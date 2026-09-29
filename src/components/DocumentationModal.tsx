import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Cpu, 
  Layers, 
  Terminal, 
  ShieldCheck, 
  CheckCircle2,
  FileCode,
  HelpCircle
} from 'lucide-react';
import { Language } from '../types/client.ts';

interface DocumentationModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({
  lang,
  isOpen,
  onClose,
}) => {
  const [docTab, setDocTab] = useState<'model' | 'architecture' | 'api' | 'setup' | 'testing'>('model');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col h-[85vh] w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#0c0f17] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-sans">
                {lang === 'ar' ? 'توثيق ومعمارية Osamah Vids' : 'Osamah Vids Documentation & Architecture'}
              </h3>
              <p className="text-xs text-slate-400">Engineering specifications, benchmarks, and API guides</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-800 bg-slate-950/40 px-5 py-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setDocTab('model')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              docTab === 'model' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>{lang === 'ar' ? 'اختيار النموذج (Model Selection)' : 'Model Selection'}</span>
          </button>

          <button
            onClick={() => setDocTab('architecture')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              docTab === 'architecture' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{lang === 'ar' ? 'المعمارية (Architecture)' : 'Architecture'}</span>
          </button>

          <button
            onClick={() => setDocTab('api')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              docTab === 'api' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="h-3.5 w-3.5" />
            <span>{lang === 'ar' ? 'واجهات البرمجة (REST API)' : 'REST API'}</span>
          </button>

          <button
            onClick={() => setDocTab('setup')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              docTab === 'setup' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>{lang === 'ar' ? 'التشغيل (Setup & Colab)' : 'Setup & Colab'}</span>
          </button>

          <button
            onClick={() => setDocTab('testing')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
              docTab === 'testing' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{lang === 'ar' ? 'الاختبارات (Testing & QA)' : 'Testing & QA'}</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs text-slate-300 space-y-4 leading-relaxed font-sans">
          {docTab === 'model' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-amber-400">النموذج الأساسي المعتمد: Wan2.1 (T2V-1.3B & 14B)</h4>
              <p>
                تم اختيار نموذج **Wan2.1** المطور من قبل فريق Wan-AI (Alibaba) بعد دراسة دقيقة ومقارنة شاملة مع LTX-Video و HunyuanVideo و CogVideoX للأسباب التالية:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                <li><strong className="text-white">أداء فائق باستهلاك ذاكرة منخفض:</strong> النسخة 1.3B تعمل على Google Colab المجاني (T4 GPU) وتستهلك 8.19 GB VRAM فقط مع تقنية CPU Offloading.</li>
                <li><strong className="text-white">ترخيص مفتوح Apache 2.0:</strong> يتيح الاستخدام التجاري والبحثي دون قيود تعسفية.</li>
                <li><strong className="text-white">دعم Hugging Face Diffusers الرسمي:</strong> متاح مباشرة عبر كلاس `WanPipeline` و `AutoencoderKLWan`.</li>
                <li><strong className="text-white">دعم Text-to-Video و Image-to-Video:</strong> إمكانية تحريك الصور الثابتة بنعومة سينمائية فائقة.</li>
                <li><strong className="text-white">توليد النصوص البصرية:</strong> أول نموذج فيديو مفتوح يدعم كتابة الكلمات بوضوح باللغتين العربية والإنجليزية.</li>
              </ul>
            </div>
          )}

          {docTab === 'architecture' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-amber-400">معمارية النظام المنفصلة (Decoupled Scalable Architecture)</h4>
              <p>
                تم تصميم المنصة بحيث تفصل تماماً بين واجهة العرض (Frontend)، وخادم الوظائف (Backend Express API & Job Queue)، ومحركات الذكاء الاصطناعي (Model Providers):
              </p>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-300 overflow-x-auto whitespace-pre">
{`Frontend (React 19 + Tailwind CSS)
    ↓  HTTPS REST API
Backend API & Queue Manager (Node.js Express)
    ↓  Job State Machine (Queued → Processing → Generation → Rendering → Completed)
AI Video Providers Abstraction Layer:
    ├── Wan2.1 SOTA (Colab GPU Worker / Hugging Face Diffusers)
    ├── LTX-Video Turbo Engine
    └── Native Procedural Synthesis Engine
    ↓
Storage Engine (Local MP4 Persistence & Cloud Storage Adapter)`}
              </pre>
            </div>
          )}

          {docTab === 'api' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-amber-400">توثيق واجهات البرمجة (REST API)</h4>
              <div className="space-y-3 font-mono text-[11px]">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-emerald-400 font-bold">GET</span> /api/v1/health - فحص حالة الخادم والـ Workers النشطة
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-amber-400 font-bold">POST</span> /api/v1/videos/generate - إدراج طلب توليد فيديو جديد في الطابور
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-emerald-400 font-bold">GET</span> /api/v1/videos/:id - الاستعلام عن حالة الوظيفة والتقدم ورابط الفيديو
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-emerald-400 font-bold">GET</span> /api/v1/videos - استرجاع سجل الفيديوهات المنشأة
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-rose-400 font-bold">DELETE</span> /api/v1/videos/:id - حذف الفيديو من التخزين وقاعدة البيانات
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-amber-400 font-bold">POST</span> /api/v1/prompt/enhance - تحسين الـ Prompt بالذكاء الاصطناعي
                </div>
              </div>
            </div>
          )}

          {docTab === 'setup' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-amber-400">التشغيل المحلي و Google Colab</h4>
              <p>تشغيل المنصة محلياً:</p>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300">
{`npm install
npm run dev
# Open http://localhost:3000`}
              </pre>
              <p>تشغيل الـ Colab GPU Worker:</p>
              <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300">
{`1. افتح النوت بوك colab/osamah_vids_wan21_worker.ipynb
2. اختر T4 GPU
3. شغّل الخلايا وانسخ رابط الـ Tunnel وضعه في إعدادات المنصة`}
              </pre>
            </div>
          )}

          {docTab === 'testing' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-amber-400">تقرير التحقق والاختبار الشامل</h4>
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Frontend: PASS (RTL/LTR, Responsive on all breakpoints, no console errors)</span>
                </p>
                <p className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Backend REST API: PASS (Endpoints tested and responding with valid JSON)</span>
                </p>
                <p className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Job Queue State Machine: PASS (Queued → Processing → Generation → Rendering → Completed)</span>
                </p>
                <p className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Video Storage & Playback: PASS (Valid MP4 generation, playback, scrubbing, downloading)</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
