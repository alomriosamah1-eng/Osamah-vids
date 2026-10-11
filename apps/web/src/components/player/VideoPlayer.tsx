import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, Volume1, VolumeX,
  Maximize, Minimize, X, Gauge, MonitorPlay, RotateCcw, RotateCw,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ProjectSummary } from '@/features/projects/store';

type FitMode = 'fit' | 'cover' | 'stretch';
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const QUALITIES = ['720p', '1080p', '1440p'];

function fileUrl(p: ProjectSummary) {
  return `/api/projects/${p.id}/file/out/final.mp4`;
}
function fmt(t: number) {
  if (!Number.isFinite(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoPlayer({
  items, index, onIndexChange, onClose, onOpened,
}: {
  items: ProjectSummary[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onOpened?: (id: string) => void;
}) {
  const current = items[index];
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [fit, setFit] = useState<FitMode>('fit');
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [quality, setQuality] = useState('1080p');

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
    v.playbackRate = speed;
  }, [volume, muted, speed, current?.id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setTime(0);
    setDur(0);
    setPlaying(true);
    const p = v.play();
    if (p) p.catch(() => setPlaying(false));
    if (current) onOpened?.(current.id);
  }, [current?.id]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { void v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }, []);

  const seek = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0);
  }, []);

  const go = useCallback((dir: number) => {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    onIndexChange(next);
  }, [index, items.length, onIndexChange]);

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen();
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'ArrowLeft': seek(-5); break;
        case 'ArrowRight': seek(5); break;
        case 'ArrowUp': e.preventDefault(); setVolume((v) => Math.min(1, v + 0.1)); setMuted(false); break;
        case 'ArrowDown': e.preventDefault(); setVolume((v) => Math.max(0, v - 0.1)); break;
        case 'm': case 'M': setMuted((m) => !m); break;
        case 'n': case 'N': go(1); break;
        case 'p': case 'P': go(-1); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'Escape': if (!document.fullscreenElement) onClose(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, seek, go, toggleFullscreen, onClose]);

  const onTime = () => {
    const v = videoRef.current;
    if (!v) return;
    setTime(v.currentTime);
    setDur(v.duration || 0);
    if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
  };

  const pct = dur ? (time / dur) * 100 : 0;
  const bufPct = dur ? (buffered / dur) * 100 : 0;

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          ref={wrapRef}
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="glass-strong flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-brd px-5 py-3">
            <MonitorPlay size={18} className="text-accent-cyan" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{current?.title ?? '—'}</div>
              <div className="text-[11px] text-dim">{current?.options?.style} · {current?.options?.quality}</div>
            </div>
            <span className="rounded-full bg-glass px-3 py-1 text-xs font-bold text-muted ring-1 ring-brd">{index + 1} / {items.length}</span>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-accent-rose/15 hover:text-accent-rose" aria-label="إغلاق">
              <X size={18} />
            </button>
          </div>

          <div className="relative min-h-0 flex-1 bg-black">
            {current && (
              <video
                ref={videoRef}
                key={current.id}
                src={fileUrl(current)}
                className="h-full w-full"
                style={{ objectFit: fit === 'stretch' ? 'fill' : fit === 'fit' ? 'contain' : 'cover' }}
                playsInline
                onTimeUpdate={onTime}
                onLoadedMetadata={onTime}
                onEnded={() => setPlaying(false)}
                onClick={togglePlay}
              />
            )}
            {items.length > 1 && (
              <>
                <button onClick={() => go(-1)} disabled={index === 0} className="absolute left-3 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70 disabled:opacity-25" aria-label="السابق">
                  <SkipBack size={22} />
                </button>
                <button onClick={() => go(1)} disabled={index === items.length - 1} className="absolute right-3 top-1/2 -translate-y-1/2 grid h-12 w-12 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70 disabled:opacity-25" aria-label="التالي">
                  <SkipForward size={22} />
                </button>
              </>
            )}
          </div>

          <div className="space-y-2 border-t border-brd px-5 py-3">
            <div
              className="group relative h-2 w-full cursor-pointer rounded-full bg-white/10"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const ratio = 1 - (e.clientX - r.left) / r.width;
                const v = videoRef.current;
                if (v && dur) v.currentTime = ratio * dur;
              }}
            >
              <div className="absolute inset-y-0 right-0 rounded-full bg-white/20" style={{ width: `${bufPct}%` }} />
              <div className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-accent-cyan to-accent-violet" style={{ width: `${pct}%` }} />
              <div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow" style={{ right: `calc(${pct}% - 8px)` }} />
            </div>

            <div className="flex items-center gap-3 text-muted">
              <button onClick={() => go(-1)} disabled={index === 0} className="hover:text-ink disabled:opacity-30" aria-label="السابق"><SkipBack size={20} /></button>
              <button onClick={togglePlay} className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-l from-accent-cyan to-accent-violet text-[#060b16] shadow-lg transition hover:brightness-110" aria-label="تشغيل/إيقاف">
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button onClick={() => go(1)} disabled={index === items.length - 1} className="hover:text-ink disabled:opacity-30" aria-label="التالي"><SkipForward size={20} /></button>
              <button onClick={() => seek(-5)} className="hover:text-ink" aria-label="خلف 5 ثوان"><RotateCcw size={18} /></button>
              <button onClick={() => seek(5)} className="hover:text-ink" aria-label="قدّم 5 ثوان"><RotateCw size={18} /></button>

              <span className="ms-1 font-mono text-xs tabular-nums text-dim">{fmt(time)} / {fmt(dur)}</span>

              <div className="ms-auto flex items-center gap-3">
                {/* volume */}
                <div className="group flex items-center gap-1">
                  <button onClick={() => setMuted((m) => !m)} className="hover:text-ink" aria-label="كتم">
                    <VolumeIcon size={20} />
                  </button>
                  <input
                    type="range" min={0} max={1} step={0.01}
                    value={muted ? 0 : volume}
                    onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }}
                    className="h-1.5 w-0 opacity-0 transition-all duration-200 group-hover:w-20 group-hover:opacity-100"
                  />
                </div>

                {/* speed */}
                <div className="relative">
                  <button onClick={() => { setShowSpeed((s) => !s); setShowQuality(false); }} className="flex items-center gap-1 text-xs font-bold hover:text-ink" aria-label="السرعة">
                    <Gauge size={18} /> {speed}×
                  </button>
                  {showSpeed && (
                    <div className="absolute bottom-9 right-0 z-10 w-28 overflow-hidden rounded-xl glass-strong">
                      {SPEEDS.map((s) => (
                        <button key={s} onClick={() => { setSpeed(s); setShowSpeed(false); }} className={cn('block w-full px-3 py-2 text-right text-sm hover:bg-glass-strong', s === speed && 'text-accent-cyan font-bold')}>
                          {s}×
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* quality */}
                <div className="relative">
                  <button onClick={() => { setShowQuality((q) => !q); setShowSpeed(false); }} className="rounded-md bg-glass px-2 py-1 text-xs font-bold ring-1 ring-brd hover:text-ink" aria-label="الجودة">
                    {quality}
                  </button>
                  {showQuality && (
                    <div className="absolute bottom-9 right-0 z-10 w-24 overflow-hidden rounded-xl glass-strong">
                      {QUALITIES.map((q) => (
                        <button key={q} onClick={() => { setQuality(q); setShowQuality(false); }} className={cn('block w-full px-3 py-2 text-right text-sm hover:bg-glass-strong', q === quality && 'text-accent-cyan font-bold')}>
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* fit mode */}
                <button
                  onClick={() => setFit((f) => (f === 'fit' ? 'cover' : f === 'cover' ? 'stretch' : 'fit'))}
                  className="rounded-md bg-glass px-2 py-1 text-xs font-bold ring-1 ring-brd hover:text-ink"
                  aria-label="وضع العرض"
                >
                  {fit === 'fit' ? 'ملاءمة' : fit === 'cover' ? 'ملء' : 'تمدد'}
                </button>

                <button onClick={toggleFullscreen} className="hover:text-ink" aria-label="ملء الشاشة">
                  {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}