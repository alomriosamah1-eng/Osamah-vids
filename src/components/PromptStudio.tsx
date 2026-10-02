import React, { useState } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Image as ImageIcon, 
  Type, 
  Sliders, 
  UploadCloud, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Film, 
  Camera, 
  Clock, 
  Layers, 
  Check, 
  Zap,
  Info
} from 'lucide-react';
import { 
  AspectRatio, 
  CameraMotion, 
  Language, 
  ModelInfo, 
  Resolution, 
  VideoModelId 
} from '../types/client.ts';
import { PROMPT_PRESETS, translations } from '../locales/translations.ts';

interface PromptStudioProps {
  lang: Language;
  models: ModelInfo[];
  isGenerating: boolean;
  onGenerate: (payload: {
    prompt: string;
    enhancedPrompt?: string;
    negativePrompt?: string;
    model: VideoModelId;
    resolution: Resolution;
    aspectRatio: AspectRatio;
    duration: number;
    fps: number;
    seed?: number;
    cameraMotion: CameraMotion;
    imageUrl?: string;
  }) => void;
  onEnhancePrompt: (prompt: string, cameraMotion: string) => Promise<{ enhancedPrompt: string; negativePrompt: string; cameraMotion: string }>;
  isEnhancing: boolean;
}

export const PromptStudio: React.FC<PromptStudioProps> = ({
  lang,
  models,
  isGenerating,
  onGenerate,
  onEnhancePrompt,
  isEnhancing,
}) => {
  const t = translations[lang];

  // State
  const [mode, setMode] = useState<'t2v' | 'i2v'>('t2v');
  const [prompt, setPrompt] = useState<string>('');
  const [enhancedPrompt, setEnhancedPrompt] = useState<string>('');
  const [showEnhancedView, setShowEnhancedView] = useState<boolean>(false);
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<VideoModelId>('wan2.1-1.3b');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [duration, setDuration] = useState<number>(5);
  const [fps, setFps] = useState<number>(24);
  const [resolution, setResolution] = useState<Resolution>('720p');
  const [cameraMotion, setCameraMotion] = useState<CameraMotion>('drone-cinematic');
  const [seed, setSeed] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Apply a preset
  const applyPreset = (presetId: string) => {
    const preset = PROMPT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setPrompt(lang === 'ar' ? preset.promptAr : preset.promptEn);
    setAspectRatio(preset.aspectRatio);
    setCameraMotion(preset.cameraMotion);
    setSelectedModel(preset.model);
    setEnhancedPrompt('');
  };

  // Handle AI Enhance
  const handleEnhance = async () => {
    if (!prompt.trim() || isEnhancing) return;
    try {
      const result = await onEnhancePrompt(prompt, cameraMotion);
      if (result && result.enhancedPrompt) {
        setEnhancedPrompt(result.enhancedPrompt);
        if (result.negativePrompt) setNegativePrompt(result.negativePrompt);
        setShowEnhancedView(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    onGenerate({
      prompt: prompt.trim(),
      enhancedPrompt: enhancedPrompt.trim() || undefined,
      negativePrompt: negativePrompt.trim() || undefined,
      model: selectedModel,
      resolution,
      aspectRatio,
      duration,
      fps,
      seed: seed ? parseInt(seed, 10) : undefined,
      cameraMotion,
      imageUrl: mode === 'i2v' && imagePreview ? imagePreview : undefined,
    });
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Mode Switcher: Text to Video vs Image to Video */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => setMode('t2v')}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-xs sm:text-sm font-semibold transition-all ${
              mode === 't2v'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Type className="h-4 w-4" />
            <span>{t.tabTextToVideo}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('i2v')}
            className={`flex items-center gap-2 rounded-lg px-5 py-2 text-xs sm:text-sm font-semibold transition-all ${
              mode === 'i2v'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            <span>{t.tabImageToVideo}</span>
          </button>
        </div>
      </div>

      {/* Preset Benchmarks Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            {t.presetsTitle}
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {PROMPT_PRESETS.map(preset => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                preset.id === 'yemeni-coffee'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shadow-sm'
                  : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
              }`}
            >
              {preset.id === 'yemeni-coffee' && '⭐ '}
              {lang === 'ar' ? preset.titleAr : preset.titleEn}
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Card */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 sm:p-6 backdrop-blur-xl shadow-2xl space-y-6">
        
        {/* Image to Video Upload Zone (if active) */}
        {mode === 'i2v' && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">{t.uploadImageTitle}</label>
            {!imagePreview ? (
              <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-slate-950/40 p-6 text-center hover:border-amber-500/50 hover:bg-slate-900/60 cursor-pointer transition">
                <UploadCloud className="h-8 w-8 text-amber-400 mb-2" />
                <p className="text-xs text-slate-300 font-medium">{t.uploadImageTitle}</p>
                <p className="text-[11px] text-slate-500 mt-1">{t.uploadImageSub}</p>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            ) : (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 p-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={imagePreview} alt="Uploaded frame" className="h-16 w-24 object-cover rounded-lg border border-slate-800" />
                  <div>
                    <p className="text-xs font-medium text-slate-200">Initial Keyframe Image Loaded</p>
                    <p className="text-[11px] text-emerald-400">Ready for Wan2.1 I2V diffusion</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="rounded-lg bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500/20 transition"
                  title={t.removeImage}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Prompt Input Area */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>{lang === 'ar' ? 'وصف المشهد (Prompt)' : 'Scene Prompt'}</span>
              <span className="text-rose-400">*</span>
            </label>
            
            {/* AI Enhance Button */}
            <button
              type="button"
              onClick={handleEnhance}
              disabled={!prompt.trim() || isEnhancing}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-gradient-to-r from-amber-500/15 to-orange-500/15 px-3 py-1 text-xs font-semibold text-amber-300 hover:from-amber-500/25 hover:to-orange-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
            >
              <Wand2 className={`h-3.5 w-3.5 text-amber-400 ${isEnhancing ? 'animate-spin' : ''}`} />
              <span>{isEnhancing ? t.enhancingPrompt : t.enhanceWithAI}</span>
            </button>
          </div>

          <div className="relative">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t.promptPlaceholder}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition resize-none leading-relaxed"
            />
            {prompt && (
              <div className="absolute bottom-2.5 right-3 text-[10px] text-slate-500">
                {prompt.length} chars
              </div>
            )}
          </div>

          {/* Enhanced Prompt Display Accordion */}
          {enhancedPrompt && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t.enhancedBadge}
                </span>
                <button
                  type="button"
                  onClick={() => setShowEnhancedView(!showEnhancedView)}
                  className="text-[11px] font-semibold text-amber-300 hover:underline"
                >
                  {showEnhancedView ? t.hideEnhancedPrompt : t.showEnhancedPrompt}
                </button>
              </div>
              {showEnhancedView && (
                <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 leading-relaxed font-mono">
                  {enhancedPrompt}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Model Selection Cards */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-slate-200">{t.modelLabel}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {models.map(model => {
              const unavailable = model.availableOnWorker === false;
              return (
              <button
                key={model.id}
                type="button"
                disabled={unavailable}
                onClick={() => !unavailable && setSelectedModel(model.id)}
                title={unavailable
                  ? (lang === 'ar'
                      ? 'هذا النموذج غير مربوط بعامل GPU ولا يمكن توليده حالياً'
                      : 'This model is not wired into the GPU worker and cannot generate yet')
                  : undefined}
                className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all relative ${
                  unavailable
                    ? 'border-slate-800/60 bg-slate-950/20 opacity-45 cursor-not-allowed'
                    : selectedModel === model.id
                      ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-100">{model.name}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      unavailable
                        ? 'bg-slate-800/60 text-slate-500 border border-slate-700/60'
                        : model.id === 'wan2.1-1.3b'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                    }`}>
                      {unavailable ? (lang === 'ar' ? 'غير متاح' : 'Unavailable') : model.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {lang === 'ar' ? model.descriptionAr : model.descriptionEn}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[10px] text-slate-500">
                  <span className="font-mono text-amber-400/90">{model.vramRequired}</span>
                  <span className="text-slate-400">{model.speedRating}</span>
                </div>
                {selectedModel === model.id && (
                  <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-slate-950">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                )}
              </button>
              );
            })}
          </div>
        </div>

        {/* Video Parameters Row: Aspect Ratio, Resolution, Duration, FPS, Camera Motion */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          
          {/* Aspect Ratio */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-300">{t.aspectRatioLabel}</label>
            <div className="grid grid-cols-3 gap-1">
              {(['16:9', '9:16', '1:1', '4:3', '21:9'] as AspectRatio[]).map(ratio => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectRatio(ratio)}
                  className={`rounded-lg border py-1.5 text-center text-xs font-semibold transition ${
                    aspectRatio === ratio
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-300">{t.resolutionLabel}</label>
            <div className="grid grid-cols-3 gap-1">
              {(['480p', '720p', '1080p'] as Resolution[]).map(res => (
                <button
                  key={res}
                  type="button"
                  onClick={() => setResolution(res)}
                  className={`rounded-lg border py-1.5 text-center text-xs font-semibold transition ${
                    resolution === res
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-300">{t.durationLabel}</label>
            <div className="grid grid-cols-4 gap-1">
              {[3, 5, 8, 10].map(dur => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setDuration(dur)}
                  className={`rounded-lg border py-1.5 text-center text-xs font-semibold transition ${
                    duration === dur
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {dur}s
                </button>
              ))}
            </div>
          </div>

          {/* FPS */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-slate-300">{t.fpsLabel}</label>
            <div className="grid grid-cols-3 gap-1">
              {[16, 24, 30].map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFps(f)}
                  className={`rounded-lg border py-1.5 text-center text-xs font-semibold transition ${
                    fps === f
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f} fps
                </button>
              ))}
            </div>
          </div>

          {/* Camera Motion */}
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-semibold text-slate-300">{t.cameraMotionLabel}</label>
            <select
              value={cameraMotion}
              onChange={(e) => setCameraMotion(e.target.value as CameraMotion)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="drone-cinematic">{t.motionDrone}</option>
              <option value="pan">{t.motionPan}</option>
              <option value="tilt">{t.motionTilt}</option>
              <option value="zoom">{t.motionZoom}</option>
              <option value="orbit">{t.motionOrbit}</option>
              <option value="dolly">{t.motionDolly}</option>
              <option value="static">{t.motionStatic}</option>
            </select>
          </div>
        </div>

        {/* Advanced Accordion: Negative Prompt & Seed */}
        <div className="border-t border-slate-800/80 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>{showAdvanced ? t.hideAdvancedOptions : t.advancedOptions}</span>
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">{t.negativePromptLabel}</label>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder={t.negativePromptPlaceholder}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">{t.seedLabel}</label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder={t.seedPlaceholder}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Main Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!prompt.trim() || isGenerating}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 px-6 py-3.5 text-sm sm:text-base font-bold text-slate-950 shadow-xl shadow-amber-500/20 hover:from-amber-400 hover:via-orange-400 hover:to-rose-500 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.005] active:scale-[0.995] transition duration-200"
          >
            <Film className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? t.generatingButton : t.generateButton}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
