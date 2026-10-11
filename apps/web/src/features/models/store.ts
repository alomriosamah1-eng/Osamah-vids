import { create } from 'zustand';
import { api, type ModelInfo, type ProbeResult } from '@/lib/api';

type ProbeState = ProbeResult | { id: string; ok: null; ms: 0 };

interface ModelsState {
  models: ModelInfo[];
  providers: string[];
  localProviders: string[];
  auto: string | null;
  selected: string | null;
  roles: Record<string, string>;
  showAll: boolean;
  total: number;
  connectedCount: number;
  loading: boolean;
  error: string | null;
  probing: Record<string, boolean>;
  probes: Record<string, ProbeState>;
  fetch: (opts?: { connectedOnly?: boolean; refresh?: boolean }) => Promise<void>;
  setShowAll: (v: boolean) => void;
  select: (id: string) => Promise<void>;
  autoSelect: () => Promise<void>;
  test: (id: string) => Promise<ProbeResult>;
}

export const useModels = create<ModelsState>((set, get) => ({
  models: [],
  providers: [],
  localProviders: [],
  auto: null,
  selected: null,
  roles: {},
  showAll: true,
  total: 0,
  connectedCount: 0,
  loading: false,
  error: null,
  probing: {},
  probes: {},
  fetch: async (opts) => {
    set({ loading: true, error: null });
    try {
      const showAll = opts?.connectedOnly === undefined ? get().showAll : !opts.connectedOnly;
      const r = await api.models({ connectedOnly: !showAll, refresh: opts?.refresh });
      set({
        models: r.models,
        providers: r.providers,
        localProviders: r.localProviders,
        auto: r.auto ?? null,
        selected: r.selected ?? null,
        roles: r.roles ?? {},
        total: r.total,
        connectedCount: r.connectedCount,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },
  setShowAll: (v) => {
    set({ showAll: v });
    void get().fetch({ connectedOnly: !v });
  },
  select: async (id) => {
    set({ selected: id });
    try {
      const r = await api.saveSettings(id);
      set({ roles: r.roles ?? {}, selected: r.model ?? id });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  autoSelect: async () => {
    const { auto } = get();
    if (!auto) return;
    await get().select(auto);
  },
  test: async (id) => {
    set((s) => ({ probing: { ...s.probing, [id]: true } }));
    try {
      const r = await api.testModel(id, true);
      set((s) => ({ probing: { ...s.probing, [id]: false }, probes: { ...s.probes, [id]: r } }));
      return r;
    } catch (e) {
      const r: ProbeResult = { id, ok: false, ms: 0, error: (e as Error).message };
      set((s) => ({ probing: { ...s.probing, [id]: false }, probes: { ...s.probes, [id]: r } }));
      return r;
    }
  },
}));
