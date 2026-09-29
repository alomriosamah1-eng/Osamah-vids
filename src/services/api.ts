import { ModelInfo, VideoJob, VideoModelId } from '../types/client.ts';

// Configurable API base URL with fallback to current origin for SPA / dev server
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export interface GenerateVideoParams {
  prompt: string;
  enhancedPrompt?: string;
  negativePrompt?: string;
  model: VideoModelId;
  resolution: string;
  aspectRatio: string;
  duration: number;
  fps: number;
  seed?: number;
  cameraMotion: string;
  imageUrl?: string;
  customWorkerUrl?: string;
}

export class ApiService {
  public static async getHealth(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/v1/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  }

  public static async getModels(): Promise<{ models: ModelInfo[]; benchmarkPrompt: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/models`);
    if (!res.ok) throw new Error('Failed to load models');
    return res.json();
  }

  public static async enhancePrompt(prompt: string, style?: string, cameraMotion?: string): Promise<{
    originalPrompt: string;
    enhancedPrompt: string;
    negativePrompt: string;
    cameraMotion: string;
    lightingStyle: string;
    artStyle: string;
    translationAr?: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/prompt/enhance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, style, cameraMotion }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to enhance prompt');
    }
    return res.json();
  }

  public static async createVideoJob(params: GenerateVideoParams): Promise<{ success: boolean; jobId: string; job: VideoJob }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/videos/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit video generation job');
    }
    return res.json();
  }

  public static async getVideoJob(id: string): Promise<VideoJob> {
    const res = await fetch(`${API_BASE_URL}/api/v1/videos/${id}`);
    if (!res.ok) {
      throw new Error(`Job not found (${res.status})`);
    }
    return res.json();
  }

  public static async getAllVideos(): Promise<{ total: number; videos: VideoJob[] }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/videos`);
    if (!res.ok) throw new Error('Failed to retrieve video history');
    return res.json();
  }

  public static async deleteVideo(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/v1/videos/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  }

  public static async connectWorker(workerUrl: string | null): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/worker/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workerUrl }),
    });
    return res.json();
  }
}
