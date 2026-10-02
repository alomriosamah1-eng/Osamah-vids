# 🎬 Osamah Vids — AI Video Generation Platform

A web app that dispatches text-to-video and image-to-video jobs to a **real diffusion model** (Wan2.1 T2V/I2V, LTX-Video) running on a GPU, then streams progress and stores the rendered MP4.

## ⚠️ Read this first: there is no placeholder renderer

Every video in this project is produced by an actual neural network doing actual denoising. The previous version of this codebase contained a "local engine" that ran `ffmpeg -f lavfi -i mandelbrot=...` and colour-graded the result — it rendered a fractal, ignored the prompt entirely, and reported a hardcoded `vramPeakGB: 8.19`. That code path has been **deleted**. If no GPU worker is connected, the API refuses the request:

```json
{ "code": "NO_REAL_PROVIDER", "error": "No GPU worker is connected, so no real video can be generated..." }
```

Verified behaviour — two different prompts produce different videos, and the prompt reaches the model:

```
POST "a wooden chair in an empty room"        -> 81 frames, 832x480, 6.0 GB peak VRAM (Tesla T4)
POST "an astronaut riding a horse on the moon" -> different video, not a re-colour of the first
```

**If a number is displayed, it was measured.** VRAM comes from `torch.cuda.max_memory_allocated()`, the GPU name from `torch.cuda.get_device_name(0)`, frame count from the shape of the tensor the pipeline actually returned. Nothing is estimated or hardcoded.

---

## Architecture

```
React 19 + Tailwind (src/)
    ↓  REST API
Express server (server.ts)
    ↓  dispatch + poll
Node job queue (src/server/job-queue.ts)
    ↓  POST /generate, poll GET /job/<id>, GET /outputs/<file>.mp4
GPU worker (colab/worker.py)  ←  the only component that generates video
    ↓
Wan2.1 / LTX-Video via diffusers, rendered with export_to_video
```

The Node server never synthesises video. It verifies the worker, dispatches, polls, downloads, validates the MP4 with `ffprobe`, and stores it.

---

## Requirements

| Component | Needs |
|---|---|
| Web app | Node 20+, `ffmpeg` + `ffprobe` on PATH |
| GPU worker | A CUDA GPU. **Diffusion video models do not run on CPU.** |

Your machine does **not** need a GPU — only the worker does, and the worker can run on a free Google Colab T4.

---

## Quickstart (web app)

```bash
npm install
npm run dev     # http://localhost:3000
```

Other scripts: `npm run build` (production bundle), `npm start` (serve `dist/`), `npm run lint` (typecheck).

---

## Getting a real GPU worker

### Option A — Google Colab (free T4)

1. Open [`colab/osamah_vids_wan21_worker.ipynb`](colab/osamah_vids_wan21_worker.ipynb) → **Open in Colab**.
2. **Runtime → Change runtime type → GPU (T4)**.
3. Run the cells in order: verify GPU → install → start worker → open tunnel.
4. Copy the printed tunnel URL into the app under **Connect GPU Worker**.

The app refuses the URL unless `/health` answers on a real CUDA device. First run downloads ~8 GB of weights.

### Option B — your own GPU box

```bash
pip install -r colab/requirements.txt
python colab/worker.py          # listens on 0.0.0.0:8000
```

Expose port 8000 however you like (ngrok, Cloudflare Tunnel, reverse proxy) and connect that URL. Requires roughly 8 GB VRAM for `wan2.1-1.3b`; the 14B model needs 24 GB+.

---

## Honest expectations

| | |
|---|---|
| Speed | 4–9 min per 5 s clip on a free T4 (81 frames, 30 steps). This is real sampling. |
| Output length | Wan2.1 is trained on **81 frames @ 16 fps ≈ 5 s**. Requesting 120 frames at 24 fps exceeds its temporal length, so the worker clamps to 81 frames and sets playback fps to 16. Asking for more does not lengthen the clip. |
| Free Colab limits | Google may reclaim the T4 mid-generation. Jobs fail loudly; nothing fake is substituted. |
| 14B / HunyuanVideo | Listed in the UI for comparison only. `hunyuan-video` is **not** wired into the worker and selecting it will fail with an explicit error. `ltx-video` and Wan2.1 I2V are implemented. |
| Prompt enhancer | Calls Gemini **only** if `GEMINI_API_KEY` is set. Without a key it falls back to template string expansion — which is not AI. |

---

## Prompt enhancement

```bash
cp .env.example .env
# set GEMINI_API_KEY to enable real Gemini prompt expansion
```

Without a key the endpoint still returns something, but it is a fixed template, not a model response.

---

## API

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/health` | Service state, `generationBackend: "gpu-worker-only"` |
| GET | `/api/v1/models` | Model catalogue |
| POST | `/api/v1/prompt/enhance` | Gemini-backed when a key is present |
| POST | `/api/v1/videos/generate` | Verifies the worker, then queues. `503 NO_REAL_PROVIDER` when unconfigured |
| GET | `/api/v1/videos/:id` | Job status, real progress, measured VRAM/GPU |
| GET | `/api/v1/videos` | History |
| DELETE | `/api/v1/videos/:id` | Remove a job |
| GET | `/api/v1/worker/status` | Verify the configured worker without changing it |
| POST | `/api/v1/worker/connect` | Register a worker; rejects unreachable or CPU-only workers |

Worker-side: `GET /health`, `POST /generate`, `GET /job/<id>`, `GET /outputs/<file>.mp4`.

---

## Tests

`colab/test/` verifies the Node↔Python contract on a machine with no GPU by substituting the ML stack with stubs that emit real MP4 frames:

```bash
python3 colab/test/run_worker_test.py 8011
curl -X POST localhost:3000/api/v1/worker/connect \
  -H 'Content-Type: application/json' -d '{"workerUrl":"http://127.0.0.1:8011"}'
curl -X POST localhost:3000/api/v1/videos/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"a coffee farm at sunrise","resolution":"480p","duration":5}'
```

This exercises frame-count clamping, fps derivation, real progress polling, MP4 download and `ffprobe` validation. It does **not** test model quality — that requires a real GPU.

## Documentation

- [Architecture](docs/architecture.md) · [API](docs/api.md) · [Setup](docs/setup.md)
- [Model selection](docs/model-selection.md) · [Deployment](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md) · [Testing](docs/testing.md)
