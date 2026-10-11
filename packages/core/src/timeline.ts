// نموذج الخط الزمني (Track/Clip) — راجع docs/editor-spec.md
export type TrackKind = 'scenes' | 'narration' | 'music' | 'captions';
export type ClipStatus = 'pending' | 'generating' | 'ready' | 'error';

export interface Clip {
  id: string;
  label: string;
  startMs: number;
  durMs: number;
  status: ClipStatus;
  sceneId?: string;
  src?: string;
  thumb?: string;
  error?: string;
}

export interface Track {
  id: string;
  kind: TrackKind;
  label: string;
  clips: Clip[];
  muted?: boolean;
  color?: string;
}

export interface Timeline {
  durationMs: number;
  fps: number;
  tracks: Track[];
}

export interface ProjectOptions {
  durationSeconds: number;
  orientation: 'horizontal' | 'vertical';
  style: string;
  voice: 'female' | 'male';
  quality: '720p' | '1080p' | '1440p';
  captions: boolean;
  music: boolean;
}

export interface ProjectMeta {
  id: string;
  slug: string;
  title: string;
  prompt: string;
  options: ProjectOptions;
  status: 'draft' | 'queued' | 'generating' | 'rendering' | 'ready' | 'failed';
  createdAt: string;
  updatedAt: string;
  durationMs: number;
  thumbnail?: string;
  finalPath?: string;
  sizeMb?: number;
  lastOpened?: string;
  error?: string;
}

export type ProjectStatus = ProjectMeta['status'];