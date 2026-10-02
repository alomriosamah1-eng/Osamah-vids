import React, { useState } from 'react';
import { 
  X, 
  Server, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Terminal,
  Cpu,
  Zap
} from 'lucide-react';
import { Language } from '../types/client.ts';
import { translations } from '../locales/translations.ts';

interface WorkerModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  workerUrl: string;
  onSaveWorkerUrl: (url: string | null) => Promise<void>;
  isConnected: boolean;
}

export const WorkerModal: React.FC<WorkerModalProps> = ({
  lang,
  isOpen,
  onClose,
  workerUrl,
  onSaveWorkerUrl,
  isConnected,
}) => {
  const t = translations[lang];
  const [urlInput, setUrlInput] = useState(workerUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedColab, setCopiedColab] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await onSaveWorkerUrl(urlInput.trim() || null);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to connect the worker');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setIsSaving(true);
    setError(null);
    try {
      setUrlInput('');
      await onSaveWorkerUrl(null);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to disconnect the worker');
    } finally {
      setIsSaving(false);
    }
  };

  const colabCommand = `!pip install -q -r https://raw.githubusercontent.com/alomriosamah1-eng/Osamah-vids/main/colab/requirements.txt
!git clone --depth 1 https://github.com/alomriosamah1-eng/Osamah-vids.git /content/osamah-vids
!python /content/osamah-vids/colab/worker.py

# then in a second cell, expose the tunnel and copy the URL:
!pip install -q pyngrok
!ngrok config set-authtoken <YOUR_NGROK_TOKEN>
!ngrok http 8000`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-[#0c0f17] p-6 shadow-2xl space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{t.workerModalTitle}</h3>
              <p className="text-xs text-slate-400">{t.workerModalDesc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Steps to run on Google Colab */}
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5" />
              <span>{lang === 'ar' ? 'تشغيل كولاب المجاني (Google Colab T4/A100 GPU):' : 'Run on Google Colab (Free T4/A100 GPU):'}</span>
            </span>
            <a
              href="https://colab.research.google.com/github/alomriosamah1-eng/Osamah-vids/blob/main/colab/osamah_vids_wan21_worker.ipynb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F9AB00]/15 hover:bg-[#F9AB00]/25 px-2.5 py-1 text-xs font-bold text-[#F9AB00] border border-[#F9AB00]/30 transition shadow-sm"
            >
              <span>{lang === 'ar' ? 'فتح في Google Colab بنقرة واحدة' : 'Open in Google Colab'}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300">
            <p>{t.step1Colab}</p>
            <p>{t.step2Colab}</p>
            <p>{t.step3Colab}</p>
          </div>

          <div className="relative rounded-lg bg-slate-900 p-2.5 font-mono text-[11px] text-slate-300 mt-2 border border-slate-800">
            <pre className="overflow-x-auto whitespace-pre-wrap">{colabCommand}</pre>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(colabCommand);
                setCopiedColab(true);
                setTimeout(() => setCopiedColab(false), 2000);
              }}
              className="absolute top-2 right-2 rounded bg-slate-800 p-1 text-slate-400 hover:text-white"
              title="Copy Code"
            >
              {copiedColab ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Worker URL Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-200">{t.workerUrlLabel}</label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={t.workerUrlPlaceholder}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <p className="text-xs leading-relaxed text-rose-200">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
            {isConnected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isSaving}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
              >
                {t.disconnectWorker}
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20 transition"
              >
                {isSaving ? '...' : t.connectWorker}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
