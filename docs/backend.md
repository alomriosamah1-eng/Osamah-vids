# الخلفية — apps/server

Node 20 + Express على المنفذ `config.server.port` (افتراضي **8799**). مسؤول عن: مكتبة المشاريع (ملفات JSON)، بثّ الأحداث (SSE)، وتشغيل خط الإنتاج عبر محوّلات.

## نقاط API (الحالية فعليًا)
| الطريقة | المسار | الوصف | الحالة |
|---|---|---|---|
| GET | `/api/health` | حالة الخدمة + مسارات الأدوات الموطَّنة | ✅ |
| GET | `/api/config` | إعدادات التطبيق المدمجة | ✅ |
| GET | `/api/projects` | قائمة المشاريع (index.json) | ✅ |
| POST | `/api/projects` | إنشاء مشروع + يشغّل `runPipeline(meta,'mock')` (202) | ✅ (mock) |
| GET | `/api/projects/:id` | تفاصيل مشروع | ✅ |
| DELETE | `/api/projects/:id` | حذف (نقل إلى `.trash`) + تحديث index | ✅ |
| POST | `/api/projects/:id/edit` | تعليمة تعديل للوكيل | ⏳ stub |
| GET | `/api/projects/:id/events` | **SSE** بثّ أحداث | ✅ |
| GET | `/api/projects/:id/file/*` | خدمة الملفات (scenes/narration/out) **مع دعم HTTP Range (206/416)** لتشغيل/تنقّل الفيديو | ✅ |

> مطلوب قريبًا لدعم المعرض: `GET /api/models`، `POST /api/projects/:id/open` (تحديث `lastOpened`)، `POST /api/projects/:id/render`. إضافة حقول `sizeMb` و`lastOpened` إلى المخطط/الحفظ.

## الأحداث (SSE) `Envelope`
الأنواع في `packages/core/src/events.ts`؛ يبثّها `events/sse.ts` (ping كل 15s):
```jsonc
{ "type": "stage_started",  "stage": "script", "ts": 1700000000000 }
{ "type": "scene_started",  "sceneId": "scene_03", "index": 2 }
{ "type": "scene_generated","sceneId": "scene_03", "spec": { /* عقد مشهد zod */ } }
{ "type": "scene_rendered", "sceneId": "scene_03", "path": "out/scenes/scene_03.mp4" }
{ "type": "render_progress","frame": 420, "total": 1200 }
{ "type": "narration_ready","sceneId": "scene_03" }
{ "type": "qc_result",      "ok": true, "info": { } }
{ "type": "done",           "final": "out/final.mp4" }
{ "type": "error",          "stage": "render", "message": "..." }
```

## المحوّلات (adapters)
| المحوّل | الملف | الحالة |
|---|---|---|
| opencode | `src/adapters/opencode.ts` | ✅ NDJSON parse + `extractJson` + `generateScenes` (وضع JSON، ما يصل 4 محاولات) + **`generateScenesHtml`/`htmlScenePrompt` (وضع HTML الافتراضي، 3 محاولات، تحقق `__seek`/`__ready`)** + إعادة محاولة على أخطاء الحصص |
| tts | `src/adapters/tts.ts` | ✅ edge-tts (venv موطَّن) مع إعادة محاولة مؤجّلة على 4xx |
| capture | `src/adapters/capture.ts` | ✅ Playwright (browsers في `tools/cache/ms-playwright`, `PLAYWRIGHT_BROWSERS_PATH` يُضبط ذاتيًا): `captureFrames` (وضع JSON، شبكة 30fps بأرقام عامة) + **`captureHtmlFrames` (وضع HTML: `setContent` + حجب الشبكة + تجميد الحركة/rAF + انتظار `__ready` + `__seek` لكل إطار + screenshot بلوحة 1920×1080/1080×1920)** |
| media | `src/adapters/media.ts` | ✅ ffmpeg/ffprobe: `encodeImageSequence` (يقبل أبعاد خرج ويحجّم بـ`scale=lanczos`)، بناء مسار صوت، mux نهائي، thumb، QC عددي، أبعاد الجودة |
| projects | `src/projects/repo.ts` | ✅ atomic write + index.json + createProject أفرعه |
| ffmpeg | spawn (`ffmpegBin`) | ✅ نظامي (static مطوَّن يبقى أولوية لاحقة) |

## الأنابيب (pipeline.ts)
- `runPipeline(meta, mode)`: `mode='mock'` يبثّ أحداثًا مسرحية (مرجع الواجهة). **`mode='real'` مفعَّل افتراضيًا في `POST /api/projects`.**
- التدفق الحقيقي: `understand (brief.json) → script (script.json) → scenes (وضع HTML: generateScenesHtml + scenes/*.html، أو وضع JSON: generateScenes + zod + scenes/*.json) → voice (edge-tts → narration/*.mp3، مدة المشهد = سرد+ذيل) → render (HTML: captureHtmlFrames بلوحة الأساس ثم تحجيم للخرج، أو JSON: capture إطارات عامة → video_only.mp4) → audio (audio_mix.wav) → export (final.mp4 + thumb.jpg) → qc (ffprobe → ready)`.
- مفتاح التبديل: `render.sceneMode` في الإعدادات (`html` افتراضيًا، `json` بديل). وحدة مشهد موحّدة `PipelineUnit` تجمع `{id,title,voiceText,onScreenText,scene?,html?}`.
- وضع HTML: لوحة تصميم ثابتة 1920×1080 (أفقي) / 1080×1920 (عمودي) والخرج يُحجَّم إلى دقّة المشروع بـlanczos. العقد: `docs/scene-contract-html.md`. القرار: ADR-0007.
- مدة المشهد لا تُقصّ أبدًا (سرد+ذيل 900ms)؛ المحرّك حتمي على شبكة 30fps.
- صفحة التسجيل: `GET /render-engine/record/index.html` (استاتيكي) تحمل `dist/index.js` وتكشف `window.__ready/__loadScene/__seek`.

## البيئة (env.ts) + المسارات
- عند بدء الخادم يُحمَّل `tools/env.sh` إن وُجد (ضبط `PLAYWRIGHT_BROWSERS_PATH`, PATH).
- `env.ts` يحدد: `root`, `projectsRoot`, `ffmpegBin/ffprobeBin/edgeTtsBin/opencodeBin`, `browsersPath`.
- CORS: `http://localhost:5173` و`http://127.0.0.1:5173`.
- تشغيل: `npm run dev:server` أو داخل Electron عبر spawn لـ `apps/server/dist/index.js`.

## حقول المشروع (ProjectRecord)
`id, title, status('draft'|'queued'|'generating'|'rendering'|'ready'|'failed'), prompt, options{durationSeconds, orientation, style, voice, quality, captions, music}, createdAt, updatedAt, events[]` — أفرعه: `scenes/ narration/ out/ events/`. *(تضاف لاحقًا: `sizeMb`, `lastOpened`, `thumbnail`)*