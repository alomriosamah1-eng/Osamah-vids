import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { enhanceVideoPrompt } from './src/server/ai-enhancer.ts';
import { VideoGeneratorEngine } from './src/server/generator-engine.ts';
import { JobQueueManager } from './src/server/job-queue.ts';
import { StorageManager } from './src/server/storage.ts';
import { ModelInfo } from './src/server/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Auto-connect to a Colab tunnel at boot so the UI is usable without a manual
// paste every time the server restarts. The same URL is re-verified live by
// VideoGeneratorEngine.getWorkerStatus(), so a transient Colab disconnect does
// not require re-registering.
const bootWorkerUrl = process.env.GPU_WORKER_URL?.trim();
if (bootWorkerUrl) {
  try {
    const normalized = VideoGeneratorEngine.setWorkerUrl(bootWorkerUrl);
    console.log(`[boot] GPU worker registered from GPU_WORKER_URL: ${normalized}`);
  } catch (error) {
    console.warn(
      `[boot] Ignoring invalid GPU_WORKER_URL: ${(error as Error).message}`,
    );
  }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static route for generated video files
const videosDir = StorageManager.getVideosDirectory();
app.use('/storage/videos', express.static(videosDir));

// List of supported models
const SUPPORTED_MODELS: ModelInfo[] = [
  {
    id: 'wan2.1-1.3b',
    name: 'Wan2.1 (T2V-1.3B)',
    creator: 'Wan-AI (Alibaba)',
    huggingFaceRepo: 'Wan-AI/Wan2.1-T2V-1.3B-Diffusers',
    badge: 'Recommended SOTA',
    descriptionAr: 'النموذج الأفضل توازناً وجودة؛ يعتمد على 3D DiT و Wan-VAE، يتطلب ~8.19 GB VRAM ويعمل على Colab T4 و RTX GPUs.',
    descriptionEn: 'Best balanced SOTA model with 3D DiT & Wan-VAE. Requires ~8.19 GB VRAM, works on Colab T4 & consumer GPUs.',
    vramRequired: '~8.19 GB VRAM',
    recommendedResolution: '720p / 480p',
    supportsI2V: true,
    speedRating: 'Fast',
    isDefault: true,
    availableOnWorker: true,
  },
  {
    id: 'wan2.1-14b',
    name: 'Wan2.1 (T2V-14B Cinema)',
    creator: 'Wan-AI (Alibaba)',
    huggingFaceRepo: 'Wan-AI/Wan2.1-T2V-14B-Diffusers',
    badge: 'Cinema Quality',
    descriptionAr: 'النسخة السينمائية العملاقة بدقة وتفاصيل خيالية؛ تتطلب كروت شاشة متقدمة 24GB+ VRAM أو A100.',
    descriptionEn: 'Flagship 14B Cinema model with breathtaking photorealism. Requires 24GB+ VRAM or A100.',
    vramRequired: '24GB+ VRAM (A100/H100)',
    recommendedResolution: '1080p / 720p',
    supportsI2V: true,
    speedRating: 'Cinema High-End',
    availableOnWorker: true,
  },
  {
    id: 'ltx-video',
    name: 'LTX-Video (0.9.5)',
    creator: 'Lightricks',
    huggingFaceRepo: 'Lightricks/LTX-Video',
    badge: 'Ultra Fast Turbo',
    descriptionAr: 'نموذج فائق السرعة يعتمد على معمارية Real-time DiT، ممتاز للتوليد الفوري والاستعراض السريع.',
    descriptionEn: 'Ultra-fast Real-time DiT model designed for high throughput and rapid generation.',
    vramRequired: '~12 GB VRAM',
    recommendedResolution: '768x512 / 480p',
    supportsI2V: true,
    speedRating: 'Ultra Fast',
    availableOnWorker: true,
  },
  {
    id: 'hunyuan-video',
    name: 'HunyuanVideo (13B)',
    creator: 'Tencent',
    huggingFaceRepo: 'tencent/HunyuanVideo',
    badge: 'High Precision',
    descriptionAr: 'نموذج متقدم بدقة بصرية وفيزيائية عالية جداً، مناسب للاستخدام المؤسسي على خوادم سحابية ضخمة.',
    descriptionEn: 'High-precision physics and visual dynamics model for enterprise cloud servers.',
    vramRequired: '32GB+ VRAM',
    recommendedResolution: '1080p / 720p',
    supportsI2V: true,
    speedRating: 'Cinema High-End',
    availableOnWorker: false,
  },
];

// Health endpoint
app.get('/api/v1/health', async (req, res) => {
  const allJobs = JobQueueManager.getAllJobs();
  const activeJobs = allJobs.filter(j => j.status === 'queued' || j.status === 'processing' || j.status === 'generation' || j.status === 'rendering');
  const completedJobs = allJobs.filter(j => j.status === 'completed');

  // Probe the worker so this endpoint reports real liveness. A configured-but-dead
  // worker must never be advertised as ready.
  const worker = await VideoGeneratorEngine.getWorkerStatus();
  const workerReady = worker.configured && worker.reachable && worker.device !== 'cpu';

  res.json({
    status: 'healthy',
    platform: 'Osamah Vids AI Engine',
    version: '2.0.0',
    activeJobsCount: activeJobs.length,
    completedJobsCount: completedJobs.length,
    defaultModel: 'wan2.1-1.3b',
    availableModels: SUPPORTED_MODELS.map(m => m.id),
    remoteWorkerConfigured: worker.configured,
    remoteWorkerReady: workerReady,
    worker: worker.configured
      ? {
          url: worker.workerUrl,
          reachable: worker.reachable,
          device: worker.device,
          gpuName: worker.gpuName,
          vramTotalGb: worker.vramTotalGb,
          loadedModel: worker.loadedModel,
          loadingModel: worker.loadingModel,
          error: worker.error,
        }
      : null,
    canGenerate: workerReady,
    generationBackend: 'gpu-worker-only',
    note: 'Videos are produced exclusively by a real diffusion model on a connected GPU worker. No synthetic/placeholder renderer exists.',
    timestamp: new Date().toISOString(),
  });
});

// Models list endpoint
app.get('/api/v1/models', (req, res) => {
  res.json({
    models: SUPPORTED_MODELS,
    benchmarkPrompt: "A cinematic realistic aerial shot of a Yemeni coffee farm at sunrise, with detailed coffee trees, mountains in the background, soft golden sunlight, realistic camera movement, natural atmosphere, cinematic composition.",
  });
});

// Enhance Prompt endpoint
app.post('/api/v1/prompt/enhance', async (req, res) => {
  try {
    const { prompt, style, cameraMotion } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required and must be a string' });
    }
    const result = await enhanceVideoPrompt(prompt, style, cameraMotion);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Prompt enhancement failed' });
  }
});

// Generate Video Job endpoint
app.post('/api/v1/videos/generate', async (req, res) => {
  try {
    const { prompt, enhancedPrompt, negativePrompt, model, resolution, aspectRatio, duration, fps, seed, cameraMotion, imageUrl, customWorkerUrl, numInferenceSteps, guidanceScale } = req.body;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Reject early and honestly instead of queueing a job that cannot be executed.
    const workerUrl = customWorkerUrl?.trim() || VideoGeneratorEngine.getWorkerUrl();
    if (!workerUrl) {
      return res.status(503).json({
        error: 'No GPU worker is connected, so no real video can be generated. ' +
          'This platform does not produce placeholder videos. Start colab/worker.py on a Google Colab T4 runtime ' +
          'and connect its tunnel URL, then try again.',
        code: 'NO_REAL_PROVIDER',
      });
    }

    const requestedModel = model || 'wan2.1-1.3b';
    const modelInfo = SUPPORTED_MODELS.find(m => m.id === requestedModel);
    if (!modelInfo) {
      return res.status(400).json({ error: `Unknown model "${requestedModel}".`, code: 'UNKNOWN_MODEL' });
    }
    if (!modelInfo.availableOnWorker) {
      return res.status(400).json({
        error: `${modelInfo.name} is listed for comparison but is not wired into the GPU worker, so it cannot generate. ` +
          `Available now: ${SUPPORTED_MODELS.filter(m => m.availableOnWorker).map(m => m.id).join(', ')}.`,
        code: 'MODEL_NOT_IMPLEMENTED',
      });
    }

    try {
      await VideoGeneratorEngine.verifyWorker(workerUrl);
    } catch (err: any) {
      // A URL that cannot reach a GPU is not a usable configuration. Drop it so
      // the UI cannot keep presenting a dead worker as connected.
      if (!customWorkerUrl?.trim()) {
        VideoGeneratorEngine.setWorkerUrl(null);
      }
      return res.status(502).json({
        error: err.message || 'GPU worker is not reachable',
        code: 'WORKER_UNREACHABLE',
        workerCleared: !customWorkerUrl?.trim(),
      });
    }

    const job = await JobQueueManager.createJob({
      prompt: prompt.trim(),
      enhancedPrompt: enhancedPrompt?.trim(),
      negativePrompt: negativePrompt?.trim(),
      model: requestedModel,
      resolution: resolution || '720p',
      aspectRatio: aspectRatio || '16:9',
      duration: duration || 5,
      fps: fps || 24,
      seed: typeof seed === 'number' ? seed : undefined,
      cameraMotion: cameraMotion || 'drone-cinematic',
      imageUrl,
      numInferenceSteps,
      guidanceScale,
      customWorkerUrl: workerUrl,
    });

    res.status(202).json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'Video generation job dispatched to the GPU worker',
      job,
    });
  } catch (err: any) {
    console.error('[Server] Generate video error:', err);
    res.status(500).json({ error: err.message || 'Internal server error while creating video job' });
  }
});

// Get Video Job by ID
app.get('/api/v1/videos/:id', (req, res) => {
  const job = JobQueueManager.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Video job not found' });
  }
  res.json(job);
});

// List All Videos
app.get('/api/v1/videos', (req, res) => {
  const jobs = JobQueueManager.getAllJobs();
  res.json({
    total: jobs.length,
    videos: jobs,
  });
});

// Delete Video
app.delete('/api/v1/videos/:id', (req, res) => {
  const deleted = JobQueueManager.deleteJob(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Video not found or already deleted' });
  }
  res.json({ success: true, deletedId: req.params.id });
});

// Remote Worker connect/heartbeat
app.post('/api/v1/worker/connect', async (req, res) => {
  const { workerUrl } = req.body;

  if (!workerUrl || typeof workerUrl !== 'string' || !workerUrl.trim()) {
    VideoGeneratorEngine.setWorkerUrl(null);
    return res.json({ success: true, message: 'Worker URL cleared. New jobs will fail until a worker is connected.' });
  }

  const trimmed = workerUrl.trim();
  let normalized: string | null;
  try {
    normalized = VideoGeneratorEngine.setWorkerUrl(trimmed);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }

  try {
    const health = await VideoGeneratorEngine.verifyWorker(normalized!);
    return res.json({
      success: true,
      workerUrl: normalized,
      message: 'Worker connected and verified on a real GPU.',
      gpu: health,
    });
  } catch (err: any) {
    VideoGeneratorEngine.setWorkerUrl(null);
    return res.status(400).json({ success: false, error: err.message || 'Worker verification failed' });
  }
});

// Verify the currently configured worker without changing it
app.get('/api/v1/worker/status', async (req, res) => {
  const status = await VideoGeneratorEngine.getWorkerStatus();

  if (!status.configured) {
    return res.status(404).json({
      connected: false,
      ready: false,
      error: 'No GPU worker configured. Start colab/worker.py on a Colab T4 runtime and connect its tunnel URL.',
    });
  }

  const ready = status.reachable && status.device !== 'cpu';

  if (!ready) {
    return res.status(502).json({
      connected: status.reachable,
      ready: false,
      workerUrl: status.workerUrl,
      device: status.device,
      gpuName: status.gpuName,
      error: status.error || 'Worker is not ready.',
    });
  }

  return res.json({
    connected: true,
    ready: true,
    workerUrl: status.workerUrl,
    gpu: {
      device: status.device,
      gpuName: status.gpuName,
      vramTotalGb: status.vramTotalGb,
      loadedModel: status.loadedModel,
    },
  });
});

// Setup Vite or Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Osamah Vids Engine] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
