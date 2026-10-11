// عقد أحداث البثّ (SSE Envelope) — راجع docs/backend.md
export type PipelineEvent =
  | { type: 'stage_started'; stage: string; ts: number }
  | { type: 'scene_started'; sceneId: string; index: number; ts: number }
  | { type: 'scene_generated'; sceneId: string; spec: unknown; ts: number }
  | { type: 'scene_rendered'; sceneId: string; path: string; ts: number }
  | { type: 'render_progress'; frame: number; total: number; ts: number }
  | { type: 'narration_ready'; sceneId: string; ts: number }
  | { type: 'qc_result'; ok: boolean; info: unknown; ts: number }
  | { type: 'done'; final: string; ts: number }
  | { type: 'error'; stage: string; message: string; ts: number };

export const PIPELINE_STAGES = ['understand', 'script', 'scenes', 'voice', 'render', 'audio', 'qc', 'export'] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];