import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutGrid, List, Play, Film, ArrowDownUp, HardDrive, Clock3, MonitorPlay, Trash2, Pencil,
} from 'lucide-react';
import { useProjects, type ProjectSummary } from '@/features/projects/store';
import { GlassCard } from '@/components/ui/GlassCard';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { durationToLabel } from '@osamah/core';
import { cn } from '@/lib/cn';

type SortKey = 'size' | 'name' | 'createdDesc' | 'createdAsc' | 'lastOpened';
type ViewMode = 'grid' | 'list';

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'lastOpened', label: 'آخر فتح' },
  { id: 'createdDesc', label: 'الأحدث إنشاءً' },
  { id: 'createdAsc', label: 'الأقدم إنشاءً' },
  { id: 'size', label: 'الحجم (الأكبر)' },
  { id: 'name', label: 'الاسم (أ-ي)' },
];

export function GalleryScreen() {
  const { projects, loading, fetch, remove, open } = useProjects();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewMode>(() => (localStorage.getItem('gallery-view') as ViewMode) || 'grid');
  const [sort, setSort] = useState<SortKey>(() => (localStorage.getItem('gallery-sort') as SortKey) || 'createdDesc');
  const [playIndex, setPlayIndex] = useState<number | null>(null);

  useEffect(() => {
    void fetch();
  }, [fetch]);
  useEffect(() => { localStorage.setItem('gallery-view', view); }, [view]);
  useEffect(() => { localStorage.setItem('gallery-sort', sort); }, [sort]);

  const ready = useMemo(() => projects.filter((p) => p.status === 'ready'), [projects]);

  const videos = useMemo(() => {
    const list = [...ready];
    switch (sort) {
      case 'size': return list.sort((a, b) => (b.sizeMb ?? 0) - (a.sizeMb ?? 0));
      case 'name': return list.sort((a, b) => a.title.localeCompare(b.title, 'ar'));
      case 'createdAsc': return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case 'lastOpened': return list.sort((a, b) => (b.lastOpened ?? '').localeCompare(a.lastOpened ?? ''));
      case 'createdDesc':
      default: return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }, [ready, sort]);

  async function play(i: number, p: ProjectSummary) {
    setPlayIndex(i);
    try { await open(p.id); } catch { /* ignore */ }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3">
        <div className="me-auto">
          <h1 className="flex items-center gap-2 text-2xl font-black"><Film className="text-accent-cyan" /> المعرض</h1>
          <p className="text-sm text-dim">{ready.length} فيديو جاهز{ready.length > 1 ? 'ة' : ''} للإنتاج</p>
        </div>
        <SortMenu sort={sort} setSort={setSort} />
        <ViewToggle view={view} setView={setView} />
      </motion.div>

      {loading && <div className="text-muted">جارٍ التحميل…</div>}

      {!loading && ready.length === 0 && (
        <GlassCard className="flex flex-col items-center gap-3 p-14 text-center">
          <Film size={38} className="text-dim" />
          <p className="text-muted">لا توجد فيديوهات جاهزة بعد. أنشئ مشروعًا ودع الوكيل ينهيه.</p>
        </GlassCard>
      )}

      {view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
              <GlassCard className="group overflow-hidden">
                <div className={cn('relative cursor-pointer bg-gradient-to-br from-bg2 to-bg', p.options?.orientation === 'vertical' ? 'aspect-[9/16]' : 'aspect-video')} onClick={() => void play(i, p)}>
                  {p.thumbnail ? (
                    <img src={`/api/projects/${p.id}/file/${p.thumbnail}`} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <div className="glass-strong grid h-16 w-16 place-items-center rounded-2xl transition group-hover:scale-110">
                        <Play size={26} className="text-accent-cyan" />
                      </div>
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">{durationToLabel(p.durationMs ?? 0)}</span>
                  {p.sizeMb != null && <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur">{p.sizeMb} MB</span>}
                </div>
                <div className="flex items-start justify-between gap-2 p-4">
                  <div className="min-w-0">
                    <div className="truncate font-bold">{p.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-dim">
                      <Clock3 size={12} /> {new Date(p.createdAt).toLocaleDateString('ar')} · {p.options?.quality ?? ''}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconBtn label="تحرير" onClick={() => navigate(`/editor/${p.id}`)}><Pencil size={15} /></IconBtn>
                    <IconBtn label="حذف" danger onClick={() => void remove(p.id)}><Trash2 size={15} /></IconBtn>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      ) : (
        <GlassCard className="divide-y divide-brd overflow-hidden">
          {videos.map((p, i) => (
            <div key={p.id} className="group flex items-center gap-4 px-4 py-3 transition hover:bg-glass-strong">
              <button onClick={() => void play(i, p)} className="relative grid h-14 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-bg2 to-bg">
                <Play size={20} className="text-accent-cyan transition group-hover:scale-110" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{p.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-dim">
                  <span><Clock3 size={11} className="inline" /> {durationToLabel(p.durationMs ?? 0)}</span>
                  {p.sizeMb != null && <span><HardDrive size={11} className="inline" /> {p.sizeMb} MB</span>}
                  <span>{new Date(p.createdAt).toLocaleDateString('ar')}</span>
                  <span className="rounded bg-glass px-2 py-0.5">{p.options?.quality ?? '—'}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <IconBtn label="فتح" onClick={() => void play(i, p)}><MonitorPlay size={16} /></IconBtn>
                <IconBtn label="تحرير" onClick={() => navigate(`/editor/${p.id}`)}><Pencil size={16} /></IconBtn>
                <IconBtn label="حذف" danger onClick={() => void remove(p.id)}><Trash2 size={16} /></IconBtn>
              </div>
            </div>
          ))}
        </GlassCard>
      )}

      {playIndex !== null && videos[playIndex] && (
        <VideoPlayer
          items={videos}
          index={playIndex}
          onIndexChange={setPlayIndex}
          onClose={() => setPlayIndex(null)}
          onOpened={(id) => void open(id)}
        />
      )}
    </div>
  );
}

function ViewToggle({ view, setView }: { view: ViewMode; setView: (v: ViewMode) => void }) {
  return (
    <div className="flex overflow-hidden rounded-xl bg-glass ring-1 ring-brd">
      <button onClick={() => setView('grid')} className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition', view === 'grid' ? 'bg-accent-cyan/20 text-ink' : 'text-muted hover:text-ink')} aria-label="شبكة">
        <LayoutGrid size={16} /> شبكة
      </button>
      <button onClick={() => setView('list')} className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-semibold transition', view === 'list' ? 'bg-accent-cyan/20 text-ink' : 'text-muted hover:text-ink')} aria-label="قائمة">
        <List size={16} /> قائمة
      </button>
    </div>
  );
}

function SortMenu({ sort, setSort }: { sort: SortKey; setSort: (s: SortKey) => void }) {
  const [open, setOpen] = useState(false);
  const current = SORTS.find((s) => s.id === sort);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-xl bg-glass px-3 py-2 text-sm font-semibold text-muted ring-1 ring-brd transition hover:text-ink">
        <ArrowDownUp size={16} /> {current?.label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="glass-strong absolute left-0 top-11 z-20 w-44 overflow-hidden">
            {SORTS.map((s) => (
              <button key={s.id} onClick={() => { setSort(s.id); setOpen(false); }} className={cn('block w-full px-4 py-2.5 text-right text-sm transition hover:bg-glass-strong', s.id === sort && 'font-bold text-accent-cyan')}>
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, label, danger }: { children: ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn('grid h-8 w-8 place-items-center rounded-lg text-dim transition', danger ? 'hover:bg-accent-rose/15 hover:text-accent-rose' : 'hover:bg-glass-strong hover:text-ink')}
    >
      {children}
    </button>
  );
}