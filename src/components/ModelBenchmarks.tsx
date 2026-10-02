import React from 'react';
import { 
  Cpu, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  Layers, 
  Award,
  Terminal
} from 'lucide-react';
import { Language } from '../types/client.ts';
import { translations } from '../locales/translations.ts';

interface ModelBenchmarksProps {
  lang: Language;
}

export const ModelBenchmarks: React.FC<ModelBenchmarksProps> = ({ lang }) => {
  const t = translations[lang];

  const benchmarkData = [
    {
      name: 'Wan2.1 (T2V-1.3B)',
      creator: 'Wan-AI (Alibaba)',
      repo: 'Wan-AI/Wan2.1-T2V-1.3B-Diffusers',
      hfUrl: 'https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B-Diffusers',
      license: 'Apache 2.0',
      vram: '~6-8 GB (Low VRAM Offload)',
      colabT4: 'YES (Full Native Support)',
      resolution: '480p / 720p',
      fps: '16 / 24 FPS',
      genSpeed: '~3.5 min (Colab T4) / 40s (4090)',
      rating: '9.6 / 10',
      status: 'Selected Primary SOTA',
      isPrimary: true,
    },
    {
      name: 'Wan2.1 (T2V-14B Cinema)',
      creator: 'Wan-AI (Alibaba)',
      repo: 'Wan-AI/Wan2.1-T2V-14B-Diffusers',
      hfUrl: 'https://huggingface.co/Wan-AI/Wan2.1-T2V-14B-Diffusers',
      license: 'Apache 2.0',
      vram: '24GB+ (FP8 / A100)',
      colabT4: 'Requires A100 / High-RAM',
      resolution: '720p / 1080p Cinema',
      fps: '24 FPS',
      genSpeed: '~45s (A100 GPU)',
      rating: '9.8 / 10',
      status: 'Flagship Cinema Tier',
      isPrimary: false,
    },
    {
      name: 'LTX-Video (0.9.5)',
      creator: 'Lightricks',
      repo: 'Lightricks/LTX-Video',
      hfUrl: 'https://huggingface.co/Lightricks/LTX-Video',
      license: 'Apache 2.0',
      vram: '~12 GB VRAM',
      colabT4: 'YES (Optimized DiT)',
      resolution: '768x512 / 480p',
      fps: '24 / 30 FPS',
      genSpeed: '~20s (RTX 4090)',
      rating: '8.8 / 10',
      status: 'Selected Turbo Engine',
      isPrimary: false,
    },
    {
      name: 'HunyuanVideo (13B)',
      creator: 'Tencent',
      repo: 'tencent/HunyuanVideo',
      hfUrl: 'https://huggingface.co/tencent/HunyuanVideo',
      license: 'Apache 2.0',
      vram: '~32 GB VRAM',
      colabT4: 'Requires High-RAM Cloud GPU',
      resolution: '720p / 1080p',
      fps: '24 FPS',
      genSpeed: '~8 min (A100)',
      rating: '8.9 / 10',
      status: 'Supported Cloud Model',
      isPrimary: false,
    },
    {
      name: 'CogVideoX-5B',
      creator: 'THUDM / Zhipu AI',
      repo: 'THUDM/CogVideoX-5B',
      hfUrl: 'https://huggingface.co/THUDM/CogVideoX-5B',
      license: 'Apache 2.0',
      vram: '~16-18 GB VRAM',
      colabT4: 'Needs Sequential Offloading',
      resolution: '720p',
      fps: '16 / 24 FPS',
      genSpeed: '~2.5 min (RTX 4090)',
      rating: '8.2 / 10',
      status: 'Supported Model',
      isPrimary: false,
    },
  ];

  return (
    <div className="w-full space-y-6">
      
      {/* Hero Banner */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 p-6 backdrop-blur-xl space-y-3">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
          <Award className="h-4 w-4" />
          <span>OFFICIAL SOTA SELECTION & BENCHMARK</span>
        </div>
        <h2 className="text-xl font-bold text-slate-100 font-sans">{t.benchmarkTitle}</h2>
        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">{t.benchmarkSub}</p>
      </div>

      {/* Benchmark Prompt Showcase */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
            <Terminal className="h-3.5 w-3.5 text-amber-400" />
            <span>Benchmark Unified Test Prompt (Yemeni Coffee Farm)</span>
          </span>
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-300">
            Standard Evaluation Protocol
          </span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-slate-300 leading-relaxed">
          &quot;A cinematic realistic aerial shot of a Yemeni coffee farm at sunrise, with detailed coffee trees, mountains in the background, soft golden sunlight, realistic camera movement, natural atmosphere, cinematic composition.&quot;
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-4">Model & Creator</th>
              <th className="p-4">License</th>
              <th className="p-4">Min VRAM</th>
              <th className="p-4">Google Colab T4</th>
              <th className="p-4">Max Resolution</th>
              <th className="p-4">Quality Score</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {benchmarkData.map((item, idx) => (
              <tr 
                key={idx} 
                className={`hover:bg-slate-800/40 transition ${
                  item.isPrimary ? 'bg-amber-500/5 font-semibold' : ''
                }`}
              >
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">{item.name}</span>
                        {item.isPrimary && (
                          <span className="rounded bg-amber-500 text-[9px] font-bold text-slate-950 px-1.5 py-0.5">
                            SELECTED SOTA
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">{item.creator}</span>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-mono text-emerald-400">{item.license}</td>
                <td className="p-4 font-mono text-amber-300">{item.vram}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    item.colabT4.startsWith('YES')
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.colabT4}
                  </span>
                </td>
                <td className="p-4 font-mono">{item.resolution}</td>
                <td className="p-4">
                  <span className="font-bold text-amber-400">{item.rating}</span>
                </td>
                <td className="p-4">
                  <a
                    href={item.hfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:border-amber-500 hover:text-amber-400 transition"
                  >
                    <span>Hugging Face</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
