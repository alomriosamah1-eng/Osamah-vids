// عميل REST بسيط.
const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export type ModelStatus = 'connected' | 'no-key' | 'restricted' | 'offline';

export interface ModelInfo {
  id: string;
  provider: string;
  name: string;
  kind: string;
  supportsText: boolean;
  connected: boolean;
  status: 'connected' | 'no-key' | 'restricted' | 'offline';
  note?: string;
}

export interface ModelsResponse {
  models: ModelInfo[];
  total: number;
  connectedCount: number;
  providers: string[];
  localProviders: string[];
  auto?: string;
  selected: string;
  roles: Record<string, string>;
}

export interface ProbeResult {
  id: string;
  ok: boolean;
  ms: number;
  sample?: string;
  error?: string;
}

export const api = {
  health: () => request<{ ok: boolean }>('/health'),
  config: () => request<unknown>('/config'),
  listProjects: () => request<{ projects: unknown[] }>('/projects'),
  createProject: (body: { prompt: string; options: unknown; title?: string }) =>
    request<{ id: string; status: string }>('/projects', { method: 'POST', body: JSON.stringify(body) }),
  getProject: (id: string) => request<unknown>(`/projects/${id}`),
  openProject: (id: string) => request<{ ok: boolean }>(`/projects/${id}/open`, { method: 'POST' }),
  deleteProject: (id: string) => request<{ ok: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
  models: (opts: { connectedOnly?: boolean; refresh?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (opts.connectedOnly) q.set('connected', '1');
    if (opts.refresh) q.set('refresh', '1');
    const qs = q.toString();
    return request<ModelsResponse>(`/models${qs ? `?${qs}` : ''}`);
  },
  testModel: (id: string, force = false) =>
    request<ProbeResult>('/models/test', { method: 'POST', body: JSON.stringify({ id, force }) }),
  getSettings: () => request<{ model?: string; roles: Record<string, string> }>('/settings'),
  saveSettings: (model: string) =>
    request<{ model?: string; roles: Record<string, string> }>('/settings', { method: 'POST', body: JSON.stringify({ model }) }),
};