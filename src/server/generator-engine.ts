import { spawn } from 'child_process';
import fs from 'fs';
import { StorageManager } from './storage.ts';
import { VideoJob } from './types.ts';

export class NoRealProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoRealProviderError';
  }
}

const MAX_POLL_ATTEMPTS = 1440;
const POLL_INTERVAL_MS = 2500;

export class VideoGeneratorEngine {
  private static registeredWorkerUrl: string | null = null;
  private static cachedStatus: { at: number; value: any } | null = null;
  private static readonly statusTtlMs = 5000;

  /** Registers the worker URL. Returns the normalized URL (no trailing slash). */
  public static setWorkerUrl(url: string | null): string | null {
    if (url) {
      const trimmed = url.trim().replace(/\/+$/, '');
      if (!/^https?:\/\//i.test(trimmed)) {
        throw new Error(`Invalid worker URL: "${url}". It must start with http:// or https://`);
      }
      this.registeredWorkerUrl = trimmed;
    } else {
      this.registeredWorkerUrl = null;
    }
    this.cachedStatus = null;
    return this.registeredWorkerUrl;
  }

  public static getWorkerUrl(): string | null {
    return this.registeredWorkerUrl;
  }

  /**
   * Liveness of the registered worker, cached briefly so health checks stay fast.
   * `reachable` reflects an actual HTTP round-trip, not merely that a URL is set.
   */
  public static async getWorkerStatus(): Promise<{
    configured: boolean;
    reachable: boolean;
    workerUrl: string | null;
    device?: string;
    gpuName?: string;
    vramTotalGb?: number;
    loadedModel?: string | null;
    loadingModel?: string | null;
    error?: string;
  }> {
    const workerUrl = this.registeredWorkerUrl;
    if (!workerUrl) {
      return { configured: false, reachable: false, workerUrl: null };
    }

    if (this.cachedStatus && Date.now() - this.cachedStatus.at < this.statusTtlMs) {
      return this.cachedStatus.value;
    }

    let value: Awaited<ReturnType<typeof VideoGeneratorEngine.getWorkerStatus>>;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(`${workerUrl}/health`, { signal: controller.signal });
      if (!response.ok) {
        value = { configured: true, reachable: false, workerUrl, error: `Worker health check returned HTTP ${response.status}` };
      } else {
        const health = await response.json();
        value = {
          configured: true,
          reachable: true,
          workerUrl,
          device: health.device,
          gpuName: health.gpu_name,
          vramTotalGb: health.vram_total_gb,
          loadedModel: health.loaded_model || null,
          loadingModel: health.loading_model || null,
        };
        if (health.device === 'cpu') {
          value.error = 'Worker is running on CPU. Diffusion video models cannot run on CPU.';
        }
      }
    } catch (err: any) {
      value = {
        configured: true,
        reachable: false,
        workerUrl,
        error: err?.name === 'AbortError'
          ? 'Worker did not answer /health within 8s.'
          : `Worker is unreachable (${err?.message || 'network error'}). Is the Colab runtime still running and the tunnel still open?`,
      };
    } finally {
      clearTimeout(timer);
    }

    this.cachedStatus = { at: Date.now(), value };
    return value;
  }

  public static invalidateWorkerStatusCache() {
    this.cachedStatus = null;
  }

  /**
   * Verifies a remote GPU worker is reachable and reports a real device.
   * Returns the worker health payload, or throws with an actionable message.
   */
  public static async verifyWorker(workerUrl: string): Promise<{
    device: string;
    gpuName: string;
    vramTotalGb: number;
    loadedModel: string | null;
  }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    let response: Response;
    try {
      response = await fetch(`${workerUrl}/health`, { signal: controller.signal });
    } catch (err: any) {
      clearTimeout(timer);
      const reason = err?.name === 'AbortError' ? 'timed out after 15s' : err?.message || 'network error';
      throw new Error(`Cannot reach GPU worker at ${workerUrl} (${reason}). Is the Colab runtime still running and the tunnel still open?`);
    }
    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`GPU worker health check failed with HTTP ${response.status}`);
    }

    const health = await response.json();
    if (health.device === 'cpu') {
      throw new Error(
        `The GPU worker at ${workerUrl} is running on CPU, not GPU. ` +
        `Diffusion video models cannot run on CPU. Enable a GPU runtime (Colab: Runtime > Change runtime type > T4 GPU) and restart the worker.`
      );
    }

    return {
      device: health.device,
      gpuName: health.gpu_name || 'unknown',
      vramTotalGb: health.vram_total_gb || 0,
      loadedModel: health.loaded_model || null,
    };
  }

  public static async generate(
    job: VideoJob,
    onProgress: (status: VideoJob['status'], progress: number, stepDesc: string) => void
  ): Promise<{ videoUrl: string; thumbnailUrl: string; duration: number; fileSizeBytes: number; vramPeakGB?: number; gpuName?: string; frameCount?: number; playbackFps?: number }> {
    const workerUrl = job.workerUrl || this.registeredWorkerUrl;

    if (!workerUrl) {
      throw new NoRealProviderError(
        'No real generation provider is configured. This platform does not synthesize placeholder videos. ' +
        'Start the GPU worker (colab/worker.py) on a Google Colab T4 runtime, then paste its tunnel URL in ' +
        '"Connect GPU Worker" to generate real videos.'
      );
    }

    const videosDir = StorageManager.getVideosDirectory();
    const videoFilename = `${job.id}.mp4`;
    const thumbFilename = `${job.id}_thumb.jpg`;
    const outputPath = `${videosDir}/${videoFilename}`;
    const thumbPath = `${videosDir}/${thumbFilename}`;

    onProgress('processing', 8, 'Verifying GPU worker connectivity...');
    await this.verifyWorker(workerUrl);

    onProgress('processing', 14, `Dispatching job to GPU worker (${job.model})...`);

    const submitRes = await this.fetchWithTimeout(`${workerUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: job.id,
        prompt: job.enhancedPrompt || job.prompt,
        negative_prompt: job.negativePrompt,
        model: job.model,
        resolution: job.resolution,
        aspect_ratio: job.aspectRatio,
        duration: job.duration,
        fps: job.fps,
        seed: job.seed,
        num_inference_steps: job.numInferenceSteps,
        guidance_scale: job.guidanceScale,
        image_url: job.imageUrl,
      }),
    }, 60000);

    if (!submitRes.ok) {
      const detail = await this.readErrorBody(submitRes);
      throw new Error(`GPU worker rejected the job (HTTP ${submitRes.status}): ${detail}`);
    }

    const submitted = await submitRes.json();
    if (submitted.status === 'failed' || submitted.error) {
      throw new Error(`GPU worker could not queue the job: ${submitted.error || submitted.status}`);
    }

    onProgress('generation', 18, submitted.step || 'Job queued on GPU worker, loading model weights...');

    let attempts = 0;
    while (attempts < MAX_POLL_ATTEMPTS) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
      attempts++;

      let statusRes: Response;
      try {
        statusRes = await this.fetchWithTimeout(`${workerUrl}/job/${job.id}`, { method: 'GET' }, 30000);
      } catch (err: any) {
        throw new Error(
          `Lost connection to the GPU worker while generating (${err.message}). ` +
          `The Colab runtime may have disconnected. Check that the notebook is still running.`
        );
      }

      if (statusRes.status === 404) {
        throw new Error(`GPU worker does not know job ${job.id}. The worker may have restarted and lost its in-memory job table.`);
      }
      if (!statusRes.ok) {
        throw new Error(`GPU worker status check failed (HTTP ${statusRes.status}).`);
      }

      const workerJob = await statusRes.json();

      if (workerJob.status === 'completed') {
        return await this.downloadAndVerify(workerJob, job, workerUrl, outputPath, thumbPath, videoFilename, thumbFilename);
      }

      if (workerJob.status === 'failed') {
        throw new Error(`GPU generation failed: ${workerJob.error || 'unknown error on worker'}`);
      }

      const reported = typeof workerJob.progress === 'number' ? workerJob.progress : null;
      const progress = reported !== null
        ? Math.max(18, Math.min(reported, 96))
        : Math.min(18 + attempts, 96);

      onProgress(
        workerJob.status === 'rendering' ? 'rendering' : 'generation',
        progress,
        workerJob.step || 'Diffusion transformer denoising on GPU...'
      );
    }

    throw new Error(
      `Timed out waiting for the GPU worker after ${Math.round((MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS) / 60000)} minutes. ` +
      `Wan2.1 on a free Colab T4 is slow; increase the timeout or lower the resolution.`
    );
  }

  private static async downloadAndVerify(
    workerJob: any,
    job: VideoJob,
    workerUrl: string,
    outputPath: string,
    thumbPath: string,
    videoFilename: string,
    thumbFilename: string
  ): Promise<{ videoUrl: string; thumbnailUrl: string; duration: number; fileSizeBytes: number; vramPeakGB?: number; gpuName?: string; frameCount?: number; playbackFps?: number }> {
    if (!workerJob.video_url) {
      throw new Error('GPU worker reported completion but returned no video URL.');
    }

    const videoRes = await this.fetchWithTimeout(`${workerUrl}${workerJob.video_url}`, { method: 'GET' }, 120000);
    if (!videoRes.ok) {
      throw new Error(
        `Failed to download the generated video from the worker (HTTP ${videoRes.status} on ${workerJob.video_url}). ` +
        `This usually means the worker is not serving its output directory.`
      );
    }

    const buffer = Buffer.from(await videoRes.arrayBuffer());
    if (buffer.length === 0) {
      throw new Error('GPU worker returned an empty video file.');
    }

    fs.writeFileSync(outputPath, buffer);

    const probe = await this.probeVideo(outputPath);
    if (!probe.valid) {
      fs.unlinkSync(outputPath);
      throw new Error(
        `The file downloaded from the GPU worker is not a valid MP4 (${probe.reason}). ` +
        `The generation was likely interrupted by a Colab disconnect or ran out of memory.`
      );
    }

    await this.generateThumbnail(outputPath, thumbPath);

    const stats = fs.statSync(outputPath);
    return {
      videoUrl: `/storage/videos/${videoFilename}`,
      thumbnailUrl: `/storage/videos/${thumbFilename}`,
      duration: probe.durationSec || job.duration,
      fileSizeBytes: stats.size,
      vramPeakGB: typeof workerJob.vram_peak_gb === 'number' ? workerJob.vram_peak_gb : undefined,
      gpuName: typeof workerJob.gpu_name === 'string' ? workerJob.gpu_name : undefined,
      frameCount: typeof workerJob.frame_count === 'number' ? workerJob.frame_count : undefined,
      playbackFps: typeof workerJob.playback_fps === 'number' ? workerJob.playback_fps : undefined,
    };
  }

  private static async probeVideo(filePath: string): Promise<{ valid: boolean; durationSec: number; reason?: string }> {
    return new Promise((resolve) => {
      const proc = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=nw=1:nk=1',
        filePath,
      ]);

      let out = '';
      let done = false;

      proc.stdout?.on('data', (d) => { out += d.toString(); });
      proc.on('error', () => {
        if (!done) { done = true; resolve({ valid: false, durationSec: 0, reason: 'ffprobe is not installed' }); }
      });
      proc.on('close', (code) => {
        if (done) return;
        done = true;
        const durationSec = parseFloat(out.trim());
        if (code !== 0 || !isFinite(durationSec) || durationSec <= 0) {
          resolve({ valid: false, durationSec: 0, reason: `ffprobe exited with code ${code}` });
        } else {
          resolve({ valid: true, durationSec });
        }
      });
    });
  }

  private static async fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private static async readErrorBody(res: Response): Promise<string> {
    try {
      const text = await res.text();
      return text.slice(0, 400);
    } catch {
      return '(no response body)';
    }
  }

  public static generateThumbnail(videoPath: string, thumbPath: string): Promise<void> {
    return new Promise((resolve) => {
      const proc = spawn('ffmpeg', [
        '-y',
        '-ss', '00:00:01',
        '-i', videoPath,
        '-vframes', '1',
        '-q:v', '3',
        thumbPath,
      ]);
      proc.on('close', () => resolve());
      proc.on('error', () => resolve());
    });
  }
}
