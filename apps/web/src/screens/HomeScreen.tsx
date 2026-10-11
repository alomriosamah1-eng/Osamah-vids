import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FolderOpen, Clock3, Play, Video, CheckCircle2 } from 'lucide-react';
import { useProjects } from '@/features/projects/store';
import { durationToLabel } from '@osamah/core';
import { GlassCard } from '@/components/ui/GlassCard';

export function HomeScreen() {
  const { projects, loading, fetch } = useProjects();
  const navigate = useNavigate();

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const stats = useMemo(() => {
    const totalMs = projects.reduce((a, p) => a + (p.durationMs ?? 0), 0);
    const ready = projects.filter((p) => p.status === 'ready').length;
    const generating = projects.filter((p) => ['queued', 'generating', 'rendering'].includes(p.status)).length;
    return { total: projects.length, ready, generating, totalMs };
  }, [projects]);

  const cards = [
    { label: 'المشاريع', value: stats.total, icon: FolderOpen, tint: 'from-amber/20 to-rose/10', accent: 'text-accent-amber' },
    { label: 'جاهزة للتصدير', value: stats.ready, icon: CheckCircle2, tint: 'from-emerald/20 to-cyan/10', accent: 'text-accent-emerald' },
    { label: 'قيد الإنتاج', value: stats.generating, icon: Video, tint: 'from-cyan/20 to-violet/10', accent: 'text-accent-cyan' },
    { label: 'إجمالي الوقت', value: durationToLabel(stats.totalMs), icon: Clock3, tint: 'from-violet/20 to-amber/10', accent: 'text-accent-violet' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="glass p-8" style={{ backgroundImage: 'radial-gradient(80% 120% at 90% 0%, rgba(76,234,255,.13), transparent 60%), radial-gradient(60% 100% at 10% 100%, rgba(173,144,255,.13), transparent 60%)' }}>
        <div className="max-w-2xl">
          <h1 className="text-3xl font-black leading-tight">
            مرحبًا بك في <span className="text-accent-cyan">Osamah vids ai</span>
          </h1>
          <p className="mt-3 text-muted">
            اكتب فكرتك، واختر الإعدادات، وشاهد الوكيل يبني الفيديو مشهدًا مشهدًا في محرر حيّ — من البرومبت إلى MP4 دون مغادرة التطبيق.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => navigate('/new')} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-accent-cyan to-accent-violet px-5 py-3 text-sm font-bold text-[#060b16] shadow-lg shadow-accent-cyan/20 transition hover:brightness-110">
              <Plus size={18} /> مشروع جديد
            </button>
            <Link to="/projects" className="inline-flex items-center gap-2 rounded-xl bg-glass px-5 py-3 text-sm font-semibold text-muted ring-1 ring-brd transition hover:text-ink hover:bg-glass-strong">
              <FolderOpen size={17} /> استعراض المشاريع
            </Link>
          </div>
        </div>
      </motion.section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
            <GlassCard className="flex items-center gap-4 p-5">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${c.tint}`}>
                <c.icon size={22} className={c.accent} />
              </div>
              <div>
                <div className="text-2xl font-black">{loading ? '—' : c.value}</div>
                <div className="text-xs text-dim">{c.label}</div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">آخر المشاريع</h2>
          <Link to="/projects" className="text-sm text-accent-cyan hover:underline">عرض الكل</Link>
        </div>
        {projects.length === 0 ? (
          <GlassCard className="flex flex-col items-center gap-3 p-10 text-center">
            <Play size={30} className="text-dim" />
            <p className="text-muted">لا توجد مشاريع بعد. ابدأ مشروعك الأول الآن.</p>
            <button onClick={() => navigate('/new')} className="rounded-xl bg-accent-cyan px-4 py-2 text-sm font-bold text-[#060b16] hover:brightness-110">ابدأ</button>
          </GlassCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((p) => (
              <GlassCard key={p.id} className="group cursor-pointer p-4 transition hover:bg-glass-strong" onClick={() => navigate(`/editor/${p.id}`)}>
                <div className="flex items-center justify-between">
                  <span className="truncate font-bold">{p.title}</span>
                  <StatusDot status={p.status} />
                </div>
                <div className="mt-2 text-xs text-dim">
                  {durationToLabel(p.durationMs ?? 0)} · {p.options?.style ?? '—'}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { dot: string; label: string }> = {
    ready: { dot: 'bg-accent-emerald', label: 'جاهز' },
    generating: { dot: 'bg-accent-amber animate-pulse', label: 'يُنتج' },
    rendering: { dot: 'bg-accent-cyan animate-pulse', label: 'يُصيّر' },
    queued: { dot: 'bg-accent-violet', label: 'في الانتظار' },
    failed: { dot: 'bg-accent-rose', label: 'فشل' },
    draft: { dot: 'bg-dim', label: 'مسودة' },
  };
  const m = map[status] ?? map.draft!;
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-dim">
      <span className={`h-2 w-2 rounded-full ${m.dot}`} /> {m.label}
    </span>
  );
}