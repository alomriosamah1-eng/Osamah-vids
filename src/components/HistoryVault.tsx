import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Play, 
  Download, 
  Trash2, 
  Copy, 
  Check, 
  Clock, 
  Cpu, 
  Film, 
  Sparkles,
  SlidersHorizontal,
  Grid,
  List
} from 'lucide-react';
import { Language, VideoJob } from '../types/client.ts';
import { translations } from '../locales/translations.ts';

interface HistoryVaultProps {
  lang: Language;
  videos: VideoJob[];
  onSelectVideo: (video: VideoJob) => void;
  onDeleteVideo: (id: string) => void;
  onReusePrompt: (video: VideoJob) => void;
}

export const HistoryVault: React.FC<HistoryVaultProps> = ({
  lang,
  videos,
  onSelectVideo,
  onDeleteVideo,
  onReusePrompt,
}) => {
  const t = translations[lang];
  const [search, setSearch] = useState('');
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredVideos = videos.filter(v => {
    const matchesSearch = !search || 
      v.prompt.toLowerCase().includes(search.toLowerCase()) ||
      (v.enhancedPrompt && v.enhancedPrompt.toLowerCase().includes(search.toLowerCase())) ||
      v.model.toLowerCase().includes(search.toLowerCase());
    const matchesModel = selectedModelFilter === 'all' || v.model === selectedModelFilter;
    return matchesSearch && matchesModel;
  });

  const totalVideos = videos.length;
  const avgGenTime = totalVideos > 0
    ? Math.round(videos.reduce((acc, curr) => acc + (curr.generationTimeSec || 0), 0) / totalVideos)
    : 0;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Header & Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-xl flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Film className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">{t.totalGenerated}</p>
            <p className="text-xl font-bold text-slate-100 font-sans">{totalVideos} videos</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-xl flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">{t.avgGenTime}</p>
            <p className="text-xl font-bold text-slate-100 font-sans">{avgGenTime}s</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-xl flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Primary Model</p>
            <p className="text-base font-bold text-emerald-400 font-sans">Wan2.1 (1.3B SOTA)</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/40 p-3.5 backdrop-blur-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchHistory}
            className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Model Filter */}
          <select
            value={selectedModelFilter}
            onChange={(e) => setSelectedModelFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300 focus:border-amber-500 focus:outline-none"
          >
            <option value="all">{t.filterAll}</option>
            <option value="wan2.1-1.3b">Wan2.1 (1.3B)</option>
            <option value="wan2.1-14b">Wan2.1 (14B)</option>
            <option value="ltx-video">LTX-Video</option>
            <option value="hunyuan-video">HunyuanVideo</option>
          </select>

          {/* View mode toggle */}
          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Videos List / Grid */}
      {filteredVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center">
          <Film className="h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-300">{t.historyTitle}</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">{t.emptyHistory}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map(video => (
            <div
              key={video.id}
              className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-amber-500/50 hover:bg-slate-900/80 transition duration-200 shadow-xl"
            >
              {/* Thumbnail with hover play overlay */}
              <div 
                onClick={() => onSelectVideo(video)}
                className="relative aspect-video w-full cursor-pointer overflow-hidden bg-slate-950"
              >
                {video.videoUrl ? (
                  <video
                    src={video.videoUrl}
                    poster={video.thumbnailUrl}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    muted
                    loop
                    onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                    onMouseLeave={(e) => (e.target as HTMLVideoElement).pause()}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-950">
                    <Film className="h-8 w-8 text-slate-700" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-lg">
                    <Play className="h-5 w-5 ml-0.5 fill-current" />
                  </div>
                </div>
                <div className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-mono text-amber-400 backdrop-blur-sm">
                  {video.model}
                </div>
                <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-mono text-slate-300 backdrop-blur-sm">
                  {video.duration}s • {video.resolution}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <p 
                  onClick={() => onSelectVideo(video)}
                  className="text-xs text-slate-200 font-medium line-clamp-2 cursor-pointer hover:text-amber-400 transition leading-relaxed"
                >
                  {video.enhancedPrompt || video.prompt}
                </p>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
                  <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(video.id, video.enhancedPrompt || video.prompt)}
                      className="rounded p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                      title={t.copyPrompt}
                    >
                      {copiedId === video.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => onReusePrompt(video)}
                      className="rounded p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                      title={t.generateAgain}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(t.confirmDelete)) onDeleteVideo(video.id);
                      }}
                      className="rounded p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      title={t.deleteVideo}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-slate-800 rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden backdrop-blur-xl">
          {filteredVideos.map(video => (
            <div key={video.id} className="flex items-center justify-between p-4 hover:bg-slate-800/30 transition">
              <div className="flex items-center gap-3">
                <div 
                  onClick={() => onSelectVideo(video)}
                  className="relative h-14 w-24 shrink-0 rounded-lg overflow-hidden bg-slate-950 cursor-pointer"
                >
                  <video src={video.videoUrl} poster={video.thumbnailUrl} className="h-full w-full object-cover" muted />
                </div>
                <div>
                  <p 
                    onClick={() => onSelectVideo(video)}
                    className="text-xs font-semibold text-slate-200 line-clamp-1 cursor-pointer hover:text-amber-400 transition"
                  >
                    {video.enhancedPrompt || video.prompt}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {video.model} • {video.resolution} • {video.duration}s • {video.generationTimeSec || 0}s gen
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectVideo(video)}
                  className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition"
                >
                  {t.play}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteVideo(video.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
