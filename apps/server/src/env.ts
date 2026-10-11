// تحميل أدوات موطَّنة (tools/env.sh) إن وُجدت، وتعريف مسارات موحّدة.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function applyEnvFile(p: string): void {
  const tok = /^export\s+(['"]?)(\w+)\1=(.*)$/;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = tok.exec(line.trim());
    if (m) {
      let v = m[3]!.trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[2]!] ??= v;
    }
  }
}

const envSh = join(ROOT, 'tools', 'env.sh');
if (process.env.OSAMAH_ENV !== 'disabled' && existsSync(envSh)) {
  try { applyEnvFile(envSh); } catch { /* ignore */ }
}

export const paths = {
  root: ROOT,
  projects: resolve(ROOT, 'projects'),
  tools: resolve(ROOT, 'tools'),
  bin: resolve(ROOT, 'tools', 'bin'),
  cache: resolve(ROOT, 'tools', 'cache'),
  ffmpegDir: resolve(ROOT, 'tools', 'ffmpeg'),
  playwrightBrowsers: resolve(ROOT, 'tools', 'cache', 'ms-playwright'),
  renderPage: resolve(ROOT, 'packages', 'render-engine', 'dist'),
  renderDist: (s: string) => join(ROOT, 'packages', 'render-engine', 'dist', s),
};

export const ffmpegBin: string =
  process.env.OSAMAH_FFMPEG || (existsSync(join(paths.bin, 'ffmpeg')) ? join(paths.bin, 'ffmpeg') : 'ffmpeg');
export const ffprobeBin: string =
  process.env.OSAMAH_FFPROBE || (existsSync(join(paths.bin, 'ffprobe')) ? join(paths.bin, 'ffprobe') : 'ffprobe');
export const edgeTtsBin: string =
  process.env.OSAMAH_EDGE_TTS ||
  (existsSync(join(paths.bin, 'edge-tts')) ? join(paths.bin, 'edge-tts') :
    existsSync(resolve(ROOT, 'tools', 'python', '.venv', 'bin', 'edge-tts')) ? resolve(ROOT, 'tools', 'python', '.venv', 'bin', 'edge-tts') : 'edge-tts');
export const opencodeBin: string =
  process.env.OPENCODE_BIN || (existsSync(join(paths.bin, 'opencode')) ? join(paths.bin, 'opencode') : 'opencode');