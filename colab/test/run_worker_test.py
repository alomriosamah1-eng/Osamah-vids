"""
Contract test harness for colab/worker.py.

Replaces ONLY the ML stack (torch + diffusers) with stubs so the HTTP contract,
static-file serving, frame planning, progress reporting and error paths can be
verified on a machine with no GPU. The stub pipeline emits real, distinct MP4
frames so the download + ffprobe validation path in generator-engine.ts is
genuinely exercised.

Usage:  python3 run_worker_test.py [port]
"""
import sys, os, types, math

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8011
HERE = os.path.dirname(os.path.abspath(__file__))
COLAB_DIR = os.path.dirname(HERE)
REPO = os.path.dirname(COLAB_DIR)
OUTPUT_DIR = os.path.join(HERE, "outputs")
os.environ["OSAMAH_OUTPUT_DIR"] = OUTPUT_DIR
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ---------------------------------------------------------------- fake torch
torch = types.ModuleType("torch")


class _Cuda:
    def is_available(self):
        return True

    def get_device_name(self, i):
        return "FakeTeslaT4"

    def get_device_properties(self, i):
        return types.SimpleNamespace(total_memory=15 * 1024 ** 3)

    # Emulate a Colab T4: compute capability 7.5, no bfloat16 support.
    # This forces worker.torch_dtype() down the float16 branch, which is the
    # path that actually matters for the free tier.
    def get_device_capability(self, i):
        return (7, 5)

    def is_bf16_supported(self):
        return False

    def max_memory_allocated(self):
        return 6_442_450_944  # 6.0 GB, plausible for Wan2.1-1.3B on a T4

    def reset_peak_memory_stats(self):
        pass


torch.cuda = _Cuda()
torch.float32 = "fp32"
torch.float16 = "fp16"
torch.bfloat16 = "bf16"


class _Gen:
    def __init__(self, device=None):
        self.device = device

    def manual_seed(self, s):
        self.seed = s
        return s


torch.Generator = _Gen
sys.modules["torch"] = torch

# ------------------------------------------------------------- fake diffusers
from PIL import Image, ImageDraw

CALL_LOG = {}


class _FakePipe:
    """Mimics the diffusers pipeline call signature."""

    def __init__(self, repo, kind):
        self.repo = repo
        self.kind = kind
        self.vae = types.SimpleNamespace(
            dtype="fp32", enable_tiling=lambda: None,
            to=lambda dtype=None: None,
        )

    def enable_model_cpu_offload(self):
        CALL_LOG["offload"] = self.repo

    def __call__(self, **kw):
        CALL_LOG.update(kw)
        w, h = kw["width"], kw["height"]
        n = kw["num_frames"]
        prompt = kw["prompt"]
        # Frames are deterministic per-prompt so the test can assert that the
        # prompt actually reaches the model.
        hsh = sum(ord(c) * (i + 1) for i, c in enumerate(prompt))
        frames = []
        for idx in range(n):
            t = idx / max(1, n - 1)
            r = int(127 + 127 * math.sin(t * 6.28 + hsh / 97.0))
            g = int(127 + 127 * math.sin(t * 6.28 + 2.1))
            b = int(127 + 127 * math.sin(t * 6.28 + 4.2))
            im = Image.new("RGB", (w, h), (r, g, b))
            d = ImageDraw.Draw(im)
            d.text((8, 8), f"f{idx}", fill=(255, 255, 255))
            frames.append(im)
        return types.SimpleNamespace(frames=[frames])


diffusers = types.ModuleType("diffusers")
WanPipeline = types.SimpleNamespace(from_pretrained=staticmethod(lambda repo, **k: _FakePipe(repo, "t2v")))
WanImageToVideoPipeline = types.SimpleNamespace(from_pretrained=staticmethod(lambda repo, **k: _FakePipe(repo, "i2v")))
LTXPipeline = types.SimpleNamespace(from_pretrained=staticmethod(lambda repo, **k: _FakePipe(repo, "ltx")))
AutoencoderKLWan = object
diffusers.WanPipeline = WanPipeline
diffusers.WanImageToVideoPipeline = WanImageToVideoPipeline
diffusers.LTXPipeline = LTXPipeline
diffusers.AutoencoderKLWan = AutoencoderKLWan
sys.modules["diffusers"] = diffusers

dutils = types.ModuleType("diffusers.utils")


def export_to_video(frames, path, fps=16):
    import subprocess, tempfile
    print(f"[stub] export_to_video -> {path} ({len(frames)} frames @ {fps}fps)", flush=True)
    tmp = tempfile.mkdtemp()
    for i, fr in enumerate(frames):
        fr.save(os.path.join(tmp, f"{i:05d}.png"))
    cmd = ["ffmpeg", "-y", "-v", "error", "-framerate", str(fps),
           "-i", os.path.join(tmp, "%05d.png"),
           "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path]
    subprocess.run(cmd, check=True)


dutils.export_to_video = export_to_video
diffusers.utils = dutils
sys.modules["diffusers.utils"] = dutils

# ------------------------------------------------------- import worker.py
sys.path.insert(0, COLAB_DIR)
os.environ["PORT"] = str(PORT)
import worker  # noqa: E402

if __name__ == "__main__":
    import uvicorn
    print(f"[stub] worker under test on port {PORT}", flush=True)
    uvicorn.run(worker.app, host="127.0.0.1", port=PORT, log_level="warning")
