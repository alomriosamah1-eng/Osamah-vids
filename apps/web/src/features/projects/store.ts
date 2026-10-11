import { create } from 'zustand';
import { api } from '@/lib/api';
import type { LiveEvent } from '@/lib/sse';

export interface ProjectSummary {
  id: string;
  title: string;
  status: string;
  durationMs?: number;
  createdAt: string;
  thumbnail?: string;
  sizeMb?: number;
  lastOpened?: string;
  options?: { orientation?: string; style?: string; quality?: string; voice?: string; durationSeconds?: number };
}

interface ProjectsState {
  projects: ProjectSummary[];
  loading: boolean;
  error: string | null;
  live: Record<string, LiveEvent[]>;
  fetch: () => Promise<void>;
  create: (body: { prompt: string; options: unknown; title?: string }) => Promise<{ id: string }>;
  remove: (id: string) => Promise<void>;
  open: (id: string) => Promise<void>;
  pushEvent: (projectId: string, ev: LiveEvent) => void;
  clearLive: (projectId: string) => void;
}

export const useProjects = create<ProjectsState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,
  live: {},
  fetch: async () => {
    set({ loading: true, error: null });
    try {
      const { projects } = await api.listProjects();
      set({ projects: projects as ProjectSummary[], loading: false });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },
  create: async (body) => {
    const r = await api.createProject(body);
    await get().fetch();
    return r;
  },
  remove: async (id) => {
    await api.deleteProject(id);
    await get().fetch();
  },
  open: async (id) => {
    await api.openProject(id);
  },
  pushEvent: (projectId, ev) =>
    set((s) => ({ live: { ...s.live, [projectId]: [...(s.live[projectId] ?? []).slice(-400), ev] } })),
  clearLive: (projectId) => set((s) => ({ live: { ...s.live, [projectId]: [] } })),
}));