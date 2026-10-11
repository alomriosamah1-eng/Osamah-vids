# سجلّ التغييرات — CHANGELOG

> سجلّ آلي يكتبه الوكيل بعد كل تغيير. الصيغة:
> `- YYYY-MM-DD HH:MM | phase | files | what | verified`

## 2026-10-11 — اختصار سطح المكتب + أيقونة، وتنظيف ورفع المستودع
- 2026-10-11 05:45 | release | apps/desktop/icon.svg، apps/desktop/assets/icon-{48,64,128,256,512}.png | **أيقونة التطبيق** بهوية الشعار (مربّع متدرّج cyan→violet→amber مع شكل V) مُولَّدة SVG ثم PNG بأحجام متعددة | ✅ تحقّق بصري
- 2026-10-11 05:45 | release | run-app.sh | **مشغّل موحّد** يبدأ الخادم + الواجهة + Electron (idempotent، مسار `ROOT` مشتق من موقع السكربت ليكون محمولًا) | ✅ `bash -n`
- 2026-10-11 05:45 | release | ~/.local/share/applications/osamah-vids-ai.desktop، ~/Desktop/osamah-vids-ai.desktop | اختصار سطح مكتب باسم **Osamah vids ai** (Icon=osamah-vids-ai مثبّتة في hicolor 48→512، trusted، Exec=run-app.sh) | ✅ desktop-file-validate
- 2026-10-11 05:45 | release | .gitignore، projects/.gitkeep | تنظيف المستودع: تجاهل مكتبة المشاريع وقت التشغيل `projects/*` (مع الإبقاء على `.gitkeep`)، و`*.swp`؛ لا node_modules/dist/caches | ✅ 106 ملفًا، ~908K فقط
- 2026-10-11 05:45 | release | (git) | تهيئة مستودع نظيف (فرع main، commit واحد شامل) والرفع إلى `git@github.com:alomriosamah1-eng/Osamah-vids.git` مع استبدال main القديم (force) | ✅ `bacd144...b9909fd main -> main (forced update)`

## 2026-10-11 — إصلاح مشغّل الفيديو (دعم HTTP Range) + تشغيل التطبيق
- 2026-10-11 04:15 | p7 | apps/server/src/http/server.ts | **إصلاح**: مسار `GET /api/projects/:id/file/*` كان يتجاهل ترويسة `Range` ويعيد `200` بالملف كاملًا → منع `<video>` من التشغيل/التنقّل. الآن يعيد `206 Partial Content` مع `Content-Range`/`Content-Length` الصحيحين، ويدعم النطاقات اللاحقة `bytes=-N`، و`416 Range Not Satisfiable` للنطاقات غير الصالحة، و`HEAD`، و`Cache-Control: no-store` | ✅ متحقَّق
- 2026-10-11 04:15 | p7 | apps/web (لا تغيير) | `VideoPlayer` يطلب `/api/projects/:id/file/out/final.mp4` (يمر عبر بروكسي Vite) — المشكلة كانت في الخادم لا الواجهة | ✅
- 2026-10-11 04:15 | p7 | (تحقق) | `curl -H 'Range: bytes=0-1023'` عبر 8799 وعبر 5173 → `206` + `Content-Range: bytes 0-1023/1631878`؛ Playwright (chromium موطَّن) على الرابط: `loadedmetadata` dur=17.95s، readyState=4، 1280×720، والقفز إلى t=8s نجح، والطلب أرسل `Range: bytes=0-` | ✅ متحقَّق
- 2026-10-11 04:15 | p7 | (تشغيل التطبيق) | تشغيل الخادم (dist على 8799) + Vite (5173، كان يعمل) + **Electron** (`electron . --no-sandbox`؛ sandbox الـSUID غير مضبوط في البيئة) — نافذة التطبيق تعمل | ✅


- 2026-10-11 04:05 | p6 | apps/server/src/config.ts | إضافة `render.sceneMode: 'html' | 'json'` (الافتراضي `html`) | ✅ typecheck
- 2026-10-11 04:05 | p6 | apps/server/src/adapters/opencode.ts | **ميزة**: `generateScenesHtml` + `htmlScenePrompt` + `extractHtml` + `validSceneHtml` — لكل مشهد مستند HTML قائم بذاته (RTL، بلا موارد خارجية، `window.__seek(t,dur)`+`window.__ready`)، حتى 3 محاولات مع إعادة تغذية الخطأ؛ يُبثّ `scene_generated` (spec `{kind:'html'}`) | ✅
- 2026-10-11 04:05 | p6 | apps/server/src/adapters/capture.ts | **ميزة**: `captureHtmlFrames` — `page.setContent` + حجب كل الطلبات غير `data:/about:/blob:` + تجميد `requestAnimationFrame` + حقن `BASE_STYLE` (`animation/transition:none!important`) + انتظار `__ready` + `__seek` لكل إطار + screenshot؛ اللوحة 1920×1080/1080×1920 | ✅
- 2026-10-11 04:05 | p6 | apps/server/src/adapters/media.ts | `encodeImageSequence` يقبل أبعاد خرج اختيارية ويحجّم بـ`scale=W:H:flags=lanczos` (توافق خلفي محفوظ) | ✅
- 2026-10-11 04:05 | p6 | apps/server/src/pipeline.ts | وحدة مشهد موحّدة `PipelineUnit`؛ مراحل scenes/voice/render تدعم الوضعين فرعيًّا حسب `sceneMode`؛ HTML: التقاط بلوحة الأساس ثم تحجيم للخرج؛ JSON: المسار السابق كما هو | ✅ typecheck+build
- 2026-10-11 04:05 | p6 | docs/adr/ADR-0007-html-scene-generation.md + docs/scene-contract-html.md (جديد) | القرار + العقد الكامل؛ تحديث `docs/index.md`، `architecture.md`، `backend.md`، `pipeline.md` | ✅ `npm run lint:docs`
- 2026-10-11 04:05 | p6 | (تحقق مستقل للمحرّك) | التقاط مشهد اصطناعي عبر `captureHtmlFrames` (1920×1080): 30 إطارًا متمايزًا + ترميز lanczos→1280×720 | ✅
- 2026-10-11 04:05 | p6 | (تحقق E2E حقيقي كامل) | `POST /api/projects` (وثائقي/أفقي/720p/أنثى/20ث، "الذكاء الاصطناعي والتعليم") → `0c44b23e`؛ المراحل: understand→script→**scenes (3 مشاهد HTML حقيقية: شبكة خلفية، بطاقات زجاجية backdrop-filter، أيقونات SVG، مخططات، عدّاد متحرك، تسهيلات easing)**→voice (3×edge-tts)→render (539 إطارًا 1920×1080 ثم تحجيم)→audio→export→qc → **`status:ready`، `out/final.mp4` 1,631,878B (1.56MB)، 1280×720@30fps، 17.95ث، h264 High + aac stereo، `qc_result ok:true`، thumb.jpg** | ✅ متحقَّق
- 2026-10-11 04:05 | p6 | (ملاحظة أداء) | زمن الالتقاط عالٍ للتصاميم الثقيلة (≈1.7ث/إطار عند 1920×1080 بسبب `backdrop-filter`/التدرجات على معالج برمجي، وتحت حمل الجهاز) → 20ث ≈ 15 دقيقة. **تحسين لاحق**: الالتقاط بدقّة الخرج مباشرة (720p ≈ 2× أسرع) أو rasterizer أسرع | ⚠️ معروف


## 2026-10-11 — تنظيف قائمة المشاريع + إعادة محاولة الأنبوب الحقيقي
- 2026-10-11 02:35 | p5 | apps/server/src/projects/repo.ts | **إصلاحان**: (1) `listProjects`/`saveIndex` يستبعدان `.trash` — منعًا لعودة المشاريع المحذوفة إلى المعرض، (2) `deleteProject` يحذف الهدف في `.trash` قبل النقل لتفادي فشل `renameSync` عند تكرار الاسم | ✅
- 2026-10-11 02:35 | p5 | (تحقق الأنبوب الحقيقي بقوة) | `POST /api/projects` (prompt حقيقي، vertical/female/20s/educational/720p) → `202 queued` → `generating`؛ عبر `understand` ثم `script` أعاد تشغيل المحاولات على الحصّة، ثم فشل نظيف بعد ~115ث: `failed` مع حدث `error stage:"script"` يحمل نصّ Google الصريح (`Quota exceeded … limit: 20, model: gemini-2.5-flash, retry in 31m`). الأحداث في `events.ndjson`: `stage_started(understand) → stage_started(script) → error(script)` | ✅ متحقَّق
- 2026-10-11 02:35 | p5 | (ملاحظة تشغيلية) | `pkill -f 'apps/server/dist/index'` لم يقتل الخادم القديم — استخدم `kill <pid>` على مالك المنفذ (`ss -ltnp | grep 8799`) قبل إعادة التشغيل، وتأكد من خلوّ السجل من EADDRINUSE | توثيق

## 2026-10-11 — الأنبوب الحقيقي (المرحلة 5: توليد فيديو فعلي)
- 2026-10-11 02:20 | p5 | apps/server/src/adapters/{media,tts,capture}.ts (جديد) | **الأنبوب الحقيقي مكتمل البنية**: `media.ts` (إطارات→encode libx264، صوت سرد→مسار كامل، mux نهائي aac، thumb، ffprobe QC)، `tts.ts` (edge-tts + إعادة محاولة مؤجّلة على 4xx من Bing)، `capture.ts` (Playwright يقود صفحة تسجيل حتمية عبر `window.__ready/__loadScene/__seek` على شبكة 30fps بأرقام عامة) | ✅
- 2026-10-11 02:20 | p5 | packages/render-engine/record/{index.html,record.js} (جديد) | صفحة تسجيل: تحمّل `dist/index.js`، `mountScene`/`applyLayer`، تعلن `__ready` بعد fonts.ready. **إصلاح**: `const stage = getElementById()!` — `!` غير صالح في JS خام → SyntaxError «Unexpected token !» | ✅
- 2026-10-11 02:20 | p5 | apps/server/src/http/server.ts | تثبيت استاتيكي `/render-engine` → `packages/render-engine` (يخدم صفحة التسجيل و dist) | ✅
- 2026-10-11 02:20 | p5 | apps/server/src/pipeline.ts | `runReal` بدل الـ stub: understand → brief.json → script.json (فشل صريح إن بلا مشاهد) → generateScenes بتحقق zod + حفظ `scenes/scene_NN.json` + `scenesCount` → سرد edge-tts (`narration/*.mp3`) ومدة المشهد الحقيقي = سرد+ذيل (أو fallback نصي) → التقاط إطارات متصلة → encode → `audio_mix.wav` → mux `out/final.mp4` + `thumb.jpg` → QC ffprobe → `ready` مع `durationMs`/`sizeMb` حقيقيين | ✅ يُبنى
- 2026-10-11 02:20 | p5 | apps/server/src/adapters/opencode.ts | تقوية توليد المشاهد: برومبت يحوي العقد الكامل + أمثلة الطبقات الصالحة (بلا kinds إبداعية) + **حتى 4 محاولات** تصحيح بإدخال النص المرفوض سابقًا والأخطاء؛ `runOpencode` يعيد المحاولة على أخطاء الحصص (quota/rate-limit) بـ backoff متصاعد (30s/2m/5m) قابل للتعطيل عبر `OSAMAH_MAX_RETRIES` | ✅
- 2026-10-11 02:20 | p5 | apps/server/src/env.ts + adapters/tts.ts | `edgeTtsBin` يفضّل venv `tools/python/.venv/bin/edge-tts` | ✅
- 2026-10-11 02:20 | p5 | apps/server/src/models.ts | `probeModel` يمرّر `retryQuota:false` (اختبار النماذج لا ينتظر) | ✅
- 2026-10-11 02:20 | p5 | (تحقق مستقل) | **التقاط+صوت+مكس E2E حقيقي بلا LLM**: مشهدان (title/counter + shapes)، سرد edge-tts حقيقي (3672ms/4872ms)، التُقطت 310 إطارات 1280×720@30، → `video_only.mp4` → `audio_mix.wav` (أصوات 2×2 قناة) → `final.mp4` **10.3s / 296KB / 289KB-wav / thumb.jpg 13KB**؛ QC: `{w:1280,h:720,fps:30,dur:10.3}` | ✅ متحقَّق
- 2026-10-11 02:20 | p5 | (تحقق LLM) | `generateScenes` المستقل يُرجع 3 مشاهد صالحة zod (`text`+`shape`)؛ الأنبوب الحي يعبر understand→script→scenes→voice (سرد scene1 صار) قبل تعذّر **حصة gemini-2.5-flash المجانية** (`Quota exceeded … retry in 1h20`) — مسار الأخطاء يصنّف المشروع `failed` مع `meta.error` الواضح + إعادة المحاولة التلقائية | ✅ مُشخَّص
- 2026-10-11 02:20 | p5 | (ملاحظة بيئية) | نماذج zen (`opencode/*`) لا تعمل من CLI تابع (403 free-tier «from within OpenCode»)، وdeepseek رصيد صفر → النموذج الفعلي الوحيد: `google/gemini-2.5-flash` (20 طلب/دقيقة على الخطة المجانية) | توثيق

## 2026-10-10 — تحقق E2E (mock) + أدوات
- 2026-10-10 20:46 | p2 | apps/server/src/pipeline.ts | إصلاح mock: `animation.in:'counter'` (غير موجود في enum المخطط) → `'fade'` ليبقى عقد المشهد صالحًا | ✅ build
- 2026-10-10 20:46 | p1-2 | (تحقق) | **E2E mock متحقَّق**: `POST /api/projects` → `202 {id,status:queued}`؛ بعد ~9s `GET /api/projects` يُرجع المشروع `status:"ready"`؛ `projects/<id>/` فيه `project.json`+`events.ndjson`+`scenes/narration/out/`؛ `durationMs`=30000، `finalPath`=`out/final.mp4` | ✅ متحقَّق
- 2026-10-10 20:46 | p1 | tools/check-docs.mjs | إنشاء سكربت فحص التوثيق (كان `lint:docs` يشير لملف مفقود): يتحقق من وثائق `index.md` + ADRs + CHANGELOG + ملفات الجذر الأساسية | ✅ `npm run lint:docs` ينجح
- 2026-10-10 20:46 | p1 | package.json | تقوية السكربتات: `typecheck` يبني core ثم يفحص كل الـ workspaces؛ `build` يبني core→render-engine→web→server | ✅ ينجح
- 2026-10-10 20:46 | p1 | packages/render-engine | استيرادات نسبية بامتداد `.js` (index.ts/dom.ts) لتُحمّل كـ ESM؛ تحقّق `import()` في Node → 11 تصدير | ✅

## 2026-10-10 — تحقق البناء والتشغيل (typecheck + build + run)
- 2026-10-10 23:40 | p1-2 | packages/render-engine/src/dom.ts | إصلاحات typecheck: استيراد `clamp`/`easeOutCubic` من engine، fallback لـ `CSS_FONT_WEIGHT/SIZE/COLOR` و`alignMap(undefined)`، `scene.background.colors[0] ?? '#0b101d'`، `'animation' in layer` للوصول الآمن، إزالة `!` الزائدة عند فهرسة نقاط الشبكة | ✅ `tsc --noEmit` نظيف
- 2026-10-10 23:40 | p1 | apps/server/src/http/server.ts | إصلاح مسارات خاطئة: كل الاستيرادات النسبية كانت بلا `../` (config/env/projects/repo/pipeline/events/sse/validation) | ✅
- 2026-10-10 23:40 | p1 | apps/server/src/pipeline.ts | إصلاح استيرادات كان فيها `../` زائدة (الملف داخل src/) | ✅
- 2026-10-10 23:40 | p1 | apps/server/src/env.ts | `process.env[m[2]!]` لإرضاء noUncheckedIndexedAccess | ✅
- 2026-10-10 23:40 | p1 | apps/server/package.json | مواءمة `@types/express` مع زمن التشغيل: `^5.0.0` → `^4.17.21` (express 4.22)؛ + `req.params['0']` cast لـ wildcard route | ✅ `tsc` نظيف
- 2026-10-10 23:40 | p1-2 | packages/core | تصدير ESM سليم: استيرادات نسبية بامتداد `.js` (index.ts، scene/index.ts) كي يعمل runtime في Node للخادم | ✅ dist يُبنى ويُستورَد
- 2026-10-10 23:40 | p1-2 | packages/render-engine/package.json | إضافة `@osamah/core` إلى dependencies (كان يعتمد على الـ symlink فقط) | ✅
- 2026-10-10 23:40 | p2 | apps/web | إصلاحات typecheck: VideoPlayer objectFit mapping (stretch→fill, fit→contain, cover→cover)، NewProjectScreen `ComponentType<{size?;className?}>`، EditorScreen cast عبر `unknown` | ✅ `tsc --noEmit` نظيف
- 2026-10-10 23:40 | p1-2 | — | **تحقق التشغيل**: `node apps/server/dist/index.js` يعمل؛ `GET /api/health` → `{ok:true,env:"vendored",browsersReady:true}`؛ `GET /api/projects` → `{"projects":[]}`؛ `vite build` للأصل ينجح (dist/index.html + assets) | ✅ متحقَّق

## 2026-10-10 — المرحلة 1-2 (هيكل الواجهة + الشاشات)
- 2026-10-10 22:00 | p1 | apps/web كامل | هيكل الواجهة React+Vite+TS+Tailwind: tokens CSS (dark/light + glass + scrollbars + slider)، ThemeProvider، App+Routes داخل AppShell، TopBar (شعار+اسم+تبديل وضع)، Sidebar (RTL بالتبويبات)، Logo، GlassCard | غير متحقَّق بعد — يلزم npm install ثم build/server/فحص curl
- 2026-10-10 22:00 | p2 | apps/web/screens | الشاشات: HomeScreen (إحصاءات + آخر المشاريع + StatusDot)، NewProjectScreen (برومبت + مدة + اتجاه + أسلوب + صوت + جودة + مفاتيح + توليد)، ProjectsScreen (شبكة + حذف + فتح)، EditorScreen (معاينة + خط زمني حيّ + تعليمات الوكيل + سجل SSE)، SettingsScreen | غير متحقَّق بعد
- 2026-10-10 22:00 | p1 | apps/web/lib,features | lib/api.ts (REST client) + lib/sse.ts (connectSse) + lib/cn.ts + features/projects/store.ts (zustand projects+live events) | غير متحقَّق بعد
- 2026-10-10 22:00 | p1 | apps/desktop | Electron main.cjs (بنتظر الخادم 8799 ثم يفتح :5173، spawns server إن غاب) + preload.cjs (خيط آمن، exposes window.osamah) | غير متحقَّق بعد — يحتاج build server
- 2026-10-10 22:00 | p1 | docs/frontend.md | توثيق أسماء المكونات والشاشات والنظام الزجاجي الفعلي (بعد الـ sync) | توثيق
- 2026-10-10 22:00 | p2 | docs/RESUME.md | دليل استئناف شامل: الوضع الحالي، المطلوب الجديد (المعرض)، الخطوات القادمة بالترتيب، خبايا البيئة | توثيق

## 2026-10-10 — المرحلة 0 (تهيئة)
- 2026-10-10 | p0 | المشروع كامل | تهيئة مستودع `Osamah-vids-ai`: هيكل workspaces، README، AGENTS.md، config، opencode.json، وثائق docs/ كاملة + ADRs | هيكل فقط
- 2026-10-10 | p0 | packages/core | نواة domain: عقد المشهد zod (schema.ts)، خط زمني (timeline.ts)، أحداث أنابيب (events.ts)، utils (index.ts) | هيكل فقط — يلزم typecheck
- 2026-10-10 | p0 | packages/render-engine | محرّك حتمي: eases/animateIn/layerTransform (engine.ts) + DOM mount/render/apply (dom.ts) | هيكل فقط — يلزم typecheck
- 2026-10-10 | p0 | apps/server | REST+SSE+repo+adapters(عقد opencode)+pipeline(mock/real) على :8799 | كود قابل للقراءة، لم يُشغَّل بعد
- 2026-10-10 | p0 | tools | bootstrap.mjs + browsers مطوّنة + venv edge-tts | جزئي ⚠️ ffmpeg static فشل تنزيله (DNS) وtools/bin/env.sh غير مولّدين
