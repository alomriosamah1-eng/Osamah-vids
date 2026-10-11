import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Type, Timer, MonitorSmartphone, Palette, Mic2, Gauge, Loader2 } from 'lucide-react';
import type { ComponentType } from 'react';
import { useProjects } from '@/features/projects/store';
import { cn } from '@/lib/cn';
import { GlassCard } from '@/components/ui/GlassCard';

const STYLES = ['وثائقي', 'تعليمي', 'تاريخي', 'إعلامي', 'علمي', 'تحفيزي', 'شروحات'];
const QUALITIES = [
  { id: '720p', label: '720p' },
  { id: '1080p', label: '1080p' },
  { id: '1440p', label: '2K' },
];

export function NewProjectScreen() {
  const navigate = useNavigate();
  const { create } = useProjects();

  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(60); // seconds, step 10
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [style, setStyle] = useState('وثائقي');
  const [voice, setVoice] = useState<'male' | 'female'>('male');
  const [quality, setQuality] = useState('1080p');
  const [captions, setCaptions] = useState(true);
  const [music, setMusic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const mm = Math.floor(duration / 60);
  const ss = duration % 60;
  const durationLabel = `${mm}:${String(ss).padStart(2, '0')}`;

  async function submit() {
    if (!prompt.trim()) return setErr('اكتب وصفًا للفيديو أولًا.');
    setSubmitting(true);
    setErr('');
    try {
      const r = await create({
        prompt,
        title: prompt.slice(0, 40),
        options: { durationSeconds: duration, orientation, style, voice, quality, captions, music },
      });
      navigate(`/editor/${r.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setSubmitting(false);
    }
  }

  const Label = ({ icon: Icon, text }: { icon: ComponentType<{ size?: number; className?: string }>; text: string }) => (
    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-muted">
      <Icon size={16} className="text-accent-cyan" /> {text}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black">مشروع جديد</h1>
        <p className="text-sm text-dim">صف الفيديو الذي تريده، واختر الإعدادات — ثم شغّل «توليد الفيديو».</p>
      </motion.div>

      <GlassCard className="space-y-6 p-6">
        {/* prompt */}
        <div>
          <Label icon={Type} text="فكرتك / البرومبت" />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="مثال: فيلم وثائقي قصير عن تطور الإنترنت خلال 30 عامًا، بأرقام مفاجئة وتأثير تقني حديث…"
            className="w-full resize-none rounded-xl bg-glass p-4 text-ink outline-none ring-1 ring-brd transition placeholder:text-dim focus:ring-brd-hi"
          />
        </div>

        {/* duration slider */}
        <div>
          <Label icon={Timer} text="مدة الفيديو" />
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={10}
              max={3600}
              step={10}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="h-2 flex-1"
            />
            <div className="glass-strong w-28 px-3 py-2 text-center font-mono text-lg font-bold">{durationLabel}</div>
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-dim">
            <span>10 ثوانٍ</span><span>60 دقيقة</span>
          </div>
        </div>

        {/* orientation */}
        <div>
          <Label icon={MonitorSmartphone} text="اتجاه الفيديو" />
          <div className="flex gap-3">
            {(['horizontal', 'vertical'] as const).map((o) => (
              <button
                key={o}
                onClick={() => setOrientation(o)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold ring-1 transition',
                  orientation === o ? 'bg-accent-cyan/20 ring-accent-cyan text-ink' : 'bg-glass ring-brd text-muted hover:text-ink',
                )}
              >
                <span className={cn('rounded ring-1 ring-current', o === 'horizontal' ? 'h-4 w-8' : 'h-8 w-4')} />
                {o === 'horizontal' ? 'أفقي' : 'عمودي'}
              </button>
            ))}
          </div>
        </div>

        {/* style */}
        <div>
          <Label icon={Palette} text="أسلوب التصميم والإخراج" />
          <div className="flex flex-wrap gap-2">
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition',
                  style === s ? 'bg-gradient-to-l from-accent-cyan/25 to-accent-violet/25 ring-accent-cyan text-ink' : 'bg-glass ring-brd text-muted hover:text-ink',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* voice */}
        <div>
          <Label icon={Mic2} text="صوت التعليق" />
          <div className="flex gap-3">
            {([
              { id: 'male', label: 'ذكر', hint: 'همام' },
              { id: 'female', label: 'أنثى', hint: 'زارية' },
            ] as const).map((v) => (
              <button
                key={v.id}
                onClick={() => setVoice(v.id)}
                className={cn(
                  'flex-1 rounded-xl px-4 py-3 text-center font-semibold ring-1 transition',
                  voice === v.id ? 'bg-accent-violet/20 ring-accent-violet text-ink' : 'bg-glass ring-brd text-muted hover:text-ink',
                )}
              >
                <div>{v.label}</div>
                <div className="text-[11px] text-dim">صوت {v.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {/* quality */}
        <div>
          <Label icon={Gauge} text="جودة الفيديو" />
          <div className="flex gap-3">
            {QUALITIES.map((q) => (
              <button
                key={q.id}
                onClick={() => setQuality(q.id)}
                className={cn(
                  'flex-1 rounded-xl px-4 py-2.5 font-semibold ring-1 transition',
                  quality === q.id ? 'bg-accent-amber/20 ring-accent-amber text-ink' : 'bg-glass ring-brd text-muted hover:text-ink',
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* toggles */}
        <div className="flex flex-wrap gap-3">
          <Toggle checked={captions} onChange={setCaptions} label="شاشة الترجمات" />
          <Toggle checked={music} onChange={setMusic} label="موسيقى خلفية" />
        </div>

        {err && <p className="text-sm text-accent-rose">{err}</p>}

        <button
          onClick={() => void submit()}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-accent-cyan to-accent-violet px-6 py-4 text-base font-black text-[#060b16] shadow-xl shadow-accent-cyan/25 transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
          {submitting ? 'جارٍ إرسال الطلب…' : 'توليد الفيديو'}
        </button>
      </GlassCard>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 rounded-xl bg-glass px-4 py-2 text-sm font-semibold text-muted ring-1 ring-brd transition hover:text-ink"
    >
      <span className={cn('relative h-5 w-9 rounded-full transition', checked ? 'bg-accent-cyan' : 'bg-dim/40')}>
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all', checked ? 'right-0.5' : 'right-4')} />
      </span>
      {label}
    </button>
  );
}