import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border p-3.5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success'
              ? 'border-emerald-500/30 bg-slate-950/90 text-emerald-300'
              : toast.type === 'error'
                ? 'border-rose-500/30 bg-slate-950/90 text-rose-300'
                : 'border-amber-500/30 bg-slate-950/90 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            ) : (
              <Info className="h-4 w-4 shrink-0 text-amber-400" />
            )}
            <p className="text-xs font-medium leading-relaxed">{toast.text}</p>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="rounded p-1 text-slate-400 hover:text-white transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
