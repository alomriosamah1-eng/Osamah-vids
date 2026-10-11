// جسر خفيف: نداءات مباشرة إلى واجهات متوافقة مع OpenAI (Zen/Big Pickle + Pollinations + Google)
// مع تخزين مفاتيح وتراجع تلقائي بين المزوّدين. لا يعتمد على أي تطبيق خارجي.
// راجع docs/backend.md
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface BridgeProvider {
  id: string;
  baseUrl: string;
  auth: 'none' | 'bearer';
  keyless?: boolean; // يعمل بلا مفتاح (قد يُحدّ معدّل الطلبات فقط)
  key: () => string | undefined;
  headers?: Record<string, string>;
  // الطرازات المرشّحة بالترتيب للموديل المطلوب (التراجع عند 429/5xx)
  models: (requested: string) => string[];
}

export interface ChatOptions {
  model?: string;
  timeoutMs?: number;
  temperature?: number;
  strict?: boolean; // بلا تراجع: اختبر الموديل المطلوب فقط
}

export interface ChatAttempt {
  provider: string;
  model: string;
  ok: boolean;
  ms: number;
  error?: string;
}

export interface ChatResult {
  ok: boolean;
  text: string;
  provider?: string;
  model?: string;
  error?: string;
  attempts: ChatAttempt[];
}

export const DEFAULT_MODEL = 'opencode/big-pickle';

function zenKey(): string | undefined {
  return process.env.OPENCODE_ZEN_API_KEY || process.env.OPENCODE_API_KEY || undefined;
}

function pollKey(): string | undefined {
  return process.env.POLLINATIONS_API_KEY || process.env.pollinations_api_key || undefined;
}

function googleKey(): string | undefined {
  const env = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (env) return env;
  try {
    const p = join(homedir(), '.local', 'share', 'opencode', 'auth.json');
    const j = JSON.parse(readFileSync(p, 'utf8')) as Record<string, { key?: string }>;
    return j?.google?.key;
  } catch {
    return undefined;
  }
}

const ZEN_VERSION = process.env.OPENCODE_VERSION || '1.18.35';

const PROVIDERS: Record<string, BridgeProvider> = {
  opencode: {
    id: 'opencode',
    baseUrl: process.env.OPENCODE_ZEN_URL || 'https://opencode.ai/zen/v1/chat/completions',
    auth: 'bearer',
    key: zenKey,
    headers: {
      'x-opencode-client': process.env.OPENCODE_CLIENT || 'cli',
      'User-Agent': `opencode/${ZEN_VERSION}`,
    },
    models: (m) => [m.startsWith('opencode/') ? m.slice('opencode/'.length) : 'big-pickle'],
  },
  pollinations: {
    id: 'pollinations',
    baseUrl: process.env.POLLINATIONS_URL || 'https://gen.pollinations.ai/v1/chat/completions',
    auth: 'bearer',
    keyless: true,
    key: pollKey,
    models: (m) => (m.startsWith('pollinations/') ? [m.slice('pollinations/'.length)] : ['openai', 'openai-fast']),
  },
  google: {
    id: 'google',
    baseUrl:
      process.env.GOOGLE_OPENAI_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    auth: 'bearer',
    key: googleKey,
    models: (m) =>
      m.startsWith('google/')
        ? [m.slice('google/'.length), 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview']
        : ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview'],
  },
};

const FALLBACK_ORDER = ['pollinations', 'google', 'opencode'] as const;

export function providerOf(model: string): string {
  return model.split('/')[0] ?? model;
}

function usable(id: string, primary: string): boolean {
  const p = PROVIDERS[id];
  if (!p) return false;
  if (p.auth === 'none' || p.keyless) return true;
  if (p.key()) return true;
  return id === primary; // نحاول المزوّد المطلوب حتى بلا مفتاح (قد ينجح كطبقة مجانية)
}

export function fallbackChain(model: string, strict = false): string[] {
  const primary = providerOf(model);
  if (strict) return PROVIDERS[primary] ? [primary] : [];
  const chain: string[] = [];
  if (PROVIDERS[primary]) chain.push(primary);
  for (const id of FALLBACK_ORDER) {
    if (id !== primary && usable(id, primary)) chain.push(id);
  }
  return chain;
}

function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

async function callOnce(
  prov: BridgeProvider,
  upstreamModel: string,
  messages: ChatMessage[],
  opts: ChatOptions,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120000);
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json', ...(prov.headers ?? {}) };
    const key = prov.key();
    if (key) headers['authorization'] = `Bearer ${key}`;
    const body: Record<string, unknown> = { model: upstreamModel, messages, stream: false };
    if (opts.temperature != null) body['temperature'] = opts.temperature;

    const res = await fetch(prov.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${raw.slice(0, 300)}`);

    let data: { choices?: Array<{ message?: { content?: unknown }; text?: unknown }>; error?: unknown };
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      throw new Error(`استجابة غير JSON: ${raw.slice(0, 200)}`);
    }
    if (data.error) {
      const e = data.error;
      throw new Error(typeof e === 'string' ? e : String((e as { message?: unknown }).message ?? JSON.stringify(e)));
    }
    const choice = data.choices?.[0];
    const content = choice?.message?.content ?? choice?.text;
    if (typeof content !== 'string' || !content.trim()) throw new Error('استجابة فارغة');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

export async function bridgeChat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
  const model = opts.model ?? DEFAULT_MODEL;
  const attempts: ChatAttempt[] = [];
  for (const id of fallbackChain(model, opts.strict)) {
    const prov = PROVIDERS[id]!;
    const candidates = [...new Set(prov.models(model))];
    for (const upstream of candidates) {
      const t0 = Date.now();
      try {
        const text = await callOnce(prov, upstream, messages, opts);
        attempts.push({ provider: id, model: upstream, ok: true, ms: Date.now() - t0 });
        return { ok: true, text, provider: id, model: upstream, attempts };
      } catch (e) {
        attempts.push({ provider: id, model: upstream, ok: false, ms: Date.now() - t0, error: errMessage(e) });
      }
    }
  }
  return {
    ok: false,
    text: '',
    error: attempts.map((a) => `${a.provider}/${a.model}: ${a.error}`).join(' | ') || 'لا مزوّد متاح',
    attempts,
  };
}

export interface CatalogEntry {
  id: string;
  name: string;
  keyless: boolean;
  connected: boolean;
  note?: string;
}

// قائمة الطرازات التي يوفّرها الجسر مباشرةً (تظهر في الواجهة)
export function bridgeCatalog(): CatalogEntry[] {
  const out: CatalogEntry[] = [
    { id: 'opencode/big-pickle', name: 'Big Pickle (Zen)', keyless: true, connected: false, note: 'افتراضي — يُتراجَع عنه عند الحجب' },
    { id: 'pollinations/openai', name: 'OpenAI (Pollinations)', keyless: true, connected: true, note: 'مجاني بلا مفتاح' },
    { id: 'pollinations/openai-fast', name: 'OpenAI Fast (Pollinations)', keyless: true, connected: true, note: 'مجاني بلا مفتاح' },
  ];
  if (googleKey()) {
    out.push({ id: 'google/gemini-3.5-flash', name: 'Gemini 3.5 Flash', keyless: false, connected: true });
  }
  return out;
}

export function providerStatus(): Array<{ id: string; hasKey: boolean; keyless: boolean }> {
  return Object.values(PROVIDERS).map((p) => ({
    id: p.id,
    hasKey: !!p.key(),
    keyless: p.auth === 'none' || p.id === 'pollinations',
  }));
}
