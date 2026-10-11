import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Play, FolderOpen } from 'lucide-react';
import { useProjects } from '@/features/projects/store';
import { durationToLabel } from '@osamah/core';
import { GlassCard } from '@/components/ui/GlassCard';

export function ProjectsScreen() {
  const { projects, loading, fetch, remove } = useProjects();
  const navigate = useNavigate();

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black">المشاريع</h1>
        <p className="text-sm text-dim">افتح أي مشروع لاستعراض المحرر وإعطاء الوكيل تعليمات التعديل.</p>
      </motion.div>

      {loading && <div className="text-muted">جارٍ التحميل…</div>}

      {!loading && projects.length === 0 && (
        <GlassCard className="flex flex-col items-center gap-3 p-12 text-center">
          <FolderOpen size={36} className="text-dim" />
          <p className="text-muted">لا توجد مشاريع بعد.</p>
          <button onClick={() => navigate('/new')} className="rounded-xl bg-accent-cyan px-5 py-2.5 text-sm font-bold text-[#060b16] hover:brightness-110">
            أنشئ أول مشروع
          </button>
        </GlassCard>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p, i) => {
          const dims = p.options?.orientation === 'vertical' ? 'aspect-[9/16]' : 'aspect-video';
          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
              <GlassCard className="group overflow-hidden">
                <div
                  className={`${dims} relative cursor-pointer bg-gradient-to-br from-bg2 to-bg`}
                  onClick={() => navigate(`/editor/${p.id}`)}
                >
                  {p.thumbnail ? (
                    <img src={`/api/projects/${p.id}/file/${p.thumbnail}`} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <div className="glass-strong grid h-16 w-16 place-items-center rounded-2xl">
                        <Play size={26} className="text-accent-cyan group-hover:scale-110 transition" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 transition group-hover:opacity-100" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-bold">{p.title}</div>
                      <div className="mt-0.5 text-xs text-dim">
                        {durationToLabel(p.durationMs ?? 0)} · {p.options?.style ?? '—'} · {p.status}
                      </div>
                    </div>
                    <button
                      onClick={() => void remove(p.id)}
                      className="shrink-0 grid h-9 w-9 place-items-center rounded-lg text-dim transition hover:bg-accent-rose/15 hover:text-accent-rose"
                      aria-label="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}