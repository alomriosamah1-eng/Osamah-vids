import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  Film, 
  Cpu, 
  Server, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Video,
  Layers,
  Award
} from 'lucide-react';
import { DocumentationModal } from './components/DocumentationModal.tsx';
import { HistoryVault } from './components/HistoryVault.tsx';
import { JobProgressCard } from './components/JobProgressCard.tsx';
import { ModelBenchmarks } from './components/ModelBenchmarks.tsx';
import { Navbar } from './components/Navbar.tsx';
import { PromptStudio } from './components/PromptStudio.tsx';
import { Toast, ToastMessage } from './components/Toast.tsx';
import { VideoPlayer } from './components/VideoPlayer.tsx';
import { WorkerModal } from './components/WorkerModal.tsx';
import { translations } from './locales/translations.ts';
import { ApiService, GenerateVideoParams } from './services/api.ts';
import { Language, ModelInfo, VideoJob } from './types/client.ts';

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'benchmarks'>('create');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [videos, setVideos] = useState<VideoJob[]>([]);
  const [activeJob, setActiveJob] = useState<VideoJob | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoJob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isWorkerConnected, setIsWorkerConnected] = useState(false);
  const [workerUrl, setWorkerUrl] = useState<string>('');
  
  // Modals
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  
  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const t = translations[lang];

  // Sync RTL / LTR document direction
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  }, [lang]);

  // Add toast helper
  const addToast = (type: 'success' | 'error' | 'info', text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Initial data loading: health, models, videos
  useEffect(() => {
    const initApp = async () => {
      try {
        const [modelsRes, videosRes, healthRes] = await Promise.all([
          ApiService.getModels().catch(() => ({ models: [], benchmarkPrompt: '' })),
          ApiService.getAllVideos().catch(() => ({ total: 0, videos: [] })),
          ApiService.getHealth().catch(() => null),
        ]);

        if (modelsRes && modelsRes.models) {
          setModels(modelsRes.models);
        }
        if (videosRes && videosRes.videos) {
          setVideos(videosRes.videos);
          if (videosRes.videos.length > 0 && !selectedVideo) {
            setSelectedVideo(videosRes.videos[0]);
          }
        }
        if (healthRes && healthRes.remoteWorkerConfigured) {
          setIsWorkerConnected(true);
        }
      } catch (err) {
        console.error('Initial loading error:', err);
      }
    };

    initApp();
  }, []);

  // Poll active video job
  useEffect(() => {
    if (!activeJob || activeJob.status === 'completed' || activeJob.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await ApiService.getVideoJob(activeJob.id);
        setActiveJob(updated);

        if (updated.status === 'completed') {
          setIsGenerating(false);
          setSelectedVideo(updated);
          addToast('success', t.jobCompletedToast);
          // Refresh list
          const all = await ApiService.getAllVideos();
          setVideos(all.videos);
        } else if (updated.status === 'failed') {
          setIsGenerating(false);
          addToast('error', `${t.jobFailedToast}: ${updated.error || ''}`);
        }
      } catch (e) {
        console.error('Job polling error:', e);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [activeJob, t]);

  // Handle Video Generation Trigger
  const handleGenerate = async (payload: GenerateVideoParams) => {
    setIsGenerating(true);
    try {
      addToast('info', t.jobCreatedToast);
      const res = await ApiService.createVideoJob({
        ...payload,
        customWorkerUrl: workerUrl || undefined,
      });
      if (res && res.job) {
        setActiveJob(res.job);
        // Scroll to progress card on mobile
        window.scrollTo({ top: 300, behavior: 'smooth' });
      }
    } catch (err: any) {
      setIsGenerating(false);
      addToast('error', err.message || t.jobFailedToast);
    }
  };

  // Handle AI Prompt Enhancement
  const handleEnhancePrompt = async (prompt: string, cameraMotion: string) => {
    setIsEnhancing(true);
    try {
      const res = await ApiService.enhancePrompt(prompt, 'cinematic-photorealistic', cameraMotion);
      addToast('success', t.enhancedBadge);
      return res;
    } catch (err: any) {
      addToast('error', err.message || 'Enhancement failed');
      throw err;
    } finally {
      setIsEnhancing(false);
    }
  };

  // Handle Delete Video
  const handleDeleteVideo = async (id: string) => {
    try {
      const ok = await ApiService.deleteVideo(id);
      if (ok) {
        setVideos(prev => prev.filter(v => v.id !== id));
        if (selectedVideo?.id === id) {
          const remaining = videos.filter(v => v.id !== id);
          setSelectedVideo(remaining.length > 0 ? remaining[0] : null);
        }
        addToast('success', t.deleteSuccessToast);
      }
    } catch (e) {
      addToast('error', 'Failed to delete video');
    }
  };

  // Handle Save Worker URL
  const handleSaveWorkerUrl = async (url: string | null) => {
    try {
      await ApiService.connectWorker(url);
      setWorkerUrl(url || '');
      setIsWorkerConnected(!!url);
      addToast('success', url ? t.workerConnected : t.workerDisconnected);
    } catch (e) {
      addToast('error', 'Failed to update worker URL');
    }
  };

  return (
    <div className="min-h-screen bg-[#090b10] text-[#f1f5f9] flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Top Navigation */}
      <Navbar
        lang={lang}
        onToggleLang={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenWorkerModal={() => setWorkerModalOpen(true)}
        onOpenDocsModal={() => setDocsModalOpen(true)}
        isWorkerConnected={isWorkerConnected}
        activeJobsCount={activeJob && activeJob.status !== 'completed' && activeJob.status !== 'failed' ? 1 : 0}
      />

      {/* Main Container */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        
        {/* Create Video Tab */}
        {activeTab === 'create' && (
          <div className="space-y-8">
            
            {/* Hero Header */}
            <div className="text-center space-y-3 max-w-3xl mx-auto pt-2 sm:pt-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 px-4 py-1.5 backdrop-blur-md shadow-inner">
                <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                <span className="text-xs font-semibold text-amber-300">
                  {lang === 'ar' ? 'الجيل الأحدث من نماذج الفيديو المفتوحة (Wan2.1 & LTX-Video)' : 'Next-Gen Open Weights SOTA Video Models (Wan2.1 & LTX-Video)'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white font-sans leading-tight">
                {t.tagline}
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
                {t.subTagline}
              </p>
            </div>

            {/* Layout Grid: Left Studio controls, Right Live Player / Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Studio Input Form */}
              <div className="lg:col-span-7 space-y-6">
                <PromptStudio
                  lang={lang}
                  models={models}
                  isGenerating={isGenerating}
                  onGenerate={handleGenerate}
                  onEnhancePrompt={handleEnhancePrompt}
                  isEnhancing={isEnhancing}
                />
              </div>

              {/* Live Preview / Player / Progress Panel */}
              <div className="lg:col-span-5 space-y-6 sticky top-24">
                
                {/* Active Job Progress Card */}
                {activeJob && activeJob.status !== 'completed' && (
                  <JobProgressCard
                    lang={lang}
                    job={activeJob}
                    onRetry={() => activeJob && handleGenerate(activeJob as any)}
                  />
                )}

                {/* Selected / Completed Video Player */}
                {selectedVideo && selectedVideo.videoUrl && (
                  <VideoPlayer
                    lang={lang}
                    job={selectedVideo}
                    onGenerateAgain={(job) => {
                      handleGenerate({
                        prompt: job.prompt,
                        enhancedPrompt: job.enhancedPrompt,
                        negativePrompt: job.negativePrompt,
                        model: job.model,
                        resolution: job.resolution,
                        aspectRatio: job.aspectRatio,
                        duration: job.duration,
                        fps: job.fps,
                        seed: job.seed,
                        cameraMotion: job.cameraMotion,
                      });
                    }}
                    onDelete={handleDeleteVideo}
                    onCopyPrompt={(txt) => addToast('success', t.promptCopied)}
                  />
                )}

                {/* If no video generated yet */}
                {!selectedVideo && (!activeJob || activeJob.status === 'completed') && (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-10 text-center space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-500">
                      <Film className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-200">
                        {lang === 'ar' ? 'استوديو العرض المباشر' : 'Live Output Studio'}
                      </h3>
                      <p className="text-xs text-slate-500 max-w-xs mt-1">
                        {lang === 'ar' ? 'سيظهر الفيديو المولد هنا فور اكتمال معالجته بواسطة النموذج.' : 'Your generated video will appear here as soon as synthesis completes.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History Vault Tab */}
        {activeTab === 'history' && (
          <HistoryVault
            lang={lang}
            videos={videos}
            onSelectVideo={(v) => {
              setSelectedVideo(v);
              setActiveTab('create');
            }}
            onDeleteVideo={handleDeleteVideo}
            onReusePrompt={(v) => {
              setSelectedVideo(v);
              setActiveTab('create');
            }}
          />
        )}

        {/* Benchmarks Tab */}
        {activeTab === 'benchmarks' && (
          <ModelBenchmarks lang={lang} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#06080c] py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Osamah Vids</span>
            <span>•</span>
            <span>AI Video Generation Architecture</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Wan2.1 (1.3B & 14B)</span>
            <span>LTX-Video 0.9.5</span>
            <span>Apache 2.0 Open Weights</span>
          </div>
        </div>
      </footer>

      {/* Modals & Toasts */}
      <WorkerModal
        lang={lang}
        isOpen={workerModalOpen}
        onClose={() => setWorkerModalOpen(false)}
        workerUrl={workerUrl}
        onSaveWorkerUrl={handleSaveWorkerUrl}
        isConnected={isWorkerConnected}
      />

      <DocumentationModal
        lang={lang}
        isOpen={docsModalOpen}
        onClose={() => setDocsModalOpen(false)}
      />

      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
