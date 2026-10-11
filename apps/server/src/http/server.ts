// Express app — نقاط REST + SSE + خدمة الملفات.
import express, { Express, json, static as staticMiddleware } from 'express';
import cors from 'cors';
import { existsSync, createReadStream, statSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';
import { paths, ffmpegBin, ffprobeBin, edgeTtsBin, opencodeBin } from '../env.js';
import * as repo from '../projects/repo.js';
import { runPipeline } from '../pipeline.js';
import { subscribe, sseHeaders } from '../events/sse.js';
import { ProjectOptionsSchema } from '../validation.js';
import { listModels, probeModel, pickAutoModel } from '../models.js';
import { loadSettings, updateSettings } from '../settings.js';

void ffmpegBin; void ffprobeBin; void edgeTtsBin; void opencodeBin;

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: true, credentials: false }));
  app.use(json({ limit: '2mb' }));

  // ---- serve render-engine (صفحة التسجيل + dist) ----
  app.use('/render-engine', staticMiddleware(join(paths.root, 'packages', 'render-engine')));

  // ---- health + doctor ----
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      env: 'vendored',
      ffmpeg: ffmpegBin,
      browsersPath: paths.playwrightBrowsers,
      browsersReady: existsSync(paths.playwrightBrowsers),
    });
  });

  app.get('/api/config', (_req, res) => res.json(config));

  // ---- models (نماذج opencode الحقيقية + مؤشر الاتصال) ----
  app.get('/api/models', async (req, res) => {
    try {
      const onlyConnected = req.query.connected === '1' || req.query.connected === 'true';
      const { list, auth, local } = await listModels(req.query.refresh === '1');
      const models = onlyConnected ? list.filter((m) => m.connected) : list;
      const settings = loadSettings();
      res.json({
        models,
        total: list.length,
        connectedCount: list.filter((m) => m.connected).length,
        providers: auth,
        localProviders: local,
        auto: pickAutoModel(list),
        selected: settings.model ?? config.models.scenes,
        roles: config.models,
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  app.post('/api/models/test', async (req, res) => {
    try {
      const id = String(req.body?.id ?? '').trim();
      if (!id) return res.status(400).json({ error: 'معرّف النموذج مطلوب' });
      const r = await probeModel(id, req.body?.force === true);
      res.json(r);
    } catch (e) {
      res.status(500).json({ error: (e as Error).message });
    }
  });

  // ---- settings (اختيار النموذج) ----
  app.get('/api/settings', (_req, res) => res.json({ ...loadSettings(), roles: config.models }));

  app.post('/api/settings', (req, res) => {
    const model = typeof req.body?.model === 'string' ? req.body.model.trim() : undefined;
    if (model !== undefined && model !== '' && !/^[a-z0-9._-]+\/\S+$/i.test(model)) {
      return res.status(400).json({ error: 'معرّف نموذج غير صالح' });
    }
    const s = updateSettings(model === undefined ? {} : { model: model === '' ? undefined : model });
    res.json({ ...s, roles: config.models });
  });

  // ---- projects ----
  app.get('/api/projects', (_req, res) => res.json({ projects: repo.listProjects() }));

  app.post('/api/projects', async (req, res) => {
    const parsed = ProjectOptionsSchema.safeParse(req.body?.options);
    if (!parsed.success) {
      return res.status(400).json({ error: 'options غير صالحة', issues: parsed.error.flatten() });
    }
    const prompt = String(req.body?.prompt ?? '').trim();
    if (!prompt) return res.status(400).json({ error: 'البرومبت مطلوب' });
    const meta = repo.createProject({ prompt, options: parsed.data, title: req.body?.title });
    res.status(202).json({ id: meta.id, status: meta.status });
    // لا ننتظر إكمال الأنابيب
    void runPipeline(meta, 'real');
  });

  app.get('/api/projects/:id', (req, res) => {
    const p = repo.getProject(req.params.id);
    if (!p) return res.status(404).json({ error: 'not found' });
    res.json(p);
  });

  app.delete('/api/projects/:id', (req, res) => {
    res.json({ ok: repo.deleteProject(req.params.id) });
  });

  // يسجّل "آخر فتح" (ترتيب المعرض)
  app.post('/api/projects/:id/open', (req, res) => {
    const p = repo.markOpened(req.params.id);
    if (!p) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true, project: p });
  });

  // ---- SSE live events ----
  app.get('/api/projects/:id/events', (req, res) => {
    const p = repo.getProject(req.params.id);
    if (!p) return res.status(404).json({ error: 'not found' });
    sseHeaders(res);
    subscribe(req.params.id, res);
  });

  // ---- serve project files (final mp4 / thumbs) مع دعم Range للمشغّل ----
  app.get('/api/projects/:id/file/*', (req, res) => {
    const rel = (req.params as unknown as Record<string, string>)['0'] ?? '';
    const abs = join(paths.projects, req.params.id, rel);
    if (!abs.startsWith(paths.projects) || !existsSync(abs)) return res.status(404).end();
    const mime = rel.endsWith('.mp4') ? 'video/mp4' : rel.endsWith('.jpg') || rel.endsWith('.jpeg') ? 'image/jpeg' : 'application/octet-stream';
    const st = statSync(abs);
    res.setHeader('Content-Type', mime);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-store');

    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (!m) {
        res.status(416).setHeader('Content-Range', `bytes */${st.size}`);
        return res.end();
      }
      let start = m[1] ? parseInt(m[1], 10) : 0;
      let end = m[2] ? parseInt(m[2], 10) : st.size - 1;
      if (m[1] === '' && m[2]) { start = Math.max(0, st.size - parseInt(m[2], 10)); end = st.size - 1; }
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= st.size) {
        res.status(416).setHeader('Content-Range', `bytes */${st.size}`);
        return res.end();
      }
      end = Math.min(end, st.size - 1);
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${st.size}`);
      res.setHeader('Content-Length', end - start + 1);
      if (req.method === 'HEAD') return res.end();
      return createReadStream(abs, { start, end }).pipe(res);
    }

    res.setHeader('Content-Length', st.size);
    if (req.method === 'HEAD') return res.end();
    createReadStream(abs).pipe(res);
  });

  // ---- edit instructions (اترك مساراً للوكيل) ----
  app.post('/api/projects/:id/edit', async (req, res) => {
    const p = repo.getProject(req.params.id);
    if (!p) return res.status(404).json({ error: 'not found' });
    const instruction = String(req.body?.instruction ?? '').trim();
    if (!instruction) return res.status(400).json({ error: 'التعليمة مطلوبة' });
    res.json({ queued: true, instruction });
    // في مرحلة 6: إرسال التعليمة للوكيل (فارغة الآن)
  });

  return app;
}