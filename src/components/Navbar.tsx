import React, { useState } from 'react';
import { 
  Video, 
  Sparkles, 
  History, 
  Cpu, 
  BookOpen, 
  Globe, 
  Menu, 
  X, 
  Server,
  Zap
} from 'lucide-react';
import { Language } from '../types/client.ts';
import { translations } from '../locales/translations.ts';

interface NavbarProps {
  lang: Language;
  onToggleLang: () => void;
  activeTab: 'create' | 'history' | 'benchmarks';
  setActiveTab: (tab: 'create' | 'history' | 'benchmarks') => void;
  onOpenWorkerModal: () => void;
  onOpenDocsModal: () => void;
  isWorkerConnected: boolean;
  activeJobsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onToggleLang,
  activeTab,
  setActiveTab,
  onOpenWorkerModal,
  onOpenDocsModal,
  isWorkerConnected,
  activeJobsCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090b10]/90 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('create')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-600 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform duration-300">
              <Video className="h-5 w-5 text-white" />
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 opacity-30 blur-sm group-hover:opacity-60 transition duration-300"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white font-sans">
                  Osamah <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Vids</span>
                </span>
                <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                  Wan2.1 SOTA
                </span>
              </div>
              <p className="hidden text-[11px] text-slate-400 sm:block">AI Video Generation Platform</p>
            </div>
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 rounded-full bg-slate-900/60 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'create'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t.navCreate}
            {activeJobsCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse">
                {activeJobsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            {t.navHistory}
          </button>

          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'benchmarks'
                ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            {t.navBenchmarks}
          </button>
        </nav>

        {/* Right Action Tools */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Worker / Colab Status Badge */}
          <button
            onClick={onOpenWorkerModal}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              isWorkerConnected
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
            }`}
            title={isWorkerConnected ? t.workerConnected : t.workerDisconnected}
          >
            <Server className={`h-3.5 w-3.5 ${isWorkerConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>{isWorkerConnected ? 'Colab GPU Active' : 'GPU Worker'}</span>
            <span className={`h-2 w-2 rounded-full ${isWorkerConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
          </button>

          {/* Docs Button */}
          <button
            onClick={onOpenDocsModal}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition"
          >
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            <span>{t.navDocs}</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/10 transition"
          >
            <Globe className="h-3.5 w-3.5 text-amber-400" />
            <span>{t.langToggle}</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={onToggleLang}
            className="rounded-lg border border-slate-800 p-2 text-xs font-medium text-amber-400"
          >
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-800 bg-[#0c0f17] px-4 py-4 md:hidden space-y-2">
          <button
            onClick={() => { setActiveTab('create'); setMobileMenuOpen(false); }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
              activeTab === 'create' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {t.navCreate}
          </button>
          <button
            onClick={() => { setActiveTab('history'); setMobileMenuOpen(false); }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
              activeTab === 'history' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <History className="h-4 w-4" />
            {t.navHistory}
          </button>
          <button
            onClick={() => { setActiveTab('benchmarks'); setMobileMenuOpen(false); }}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
              activeTab === 'benchmarks' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Cpu className="h-4 w-4" />
            {t.navBenchmarks}
          </button>
          <div className="pt-2 border-t border-slate-800 flex gap-2">
            <button
              onClick={() => { onOpenWorkerModal(); setMobileMenuOpen(false); }}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 py-2 text-xs text-slate-300"
            >
              <Server className="h-3.5 w-3.5 text-amber-400" />
              {t.navColab}
            </button>
            <button
              onClick={() => { onOpenDocsModal(); setMobileMenuOpen(false); }}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 py-2 text-xs text-slate-300"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {t.navDocs}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
