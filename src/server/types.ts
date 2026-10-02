export type JobStatus = 'queued' | 'processing' | 'generation' | 'rendering' | 'completed' | 'failed';

export type VideoModelId = 
  | 'wan2.1-1.3b'
  | 'wan2.1-14b'
  | 'ltx-video'
  | 'hunyuan-video'
  | 'cogvideox-5b';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '21:9';
export type Resolution = '480p' | '720p' | '1080p';
export type CameraMotion = 'pan' | 'tilt' | 'zoom' | 'orbit' | 'dolly' | 'static' | 'drone-cinematic';

export interface VideoJob {
  id: string;
  prompt: string;
  enhancedPrompt?: string;
  negativePrompt?: string;
  model: VideoModelId;
  resolution: Resolution;
  aspectRatio: AspectRatio;
  duration: number; // in seconds
  fps: number;
  seed: number;
  cameraMotion: CameraMotion;
  imageUrl?: string;
  status: JobStatus;
  progress: number; // 0 to 100
  stepDescription?: string;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  generationTimeSec?: number;
  /** Real peak VRAM in GB, reported by the GPU worker. Absent when the worker did not measure it. Never estimated. */
  vramPeakGB?: number;
  /** Name of the GPU the worker actually ran on, e.g. "Tesla T4". */
  gpuName?: string;
  /** Number of frames the diffusion model actually produced. */
  frameCount?: number;
  /** Playback fps of the produced file, which differs from the requested fps for Wan2.1. */
  playbackFps?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  fileSizeBytes?: number;
  workerType: 'colab-gpu';
  workerUrl?: string;
}

export interface GenerateVideoPayload {
  prompt: string;
  enhancedPrompt?: string;
  negativePrompt?: string;
  model?: VideoModelId;
  resolution?: Resolution;
  aspectRatio?: AspectRatio;
  duration?: number;
  fps?: number;
  seed?: number;
  cameraMotion?: CameraMotion;
  imageUrl?: string;
  numInferenceSteps?: number;
  guidanceScale?: number;
  /** Tunnel URL of the GPU worker that must execute this job. */
  customWorkerUrl?: string;
}

export interface ModelInfo {
  id: VideoModelId;
  name: string;
  creator: string;
  huggingFaceRepo: string;
  badge: string;
  descriptionAr: string;
  descriptionEn: string;
  vramRequired: string;
  recommendedResolution: string;
  supportsI2V: boolean;
  speedRating: 'Ultra Fast' | 'Fast' | 'Cinema High-End';
  isDefault?: boolean;
  /** False when colab/worker.py cannot execute this model, so the UI can disable it. */
  availableOnWorker: boolean;
}
