// أدوات الإعلام — حزمات ffmpeg/ffprobe + مسارات الجودة.
import { existsSync, mkdirSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { config } from '../config.js';
import { ffmpegBin, ffprobeBin, paths } from '../env.js';

export function dimsFor(orientation: 'horizontal' | 'vertical', quality: '720p' | '1080p' | '1440p'): { width: number; height: number } {
  const base = config.orientation[orientation];
  const q = config.quality[quality];
  const scale = q.height / base.height; // عمودي/أفقي تصغير متناسب
  return { width: Math.round(base.width * scale), height: q.height };
}

export function runFfmpeg(args: string[], cwd?: string): { ok: boolean; code: number; stderr: string } {
  const r = spawnSync(ffmpegBin, ['-y', '-hide_banner', '-loglevel', 'error', ...args], {
    cwd: cwd || paths.root,
    encoding: 'utf8',
    timeout: 1000 * 60 * 30,
  });
  return { ok: r.status === 0, code: r.status ?? -1, stderr: r.stderr ?? '' };
}

export function ffprobeInfo(file: string): { ok: boolean; width?: number; height?: number; fps?: number; durationSec?: number; sizeBytes?: number; streams?: unknown } {
  if (!existsSync(file)) return { ok: false };
  const s = spawnSync(ffprobeBin, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {
    encoding: 'utf8',
    timeout: 60000,
  });
  if (s.status !== 0) return { ok: false };
  try {
    const d = JSON.parse(s.stdout);
    const v = (d.streams ?? []).find((st: { codec_type: string }) => st.codec_type === 'video');
    const a = (d.streams ?? []).find((st: { codec_type: string }) => st.codec_type === 'audio');
    const fmt = (v && (v.avg_frame_rate as string)) || '';
    const [n, dn] = fmt.split('/').map(Number);
    return {
      ok: true,
      width: v?.width,
      height: v?.height,
      fps: n && dn ? Math.round((n / dn) * 100) / 100 : undefined,
      durationSec: d.format?.duration ? Number(d.format.duration) : undefined,
      sizeBytes: d.format?.size ? Number(d.format.size) : undefined,
      streams: d.streams,
    };
  } catch {
    return { ok: false };
  }
}

// ترميز إطارات متصلة (global frame index) إلى فيديو واحد. يمكن تمرير أبعاد خرج لتحجيم لوحة التصميم.
export function encodeImageSequence(frameDir: string, outMp4: string, fps: number, crf: number, preset: string, outWidth?: number, outHeight?: number): { ok: boolean; stderr: string } {
  const args = [
    '-framerate', String(fps),
    '-i', join(frameDir, '%06d.png'),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', String(crf),
    '-preset', preset,
  ];
  if (outWidth && outHeight) args.push('-vf', `scale=${outWidth}:${outHeight}:flags=lanczos`);
  args.push('-movflags', '+faststart', outMp4);
  const r = runFfmpeg(args);
  return { ok: r.ok, stderr: r.stderr };
}

// بناء مسار صوتي كامل: لكل مشهد مقطع سرد مبطّن بصمت إلى مدّة المشهد، ثم دمجها.
export function silenceWav(path: string): string {
  ensureDir(join(path, '..'));
  const r = runFfmpeg(['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-t', '1', path]);
  return r.ok ? path : '';
}

export function buildAudioTrack(scenes: Array<{ id: string; narrationFile: string; durMs: number }>, outWav: string): { ok: boolean; stderr: string } {
  const silence = silenceWav(join(join(scenes[0]!.narrationFile, '..'), 'silence.wav'));
  const tmp = join(join(scenes[0]!.narrationFile, '..'), '.audio_segments');
  mkdirSync(tmp, { recursive: true });
  const parts: string[] = [];
  scenes.forEach((s, i) => {
    const src = s.narrationFile && existsSync(s.narrationFile) ? s.narrationFile : silence;
    if (!src) return;
    const seg = join(tmp, `seg_${String(i).padStart(2, '0')}.wav`);
    const durSec = (s.durMs / 1000).toFixed(3);
    const r = runFfmpeg(['-i', src, '-af', 'apad', '-t', durSec, '-ar', '44100', '-ac', '2', seg]);
    if (!r.ok) return;
    parts.push(seg);
  });
  if (parts.length !== scenes.length) return { ok: false, stderr: 'audio segments incomplete' };
  const list = join(tmp, 'list.txt');
  writeFileSync(list, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  const r = runFfmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', outWav]);
  if (!r.ok) return { ok: false, stderr: r.stderr };
  mkdirSync(join(outWav, '..'), { recursive: true });
  rmSync(tmp, { recursive: true, force: true });
  return { ok: true, stderr: '' };
}

export function muxFinal(videoOnly: string, audioWav: string, outFinal: string): { ok: boolean; stderr: string } {
  const r = runFfmpeg(['-i', videoOnly, '-i', audioWav, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', outFinal]);
  return { ok: r.ok, stderr: r.stderr };
}

export function makeThumb(video: string, outJpg: string): void {
  const outDir = join(outJpg, '..');
  mkdirSync(outDir, { recursive: true });
  runFfmpeg(['-i', video, '-ss', '0.5', '-frames:v', '1', '-q:v', '4', outJpg]);
}

export function ensureDir(p: string): void {
  mkdirSync(p, { recursive: true });
}

export function countFiles(dir: string, ext: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith(ext)).length;
}