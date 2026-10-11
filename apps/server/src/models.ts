import { execFile } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { createConnection } from 'node:net';
import { opencodeBin, paths } from './env.js';
import { runOpencode } from './adapters/opencode.js';
import { bridgeCatalog, providerStatus } from './adapters/bridge.js';

export type ModelKind = 'chat' | 'embedding' | 'image' | 'tts' | 'video' | 'music' | 'other';
export type ModelStatus = 'connected' | 'no-key' | 'restricted' | 'offline';

const KNOWN_LOCAL = new Set(['ollama-local', 'ollama', 'lmstudio', 'llama.cpp', 'llamacpp', 'vllm']);

export interface ModelInfo {
  id: string;
  provider: string;
  name: string;
  kind: ModelKind;
  supportsText: boolean;
  connected: boolean;
  status: ModelStatus;
  note?: string;
}

function exec(cmd: string, args: string[], timeoutMs = 15000): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolvePromise) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' }, (err, stdout, stderr) => {
      const code = err && typeof (err as { code?: unknown }).code === 'number' ? (err as { code: number }).code : err ? 1 : 0;
      resolvePromise({ code, stdout: stdout ?? '', stderr: stderr ?? '' });
    });
  });
}

function classify(id: string): ModelKind {
  const s = id.toLowerCase();
  if (s.includes('embedding')) return 'embedding';
  if (s.includes('-image') || s.includes('image')) return 'image';
  if (s.includes('tts')) return 'tts';
  if (s.includes('veo')) return 'video';
  if (s.includes('lyria')) return 'music';
  if (s.includes('live') || s.includes('computer-use') || s.includes('deep-research') || s.includes('omni')) return 'other';
  return 'chat';
}

export function authProviders(): string[] {
  try {
    const p = join(homedir(), '.local', 'share', 'opencode', 'auth.json');
    const j = JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;
    return Object.keys(j);
  } catch {
    return [];
  }
}

function portOpen(host: string, port: number, timeoutMs = 1200): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const sock = createConnection({ host, port });
    const done = (v: boolean) => {
      sock.destroy();
      resolvePromise(v);
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => done(true));
    sock.once('timeout', () => done(false));
    sock.once('error', () => done(false));
  });
}

async function localProviders(): Promise<string[]> {
  const found: string[] = [];
  if (await portOpen('127.0.0.1', 11434)) found.push('ollama-local');
  return found;
}

let cache: { at: number; list: ModelInfo[]; auth: string[]; local: string[] } | null = null;
const TTL = 30000;
const CACHE_FILE = join(paths.cache, 'models-list.json');

function readDiskIds(): string[] {
  try {
    if (!existsSync(CACHE_FILE)) return [];
    const j = JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as { ids?: string[] };
    return Array.isArray(j.ids) ? j.ids : [];
  } catch {
    return [];
  }
}

function writeDiskIds(ids: string[]): void {
  try {
    mkdirSync(dirname(CACHE_FILE), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify({ at: Date.now(), ids }));
  } catch { /* ignore */ }
}

function buildList(ids: string[], auth: string[], local: string[]): ModelInfo[] {
  return ids.map((id) => {
    const provider = id.split('/')[0] ?? '';
    const kind = classify(id);
    let connected = false;
    let status: ModelStatus = 'no-key';
    let note: string | undefined;
    if (provider === 'opencode') {
      connected = true;
      status = 'connected';
      note = 'متصل مباشرة (Zen)';
    } else if (auth.includes(provider) || local.includes(provider)) {
      connected = true;
      status = 'connected';
    } else if (KNOWN_LOCAL.has(provider)) {
      status = 'offline';
      note = 'الخادم المحلي غير مشغّل';
    } else if (id.includes('-free') && provider !== 'opencode') {
      status = 'restricted';
    } else {
      status = 'no-key';
      note = 'يتطلب مفتاح API';
    }
    return { id, provider, name: id.split('/').slice(1).join('/'), kind, supportsText: kind === 'chat', connected, status, note };
  });
}

export async function listModels(force = false): Promise<{ list: ModelInfo[]; auth: string[]; local: string[] }> {
  if (!force && cache && Date.now() - cache.at < TTL) return cache;
  const r = await exec(opencodeBin, ['models'], 25000);
  let ids = r.stdout
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[a-z0-9._-]+\/[^\s]+$/i.test(l));
  if (ids.length > 0) writeDiskIds(ids);
  else ids = readDiskIds();
  const auth = authProviders();
  const local = await localProviders();
  const list = withBridge(buildList(ids, auth, local));
  cache = { at: Date.now(), list, auth, local };
  return cache;
}

// يدمج طرازات الجسر (Big Pickle/Pollinations/Google) في القائمة الظاهرة.
function withBridge(list: ModelInfo[]): ModelInfo[] {
  const seen = new Set(list.map((m) => m.id));
  const extra: ModelInfo[] = bridgeCatalog()
    .filter((c) => !seen.has(c.id))
    .map((c) => ({
      id: c.id,
      provider: c.id.split('/')[0] ?? '',
      name: c.name,
      kind: 'chat',
      supportsText: true,
      connected: c.connected,
      status: c.connected ? 'connected' : 'restricted',
      note: c.note,
    }));
  return [...extra, ...list];
}

export function bridgeProviders(): Array<{ id: string; hasKey: boolean; keyless: boolean }> {
  return providerStatus();
}

export interface ProbeResult {
  id: string;
  ok: boolean;
  ms: number;
  sample?: string;
  error?: string;
}

const probeCache = new Map<string, { at: number; r: ProbeResult }>();
const PROBE_TTL = 120000;

export async function probeModel(id: string, force = false): Promise<ProbeResult> {
  const hit = probeCache.get(id);
  if (!force && hit && Date.now() - hit.at < PROBE_TTL) return hit.r;
  const t0 = Date.now();
  const r = await runOpencode('Reply with exactly: OK', { model: id, timeoutMs: 30000, retryQuota: false, strict: true });
  const res: ProbeResult = r.ok && r.text.trim().length > 0
    ? { id, ok: true, ms: Date.now() - t0, sample: r.text.trim().slice(0, 40) }
    : { id, ok: false, ms: Date.now() - t0, error: (r.error ?? 'لا استجابة').slice(0, 300) };
  probeCache.set(id, { at: Date.now(), r: res });
  return res;
}

export function pickAutoModel(list: ModelInfo[]): string | undefined {
  const text = list.filter((m) => m.supportsText);
  const pref = [
    /^opencode\/big-pickle$/, // الافتراضي المطلوب
    /^pollinations\/openai$/,
    /^pollinations\/openai-fast$/,
    /^google\/gemini-3\.5-flash$/,
    /^google\/gemini-3/,
    /^deepseek\/deepseek-flash$/,
    /^opencode\/.*-free$/,
    /^deepseek\//,
    /^google\//,
    /^ollama-local\//,
  ];
  for (const re of pref) {
    const m = text.find((x) => re.test(x.id));
    if (m) return m.id;
  }
  return text.find((m) => m.connected)?.id ?? text[0]?.id;
}
