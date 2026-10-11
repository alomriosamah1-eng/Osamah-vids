// محوّل opencode — تشغيل `opencode run --format json` وتحليل NDJSON.
// راجع docs/opencode-integration.md
import { spawn } from 'node:child_process';
import { opencodeBin, paths } from '../env.js';
import { config } from '../config.js';
import { parseScene } from '@osamah/core';
import { emit } from '../events/sse.js';
import { bridgeChat } from './bridge.js';

export type OpenCodeEvent =
  | { type: 'step_start' }
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'tool_use'; tool: string; callID: string; status: string }
  | { type: 'step_finish'; reason?: string }
  | { type: 'error'; message: string };

export interface RunOptions {
  agent?: string;
  model?: string;
  timeoutMs?: number;
  maxStdoutBytes?: number;
  retryQuota?: boolean;
  maxRetries?: number;
  strict?: boolean; // اختبر الموديل المطلوب فقط عبر الجسر بلا تراجع أو عملية فرعية
}

export interface RunResult {
  ok: boolean;
  text: string;
  events: OpenCodeEvent[];
  json?: unknown;
  error?: string;
}

interface NDJsonLine {
  type?: string;
  part?: { type?: string; text?: string; tool?: string; callID?: string; reason?: string; state?: { status?: string } };
  reason?: string;
  error?: { data?: { message?: string } };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isQuotaError(err: string): boolean {
  const e = err.toLowerCase();
  return /quota|rate[- ]limit|resource exhausted|429|insufficient balance|free tier|5[0-9][0-9]/.test(e);
}

// نداء مباشر عبر الجسر (Zen/Big Pickle + Pollinations + Google) مع تراجع تلقائي.
export async function runModel(prompt: string, opts: RunOptions = {}): Promise<RunResult> {
  const model = opts.model ?? config.models.scenes;
  const r = await bridgeChat([{ role: 'user', content: prompt }], {
    model,
    timeoutMs: opts.timeoutMs,
    strict: opts.strict,
  });
  if (!r.ok) return { ok: false, text: '', events: [], error: r.error };
  let json: unknown;
  try {
    json = JSON.parse(extractJson(r.text));
  } catch { /* not JSON */ }
  return { ok: true, text: r.text, events: [{ type: 'text', text: r.text }], json };
}

export async function runOpencode(prompt: string, opts: RunOptions = {}): Promise<RunResult> {
  const bridged = await runModel(prompt, opts);
  if (bridged.ok) return bridged;
  if (opts.strict) return bridged;
  // احتياطي أخير: العملية الفرعية لـ opencode
  const envRetries = Number(process.env.OSAMAH_MAX_RETRIES ?? '');
  const maxAttempts = Number.isFinite(envRetries) && envRetries >= 0 ? envRetries + 1 : (opts.retryQuota === false ? 1 : (opts.maxRetries ?? 3));
  const attempt = async (n: number): Promise<RunResult> => {
    const r = await runOnce(prompt, opts, n);
    if (r.ok) return r;
    if (n >= maxAttempts) return r;
    if (!opts.retryQuota && !isQuotaError(r.error ?? '')) return r;
    if (isQuotaError(r.error ?? '')) {
      // حصة خارجية مستنفدة: انتظار متصاعد قبل إعادة المحاولة
      const wait = [30_000, 120_000, 5 * 60_000][n - 1] ?? 5 * 60_000;
      // eslint-disable-next-line no-console
      console.warn(`[opencode] quota/rate-limit: انتظار ${Math.round(wait / 60000)}دق قبل إعادة المحاولة (${n}/${maxAttempts})`);
      await sleep(wait);
      return attempt(n + 1);
    }
    return r;
  };
  return attempt(1);
}

function runOnce(prompt: string, opts: RunOptions, attemptNo: number): Promise<RunResult> {
  return new Promise((resolvePromise) => {
    const timeoutMs = opts.timeoutMs ?? config.opencode.timeoutMs;
    const maxStdoutBytes = opts.maxStdoutBytes ?? config.opencode.maxStdoutBytes;

    const args = ['run', '--format', 'json'];
    if (opts.agent ?? config.opencode.agent) args.push('--agent', opts.agent ?? config.opencode.agent);
    if (opts.model ?? config.models.scenes) args.push('--model', opts.model ?? config.models.scenes);
    if (config.opencode.autoApprove) args.push('--auto');
    args.push(prompt);

    const child = spawn(opencodeBin, args, { cwd: paths.root, shell: false });

    let stdout = '';
    let stderr = '';
    let dead = false;
    const events: OpenCodeEvent[] = [];

    const timer = setTimeout(() => {
      dead = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString('utf8');
      if (stdout.length > maxStdoutBytes) {
        dead = true;
        child.kill('SIGKILL');
      }
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString('utf8');
      if (stderr.length > 8192) stderr = stderr.slice(-8192);
    });

    child.on('error', (e) => {
      if (dead) return;
      clearTimeout(timer);
      resolvePromise({ ok: false, text: '', events, error: `opencode spawn failed: ${e.message}` });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      let text = '';
      for (const line of stdout.split('\n')) {
        if (!line.trim()) continue;
        try {
          const ev = JSON.parse(line) as NDJsonLine;
          if (ev?.type === 'error') {
            events.push({ type: 'error', message: ev.error?.data?.message ?? 'unknown' });
            continue;
          }
          if (!ev?.part) continue;
          if (ev.part.type === 'text' && ev.part.text) {
            events.push({ type: 'text', text: ev.part.text });
            text += ev.part.text;
          } else if (ev.part.type === 'reasoning' && ev.part.text) {
            events.push({ type: 'reasoning', text: ev.part.text });
          } else if (ev.part.type === 'tool') {
            events.push({ type: 'tool_use', tool: ev.part.tool ?? '', callID: ev.part.callID ?? '', status: ev.part.state?.status ?? '' });
          } else if (ev.part.type === 'step-start') {
            events.push({ type: 'step_start' });
          } else if (ev.part.type === 'step-finish') {
            events.push({ type: 'step_finish', reason: ev.part.reason ?? ev.reason });
          }
        } catch { /* ignore malformed */ }
      }

      if (code === 0 && text.trim()) {
        let json: unknown;
        try {
          json = JSON.parse(extractJson(text));
        } catch { /* not JSON */ }
        resolvePromise({ ok: true, text, events, json });
        return;
      }

      resolvePromise({
        ok: false,
        text,
        events,
        error: stderr.trim() || events.find((e) => e.type === 'error')?.message || `exit ${code}`,
      });
    });

    // البرومبت يُمرَّر كوسيط موضعي (opencode run [message..]) — راجع docs/opencode-integration.md
    child.stdin.end();
  });
}

// استخراج أطول قطعة متوازنة{…} (يدعم nesting)
export function extractJson(s: string): string {
  let best = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '{') {
      let depth = 0;
      let j = i;
      for (; j < s.length; j++) {
        if (s[j] === '{') depth++;
        else if (s[j] === '}') {
          depth--;
          if (depth === 0) break;
        }
      }
      const candidate = s.slice(i, j + 1);
      try {
        JSON.parse(candidate);
        if (candidate.length > best.length) best = candidate;
      } catch { /* ignore */ }
      i = j + 1;
    } else i++;
  }
  return best || s;
}

// خدمة: تطلب من الوكيل توليد مشهد وترجع عقد مشاهد سليمة، مع دورة تصحيح.
export async function generateScenes(projectId: string, brief: unknown, script: unknown): Promise<{ ok: boolean; scenes: unknown[]; error?: string }> {
  const out: unknown[] = [];
  const scenes = (script as { scenes?: Array<{ id: string; narration: string }> })?.scenes ?? [];
  for (let idx = 0; idx < scenes.length; idx++) {
    const sc = scenes[idx]!;
    const base = makeScenePrompt(brief, script, sc, idx + 1, scenes.length);
    let ok = false;
    let lastText = '';
    let lastErrors: string[] = [];
    for (let attempt = 0; attempt < 4 && !ok; attempt++) {
      const prompt = attempt === 0 ? base : [
        'الإخراج رقم ' + attempt + ' السابق رُفض لأنه لا يطابق العقد:',
        lastErrors.join('\n'),
        'النص المرفوض كما أُخرج حرفيًا:',
        `"""${lastText.slice(0, 3000)}"""`,
        'أعد الإخراج الآن: عقد مشهد JSON واحد صالح فقط، مكتوب من الصفر لا تكرر نفس الأخطاء، بلا حقول إضافية إطلاقًا.',
      ].join('\n');
      const r = await runOpencode(prompt, { model: config.models.scenes });
      if (!r.ok) return { ok: false, scenes: out, error: `scene ${sc.id}: ${r.error}` };
      lastText = r.text;
      const parsed = r.json ?? parseTextJson(r.text);
      const v = parseScene(parsed);
      if (v.ok) {
        out.push(v.scene);
        emit(projectId, { type: 'scene_generated', sceneId: sc.id, spec: v.scene, ts: Date.now() });
        ok = true;
      } else {
        lastErrors = v.errors;
      }
    }
    if (!ok) return { ok: false, scenes: out, error: `scene ${sc.id} invalid بعد 4 محاولات:\n${lastErrors.join('\n')}` };
  }
  return { ok: true, scenes: out };
}

function makeScenePrompt(brief: unknown, script: unknown, sc: { id: string; narration?: string }, idx: number, total: number): string {
  const b = JSON.stringify(brief).slice(0, 1500);
  return [
    'أنت مصمّم مشاهد فيديو حتمية. أخرِج عقد JSON واحد فقط لمشهد واحد (بلا يافتات، بلا نصوص خارج العقد).',
    `المشهد ${idx}/${total} id=${sc.id}`,
    `وصف الفيلم: ${b}`,
    `نص السرد: ${sc.narration ?? ''}`,
    '',
    'البنية الإلزامية (أسماء الحقول وأيّ الحقول بالضبط، لا مزيد):',
    '{ "_contractVersion": 1, "id": string, "title": string, "durationMs": number>=1500,',
    '  "background": { "type": "gradient"|"solid", "colors": [string...] 1-2, "angle": 0-360 },',
    '  "layers": [ ... 2-4 طبقات ... ],',
    '  "onScreenText": string, "voiceText": string, "musicMood": "calm"|"warm"|"tense"|"epic"|"tech"|"none" }',
    'لكل طبقة، "kind" يجب أن يكون واحدًا فقط من: "text" | "shape" | "counter" | "chart" | "network" | "timeline".',
    'نمط طبقة نصية صالح: { "kind":"text","text":"نص قصير","tone":"kicker"|"title"|"subtitle"|"body","align":"center"|"left"|"right",',
    '  "animation": { "in":"fade"|"fadeUp"|"pop","delay":0,"dur":700 } }',
    'نمط طبقة شكل: { "kind":"shape","shape":"line"|"rect"|"circle","color":"#hex","animation": {...} }',
    'نمط عداد: { "kind":"counter","to":number,"from":0,"decimals":0,"prefix":"","suffix":"","animation": {...} }',
    'أيّ طبقات أخرى بدون هذه الأمثلة مرفوضة. لا تستخدم أسماء kinds إبداعية (لا "title" و"caption" و"paragraph").',
    'لا تكرر مفتاح "id" داخل الطبقات. لا حقول إضافية في أي كائن. استخدم id حرفي sc.id أعلاه.',
    'أخرِج JSON صالحًا فقط.',
  ].join('\n');
}

function parseTextJson(s: string): unknown {
  try { return JSON.parse(extractJson(s)); } catch { return null; }
}

// ---------- وضع HTML/CSS/JS: تصميم احترافي يولّده الوكيل ----------
// راجع docs/scene-contract-html.md و ADR-0003

export interface HtmlScene {
  id: string;
  title: string;
  voiceText: string;
  onScreenText: string;
  html: string;
}

export function extractHtml(s: string): string {
  const fence = s.match(/```(?:html)?\s*([\s\S]*?)```/i);
  let body = (fence ? fence[1]! : s).trim();
  const start = body.search(/<!doctype\s+html|<html[\s>]/i);
  if (start >= 0) {
    const end = body.toLowerCase().lastIndexOf('</html>');
    body = end > start ? body.slice(start, end + 7) : body.slice(start);
  }
  return body.trim();
}

export function validSceneHtml(html: string): boolean {
  return /<html[\s>]/i.test(html) && /window\.__seek/.test(html) && /window\.__ready/.test(html);
}

export async function generateScenesHtml(
  projectId: string,
  brief: unknown,
  script: unknown,
  dims: { width: number; height: number },
): Promise<{ ok: boolean; scenes: HtmlScene[]; error?: string }> {
  const out: HtmlScene[] = [];
  const scenes = (script as { scenes?: Array<{ id: string | number; title?: string; narration?: string; onScreenText?: string }> })?.scenes ?? [];
  for (let idx = 0; idx < scenes.length; idx++) {
    const sc = scenes[idx]!;
    const id = String(sc.id);
    const base = htmlScenePrompt(brief, sc, idx + 1, scenes.length, dims);
    let ok = false;
    let lastErr = '';
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      const prompt = attempt === 0 ? base : [
        base, '',
        'المخرَج السابق لم يكن مستند HTML صالحاً:', lastErr,
        'أعد الإخراج الآن: مستند HTML واحد كامل قائم بذاته، يبدأ بـ <!doctype html> وينتهي بـ </html>، ويتضمّن window.__seek و window.__ready. بلا أي كلام خارج المستند.',
      ].join('\n');
      const r = await runOpencode(prompt, { model: config.models.scenes });
      if (!r.ok) { lastErr = r.error ?? 'بلا مخرَج'; continue; }
      const html = extractHtml(r.text);
      if (validSceneHtml(html)) {
        out.push({ id, title: sc.title ?? '', voiceText: sc.narration ?? '', onScreenText: sc.onScreenText ?? '', html });
        emit(projectId, { type: 'scene_generated', sceneId: id, spec: { kind: 'html' }, ts: Date.now() });
        ok = true;
      } else {
        lastErr = 'المستند يفتقد <html> أو window.__seek/__ready';
      }
    }
    if (!ok) return { ok: false, scenes: out, error: `scene ${id}: ${lastErr}` };
  }
  return { ok: true, scenes: out };
}

function htmlScenePrompt(
  brief: unknown,
  sc: { id: string | number; title?: string; narration?: string; onScreenText?: string },
  idx: number,
  total: number,
  dims: { width: number; height: number },
): string {
  const b = JSON.stringify(brief).slice(0, 1200);
  return [
    'أنت مصمم موشن جرافيك محترف. اكتب تصميم مشهد فيديو كامل بـ HTML/CSS/JS كتصميم احترافي حقيقي (طبقات، مساحات، تدرجات، أشكال SVG، مخططات، بيانات) — وليس مجرد نص على خلفية.',
    `المشهد ${idx}/${total} id=${sc.id} — العنوان: ${sc.title ?? ''}`,
    `وصف الفيلم: ${b}`,
    `نص السرد: ${sc.narration ?? ''}`,
    `نص على الشاشة إن وُجد: ${sc.onScreenText ?? ''}`,
    '',
    `مقاس لوحة التصميم: ${dims.width}×${dims.height} بكسل. اجعل body بمقاس 100vw×100vh بلا تمرير، واستخدم واحدات vw/vh/% لتتجاوب.`,
    'اتجاه عربي RTL. الخط: font-family: "Cairo","Noto Sans Arabic","Noto Kufi Arabic",system-ui,sans-serif.',
    '',
    'قواعد إلزامية:',
    '1) مستند HTML واحد كامل قائم بذاته: <!doctype html><html dir="rtl" lang="ar"> ... </html>.',
    '2) ممنوع أي مورد خارجي: لا روابط، لا خطوط من الإنترنت، لا صور عن بعد، لا fetch (الشبكة محجوبة).',
    '3) حتمية تامة: ممنوع CSS animations/transitions، وممنوع setTimeout/Date.now/Math.random غير مزروع. استخدم PRNG مزروعاً إن لزم.',
    '4) عرّف دالة عامة window.__seek(tMs, durMs) تُحدّث الـDOM لتعكس حالة الزمن tMs بدقة (من 0 إلى durMs)، وهي المسؤولة الوحيدة عن الحركة.',
    '5) بعد بناء الـDOM عند التحميل، استدعِ window.__seek(0,1) واجعل window.__ready = true.',
    '6) استعمل أدوات تصميم مقنعة: تدرجات وشبكات خلفية، بطاقات زجاجية (backdrop-filter)، ظلال، أيقونات SVG، أعداد/عدادات، مخططات، خطوط زمنية. حافظ على تباعد أنيق وهرمية بصرية.',
    '7) النصوص عربية موجزة مأخوذة من السرد/العنوان.',
    'أخرِج كود HTML فقط بلا أي شرح أو أسطر خارج المستند.',
  ].join('\n');
}