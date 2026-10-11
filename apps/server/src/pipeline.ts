// Pipeline Orchestrator — ينسّق المراحل ويبثّ الأحداث عبر SSE.
// الوضع الحالي: mock (لمعاينة الواجهة) بمسار real معتمَد البنية (مُفعَّل لاحقًا).
import { ProjectMeta, PipelineEvent, Scene } from '@osamah/core';
import { emit } from './events/sse.js';
import { runOpencode, generateScenes, generateScenesHtml } from './adapters/opencode.js';
import { config } from './config.js';
import { appendEvent, getProject, saveProjectMeta } from './projects/repo.js';

export async function runPipeline(meta: ProjectMeta, mode: 'mock' | 'real' = 'real'): Promise<void> {
  if (mode === 'mock') return runMock(meta);
  return runReal(meta);
}

function push(projectId: string, ev: PipelineEvent): void {
  appendEvent(projectId, ev);
  emit(projectId, ev);
}

function setStatus(meta: ProjectMeta, status: ProjectMeta['status']): void {
  meta.status = status;
  meta.updatedAt = new Date().toISOString();
  saveProjectMeta(meta);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------- mock (معاينة واجهة) ----------------
const STYLE_PALETTES: Record<string, [string, string]> = {
  documentary: ['#0f2740', '#07151f'],
  educational: ['#0b2d22', '#05130c'],
  historical: ['#2a1a08', '#120b02'],
  news: ['#1b1438', '#08050f'],
  scientific: ['#12333a', '#051214'],
  motivational: ['#3a1d24', '#120507'],
  explainer: ['#1c2838', '#06080c'],
};

async function runMock(meta: ProjectMeta): Promise<void> {
  setStatus(meta, 'generating');
  const [c1, c2] = STYLE_PALETTES[meta.options.style] ?? STYLE_PALETTES.documentary!;
  const sceneCount = Math.max(3, Math.round(meta.options.durationSeconds / 15));

  push(meta.id, { type: 'stage_started', stage: 'understand', ts: Date.now() });
  await sleep(700);
  push(meta.id, { type: 'stage_started', stage: 'script', ts: Date.now() });

  const scenes = Array.from({ length: sceneCount }, (_, i) => ({
    id: `scene_${String(i + 1).padStart(2, '0')}`,
  }));

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i]!;
    const baseDur = Math.round(meta.options.durationSeconds * 1000 / sceneCount);
    push(meta.id, { type: 'scene_started', sceneId: sc.id, index: i, ts: Date.now() });
    await sleep(420);
    const number = 3 + Math.round(3 * Math.random() * 10) / 10;
    push(meta.id, {
      type: 'scene_generated',
      sceneId: sc.id,
      ts: Date.now(),
      spec: {
        _contractVersion: 1,
        id: sc.id,
        title: `مشهد ${i + 1}`,
        durationMs: baseDur,
        background: { type: 'gradient', colors: [c1, c2] },
        layers: [
          { kind: 'counter', to: number, decimals: 1, suffix: '×', animation: { in: 'fade', delay: 300, dur: 1400 } },
          { kind: 'text', text: ['نمو ملحوظ', 'تحوّل رقمي', 'انتشار عالمي', 'أثر ممتد'][i % 4], tone: 'title', animation: { in: 'fadeUp', delay: 800, dur: 700 } },
        ],
        voiceText: `هذا نص المشهد ${i + 1}`,
        musicMood: 'warm',
      },
    });
    await sleep(340);
    push(meta.id, { type: 'narration_ready', sceneId: sc.id, ts: Date.now() });
    push(meta.id, { type: 'scene_rendered', sceneId: sc.id, path: `scenes/${sc.id}.mp4`, ts: Date.now() });
  }

  push(meta.id, { type: 'stage_started', stage: 'render', ts: Date.now() });
  const total = 60;
  for (let f = 0; f <= total; f += 10) {
    push(meta.id, { type: 'render_progress', frame: f, total, ts: Date.now() });
    await sleep(150);
  }

  push(meta.id, { type: 'stage_started', stage: 'qc', ts: Date.now() });
  await sleep(500);
  push(meta.id, { type: 'qc_result', ok: true, info: { width: 1920, height: 1080, fps: 30 }, ts: Date.now() });
  push(meta.id, { type: 'stage_started', stage: 'export', ts: Date.now() });
  await sleep(400);

  meta.status = 'ready';
  meta.finalPath = `out/final.mp4`;
  meta.durationMs = meta.options.durationSeconds * 1000;
  meta.updatedAt = new Date().toISOString();
  saveProjectMeta(meta);
  push(meta.id, { type: 'done', final: 'out/final.mp4', ts: Date.now() });
}

// ---------------- real ----------------
// الأنبوب الحقيقي: opencode (brief → script → مشاهد zod) → edge-tts →
// التقاط Playwright مستمر → encode ffmpeg → مكس صوت → مكس نهائي → QC.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { dimsFor, encodeImageSequence, buildAudioTrack, muxFinal, makeThumb, ffprobeInfo, ensureDir } from './adapters/media.js';
import { synthesizeNarration } from './adapters/tts.js';
import { captureFrames, captureHtmlFrames } from './adapters/capture.js';
import { projectDir } from './projects/repo.js';

// وحدة مشهد موحّدة بين وضع HTML (تصميم يولّده الوكيل) ووضع JSON (العقد القديم).
interface PipelineUnit {
  id: string;
  title: string;
  voiceText: string;
  onScreenText: string;
  scene?: Scene;
  html?: string;
}

async function runReal(meta: ProjectMeta): Promise<void> {
  setStatus(meta, 'generating');
  const dir = projectDir(meta.id);
  const scDir = join(dir, 'scenes');
  const narDir = join(dir, 'narration');
  const outDir = join(dir, 'out');
  ensureDir(scDir); ensureDir(narDir); ensureDir(outDir);

  try {
    // 1) understand — brief منظم
    push(meta.id, { type: 'stage_started', stage: 'understand', ts: Date.now() });
    const briefR = await runOpencode(briefPrompt(meta), { model: config.models.understand });
    const brief = briefR.json ?? parseTextJson(briefR.text);
    if (!brief || typeof brief !== 'object') {
      push(meta.id, { type: 'error', stage: 'understand', message: briefR.error || 'brief غير صالح', ts: Date.now() });
      setStatus(meta, 'failed'); return;
    }
    writeFileSync(join(dir, 'brief.json'), JSON.stringify(brief, null, 2));

    // 2) script — مشاهد سردية + نصوص
    push(meta.id, { type: 'stage_started', stage: 'script', ts: Date.now() });
    const scriptR = await runOpencode(scriptPrompt(meta, JSON.stringify(brief).slice(0, 4000)), { model: config.models.script });
    const script = scriptR.json ?? parseTextJson(scriptR.text);
    const scriptScenes = (script as { scenes?: Array<{ id: string; narration?: string }> })?.scenes ?? [];
    if (!script || scriptScenes.length === 0) {
      push(meta.id, { type: 'error', stage: 'script', message: scriptR.error || 'السكربت بلا مشاهد', ts: Date.now() });
      setStatus(meta, 'failed'); return;
    }
    (meta as ProjectMeta & { script?: unknown }).script = script;
    saveProjectMeta(meta);
    writeFileSync(join(dir, 'script.json'), JSON.stringify(script, null, 2));

    // 3) scenes — تصميم HTML/CSS/JS عبر الوكيل (افتراضي) أو عقد JSON (بديل)
    push(meta.id, { type: 'stage_started', stage: 'scenes', ts: Date.now() });
    const sceneMode = config.render.sceneMode;
    const canvas = config.orientation[meta.options.orientation];
    const units: PipelineUnit[] = [];
    if (sceneMode === 'html') {
      const genHtml = await generateScenesHtml(meta.id, brief, script, canvas);
      if (!genHtml.ok || genHtml.scenes.length === 0) {
        push(meta.id, { type: 'error', stage: 'scenes', message: genHtml.error || 'لا مشاهد HTML منتجة', ts: Date.now() });
        setStatus(meta, 'failed'); return;
      }
      genHtml.scenes.forEach((sc, i) => {
        writeFileSync(join(scDir, `scene_${String(i + 1).padStart(2, '0')}.html`), sc.html);
        units.push({ id: sc.id, title: sc.title, voiceText: sc.voiceText, onScreenText: sc.onScreenText, html: sc.html });
      });
    } else {
      const gen = await generateScenes(meta.id, brief, script);
      if (!gen.ok || gen.scenes.length === 0) {
        push(meta.id, { type: 'error', stage: 'scenes', message: gen.error || 'لا مشاهد منتجة', ts: Date.now() });
        setStatus(meta, 'failed'); return;
      }
      (gen.scenes as Scene[]).forEach((sc, i) => {
        writeFileSync(join(scDir, `scene_${String(i + 1).padStart(2, '0')}.json`), JSON.stringify(sc, null, 2));
        units.push({ id: sc.id, title: sc.title, voiceText: sc.voiceText, onScreenText: sc.onScreenText, scene: sc });
      });
    }
    (meta as ProjectMeta & { scenesCount?: number }).scenesCount = units.length;
    saveProjectMeta(meta);

    // 4) voice — سرد edge-tts لكل مشهد، والمدة الحقيقية = سرد + ذيل
    push(meta.id, { type: 'stage_started', stage: 'voice', ts: Date.now() });
    const narrById = new Map(scriptScenes.map((s) => [s.id, s.narration ?? '']));
    const timed: Array<PipelineUnit & { narrationFile: string; durMs: number }> = [];
    for (let i = 0; i < units.length; i++) {
      const u = units[i]!;
      push(meta.id, { type: 'scene_started', sceneId: u.id, index: i, ts: Date.now() });
      const text = (u.voiceText || u.onScreenText || narrById.get(u.id) || '').trim();
      const file = join(narDir, `scene_${String(i + 1).padStart(2, '0')}.mp3`);
      if (text) {
        const tts = await synthesizeNarration(text, file, meta.options.voice);
        if (!tts.ok) {
          push(meta.id, { type: 'error', stage: 'voice', message: tts.error || 'tts failed', ts: Date.now() });
          setStatus(meta, 'failed'); return;
        }
        const durMs = Math.max(tts.durationMs ?? 1000 + config.render.trailMs, config.render.trailMs + 500);
        timed.push({ ...u, narrationFile: file, durMs });
        push(meta.id, { type: 'narration_ready', sceneId: u.id, ts: Date.now() });
      } else {
        timed.push({ ...u, narrationFile: '', durMs: Math.max(u.scene?.durationMs ?? config.render.trailMs * 2, 1500) });
      }
    }
    (meta as ProjectMeta & { scenesCount?: number }).scenesCount = timed.length;

    // 5) render — لحظات حتمية على شبكة 30fps ثم encode
    push(meta.id, { type: 'stage_started', stage: 'render', ts: Date.now() });
    const dims = dimsFor(meta.options.orientation, meta.options.quality);
    const frameDir = join(outDir, 'frames');
    const videoOnly = join(outDir, 'video_only.mp4');
    const onProgress = (frame: number, total: number) => push(meta.id, { type: 'render_progress', frame, total, ts: Date.now() });
    const onSceneRendered = (sceneId: string) => push(meta.id, { type: 'scene_rendered', sceneId, path: 'out/final.mp4', ts: Date.now() });

    if (sceneMode === 'html') {
      const cap = await captureHtmlFrames({
        id: meta.id,
        scenes: timed.map((t) => ({ id: t.id, html: t.html ?? '', durMs: t.durMs })),
        frameDir,
        width: canvas.width,
        height: canvas.height,
        onProgress,
        onSceneRendered,
      });
      if (!cap.ok || cap.frames === 0) {
        push(meta.id, { type: 'error', stage: 'render', message: cap.error || 'no frames captured', ts: Date.now() });
        setStatus(meta, 'failed'); return;
      }
      const enc = encodeImageSequence(join(frameDir, 'png'), videoOnly, config.render.fps, config.render.crf, config.render.preset, dims.width, dims.height);
      if (!enc.ok) {
        push(meta.id, { type: 'error', stage: 'render', message: enc.stderr || 'encode failed', ts: Date.now() });
        setStatus(meta, 'failed'); return;
      }
    } else {
      if (timed.some((t) => !t.narrationFile)) {
        // مشاهد بلا سرد: نص موقّت يظهر كطبقة نصية بدل الصمت
        timed.forEach((t) => {
          if (!t.narrationFile && t.scene && !t.scene.layers?.some((l) => l.kind === 'text')) {
            (t.scene.layers ??= []).push({ kind: 'text', text: t.scene.title || t.scene.onScreenText || '—', tone: 'title', align: 'center', animation: { in: 'fade', delay: 300, dur: 600 } });
          }
        });
        saveProjectMeta(meta);
      }
      const cap = await captureFrames({
        id: meta.id,
        scenes: timed.map((t) => ({ scene: t.scene!, durMs: t.durMs })),
        frameDir,
        width: dims.width,
        height: dims.height,
        onProgress,
        onSceneRendered,
      });
      if (!cap.ok || cap.frames === 0) {
        push(meta.id, { type: 'error', stage: 'render', message: cap.error || 'no frames captured', ts: Date.now() });
        setStatus(meta, 'failed'); return;
      }
      const enc = encodeImageSequence(join(frameDir, 'png'), videoOnly, config.render.fps, config.render.crf, config.render.preset);
      if (!enc.ok) {
        push(meta.id, { type: 'error', stage: 'render', message: enc.stderr || 'encode failed', ts: Date.now() });
        setStatus(meta, 'failed'); return;
      }
    }

    // 6) audio — مسار سرد كامل محاذٍ لمدة كل مشهد
    push(meta.id, { type: 'stage_started', stage: 'audio', ts: Date.now() });
    const audioWav = join(outDir, 'audio_mix.wav');
    const aud = buildAudioTrack(
      timed.map((t) => ({ id: t.id, narrationFile: t.narrationFile, durMs: t.durMs })),
      audioWav,
    );
    if (!aud.ok) {
      push(meta.id, { type: 'error', stage: 'audio', message: aud.stderr || 'audio mix failed', ts: Date.now() });
      setStatus(meta, 'failed'); return;
    }

    // 7) export — مكس نهائي + صورة مصغّرة
    push(meta.id, { type: 'stage_started', stage: 'export', ts: Date.now() });
    const finalPath = join(outDir, 'final.mp4');
    const mx = muxFinal(videoOnly, audioWav, finalPath);
    if (!mx.ok) {
      push(meta.id, { type: 'error', stage: 'export', message: mx.stderr || 'mux failed', ts: Date.now() });
      setStatus(meta, 'failed'); return;
    }
    makeThumb(finalPath, join(outDir, 'thumb.jpg'));

    // 8) qc — فحص عددي عبر ffprobe
    push(meta.id, { type: 'stage_started', stage: 'qc', ts: Date.now() });
    const info = ffprobeInfo(finalPath);
    const totalMs = timed.reduce((a, t) => a + t.durMs, 0);
    push(meta.id, { type: 'qc_result', ok: info.ok, info, ts: Date.now() });

    meta.status = 'ready';
    meta.finalPath = 'out/final.mp4';
    meta.durationMs = info.durationSec ? Math.round(info.durationSec * 1000) : totalMs;
    meta.sizeMb = info.sizeBytes ? Math.round((info.sizeBytes / (1024 * 1024)) * 100) / 100 : meta.sizeMb;
    meta.updatedAt = new Date().toISOString();
    saveProjectMeta(meta);
    push(meta.id, { type: 'done', final: 'out/final.mp4', ts: Date.now() });
  } catch (e) {
    push(meta.id, { type: 'error', stage: 'pipeline', message: String((e as Error).message), ts: Date.now() });
    setStatus(meta, 'failed');
  }
}

function briefPrompt(meta: ProjectMeta): string {
  return [
    'أنت محلّل برومبت. حوّل الطلب التالي إلى brief منظم بواسطة JSON',
    'يتضمن: عنوان، جمهور، نبرة، بنية المشاهد المقترحة، وأسلوباً.',
    'أخرِج JSON صالحاً فقط.',
    `الطلب: ${meta.prompt}`,
    `المدة: ${meta.options.durationSeconds} ثانية، الاتجاه ${meta.options.orientation}، الأسلوب ${meta.options.style}`,
  ].join('\n');
}

function scriptPrompt(meta: ProjectMeta, briefText: string): string {
  return [
    'أنت كاتب سكربت فيديو وثائقي عربي. استناداً للـ brief التالي أخرِج سكربت JSON',
    'يتضمن: scenes[] بكل مشهد {id, title, narration (نص سردي عربي يُقرأ بوضوح خلال المدة), onScreenText}',
    'قدّر المدة لكل مشهد بدقّة، بحيث لا يتجاوز المجموع مدة الفيديو المطلوبة ولا يقصّ أي مشهد.',
    'أخرِج JSON صالحاً فقط.',
    `الـbrief:\n${briefText}`,
    `إجمالي المدة المطلوبة ${meta.options.durationSeconds} ثانية`,
  ].join('\n');
}

export { getProject as loadProject }; // إعادة تصدير للمساعدة

function parseTextJson(s: string): unknown {
  try {
    const m = s.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : null;
  } catch {
    return null;
  }
}