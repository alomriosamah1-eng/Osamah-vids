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
  },
];

// Health endpoint
app.get('/api/v1/health', (req, res) => {
  const allJobs = JobQueueManager.getAllJobs();
  const activeJobs = allJobs.filter(j => j.status === 'queued' || j.status === 'processing' || j.status === 'generation' || j.status === 'rendering');
  const completedJobs = allJobs.filter(j => j.status === 'completed');
  
  res.json({
    status: 'healthy',
    platform: 'Osamah Vids AI Engine',
    version: '1.0.0',
    activeJobsCount: activeJobs.length,
    completedJobsCount: completedJobs.length,
    defaultModel: 'wan2.1-1.3b',
    availableModels: SUPPORTED_MODELS.map(m => m.id),
    remoteWorkerConfigured: !!VideoGeneratorEngine.getWorkerUrl(),
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
    const { prompt, enhancedPrompt, negativePrompt, model, resolution, aspectRatio, duration, fps, seed, cameraMotion, imageUrl, customWorkerUrl } = req.body;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const job = await JobQueueManager.createJob({
      prompt: prompt.trim(),
      enhancedPrompt: enhancedPrompt?.trim(),
      negativePrompt: negativePrompt?.trim(),
      model: model || 'wan2.1-1.3b',
      resolution: resolution || '720p',
      aspectRatio: aspectRatio || '16:9',
      duration: duration || 5,
      fps: fps || 24,
      seed: typeof seed === 'number' ? seed : undefined,
      cameraMotion: cameraMotion || 'drone-cinematic',
      imageUrl,
      customWorkerUrl,
    });

    res.status(202).json({
      success: true,
      jobId: job.id,
      status: job.status,
      message: 'Video generation job queued successfully',
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
app.post('/api/v1/worker/connect', (req, res) => {
  const { workerUrl } = req.body;
  if (workerUrl && typeof workerUrl === 'string') {
    VideoGeneratorEngine.setWorkerUrl(workerUrl.trim());
    return res.json({ success: true, workerUrl: workerUrl.trim(), message: 'Worker URL registered' });
  } else {
    VideoGeneratorEngine.setWorkerUrl(null);
    return res.json({ success: true, message: 'Worker URL cleared, using internal engine' });
  }
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
