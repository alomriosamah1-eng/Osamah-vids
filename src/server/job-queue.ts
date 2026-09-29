import { VideoGeneratorEngine } from './generator-engine.ts';
import { StorageManager } from './storage.ts';
import { GenerateVideoPayload, JobStatus, VideoJob } from './types.ts';

export class JobQueueManager {
  private static queue: string[] = [];
  private static isProcessing: boolean = false;
  private static listeners: Map<string, Array<(job: VideoJob) => void>> = new Map();

  public static async createJob(payload: GenerateVideoPayload): Promise<VideoJob> {
    const id = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: VideoJob = {
      id,
      prompt: payload.prompt,
      enhancedPrompt: payload.enhancedPrompt,
      negativePrompt: payload.negativePrompt || 'blurry, low quality, distorted, overexposed, static, jittery, watermark',
      model: payload.model || 'wan2.1-1.3b',
      resolution: payload.resolution || '720p',
      aspectRatio: payload.aspectRatio || '16:9',
      duration: payload.duration || 5,
      fps: payload.fps || 24,
      seed: payload.seed ?? Math.floor(Math.random() * 1000000),
      cameraMotion: payload.cameraMotion || 'drone-cinematic',
      imageUrl: payload.imageUrl,
      status: 'queued',
      progress: 0,
      stepDescription: 'Queued in processing pipeline',
      createdAt: Date.now(),
      workerType: payload.customWorkerUrl ? 'colab-remote' : 'local-engine',
    };

    if (payload.customWorkerUrl) {
      VideoGeneratorEngine.setWorkerUrl(payload.customWorkerUrl);
    }

    StorageManager.saveJob(job);
    this.queue.push(id);
    this.triggerProcessing();

    return job;
  }

  public static getJob(id: string): VideoJob | undefined {
    return StorageManager.getJob(id);
  }

  public static getAllJobs(): VideoJob[] {
    return StorageManager.getAllJobs();
  }

  public static deleteJob(id: string): boolean {
    const index = this.queue.indexOf(id);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
    return StorageManager.deleteJob(id);
  }

  private static async triggerProcessing() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const jobId = this.queue.shift();
      if (!jobId) continue;

      const job = StorageManager.getJob(jobId);
      if (!job) continue;

      try {
        job.status = 'processing';
        job.startedAt = Date.now();
        job.progress = 10;
        job.stepDescription = 'Initializing Diffusion Pipeline...';
        StorageManager.saveJob(job);
        this.notify(job);

        const startTime = Date.now();

        const result = await VideoGeneratorEngine.generate(job, (status: JobStatus, progress: number, stepDesc: string) => {
          job.status = status;
          job.progress = progress;
          job.stepDescription = stepDesc;
          StorageManager.saveJob(job);
          this.notify(job);
        });

        const elapsed = Math.round((Date.now() - startTime) / 100) / 10;

        job.status = 'completed';
        job.progress = 100;
        job.completedAt = Date.now();
        job.generationTimeSec = elapsed;
        job.videoUrl = result.videoUrl;
        job.thumbnailUrl = result.thumbnailUrl;
        job.fileSizeBytes = result.fileSizeBytes;
        job.vramPeakGB = result.vramPeakGB;
        job.stepDescription = 'Generation Complete';

        StorageManager.saveJob(job);
        this.notify(job);
      } catch (err: any) {
        console.error(`[JobQueue] Job ${jobId} failed:`, err);
        job.status = 'failed';
        job.error = err.message || 'Unknown generation failure';
        job.completedAt = Date.now();
        job.stepDescription = 'Generation Failed';
        StorageManager.saveJob(job);
        this.notify(job);
      }
    }

    this.isProcessing = false;
  }

  private static notify(job: VideoJob) {
    const handlers = this.listeners.get(job.id);
    if (handlers) {
      handlers.forEach(h => h(job));
    }
  }

  public static onJobUpdate(id: string, cb: (job: VideoJob) => void) {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, []);
    }
    this.listeners.get(id)!.push(cb);
  }
}
