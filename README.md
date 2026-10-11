# Osamah vids ai

برنامج سطح مكتب احترافي لإنتاج الفيديو بالذكاء الاصطناعي، يعتمد على **وكيل opencode** لتوليد مشاهد من عقد JSON، ثم تسجيل الشاشة الحيّ عبر **Playwright** ومزج الصوت عبر **ffmpeg** — مع محرر حيّ يشبه CapCut يعرض كل طبقة وهي تُنتَج لحظيًا.

> الحالة: **قيد التنفيذ — المرحلة 1/2 (هيكل + شاشات الواجهة) + بدء المعرض**. انظر **`docs/RESUME.md`** للوضع الحالي بدقة، وقائمة الخطوات القادمة، وخبايا البيئة.

## المكوّنات
| المسار | الوصف |
|---|---|
| `apps/web` | الواجهة الأمامية — React + Vite + TypeScript + Tailwind (RTL، Glassmorphism) |
| `apps/desktop` | غلاف Electron (main/preload/IPC) |
| `apps/server` | خلفية Node: REST + SSE + تشغيل الأنابيب |
| `packages/core` | النواة النقيّة: الأنواع، عقد المشهد (zod)، نموذج الخط الزمني |
| `packages/render-engine` | محرّك تشغيل حتمي يرسم عقد المشهد (`__loadScene/__seek/__ready`) للتسجيل |
| `tools` | الأدوات المُوطّنة داخل المشروع (Playwright browsers، Python venv + edge-tts، ffmpeg static، fonts) |
| `projects` | مكتبة الإنتاج: مجلد لكل فيديو |
| `docs` | التوثيق الكامل + سجلّ التغييرات الآلي |

## المتطلبات
- Node ≥ 20 (المُختبر: 20.20.2)
- Python 3.12 (لـ edge-tts)
- نظام Linux x86_64

## التشغيل السريع
```bash
# 1) توطين كل الأدوات داخل المشروع (Playwright browsers + edge-tts venv + ffmpeg static + fonts)
npm run tools:vendor

# 2) تثبيت الاعتماديات
npm install

# 3) تشغيل كل شيء (الخادم + الواجهة + Electron)
npm run dev
```

## مبادئ أساسية
1. **كل شيء داخل المشروع**: لا اعتماد على مسارات خارجية (`طرفية`/system) لأي أداة أو حزمة يحتاجها المشروع؛ تُوطَّن في `tools/`.
2. **التوثيق المستمر الآلي**: كل تغيير يُوثَّق في `docs/progress/CHANGELOG.md` ويُحدَّث `docs/architecture.md` وADR المرتبط (انظر `AGENTS.md`).
3. **الفصل النظيف**: الواجهة عرض فقط؛ المنطق في `packages/core`؛ كل I/O عبر محوّلات (adapters) في الخادم.
4. **اللحظية**: بثّ التقدّم عبر SSE من الخادم إلى المحرر — لا polling.
