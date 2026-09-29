import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Maximize, 
  Download, 
  Copy, 
  Check, 
  Trash2, 
  Sparkles, 
  RefreshCw, 
  Sliders, 
  Cpu, 
  Layers, 
  Film, 
  Volume2, 
  VolumeX,
  Share2
} from 'lucide-react';
import { Language, VideoJob } from '../types/client.ts';
import { translations } from '../locales/translations.ts';

interface VideoPlayerProps {
  lang: Language;
  job: VideoJob;
  onGenerateAgain?: (job: VideoJob) => void;
  onCreateVariation?: (job: VideoJob) => void;
  onDelete?: (id: string) => void;
  onCopyPrompt?: (text: string) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  lang,
  job,
  onGenerateAgain,
  onCreateVariation,
  onDelete,
  onCopyPrompt,
}) => {
  const t = translations[lang];
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(job.duration || 5);
  const [isLooping, setIsLooping] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };
    const handleEnded = () => {
      if (!isLooping) setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [isLooping]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen().catch(err => console.error(err));
    }
  };

  const handleCopy = () => {
    const textToCopy = job.enhancedPrompt || job.prompt;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    if (onCopyPrompt) onCopyPrompt(textToCopy);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!job.videoUrl) return;
    const a = document.createElement('a');
    a.href = job.videoUrl;
    a.download = `osamah_vids_${job.model}_${job.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Video Container */}
      <div 
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-950 shadow-2xl group transition-all"
      >
        <video
          ref={videoRef}
          src={job.videoUrl}
          poster={job.thumbnailUrl}
          autoPlay
          loop={isLooping}
          muted={isMuted}
          playsInline
          onClick={togglePlay}
          className="w-full h-auto max-h-[650px] object-contain mx-auto cursor-pointer bg-black"
        />

        {/* Center Play Overlay Icon when paused */}
        {!isPlaying && (
          <div 
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer backdrop-blur-[2px] transition"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-2xl shadow-amber-500/50 hover:scale-110 transition duration-200">
              <Play className="h-8 w-8 ml-1 fill-current" />
            </div>
          </div>
        )}

        {/* Video Controls Bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/70 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          
          {/* Progress Scrubber */}
          <div className="flex items-center gap-3 mb-2">
            <input
              type="range"
              min="0"
              max={duration || 1}
              step="0.05"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:h-2 transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-200">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="p-1 text-slate-200 hover:text-amber-400 transition"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsLooping(!isLooping)}
                className={`p-1 transition ${isLooping ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
                title={t.loop}
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>

              <span className="font-mono text-[11px] text-slate-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Playback Speed selector */}
              <div className="flex items-center gap-1 rounded bg-slate-900/80 px-2 py-0.5 border border-slate-800">
                {[0.5, 1, 1.5, 2].map(speed => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => changeSpeed(speed)}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      playbackRate === speed ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1 text-slate-200 hover:text-amber-400 transition"
                title={t.fullscreen}
              >
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-[0.99] transition"
        >
          <Download className="h-4 w-4" />
          <span>{t.downloadVideo}</span>
        </button>

        {onGenerateAgain && (
          <button
            type="button"
            onClick={() => onGenerateAgain(job)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs sm:text-sm font-bold text-slate-200 hover:border-slate-600 hover:bg-slate-800 transition"
          >
            <RefreshCw className="h-4 w-4 text-amber-400" />
            <span>{t.generateAgain}</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs sm:text-sm font-bold text-slate-200 hover:border-slate-600 hover:bg-slate-800 transition"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-amber-400" />}
          <span>{copied ? t.promptCopied : t.copyPrompt}</span>
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t.confirmDelete)) {
                onDelete(job.id);
              }
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-rose-300 hover:bg-rose-500/20 transition"
          >
            <Trash2 className="h-4 w-4 text-rose-400" />
            <span>{t.deleteVideo}</span>
          </button>
        )}
      </div>

      {/* Production Specs & Metadata Inspector */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Cpu className="h-4 w-4 text-amber-400" />
            <span>{t.videoDetails}</span>
          </div>
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
            Status: COMPLETED
          </span>
        </div>

        {/* Prompt details */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400">{lang === 'ar' ? 'الوصف المستخدم:' : 'Prompt Used:'}</span>
          <p className="text-xs text-slate-200 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed font-sans">
            {job.enhancedPrompt || job.prompt}
          </p>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5 space-y-0.5">
            <span className="text-[10px] text-slate-400">{t.modelUsed}</span>
            <p className="text-xs font-bold text-amber-400 truncate">{job.model}</p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5 space-y-0.5">
            <span className="text-[10px] text-slate-400">{t.resolutionUsed}</span>
            <p className="text-xs font-bold text-slate-200">{job.resolution} ({job.aspectRatio})</p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5 space-y-0.5">
            <span className="text-[10px] text-slate-400">{t.genTimeUsed}</span>
            <p className="text-xs font-bold text-slate-200">{job.generationTimeSec || 0}s</p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5 space-y-0.5">
            <span className="text-[10px] text-slate-400">{t.vramUsed}</span>
            <p className="text-xs font-bold text-slate-200">{job.vramPeakGB || 8.19} GB</p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5 space-y-0.5">
            <span className="text-[10px] text-slate-400">{t.fpsUsed}</span>
            <p className="text-xs font-bold text-slate-200">{job.fps} FPS</p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5 space-y-0.5">
            <span className="text-[10px] text-slate-400">{t.durationUsed}</span>
            <p className="text-xs font-bold text-slate-200">{job.duration}s</p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5 space-y-0.5">
            <span className="text-[10px] text-slate-400">{t.seedUsed}</span>
            <p className="text-xs font-mono font-bold text-slate-200">{job.seed}</p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5 space-y-0.5">
            <span className="text-[10px] text-slate-400">{t.fileSize}</span>
            <p className="text-xs font-bold text-slate-200">
              {job.fileSizeBytes ? `${(job.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
