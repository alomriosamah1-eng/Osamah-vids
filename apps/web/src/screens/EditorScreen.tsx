import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ArrowRight, Send, MonitorPlay, RefreshCw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useProjects } from '@/features/projects/store';
import { connectSse, type LiveEvent } from '@/lib/sse';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { GlassCard } from '@/components/ui/GlassCard';
import { durationToLabel } from '@osamah/core';

interface SceneClip {
  id: string;
  index: number;
  status: 'pending' | 'generating' | 'ready' | 'error';
  title?: string;
  durMs?: number;
}

export function EditorScreen() {
  const { id = '' } = useParams();
  const { live, pushEvent, clearLive } = useProjects();
  const [meta, setMeta] = useState<unknown>(null);
  const [sceneClips, setSceneClips] = useState<SceneClip[]>([]);
  const [renderFrame, setRenderFrame] = useState<{ frame: number; total: number } | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [errored, setErrored] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [sending, setSending] = useState(false);
  const events = live[id] ?? [];
  const tailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let h: { close: () => void } | null = null;
    clearLive(id);
    api.getProject(id).then((m) => setMeta(m)).catch(() => {});
    const handle = connectSse(id, (ev: LiveEvent) => {
      pushEvent(id, ev);
      dispatch(ev);
    });
    h = handle;
    return () => { h?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function dispatch(ev: LiveEvent) {
    switch (ev.type) {
      case 'stage_started':
        setActiveStage(String(ev.stage));
        break;
      case 'scene_started': {
        const sceneId = String(ev.sceneId);
        setSceneClips((prev) => {
          if (prev.some((c) => c.id === sceneId)) return prev.map((c) => (c.id === sceneId ? { ...c, status: 'generating' } : c));
          return [...prev, { id: sceneId, index: prev.length, status: 'generating' }];
        });
        break;
      }
      case 'scene_generated': {
        const sceneId = String(ev.sceneId);
        setSceneClips((prev) =>
          prev.map((c) => (c.id === sceneId ? { ...c, title: (ev.spec as { title?: string })?.title ?? c.title, status: 'generating' } : c)),
        );
        break;
      }
      case 'scene_rendered': {
        const sceneId = String(ev.sceneId);
        setSceneClips((prev) => prev.map((c) => (c.id === sceneId ? { ...c, status: 'ready' } : c)));
        break;
      }
      case 'render_progress':
        setRenderFrame({ frame: Number(ev.frame), total: Number(ev.total) });
        break;
      case 'qc_result':
        setActiveStage((ev as unknown as { ok: boolean }).ok ? 'export' : 'qc');
        break;
      case 'done':
        setDone(true);
        setActiveStage(null);
        break;
      case 'error':
        setErrored(String(ev.message ?? ev.stage));
        break;
    }
  }

  useEffect(() => {
    tailRef.current?.scrollTo({ top: tailRef.current.scrollHeight, behavior: 'smooth' });
  }, [events.length]);

  const stageProgress = useMemo(() => {
    const ready = sceneClips.filter((c) => c.status === 'ready').length;
    const total = Math.max(sceneClips.length, 1);
    return Math.round((ready / total) * 100);
  }, [sceneClips]);

  const project = meta as { id?: string; title?: string; options?: { orientation?: string; durationSeconds?: number; style?: string; quality?: string }; status?: string } | null;

  async function sendInstruction() {
    if (!instruction.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/projects/${id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      });
      setInstruction('');
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/projects" className="grid h-9 w-9 place-items-center rounded-lg text-muted ring-1 ring-brd hover:text-ink">
          <ArrowRight size={17} />
        </Link>
        <div>
          <h1 className="text-lg font-black leading-tight">{project?.title ?? 'المحرر'}</h1>
          <div className="text-xs text-dim">
            {project ? `${project.options?.style ?? '—'} · ${durationToLabel((project.options?.durationSeconds ?? 0) * 1000)} · ${project.options?.quality ?? ''} · ${project.options?.orientation === 'vertical' ? 'عمودي' : 'أفقي'}` : 'جارٍ التحميل…'}
          </div>
        </div>
        <StatusChip done={done} error={errored} activeStage={activeStage} projectStatus={project?.status} />
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* preview */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <GlassCard className={cn('relative grid flex-1 place-items-center overflow-hidden p-3', project?.options?.orientation === 'vertical' ? 'flex-col' : '')}>
            <div className={cn('relative overflow-hidden rounded-xl bg-black/70', project?.options?.orientation === 'vertical' ? 'h-full aspect-[9/16]' : 'w-full overflow-hidden')}>
              {project?.options?.orientation === 'horizontal' ? (
                <div className="aspect-video w-full" />
              ) : null}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-dim">
                {done ? <CheckCircle2 size={34} className="text-accent-emerald" /> : <MonitorPlay size={30} />}
                <span className="text-sm font-bold text-muted">
                  {done ? 'اكتمل الفيديو' : renderFrame ? `جارٍ التسجيل… ${Math.round((renderFrame.frame / renderFrame.total) * 100)}%` : activeStage ? `المرحلة: ${activeStage}` : 'بانتظار الإنتاج…'}
                </span>
                {renderFrame && (
                  <div className="h-1.5 w-2/3 overflow-hidden rounded-full bg-black/50">
                    <motion.div className="h-full bg-gradient-to-l from-accent-cyan to-accent-violet" animate={{ width: `${(renderFrame.frame / renderFrame.total) * 100}%` }} />
                  </div>
                )}
              </div>
            </div>
            {done && project?.id && (
              <a
                href={`/api/projects/${project.id}/file/out/final.mp4`}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 -translate-y-1 rounded-xl bg-accent-emerald px-5 py-2.5 text-sm font-bold text-[#062] shadow-lg hover:brightness-110"
              >
                تشغيل / تحميل MP4
              </a>
            )}
          </GlassCard>
        </div>

        {/* timeline + agent panel */}
        <div className="flex w-[420px] shrink-0 flex-col gap-3">
          <GlassCard className="p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-bold">الخط الزمني الحيّ</span>
              <span className="text-dim">{stageProgress}%</span>
            </div>
            {/* scenes track */}
            <TrackRow label="المشاهد" icon="🎬">
              <div className="flex gap-2">
                {sceneClips.length === 0 && <span className="text-[11px] text-dim">لا مشاهد بعد</span>}
                {sceneClips.map((c) => (
                  <Clip key={c.id} clip={c} />
                ))}
              </div>
            </TrackRow>
            <TrackRow label="التعليق الصوتي" icon="🎙️">
              <div className="flex gap-2">
                {sceneClips.map((c) => (
                  <div key={c.id} className={cn('h-8 w-20 rounded-md bg-gradient-to-b from-violet/40 to-violet/15 ring-1 ring-accent-violet/30', c.status === 'ready' && 'from-emerald/40 to-emerald/10')} />
                ))}
              </div>
            </TrackRow>
            <TrackRow label="الموسيقى" icon="🎵">
              <div className="h-8 w-full rounded-md bg-gradient-to-r from-amber/30 via-amber/10 to-amber/30 ring-1 ring-accent-amber/25" />
            </TrackRow>
            <TrackRow label="الترجمات" icon="💬">
              <div className="flex gap-2">
                {sceneClips.map((c) => (
                  <div key={c.id} className="h-8 w-20 rounded-md bg-cyan/15 ring-1 ring-accent-cyan/25" />
                ))}
              </div>
            </TrackRow>
          </GlassCard>

          {/* agent instructions */}
          <GlassCard className="flex flex-1 flex-col p-4">
            <div className="mb-2 text-sm font-bold">تعليمات للوكيل</div>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={2}
              placeholder="مثال: اجعل المشهد الثالث أبطأ وأضف رقمًا كبيرًا…"
              className="w-full resize-none rounded-xl bg-glass p-3 text-sm ring-1 ring-brd outline-none placeholder:text-dim focus:ring-brd-hi"
            />
            <button onClick={() => void sendInstruction()} disabled={sending || !instruction.trim()} className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-accent-violet px-4 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50">
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} إرسال التعديل
            </button>
            <div ref={tailRef} className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto rounded-xl bg-black/25 p-2 text-[11px] font-mono">
              {events.length === 0 && <div className="text-dim">بانتظار أحداث الإنتاج…</div>}
              {events.map((e, i) => (
                <div key={i} className="text-muted">
                  <span className="text-accent-cyan">{e.type}</span>
                  {'sceneId' in e && <span className="text-dim"> [{String((e as { sceneId?: unknown }).sceneId)}]</span>}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function TrackRow({ label, icon, children }: { label: string; icon: string; children: ReactNode }) {
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-muted">
        <span>{icon}</span> {label}
      </div>
      <div className="flex min-h-[40px] items-center gap-2 overflow-x-auto rounded-lg bg-black/20 p-2">{children}</div>
    </div>
  );
}

function Clip({ clip }: { clip: SceneClip }) {
  return (
    <motion.div
      layout
      className={cn(
        'relative h-10 w-24 shrink-0 rounded-lg p-1.5 text-[10px] font-bold ring-1 transition',
        clip.status === 'pending' && 'bg-dim/10 text-dim ring-brd',
        clip.status === 'generating' && 'bg-amber/10 text-accent-amber ring-accent-amber animate-pulse',
        clip.status === 'ready' && 'bg-emerald/10 text-accent-emerald ring-accent-emerald',
        clip.status === 'error' && 'bg-rose/10 text-accent-rose ring-accent-rose',
      )}
      title={clip.title ?? clip.id}
    >
      <div className="truncate">{clip.title ?? clip.id}</div>
      <div className="absolute bottom-1 left-1.5">{clip.status === 'ready' ? '✓' : clip.status === 'error' ? '✗' : '·'}</div>
    </motion.div>
  );
}

function StatusChip({ done, error, activeStage, projectStatus }: { done: boolean; error: string | null; activeStage: string | null; projectStatus?: string }) {
  if (error) return <span className="rounded-full bg-accent-rose/15 px-3 py-1 text-xs font-bold text-accent-rose ring-1 ring-accent-rose/40">فشل</span>;
  if (done) return <span className="rounded-full bg-accent-emerald/15 px-3 py-1 text-xs font-bold text-accent-emerald ring-1 ring-accent-emerald/40">جاهز ✓</span>;
  if (activeStage || projectStatus === 'generating' || projectStatus === 'rendering')
    return <span className="flex items-center gap-1.5 rounded-full bg-accent-amber/15 px-3 py-1 text-xs font-bold text-accent-amber ring-1 ring-accent-amber/40"><span className="h-2 w-2 animate-pulse rounded-full bg-accent-amber" /> {activeStage ?? 'يُنتج…'}</span>;
  return <span className="rounded-full bg-dim/20 px-3 py-1 text-xs font-bold text-dim ring-1 ring-brd">{projectStatus ?? '—'}</span>;
}