// التقاط الشاشة — Playwright (بrowser موطَّن) يقود صفحة التسجيل الحتمية.
// يلتقط لقطات على شبكة 30 فهرتز لكل مشهد، بأرقام عامة متصلة (بلا وصلات).
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';
import { paths } from '../env.js';
import type { Scene } from '@osamah/core';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { chromium } = require('playwright') as unknown as { chromium: { launch: (opts: Record<string, unknown>) => Promise<any> } };

export interface CaptureOptions {
  id: string;
  scenes: Array<{ scene: Scene; durMs: number }>;
  frameDir: string;
  width: number;
  height: number;
  fps?: number;
  onProgress?: (frame: number, total: number) => void;
  onSceneRendered?: (sceneId: string, frames: number) => void;
}

export async function captureFrames(opts: CaptureOptions): Promise<{ ok: boolean; frames: number; error?: string }> {
  const fps = opts.fps ?? config.render.fps;
  if (opts.scenes.length === 0) return { ok: false, frames: 0, error: 'no scenes' };
  if (!existsSync(paths.playwrightBrowsers)) return { ok: false, frames: 0, error: `browsers not vendored: ${paths.playwrightBrowsers}` };

  mkdirSync(opts.frameDir, { recursive: true });
  process.env.PLAYWRIGHT_BROWSERS_PATH = paths.playwrightBrowsers;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-lcd-text', '--force-color-profile=srgb'] });
  const page = await browser.newPage({
    viewport: { width: opts.width, height: opts.height },
    deviceScaleFactor: 1,
    screen: { width: opts.width, height: opts.height },
  });
  try {
    const url = `http://127.0.0.1:${config.server.port}/render-engine/record/index.html?w=${opts.width}&h=${opts.height}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, undefined, { timeout: 30000 });
    await page.waitForTimeout(200);
    const errors: string[] = [];
    page.on('pageerror', (e: unknown) => errors.push(String((e as Error).message ?? e)));
    page.on('console', (m: { type: () => string; text: () => string }) => {
      if (m.type() === 'error') errors.push(m.text());
    });

    let frame = 0;
    let total = 0;
    for (const s of opts.scenes) total += Math.round((s.durMs / 1000) * fps);

    const pngDir = join(opts.frameDir, 'png');
    rmSync(pngDir, { recursive: true, force: true });
    mkdirSync(pngDir, { recursive: true });

    for (let i = 0; i < opts.scenes.length; i++) {
      const s = opts.scenes[i]!;
      const frames = Math.round((s.durMs / 1000) * fps);
      await page.evaluate((sc: unknown) => (window as unknown as { __loadScene: (s: unknown) => void }).__loadScene(sc), s.scene);
      await page.waitForTimeout(120);
      for (let f = 0; f < frames; f++) {
        const t = (f * 1000) / fps;
        await page.evaluate((time: number) => (window as unknown as { __seek: (t: number) => void }).__seek(time), t);
        await page.screenshot({ path: join(pngDir, String(frame + 1).padStart(6, '0') + '.png') });
        frame++;
        if (opts.onProgress && (frame % 30 === 0 || frame === total)) opts.onProgress(frame, total);
      }
      if (opts.onSceneRendered) opts.onSceneRendered(s.scene.id, frames);
    }
    if (errors.length) return { ok: false, frames: frame, error: errors.slice(0, 5).join(' | ') };
    return { ok: true, frames: frame };
  } finally {
    await browser.close();
  }
}

// ---------- وضع HTML/CSS/JS: التقاط مشاهد يولّدها الوكيل ----------
// العقد: window.__ready (bool) و window.__seek(tMs, durMs). الشبكة محجوبة، الحركة مُجمّدة.

export interface HtmlCaptureOptions {
  id: string;
  scenes: Array<{ id: string; html: string; durMs: number }>;
  frameDir: string;
  width: number;
  height: number;
  fps?: number;
  onProgress?: (frame: number, total: number) => void;
  onSceneRendered?: (sceneId: string, frames: number) => void;
}

const BASE_STYLE = [
  'html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000;',
  'font-family:"Cairo","Noto Sans Arabic","Noto Kufi Arabic",system-ui,sans-serif;}',
  '*,*::before,*::after{box-sizing:border-box;animation:none !important;transition:none !important;}',
].join('');

export async function captureHtmlFrames(opts: HtmlCaptureOptions): Promise<{ ok: boolean; frames: number; error?: string }> {
  const fps = opts.fps ?? config.render.fps;
  if (opts.scenes.length === 0) return { ok: false, frames: 0, error: 'no scenes' };
  if (!existsSync(paths.playwrightBrowsers)) return { ok: false, frames: 0, error: `browsers not vendored: ${paths.playwrightBrowsers}` };

  mkdirSync(opts.frameDir, { recursive: true });
  process.env.PLAYWRIGHT_BROWSERS_PATH = paths.playwrightBrowsers;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-lcd-text', '--force-color-profile=srgb', '--hide-scrollbars'] });
  const page = await browser.newPage({
    viewport: { width: opts.width, height: opts.height },
    deviceScaleFactor: 1,
    screen: { width: opts.width, height: opts.height },
  });
  try {
    await page.addInitScript(() => {
      const w = window as unknown as { requestAnimationFrame?: unknown; cancelAnimationFrame?: unknown };
      w.requestAnimationFrame = () => 0;
      w.cancelAnimationFrame = () => undefined;
    });
    await page.route('**/*', (route: { request: () => { url: () => string }; continue: () => void; abort: () => void }) => {
      const u = route.request().url();
      if (u.startsWith('data:') || u.startsWith('about:') || u.startsWith('blob:') || u === '') return route.continue();
      return route.abort();
    });

    const pngDir = join(opts.frameDir, 'png');
    rmSync(pngDir, { recursive: true, force: true });
    mkdirSync(pngDir, { recursive: true });

    let frame = 0;
    let total = 0;
    for (const s of opts.scenes) total += Math.round((s.durMs / 1000) * fps);

    const errors: string[] = [];
    page.on('pageerror', (e: unknown) => errors.push(String((e as Error).message ?? e)));

    for (const s of opts.scenes) {
      errors.length = 0;
      await page.setContent(s.html, { waitUntil: 'load', timeout: 30000 });
      await page.addStyleTag({ content: BASE_STYLE });
      await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true, undefined, { timeout: 20000 }).catch(() => undefined);
      const ready = await page.evaluate(() => (window as unknown as { __ready?: boolean }).__ready === true);
      if (!ready) return { ok: false, frames: frame, error: `scene ${s.id}: لم يجهز (__ready) أو خطأ JS: ${errors[0] ?? ''}` };
      const frames = Math.round((s.durMs / 1000) * fps);
      for (let f = 0; f < frames; f++) {
        const t = (f * 1000) / fps;
        await page.evaluate(([time, dur]: [number, number]) => {
          const w = window as unknown as { __seek?: (t: number, d: number) => void };
          if (typeof w.__seek === 'function') w.__seek(time, dur);
        }, [t, s.durMs]);
        await page.screenshot({ path: join(pngDir, String(frame + 1).padStart(6, '0') + '.png') });
        frame++;
        if (opts.onProgress && (frame % 30 === 0 || frame === total)) opts.onProgress(frame, total);
      }
      if (opts.onSceneRendered) opts.onSceneRendered(s.id, frames);
    }
    return { ok: true, frames: frame };
  } finally {
    await browser.close();
  }
}