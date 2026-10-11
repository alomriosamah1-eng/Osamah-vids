import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Cpu, Check, RefreshCw, Zap, Wifi, WifiOff, Loader2, ShieldCheck, KeyRound, Sparkles, PlugZap, ShieldAlert,
} from 'lucide-react';
import { useModels } from '@/features/models/store';
import type { ModelInfo, ProbeResult } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/cn';

const KIND_LABEL: Record<string, string> = {
  chat: 'محادثة', embedding: 'تضمين', image: 'صور', tts: 'نطق', video: 'فيديو', music: 'موسيقى', other: 'أخرى',
};

export function ModelsPanel() {
  const m = useModels();

  useEffect(() => {
    void m.fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ModelInfo[]>();
    for (const model of m.models) {
      const arr = map.get(model.provider) ?? [];
      arr.push(model);
      map.set(model.provider, arr);
    }
    return [...map.entries()].map(([provider, list]) => ({
      provider,
      list: list.sort((a, b) => (a.supportsText === b.supportsText ? a.id.localeCompare(b.id) : a.supportsText ? -1 : 1)),
    }));
  }, [m.models]);

  const selectedInfo = m.models.find((x) => x.id === m.selected);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="me-auto">
          <h2 className="flex items-center gap-2 text-xl font-black"><Cpu className="text-accent-cyan" /> نماذج opencode</h2>
          <p className="text-sm text-dim">القائمة الكاملة لنماذج opencode مع مؤشر حالة حقيقي لكل نموذج. اختر نموذجك أو دع النظام يختار تلقائيًا من المتصل.</p>
        </div>
        <button
          onClick={() => void m.autoSelect()}
          disabled={!m.auto}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-accent-cyan/25 to-accent-violet/20 px-3.5 py-2 text-sm font-bold text-ink ring-1 ring-brd-hi transition hover:brightness-110 disabled:opacity-50"
        >
          <Zap size={16} className="text-accent-cyan" /> اختيار تلقائي
        </button>
        <button
          onClick={() => void m.fetch({ refresh: true })}
          className="flex items-center gap-2 rounded-xl bg-glass px-3.5 py-2 text-sm font-semibold text-muted ring-1 ring-brd transition hover:text-ink"
        >
          <RefreshCw size={16} className={cn(m.loading && 'animate-spin')} /> تحديث
        </button>
      </div>

      <GlassCard className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck size={16} className="text-accent-emerald" />
          <span className="text-muted">مزوّدو الخدمة المتصلون:</span>
          {m.providers.length === 0 && m.localProviders.length === 0 && <span className="text-dim">لا يوجد</span>}
          {[...m.providers, ...m.localProviders].map((p) => (
            <span key={p} className="flex items-center gap-1.5 rounded-lg bg-glass px-2 py-1 text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-accent-emerald shadow-[0_0_8px] shadow-accent-emerald" /> {p}
            </span>
          ))}
        </div>
        <span className="text-xs text-dim">الإجمالي: <b className="text-muted">{m.total}</b> · متصل: <b className="text-accent-emerald">{m.connectedCount}</b></span>
        <label className="ms-auto flex cursor-pointer items-center gap-2 text-xs text-dim">
          <input type="checkbox" checked={!m.showAll} onChange={(e) => m.setShowAll(!e.target.checked)} className="accent-accent-cyan" />
          المتصل فقط
        </label>
      </GlassCard>

      {selectedInfo && (
        <GlassCard className={cn('flex flex-wrap items-center gap-4 p-4 ring-1', selectedInfo.connected ? 'ring-accent-emerald/40' : 'ring-accent-amber/40')}>
          <PlugZap size={20} className="text-accent-cyan" />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-dim">النموذج المختار</div>
            <div className="truncate font-black">{selectedInfo.id}</div>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <ConnBadge info={selectedInfo} probe={m.probes[selectedInfo.id]} probing={!!m.probing[selectedInfo.id]} />
            <TestBtn id={selectedInfo.id} probing={!!m.probing[selectedInfo.id]} onTest={() => void m.test(selectedInfo.id)} />
          </div>
        </GlassCard>
      )}

      {m.error && <div className="rounded-xl bg-accent-rose/15 px-4 py-3 text-sm text-accent-rose">{m.error}</div>}

      {m.loading && m.models.length === 0 && (
        <GlassCard className="flex items-center gap-3 p-8 text-muted"><Loader2 className="animate-spin" size={18} /> جارٍ تحميل النماذج…</GlassCard>
      )}

      <div className="space-y-4">
        {grouped.map(({ provider, list }, gi) => (
          <motion.div key={provider} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.04 }}>
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="text-xs font-black uppercase tracking-wider text-muted">{provider}</span>
              <span className="rounded bg-glass px-2 py-0.5 text-[11px] text-dim">{list.length}</span>
            </div>
            <GlassCard className="divide-y divide-brd overflow-hidden">
              {list.map((info) => {
                const isSel = info.id === m.selected;
                const selectable = info.connected && info.supportsText;
                return (
                  <button
                    key={info.id}
                    disabled={!selectable}
                    onClick={() => selectable && void m.select(info.id)}
                    className={cn('flex w-full items-center gap-3 px-4 py-3 text-right transition', selectable ? 'hover:bg-glass-strong' : 'cursor-not-allowed opacity-60')}
                  >
                    <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full ring-1', isSel ? 'bg-accent-cyan text-bg ring-accent-cyan' : 'ring-brd')}>
                      {isSel && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-bold">{info.name}</span>
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', info.kind === 'chat' ? 'bg-accent-cyan/15 text-accent-cyan' : 'bg-glass text-dim')}>
                          {KIND_LABEL[info.kind] ?? info.kind}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-dim">{info.id}</span>
                    </span>
                    <ConnBadge info={info} probe={m.probes[info.id]} probing={!!m.probing[info.id]} />
                    {info.connected && info.supportsText && (
                      <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); void m.test(info.id); }}>
                        <TestBtn id={info.id} probing={!!m.probing[info.id]} onTest={() => {}} />
                      </div>
                    )}
                  </button>
                );
              })}
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ConnBadge({ info, probe, probing }: { info: ModelInfo; probe?: ProbeResult | { id: string; ok: null; ms: 0 }; probing: boolean }) {
  if (probing) {
    return <span className="flex items-center gap-1.5 rounded-lg bg-glass px-2.5 py-1 text-xs font-bold text-muted"><Loader2 size={13} className="animate-spin" /> اختبار…</span>;
  }
  if (probe && probe.ok === false) {
    return <span className="flex items-center gap-1.5 rounded-lg bg-accent-rose/15 px-2.5 py-1 text-xs font-bold text-accent-rose"><WifiOff size={13} /> تعذّر الاتصال</span>;
  }
  if (probe && probe.ok === true) {
    return <span className="flex items-center gap-1.5 rounded-lg bg-accent-emerald/15 px-2.5 py-1 text-xs font-bold text-accent-emerald"><Wifi size={13} /> متصل · {(probe.ms / 1000).toFixed(1)}ث</span>;
  }
  if (info.status === 'restricted') {
    return <span className="flex items-center gap-1.5 rounded-lg bg-accent-amber/15 px-2.5 py-1 text-xs font-bold text-accent-amber" title={info.note}><ShieldAlert size={13} /> داخل OpenCode فقط</span>;
  }
  if (info.status === 'offline') {
    return <span className="flex items-center gap-1.5 rounded-lg bg-glass px-2.5 py-1 text-xs font-bold text-dim" title={info.note}><WifiOff size={13} /> غير مشغّل</span>;
  }
  if (info.status === 'no-key') {
    return <span className="flex items-center gap-1.5 rounded-lg bg-glass px-2.5 py-1 text-xs font-bold text-dim"><KeyRound size={13} /> يتطلب مفتاح</span>;
  }
  return (
    <span className="flex items-center gap-1.5 rounded-lg bg-accent-emerald/10 px-2.5 py-1 text-xs font-bold text-accent-emerald">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-emerald opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-emerald" />
      </span>
      متصل
    </span>
  );
}

function TestBtn({ probing, onTest }: { id: string; probing: boolean; onTest: () => void }) {
  return (
    <button
      onClick={onTest}
      disabled={probing}
      className="flex items-center gap-1.5 rounded-lg bg-glass px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-brd transition hover:text-ink disabled:opacity-50"
    >
      {probing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} اختبار
    </button>
  );
}
