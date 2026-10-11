// تحميل osamah-vids-ai.config.json مع قيم افتراضية.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { paths } from './env.js';

export interface AppConfig {
  app: { name: string; locale: string; direction: string; themeDefault: string };
  server: { host: string; port: number };
  web: { devPort: number };
  models: { understand: string; script: string; scenes: string; edit: string; qc: string };
  opencode: { bin: string; agent: string; autoApprove: boolean; timeoutMs: number; maxStdoutBytes: number };
  voices: { female: { id: string; label: string }; male: { id: string; label: string }; rate: string };
  render: { fps: number; trailMs: number; crf: number; preset: string; browsersPath: string; sceneMode: 'html' | 'json' };
  quality: Record<'720p' | '1080p' | '1440p', { width: number; height: number; label: string }>;
  orientation: Record<'horizontal' | 'vertical', { width: number; height: number; label: string }>;
  styles: Array<{ id: string; label: string }>;
  duration: { minSeconds: number; maxSeconds: number; stepSeconds: number };
}

const DEFAULT: AppConfig = {
  app: { name: 'Osamah vids ai', locale: 'ar', direction: 'rtl', themeDefault: 'dark' },
  server: { host: '127.0.0.1', port: 8799 },
  web: { devPort: 5173 },
  models: {
    understand: 'opencode/big-pickle',
    script: 'opencode/big-pickle',
    scenes: 'opencode/big-pickle',
    edit: 'opencode/big-pickle',
    qc: 'opencode/big-pickle',
  },
  opencode: {
    bin: './tools/bin/opencode',
    agent: 'video-agent',
    autoApprove: true,
    timeoutMs: 300000,
    maxStdoutBytes: 8388608,
  },
  voices: { female: { id: 'ar-SA-ZariyahNeural', label: 'أنثى' }, male: { id: 'ar-SA-HamedNeural', label: 'ذكر' }, rate: '+12%' },
  render: { fps: 30, trailMs: 900, crf: 18, preset: 'medium', browsersPath: './tools/cache/ms-playwright', sceneMode: 'html' },
  quality: {
    '720p': { width: 1280, height: 720, label: '720p' },
    '1080p': { width: 1920, height: 1080, label: '1080p' },
    '1440p': { width: 2560, height: 1440, label: '2K' },
  },
  orientation: { horizontal: { width: 1920, height: 1080, label: 'أفقي' }, vertical: { width: 1080, height: 1920, label: 'عمودي' } },
  styles: [
    { id: 'documentary', label: 'وثائقي' },
    { id: 'educational', label: 'تعليمي' },
    { id: 'historical', label: 'تاريخي' },
    { id: 'news', label: 'إعلامي' },
    { id: 'scientific', label: 'علمي' },
    { id: 'motivational', label: 'تحفيزي' },
    { id: 'explainer', label: 'شروحات' },
  ],
  duration: { minSeconds: 10, maxSeconds: 3600, stepSeconds: 10 },
};

export function loadConfig(): AppConfig {
  try {
    const raw = JSON.parse(readFileSync(join(paths.root, 'osamah-vids-ai.config.json'), 'utf8'));
    return {
      ...DEFAULT,
      ...raw,
      server: { ...DEFAULT.server, ...raw.server },
      web: { ...DEFAULT.web, ...raw.web },
      models: { ...DEFAULT.models, ...raw.models },
      opencode: { ...DEFAULT.opencode, ...raw.opencode },
      voices: { ...DEFAULT.voices, ...raw.voices },
      render: { ...DEFAULT.render, ...raw.render },
      duration: { ...DEFAULT.duration, ...raw.duration },
      quality: { ...DEFAULT.quality, ...raw.quality },
      orientation: { ...DEFAULT.orientation, ...raw.orientation },
      styles: raw.styles ?? DEFAULT.styles,
    };
  } catch {
    return DEFAULT;
  }
}

export const config: AppConfig = loadConfig();