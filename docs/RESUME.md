# دليل الاستئناف — RESUME

> اقرأ هذا الملف أولًا. يلخّص **الوضع الحالي بدقة** (مُتحقَّق / غير مُتحقَّق)، والمطلوب الجديد، والخطوات القادمة بالترتيب، وخبايا البيئة، بحيث يستطيع **أي وكيل** استئناف تصميم المشروع من حيث توقّف العمل دون الحاجة لسؤال.

---

## 1) ما هو المشروع وما بنيته

تطبيق سطح مكتب **«Osamah vids ai»** لإنتاج الفيديو من نصّ (برومبت) عبر وكيل opencode:
- الوكيل يكتب **عقد مشهد JSON** (مخطط zod في `packages/core/src/scene/schema.ts`).
- خادم Node (`apps/server`) يدير المشاريع كـ JSON، يبثّ أحداثًا حيّة عبر SSE، ثم يشغّل **محرّك العرض الحتمي** (`packages/render-engine`) داخل Playwright ويسجّل الشاشة مستمرًا، ويولّد التعليق بـ edge-tts، ويُمزج ويُصيّر بـ ffmpeg.
- واجهة React (Vite+TS+Tailwind، عربية RTL، Glassmorphism) مع محرر حيّ يشبه CapCut.

**القرارات المعتمدة** (كلها موثقة):
| القرار | ADR |
|---|---|
| مستودع منفصل عن `Osamah-vids` | ADR-0001 |
| عقد مشهد JSON + محرّك حتمي (لا HTML خام) | ADR-0002 |
| تخزين JSON (لا قاعدة بيانات) | ADR-0003 |
| تسجيل مستمر عبر Playwright (لا لصق مقاطع) | ADR-0004 |
| اللحظية عبر SSE | ADR-0005 |
| توطين كل الأدوات داخل المشروع | ADR-0006 |

**البنية**:
```
apps/web        React 19 + Vite 5173 (proxy /api → 8799)
apps/desktop    Electron (main.cjs + preload.cjs، يشغّل الخادم إن غاب)
apps/server     Express REST + SSE على 8799، أنابيب mock|real، محوّل opencode
packages/core   أنواع + مخطط zod للمشهد + خط زمني + أحداث الأنابيب
packages/render-engine  محرّك رسم حتمي (engine.ts + dom.ts)
tools/          أدوات موطّنة (browsers، python venv + edge-tts، ffmpeg static، fonts)
docs/           توثيق + ADRs + سجلّ تغييرات
projects/       [مستودع إنتاج الفيديو، غير مبنيّ بعد]
```

---

## 2) الوضع الحالي بالتفصيل

### ✅ مكتمل وموثّق (متحقَّق جزئيًا/كليًا)
- **الهيكل + التوثيق**: README, AGENTS.md, opencode.json, tsconfig.base.json, root package.json (workspaces), docs كاملة + 6 ADRs.
- **`packages/core`**: `scene/schema.ts` (zod: `_contractVersion:1`, background solid/gradient, layers text|counter|shape|chart|network|timeline، animation في/تأخير/مدة/خروج، onScreenText, voiceText, musicMood)؛ `timeline.ts` (Track/Clip/Timeline/ProjectOptions/ProjectMeta/ProjectStatus + `sizeMb`,`lastOpened`)؛ `events.ts` (9 أنواع أحداث + PIPELINE_STAGES)؛ `index.ts` (durationToLabel, slugify). **✅ `tsc` نظيف ويُبنى إلى `dist`**؛ الاستيرادات النسبية بامتداد `.js` (`./scene/index.js`…) ليعمل import وقت تشغيل Node في الخادم.
- **`packages/render-engine`**: `engine.ts` (clamp, eases, animateIn, layerTransform, isVisible) + `dom.ts` (mountScene/renderLayer/applyLayer/updateNetwork/resetSceneDom). **✅ `tsc --noEmit` نظيف** (أُصلحت: استيراد clamp/easeOutCubic، fallbacks للـ tone/align، `colors[0] ?? …`، `'animation' in layer`، فهرسة شبكة آمنة). — **لم يُربط بعد بأنبوب الالتقاط** (يُشار إليه في `env.ts` فقط).
- **`apps/server`**: env.ts (يحمّل `tools/env.sh` عند الوجود + بِنات المسارات)، config.ts، events/sse.ts (SSE + ping 15s)، projects/repo.ts (index.json + atomic write + createProject ينشئ الأفرع scenes/narration/out/events + حذف→.trash + `finalSizeMb`/`hydrate`/`markOpened`)، adapters/opencode.ts (NDJSON parse + extractJson + generateScenes مع ما يصل 4 محاولات + إعادة محاولة على أخطاء الحصص)، adapters/tts.ts (edge-tts + إعادة محاولة)، adapters/capture.ts (Playwright مقود لصفحة التسجيل)، adapters/media.ts (ffmpeg/ffprobe)، pipeline.ts (mock|real)، models.ts + settings.ts، validation.ts، http/server.ts (health, config, projects CRUD, **SSE**, **`POST /api/projects/:id/open`**, **`/api/models` + `/api/models/test` + `/api/settings`**, **`/render-engine` استاتيكي**, file serve, edit stub)، index.ts. **✅ `tsc --noEmit` نظيف ويُبنى إلى `dist`**، ويُشغَّل فعليًا.
  - **`POST /api/projects` يشغّل `runPipeline(meta,'real')`**: الأنبوب الحقيقي مفعَّل (understand→script→scenes→voice→render→audio→export→qc). يُنتج `out/final.mp4` فعليًا.
- **النماذج**: `models.ts` يقرأ `opencode models` (53 نموذجًا: opencode zen ×12، google ×39، deepseek ×2، ollama-local ×1)، `authProviders` من `~/.local/share/opencode/auth.json` (google+deepseek)، `probeModel` باختبار حقيقي، `pickAutoModel` يفضّل `google/gemini-2.5-flash`. تبويب «النماذج» في الواجهة يعرضها بالحالة (متصل/بلا مفتاح/مقيَّد/غير متصل) والمزامنة عبر `settings.json`.
- **`apps/web`**: كل ملفات المصدر جاهزة (انظر §3) + **المعرض والمشغّل** + **تبويب النماذج في الإعدادات**. **✅ `tsc --noEmit` نظيف و`vite build` ينجح**؛ التحقق البصري عبر متصفح: `/gallery` يعرض مشروعين، المعرض والمشغّل يعملان، تبويب النماذج يعرض 53 نموذجًا بحالة الاتصال (52 متصلًا)؛ `errs 0` في اختبار Playwright.
- **`apps/desktop`**: main.cjs + preload.cjs (Electron). — **لم يُشغَّل بعد** (يحتاج `apps/server/dist` ✅ + واجهة :5173).
- **`tools/`**: `bootstrap.mjs` (توطين)؛ `tools/cache/ms-playwright/` فيه chromium-1228 + chromium_headless_shell-1228 (منسوخان من `~/.cache/ms-playwright`). `tools/python/.venv` فيه edge-tts. **ffmpeg static فشل تنزيله** (DNS لـ johnvansickle.com وقت التشغيل) — مجلد `tools/ffmpeg` فارغ. `tools/bin` فاضي (لا wrappers). `tools/env.sh` لم يُولّد. **بِنات الأصوات/الخطوط لم تُنقل**. (الخادم يعمل بذلك مع ffmpeg النظامي: health يُرجع `env:"vendored"`, `ffmpeg:"ffmpeg"`.)

### ✅ تحقُّقات هذه الجلسة (متحقَّق)
1. **تثبيت الحزم** — اكتمل: `added 348 packages`؛ workspaces مربوطة (`@osamah/core`, `desktop`, `render-engine`, `server`, `web`)؛ bins: electron/tsc/tsx/vite.
2. **typecheck** — نظيف لكل: `packages/core`, `packages/render-engine`, `apps/server`, `apps/web`.
3. **build** — `packages/core` → dist؛ `apps/server` → dist؛ `apps/web` → dist (vite).
4. **تشغيل الخادم** — `node apps/server/dist/index.js`؛ `GET /api/health`→`{ok:true,env:"vendored",browsersReady:true}`؛ `GET /api/projects`→`{"projects":[]}`.
5. **بناء الواجهة** — `vite build` ينجح.
6. **E2E mock** — `POST /api/projects` → `202 {id,status:"queued"}`؛ ثم `GET /api/projects` يُظهر المشروع `status:"ready"`؛ مجلد `projects/<id>/` يحوي `project.json`+`events.ndjson`+`scenes/narration/out/`. (mock لا ينتج `final.mp4` فعليًا، لذا `sizeMb` يبقى غير معرّف — متوقّع.)
7. **`npm run typecheck` / `npm run build` / `npm run lint:docs`** — كلها تنجح.
8. **render-engine ESM** — `import('@osamah/render-engine/dist/index.js')` في Node ينجح (11 تصدير).

### ⚠️ ما تبقّى غير متحقَّق
1. **Electron** — تشغيل النافذة فعليًا (يحتاج `apps/server/dist` ✅ + واجهة :5173).
2. **الأنبوب الحقيقي كامل** عبر LLM: أجزاؤه كلها مُختبَرة منفصلة (scene JSON ✅ zod، edge-tts ✅، لقطات+encode+mux+QC ✅)، وعبور الحي understand→script→scenes→voice كان سليمًا؛ **يُعاق فقط بحصّة `google/gemini-2.5-flash` المجانية** (20 طلب/دقيقة، استنفدت أثناء الاختبارات؛ يعيد المحاولة تلقائيًا). النماذج الأخرى خارج الخدمة: zen (`opencode/*`) → 403 free-tier من CLI تابع؛ deepseek → رصيد صفر.
3. **tools:vendor بالكامل** — ffmpeg static مفقود (النظامي يعمل حاليًا)؛ wrappers و`tools/env.sh` غير مولّدين.
4. **تصنيع محاوِل الصوت/الخطوط** — `assets/fonts` فاضٍ (يتّكل الالتقاط على خطوط النظام مثل Noto Kufi Arabic).

### 📌 مطلب «المعرض» (Gallery) — ✅ مُنفَّذ
**تبويب «المعرض»** لعرض الفيديوهات المنتجة، مبنيّ بالكامل: `screens/GalleryScreen.tsx` + `components/player/VideoPlayer.tsx`، موصولان في `App.tsx` (مسار `/gallery`) و`Sidebar` (أيقونة `GalleryVerticalEnd`).

### 📌 مطلب «تبويب النماذج» (Models) — ✅ مُنفَّذ
**إعدادات → النماذج**: `screens/ModelsScreen.tsx` (`ModelsPanel` مجمّعًا بالـ provider + شارة اتصال + اختبار فوري + «المتصل فقط» + الإجماليات)، حالة تحميل/فشل، اختيار النموذج يحدّث `settings.json` ويُطبَّق على `config.models.*` فورًا.

---

## 3) حالة واجهة الويب (apps/web) — ما كُتب تحديدًا

```
src/
  main.tsx                    React 19 + BrowserRouter + ThemeProvider (پسر StrictMode)
  App.tsx                     Routes داخل AppShell
  styles/index.css            tokens CSS (dark/light) + .glass + .glass-strong + scrollbars + slider
  theme/ThemeContext.tsx      زوستاند-less: context عربي للوضعين + localStorage('osamah-vids-theme')
  lib/cn.ts                   clsx + tailwind-merge
  lib/api.ts                  عملاء REST لـ /api
  lib/sse.ts                  connectSse(projectId, onEvent) → EventSource + close()
  components/ui/GlassCard.tsx سطح زجاجي عام
  components/ui/Logo.tsx      شعار متحرك (أحرف V + دوائر)
  components/layout/AppShell.tsx / TopBar.tsx / Sidebar.tsx   (تبويبات RTL)
  features/projects/store.ts  zustand: قائمة مشاريع + حركة SSE (pushEvent/clearLive) + open()
  components/player/VideoPlayer.tsx  مشغّل احترافي (نافذة portal): تشغيل/إيقاف/استئناف، ±5s، prev/next،
                                       صوت+كتم+سلايدر، سرعة 0.25×–2×، جودة، أوضاع ملاءمة/ملء/تمدد،
                                       ملء شاشة، مفاتيح Space/←→/↑↓/N/P/M/F/Esc
  screens/HomeScreen.tsx      إحصاءات + آخر المشاريع + StatusDot
  screens/NewProjectScreen.tsx برومبت + مدة + اتجاه + أسلوب + صوت + جودة + مفاتيح + توليد
  screens/ProjectsScreen.tsx  شبكة مشاريع + حذف + فتح
  screens/GalleryScreen.tsx   المعرض: شبكة/قائمة + ترتيب (size|name|createdDesc|createdAsc|lastOpened)
                              + فتح VideoPlayer؛ مصدر الملف /api/projects/{id}/file/out/final.mp4
  screens/EditorScreen.tsx    محرر حيّ: معاينة + خط زمني (مشاهد/صوت/موسيقى/ترجمات) + تعليمات للوكيل + سجل أحداث SSE
  screens/SettingsScreen.tsx  إعدادات بسيطة
```

**شيمات النظام الفعلية** (tokens في `styles/index.css`):
`--bg, --bg2, --panel, --brd, --brd-hi, --ink, --muted, --dim, --glass, --glass-strong, --accent-{cyan,violet,amber,emerald,rose}, --shadow-glass`.
وضعان: داكن (افتراضي) عبر `html.light` (class على `<html>`).

**التبويبات الحالية في Sidebar**: الرئيسية، مشروع جديد، المشاريع، **المعرض**، المحرر، الإعدادات. ✅

---

## 4) الخطوات القادمة بالترتيب (قائمة عمل أي وكيل)

> ✅ 1-7 مكتملة هذه الجلسات. التالي هو **التحقق العملي المتبقّي**.

1. **أنبوب حقيقي كامل LLM**: أعد اختبار `POST /api/projects` بعد زوال حصّة gemini-2.5-flash (أو مفتاح مدفوع) — يمرّ understand→script→scenes→voice→render→audio→export→qc وينتج `out/final.mp4` بملفاتٍ حقيقية + `sizeMb`. تحقّق من وصول أحداث SSE الحيّة إلى `store.ts` في المتصفح أثناء الإنشاء.
2. **Electron**: `npm run dev` كاملًا (ينتظر tcp:5173+8799 ثم يفتح النافذة). يحتاج `apps/server/dist` ✅.
3. **tools:vendor بالكامل**: أعد تشغيل `npm run tools:vendor` لتنزيل ffmpeg static، ثم تأكد من توليد `tools/bin/*` و`tools/env.sh`؛ انقل الخطوط إلى `assets/fonts`.
4. **التوثيق المستمر**: بعد كل خطوة سجّل في `docs/progress/CHANGELOG.md` وحدّث `docs/frontend.md`/`backend.md`/`roadmap.md`/`RESUME.md`.
5. **(مؤجّل، خارج هذا المستودع)**: `try/out/final.mp4` mono → أعِد المزج stereo (`-ac 2`) + فحص رقمي.

---

## 5) خبايا البيئة والمزالق (تعلمتها بالتجربة)

- **Bash tool timeout 120s**: أي أمر يبقى جاريًا أطول من 120s يُقتل (بما في ذلك مجموعته) ويبدو «لا ناتج». الحل: شغّل العمليات طويلة المدى بـ `setsid nohup <cmd> > /tmp/x.log 2>&1 &` ثم echo فورًا، وبعدها استطلاع `/tmp/x.log` بفواصل قصيرة.
  - ⚠️ لا تستخدم `pkill -f "<نص>"` على نصّ يطابق سطر أوامر أداتك نفسها (يقتل الـ shell وينتج timeout/abort). استخدم `pkill -f "اسم[.]ext"` (قَوس الفاصل) أو قِس على PID.
- **تشغيل Vite/Node في الخلفية**: أعد توجيه stdin من `/dev/null` في اسكربتات `resume` لمنع التعلّق.
- **npm قد يتأخر** في تنزيل Electron (شبكة). صبّر: `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` (المتصفحات موطّنة) ولا توقف العرض حتى يظهر `npm DONE`.
- **Playwright**: browsers في `tools/cache/ms-playwright` — عيّن `PLAYWRIGHT_BROWSERS_PATH` لذلك المسار وقت التشغيل (مثبت في `env.ts`). إصدار chromium = **1228** (يجب أن يطابق إصدار مكتبة playwright في `apps/server`).
- **ffmpeg static**: تنزيل johnvansickle.com قد يفشل مؤقتًا بـ DNS؛ أعد تشغيل `npm run tools:vendor` لاحقًا. النسخة الأقدم `out/video_only.mp4` في `try/` نجحت بالمكوّن النظامي.
- **لا تعليقات في الكود** (AGENTS.md)؛ الواجهة عربية RTL؛ **لا commit** إلا بطلب.
- **ESM في Node (`type:module`)**: استيرادات نسبية داخل أي حزمة تُستورَد وقت التشغيل من Node **يجب أن تحمل امتداد `.js`** (وأي مجلد عبر `./dir/index.js`)، وإلا فشل `import` في runtime. `moduleResolution: Bundler` يقبل `.js`→`.ts` ويمرّ typecheck، لكن يحرص على كتابتها في المصدر (كما في core وserver).
- **مسارات الاستيراد النسبية بحسب موقع الملف**: خطأ شائع أن يكون الملف في `src/x.ts` ويستورد `../y.js` بينما الصواب `./y.js`. تحقّق بمقارنة موقع الملف بالهدف قبل إصلاح «Cannot find module».
- **`@types/express` يجب أن يطابق express runtime**: كان `^5.0.0` مع express 4 → أخطاء أنواع في `req.params` (wildcard). الآن `^4.17.21`. `req.params['0']` (wildcard `*`) يحتاج cast `(req.params as Record<string,string>)['0']`.
- **ترتيب البناء**: `packages/core` يجب أن يُبنى أولًا (يصدّر `dist/index.d.ts`) قبل typecheck/render لِـ `packages/render-engine` و`apps/server`، لأن الحزم تُحلّ عبر `exports`→`dist`.
- **أخطاء شائعة في المحرر**: `EditorScreen` يستخدم `React.ReactNode` دون استيراد `React` — أضف `import type { ReactNode }` واستخدمها. `Sidebar` يشير إلى `/editor/demo` — حدّثه. `vite.config.ts` يعيّن alias `@` و`@osamah/core`.
- **النماذج**: `models` في `osamah-vids-ai.config.json`؛ الوكيل عبر `opencode run --format json` (توثيق كامل في `docs/opencode-integration.md`).

---

## 6) ملفات ذات أهمية لإنعاش الذاكرة
| الملف | ماذا تجد فيه |
|---|---|
| `docs/architecture.md`, `docs/pipeline.md` | كيف تتدفق البيانات نهايةً لنهاية |
| `docs/scene-contract.md`, `packages/core/src/scene/schema.ts` | عقد المشهد (مهم لربط الوكيل) |
| `docs/editor-spec.md`, `docs/frontend.md` | مواصفة المحرر والواجهة (حدّث عند إضافة المعرض) |
| `docs/backend.md` | كل نقاط API + مغلّفات SSE |
| `apps/server/src/pipeline.ts` | الأنبوب mock (مرجع أحداث فقط) و`runReal` الحقيقي (LLM→صوت→لقطات→مكس→QC) |
| `tools/bootstrap.mjs`, `tools/README.md` | كيف تُوطَّن الأدوات وأين |
| `osamah-vids-ai.config.json`, `opencode.json` | إعدادات التشغيل والوكلاء/الصلاحيات |
| `/tmp/npm_install.log` | سجلّ تثبيت الحزم (قد لا يزال جاريًا) |