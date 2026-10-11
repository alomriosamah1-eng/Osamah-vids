// توليد السرد الصوتي — edge-tts (venv موطَّن إن وُجد).
// يتطلب نصًا عربيًا قصيرًا. يعيد مدّة الصوت بالـ ms عبر ffprobe.
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { config } from '../config.js';
import { edgeTtsBin, ffprobeBin } from '../env.js';

export interface TtsResult {
  ok: boolean;
  file?: string;
  durationMs?: number;
  error?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function synthesizeNarration(text: string, outMp3: string, voice: 'female' | 'male' = 'female', rate = config.voices.rate): Promise<TtsResult> {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return { ok: false, error: 'empty narration text' };
  mkdirSync(join(outMp3, '..'), { recursive: true });
  let lastErr = '';
  // edge-tts خدمة خارجية تحدّ من الاتصالات → إعادة محاولة مؤجّلة
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(2500 * attempt * attempt);
    try {
      const r = spawnSync(edgeTtsBin, ['--voice', config.voices[voice].id, '--rate', rate, '--text', t, '--write-media', outMp3], {
        encoding: 'utf8',
        timeout: 120000,
      });
      if (r.status !== 0 || !existsSync(outMp3)) { lastErr = r.stderr?.trim() || `edge-tts exit ${r.status}`; continue; }
      const d = spawnSync(ffprobeBin, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', outMp3], { encoding: 'utf8', timeout: 30000 });
      const sec = d.status === 0 ? Number(d.stdout.trim()) : NaN;
      return { ok: true, file: outMp3, durationMs: Number.isFinite(sec) ? Math.round(sec * 1000) : undefined };
    } catch (e) {
      lastErr = (e as Error).message;
    }
  }
  return { ok: false, error: lastErr };
}