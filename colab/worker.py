#!/usr/bin/env python3
"""
Osamah Vids - Dedicated High-Performance Colab/GPU Inference Worker
Powered by Wan2.1 (Wan-AI/Wan2.1-T2V-1.3B-Diffusers & 14B) and LTX-Video
"""

import os
import sys
import time
import uuid
import torch
import uvicorn
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Osamah Vids AI Worker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
current_pipeline = None
current_model_id = None

class GenerateRequest(BaseModel):
    job_id: str
    prompt: str
    negative_prompt: Optional[str] = "blurry, low quality, distorted, bad anatomy, artifacts"
    model: str = "wan2.1-1.3b"
    resolution: str = "480p"
    aspect_ratio: str = "16:9"
    duration: int = 5
    fps: int = 24
    num_inference_steps: int = 35
    guidance_scale: float = 6.0
    seed: Optional[int] = None
    image_url: Optional[str] = None

jobs_db = {}

def get_resolution_dims(aspect_ratio: str, resolution: str):
    if resolution == "720p":
        if aspect_ratio == "16:9": return (1280, 720)
        elif aspect_ratio == "9:16": return (720, 1280)
        elif aspect_ratio == "1:1": return (720, 720)
        elif aspect_ratio == "4:3": return (960, 720)
        elif aspect_ratio == "21:9": return (1280, 544)
    # Default 480p
    if aspect_ratio == "16:9": return (832, 480)
    elif aspect_ratio == "9:16": return (480, 832)
    elif aspect_ratio == "1:1": return (512, 512)
    elif aspect_ratio == "4:3": return (640, 480)
    elif aspect_ratio == "21:9": return (832, 352)
    return (832, 480)

def load_wan_pipeline(model_type="1.3b"):
    global current_pipeline, current_model_id
    model_id = "Wan-AI/Wan2.1-T2V-1.3B-Diffusers" if model_type == "1.3b" else "Wan-AI/Wan2.1-T2V-14B-Diffusers"
    
    if current_pipeline is not None and current_model_id == model_id:
        return current_pipeline

    print(f"[*] Loading model {model_id} onto {DEVICE}...")
    try:
        from diffusers import WanPipeline, AutoencoderKLWan
        pipe = WanPipeline.from_pretrained(
            model_id,
            torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32
        )
        if torch.cuda.is_available():
            # Memory optimization for 8GB-16GB VRAM GPUs (Colab T4 / RTX 3060/4060)
            pipe.enable_model_cpu_offload()
            if hasattr(pipe, "vae") and hasattr(pipe.vae, "enable_tiling"):
                pipe.vae.enable_tiling()
        current_pipeline = pipe
        current_model_id = model_id
        print(f"[+] Model {model_id} loaded successfully!")
        return pipe
    except Exception as e:
        print(f"[-] Failed to load WanPipeline: {e}")
        return None

def process_video_generation(req: GenerateRequest):
    job_id = req.job_id
    jobs_db[job_id]["status"] = "processing"
    jobs_db[job_id]["started_at"] = time.time()
    
    try:
        width, height = get_resolution_dims(req.aspect_ratio, req.resolution)
        num_frames = req.duration * req.fps
        # Wan models usually generate 81 frames for 5 seconds @ 16fps
        actual_frames = min(num_frames, 81)

        pipe = load_wan_pipeline(model_type="1.3b" if "1.3b" in req.model else "14b")
        
        jobs_db[job_id]["status"] = "generation"
        jobs_db[job_id]["step"] = "Diffusion Transformer Denoising"

        generator = None
        if req.seed is not None and req.seed >= 0:
            generator = torch.Generator(device=DEVICE).manual_seed(req.seed)

        start_time = time.time()
        if pipe is not None:
            output = pipe(
                prompt=req.prompt,
                negative_prompt=req.negative_prompt,
                height=height,
                width=width,
                num_frames=actual_frames,
                num_inference_steps=req.num_inference_steps,
                guidance_scale=req.guidance_scale,
                generator=generator
            ).frames[0]
            
            # Export to mp4 using diffusers export_to_video
            from diffusers.utils import export_to_video
            os.makedirs("outputs", exist_ok=True)
            output_path = f"outputs/{job_id}.mp4"
            export_to_video(output, output_path, fps=req.fps)
            
            gen_time = round(time.time() - start_time, 2)
            jobs_db[job_id]["status"] = "completed"
            jobs_db[job_id]["progress"] = 100
            jobs_db[job_id]["output_file"] = output_path
            jobs_db[job_id]["video_url"] = f"/outputs/{job_id}.mp4"
            jobs_db[job_id]["generation_time_sec"] = gen_time
            jobs_db[job_id]["vram_peak_gb"] = round(torch.cuda.max_memory_allocated() / (1024**3), 2) if torch.cuda.is_available() else 0
        else:
            raise Exception("AI Pipeline is not loaded or unsupported hardware.")

    except Exception as e:
        print(f"[!] Error generating video: {e}")
        jobs_db[job_id]["status"] = "failed"
        jobs_db[job_id]["error"] = str(e)
    finally:
        jobs_db[job_id]["completed_at"] = time.time()

@app.get("/health")
def health():
    return {
        "status": "online",
        "worker": "Osamah Vids Dedicated Colab Worker",
        "device": DEVICE,
        "gpu_name": torch.cuda.get_grad_device_name(0) if torch.cuda.is_available() else "No GPU (CPU)",
        "vram_total_gb": round(torch.cuda.get_device_properties(0).total_memory / (1024**3), 2) if torch.cuda.is_available() else 0,
        "loaded_model": current_model_id
    }

@app.post("/generate")
def generate(req: GenerateRequest, background_tasks: BackgroundTasks):
    job_id = req.job_id
    jobs_db[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "prompt": req.prompt,
        "model": req.model,
        "resolution": req.resolution,
        "created_at": time.time(),
        "error": None
    }
    background_tasks.add_task(process_video_generation, req)
    return {"success": True, "job_id": job_id, "status": "queued"}

@app.get("/job/{job_id}")
def get_job(job_id: str):
    if job_id not in jobs_db:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs_db[job_id]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
