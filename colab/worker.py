#!/usr/bin/env python3
"""
Osamah Vids - GPU Inference Worker.

Runs a REAL diffusion video model (Wan2.1 T2V/I2V, LTX-Video) on a CUDA GPU and
serves the rendered MP4 over HTTP for the Node/Express front-end to download.

There is no placeholder renderer in this file. If the model cannot be loaded, the
job fails loudly with a diagnostic message.

Expected to be started on a GPU runtime, e.g. Google Colab T4/A100:

    pip install -r requirements.txt
    python worker.py

Endpoints:
    GET  /health          -> device, GPU name, VRAM, loaded model
    POST /generate         -> enqueue a generation job
    GET  /job/<job_id>     -> job status, progress, step, result URLs
    GET  /outputs/<file>   -> the rendered MP4
"""

import os
import sys
import time
import threading
import traceback

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

OUTPUT_DIR = os.environ.get("OSAMAH_OUTPUT_DIR", "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = FastAPI(title="Osamah Vids GPU Worker", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# This mount is what makes /outputs/<job_id>.mp4 downloadable by the Node server.
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

CUDA = torch.cuda.is_available()
DEVICE = "cuda" if CUDA else "cpu"


def torch_dtype():
    """
    Pick a dtype the current GPU can actually execute.

    bfloat16 requires compute capability 8.0+ (Ampere). Google Colab's free T4
    is sm_75 and does NOT support bfloat16 -- using it there produces NaNs or a
    hard crash. T4 must use float16.
    """
    if not CUDA:
        return torch.float32
    try:
        if torch.cuda.is_bf16_supported():
            return torch.bfloat16
    except Exception:
        pass
    major, _minor = torch.cuda.get_device_capability(0)
    if major >= 8:
        return torch.bfloat16
    return torch.float16

# Wan2.1 native geometry.
NATIVE_FPS = 16
MAX_FRAMES_WAN = 81  # 81 frames @ 16fps == ~5s, the model's training length

MODEL_REPOS = {
    "wan2.1-1.3b": "Wan-AI/Wan2.1-T2V-1.3B-Diffusers",
    "wan2.1-14b": "Wan-AI/Wan2.1-T2V-14B-Diffusers",
    "ltx-video": "Lightricks/LTX-Video",
}
WAN_I2V_REPOS = {
    "wan2.1-1.3b": "Wan-AI/Wan2.1-I2V-14B-480P-Diffusers",
}

_pipelines = {}
# Guards pipeline construction only. It is held for the whole ~8GB download and
# pipeline build, so nothing else may ever block on it.
_pipelines_lock = threading.Lock()

# Guards cheap metadata for /health. Never held during a download or a
# generation, so health checks answer instantly even while a model is loading.
_meta_lock = threading.Lock()
_loaded_models = []
_loading = {"model": None, "since": None}


def _meta_snapshot():
    with _meta_lock:
        return list(_loaded_models), dict(_loading)


class GenerateRequest(BaseModel):
    job_id: str
    prompt: str
    negative_prompt: str = "blurry, low quality, distorted, bad anatomy, artifacts, watermark, text"
    model: str = "wan2.1-1.3b"
    resolution: str = "480p"
    aspect_ratio: str = "16:9"
    duration: int = 5
    fps: int = 24
    num_inference_steps: int = 30
    guidance_scale: float = 6.0
    seed: int | None = None
    image_url: str | None = None


jobs_db = {}
_jobs_lock = threading.Lock()


def update_job(job_id, **fields):
    with _jobs_lock:
        if job_id in jobs_db:
            jobs_db[job_id].update(fields)


def gpu_name():
    if not CUDA:
        return None
    return torch.cuda.get_device_name(0)


def resolution_dims(aspect_ratio: str, resolution: str):
    """Return (width, height). Wan2.1 requires dimensions that are multiples of 16."""
    table = {
        ("720p", "16:9"): (1280, 720),
        ("720p", "9:16"): (720, 1280),
        ("720p", "1:1"): (720, 720),
        ("720p", "4:3"): (960, 720),
        ("720p", "21:9"): (1280, 544),
        ("480p", "16:9"): (832, 480),
        ("480p", "9:16"): (480, 832),
        ("480p", "1:1"): (512, 512),
        ("480p", "4:3"): (640, 480),
        ("480p", "21:9"): (832, 352),
        ("1080p", "16:9"): (1920, 1080),
        ("1080p", "9:16"): (1080, 1920),
        ("1080p", "1:1"): (1024, 1024),
        ("1080p", "4:3"): (1440, 1080),
        ("1080p", "21:9"): (1920, 816),
    }
    dims = table.get((resolution, aspect_ratio), table[("480p", aspect_ratio)])
    width, height = dims
    return (width // 16) * 16, (height // 16) * 16


def plan_frames(duration: int, fps: int, is_wan: bool) -> tuple[int, int]:
    """
    Decide how many frames to actually denoise, and at what playback fps.

    Wan2.1 is trained on 81 frames @ 16fps. Asking it for 121 frames at 24fps
    (5s * 24) would exceed the model's temporal length and either fail or produce
    a broken video. So we clamp the denoised frame count and re-derive the
    playback fps from the requested duration.
    """
    if is_wan:
        wanted = max(1, int(round(duration * fps)))
        num_frames = min(wanted, MAX_FRAMES_WAN)
    else:
        num_frames = max(1, int(round(duration * fps)))

    if num_frames % 4 != 1 and num_frames > 1:
        # Wan wants 4n+1 frames.
        num_frames = max(5, ((num_frames - 1) // 4) * 4 + 1)
        num_frames = min(num_frames, MAX_FRAMES_WAN) if is_wan else num_frames

    playback_fps = max(1, round(num_frames / duration))
    return num_frames, playback_fps


def load_pipeline(model: str, image_url: str | None = None):
    """Load (and cache) the real diffusion pipeline for the requested model."""
    key = f"{model}:{'i2v' if image_url else 't2v'}"

    try:
        return _load_pipeline_locked(key, model, image_url)
    finally:
        with _meta_lock:
            _loading["model"] = None
            _loading["since"] = None


def _load_pipeline_locked(key, model, image_url):
    with _pipelines_lock:
        if key in _pipelines:
            return _pipelines[key]

        if not CUDA:
            raise RuntimeError(
                "No CUDA GPU is available on this worker. Wan2.1/LTX-Video cannot run on CPU. "
                "Select a GPU runtime (Colab: Runtime > Change runtime type > T4 GPU) and restart."
            )

        is_i2v = bool(image_url) and model in WAN_I2V_REPOS

        if model not in MODEL_REPOS:
            raise RuntimeError(f"Unsupported model '{model}'. Known models: {list(MODEL_REPOS)}")

        with _meta_lock:
            _loading["model"] = key
            _loading["since"] = time.time()

        if is_i2v:
            from diffusers import AutoencoderKLWan, WanImageToVideoPipeline
            repo = WAN_I2V_REPOS[model]
            print(f"[worker] loading {repo} (image-to-video)...", flush=True)
            pipe = WanImageToVideoPipeline.from_pretrained(repo, torch_dtype=torch_dtype())
        elif model.startswith("wan2.1"):
            from diffusers import WanPipeline
            repo = MODEL_REPOS[model]
            print(f"[worker] loading {repo} (text-to-video)...", flush=True)
            pipe = WanPipeline.from_pretrained(repo, torch_dtype=torch_dtype())
        else:
            from diffusers import LTXPipeline
            repo = MODEL_REPOS[model]
            print(f"[worker] loading {repo}...", flush=True)
            pipe = LTXPipeline.from_pretrained(repo, torch_dtype=torch_dtype())

        if hasattr(pipe, "enable_model_cpu_offload"):
            pipe.enable_model_cpu_offload()
        else:
            pipe = pipe.to(DEVICE)

        vae = getattr(pipe, "vae", None)
        if vae is not None and hasattr(vae, "enable_tiling"):
            vae.enable_tiling()

        torch.cuda.reset_peak_memory_stats()
        _pipelines[key] = pipe
        with _meta_lock:
            if key not in _loaded_models:
                _loaded_models.append(key)
        print(f"[worker] {repo} ready on {gpu_name()} (dtype={torch_dtype()})", flush=True)
        return pipe


def download_image(url: str) -> "object":
    """Fetch a reference image for image-to-video jobs."""
    from PIL import Image
    from io import BytesIO
    from urllib.request import urlopen, Request

    req = Request(url, headers={"User-Agent": "osamah-vids-worker"})
    with urlopen(req, timeout=30) as resp:
        data = resp.read()
    return Image.open(BytesIO(data)).convert("RGB")


def process_video_generation(req: GenerateRequest):
    job_id = req.job_id
    started = time.time()

    update_job(job_id, status="processing", started_at=started, step="Preparing pipeline...", progress=5)

    if not CUDA:
        update_job(
            job_id,
            status="failed",
            error=(
                "Worker is not running on a GPU. Enable a GPU runtime in Colab "
                "(Runtime > Change runtime type > T4 GPU) and restart the worker."
            ),
            completed_at=time.time(),
        )
        return

    try:
        pipe = load_pipeline(req.model, req.image_url)

        width, height = resolution_dims(req.aspect_ratio, req.resolution)
        is_wan = req.model.startswith("wan2.1")
        num_frames, playback_fps = plan_frames(req.duration, req.fps, is_wan)

        update_job(
            job_id,
            status="generation",
            step=f"Denoising {num_frames} frames at {width}x{height} on {gpu_name()}...",
            progress=25,
            frame_count=num_frames,
        )

        generator = None
        if req.seed is not None and req.seed >= 0:
            generator = torch.Generator(device="cpu").manual_seed(req.seed)

        kwargs = dict(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt,
            height=height,
            width=width,
            num_frames=num_frames,
            num_inference_steps=max(1, int(req.num_inference_steps)),
            guidance_scale=req.guidance_scale,
            generator=generator,
        )

        if req.image_url and req.model in WAN_I2V_REPOS:
            kwargs["image"] = download_image(req.image_url)

        # Wan2.1: run the VAE in fp32 to avoid the well-known black-frame NaN issue
        # on fp16 GPUs such as the Colab T4.
        vae = getattr(pipe, "vae", None)
        if is_wan and vae is not None and vae.dtype != torch.float32:
            try:
                vae.to(dtype=torch.float32)
                print("[worker] VAE promoted to fp32 to avoid NaN frames", flush=True)
            except Exception as exc:
                print(f"[worker] could not promote VAE to fp32: {exc}", flush=True)

        update_job(job_id, step="Running diffusion transformer...", progress=40)
        result = pipe(**kwargs)

        update_job(job_id, status="rendering", step="Decoding latents and encoding MP4...", progress=85)

        frames = result.frames[0]
        output_path = os.path.join(OUTPUT_DIR, f"{job_id}.mp4")

        from diffusers.utils import export_to_video
        export_to_video(frames, output_path, fps=playback_fps)

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            raise RuntimeError(f"Video encoder produced no output at {output_path}")

        vram_peak = round(torch.cuda.max_memory_allocated() / (1024**3), 2)

        update_job(
            job_id,
            status="completed",
            progress=100,
            step="Generation complete",
            video_url=f"/outputs/{job_id}.mp4",
            output_file=output_path,
            generation_time_sec=round(time.time() - started, 2),
            vram_peak_gb=vram_peak,
            gpu_name=gpu_name(),
            frame_count=num_frames,
            playback_fps=playback_fps,
            width=width,
            height=height,
            completed_at=time.time(),
        )
        print(f"[worker] job {job_id} completed in {time.time() - started:.1f}s", flush=True)

    except Exception as exc:
        traceback.print_exc()
        detail = f"{type(exc).__name__}: {exc}"
        if not CUDA:
            detail = "Worker has no GPU."
        elif "out of memory" in str(exc).lower() or "OutOfMemoryError" in type(exc).__name__:
            detail = (
                "CUDA out of memory. Lower the resolution to 480p, reduce num_inference_steps, "
                "or use a smaller model (wan2.1-1.3b). Original error: " + detail
            )
        update_job(job_id, status="failed", error=detail, completed_at=time.time())


@app.get("/health")
def health():
    # Must never block: this endpoint is what the UI polls to decide whether the
    # worker is usable. It reads a lock-free snapshot instead of _pipelines_lock,
    # which is held for the entire model download.
    loaded, loading = _meta_snapshot()
    vram = 0
    if CUDA:
        try:
            vram = round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2)
        except Exception:
            vram = 0
    return {
        "status": "online",
        "worker": "Osamah Vids GPU Worker",
        "device": DEVICE,
        "gpu_name": gpu_name() or "No GPU (CPU)",
        "vram_total_gb": vram,
        "loaded_models": loaded,
        "loaded_model": loaded[0] if loaded else None,
        "loading_model": loading["model"],
        "loading_since": loading["since"],
        "supported_models": list(MODEL_REPOS),
    }


@app.post("/generate")
def generate(req: GenerateRequest):
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="prompt must not be empty")

    with _jobs_lock:
        if req.job_id in jobs_db and jobs_db[req.job_id].get("status") in ("queued", "processing", "generation", "rendering"):
            return {"success": True, "job_id": req.job_id, "status": jobs_db[req.job_id]["status"], "duplicate": True}
        jobs_db[req.job_id] = {
            "job_id": req.job_id,
            "status": "queued",
            "progress": 0,
            "step": "Queued, waiting for a free slot...",
            "prompt": req.prompt,
            "model": req.model,
            "resolution": req.resolution,
            "created_at": time.time(),
            "error": None,
        }

    threading.Thread(target=process_video_generation, args=(req,), daemon=True).start()
    return {"success": True, "job_id": req.job_id, "status": "queued"}


@app.get("/job/{job_id}")
def get_job(job_id: str):
    with _jobs_lock:
        job = jobs_db.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found on this worker")
        return dict(job)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    print(f"[worker] device={DEVICE} gpu={gpu_name()} outputs={OUTPUT_DIR}", flush=True)
    if not CUDA:
        print("[worker] WARNING: no CUDA device found. Jobs will fail with a clear error.", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=port)
