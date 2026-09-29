import React, { useEffect, useState } from 'react';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Cpu, 
  Layers, 
  Film, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Language, VideoJob } from '../types/client.ts';
import { translations } from '../locales/translations.ts';

interface JobProgressCardProps {
  lang: Language;
  job: VideoJob;
  onRetry?: () => void;
}

export const JobProgressCard: React.FC<JobProgressCardProps> = ({
  lang,
  job,
  onRetry,
}) => {
  const t = translations[lang];
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    if (job.status === 'completed' || job.status === 'failed') return;
    const start = job.startedAt || job.createdAt;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [job.status, job.startedAt, job.createdAt]);

  const stages = [
    { key: 'queued', label: t.statusQueued, icon: Clock },
    { key: 'processing', label: t.statusProcessing, icon: Cpu },
    { key: 'generation', label: t.statusGeneration, icon: Sparkles },
    { key: 'rendering', label: t.statusRendering, icon: Film },
  ];

  const getStageIndex = (status: string) => {
    switch (status) {
      case 'queued': return 0;
      case 'processing': return 1;
      case 'generation': return 2;
      case 'rendering': return 3;
      case 'completed': return 4;
      default: return 0;
    }
  };

  const currentIndex = getStageIndex(job.status);

  return (
    <div className="w-full rounded-2xl border border-amber-500/30 bg-slate-900/80 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-5 animate-in fade-in duration-300">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {job.status === 'failed' ? (
              <AlertCircle className="h-5 w-5 text-rose-400" />
            ) : job.status === 'completed' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">
                {job.status === 'completed' 
                  ? t.statusCompleted 
                  : job.status === 'failed' 
                    ? t.statusFailed 
                    : job.stepDescription || t.generatingButton}
              </span>
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-amber-400">
                {job.model}
              </span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5 font-mono">
              ID: {job.id} • {job.resolution} • {job.aspectRatio} • {job.duration}s
            </p>
          </div>
        </div>

        {/* Timer Counter */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 w-fit">
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span>{elapsed}s elapsed</span>
          {job.progress > 0 && <span className="text-amber-400 font-bold">({job.progress}%)</span>}
        </div>
      </div>

      {/* Multi-stage Milestones Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stages.map((stage, idx) => {
          const isPassed = currentIndex > idx;
          const isCurrent = currentIndex === idx;
          const Icon = stage.icon;

          return (
            <div
              key={stage.key}
              className={`flex items-center gap-2.5 rounded-xl border p-2.5 transition-all ${
                isCurrent
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-md shadow-amber-500/10'
                  : isPassed
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                    : 'border-slate-800/80 bg-slate-950/40 text-slate-500'
              }`}
            >
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                isCurrent ? 'bg-amber-500 text-slate-950 animate-pulse' : isPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
              }`}>
                {isPassed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className="text-[11px] font-semibold truncate">{stage.label}</span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-300">{job.stepDescription || 'Processing video synthesis...'}</span>
          <span className="font-mono text-amber-400 font-bold">{job.progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              job.status === 'failed' 
                ? 'bg-rose-500' 
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 shadow-lg shadow-amber-500/50'
            }`}
            style={{ width: `${Math.max(job.progress, 5)}%` }}
          />
        </div>
      </div>

      {/* Error state details */}
      {job.status === 'failed' && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{job.error || 'Generation failed. Check worker status or memory limits.'}</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
