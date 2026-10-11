# الواجهة الأمامية — apps/web

React 19 + Vite + TypeScript + Tailwind v3. اللغة عربية RTL، تصميم **Glassmorphism**.

## المكدّس
- `react`, `react-dom`, `react-router-dom` — التوجيه.
- `zustand` — حالة المشاريع والأحداث الحيّة.
- `framer-motion` — الحركة.
- `lucide-react` — الأيقونات.
- `clsx` + `tailwind-merge` — دمج الأصناف (عبر `lib/cn.ts`).

## نظام التصميم (Glassmorphism)
رموز الألوان (CSS variables) بوضعين: داكن (افتراضي) يتبدّل بإضافة `html.light`:
```
--bg, --bg2            الخلفية (متدرّج شعاعي)
--ink, --muted, --dim  النص بثلاث درجات
--brd, --brd-hi        حدود زجاجية
--glass, --glass-strong  أسطح زجاجية
--accent-{cyan,violet,amber,emerald,rose}
--shadow-glass
```
أصناف Tailwind مخصصة: `bg`, `bg2`, `panel`, `ink`, `muted`, `dim`, `accent-cyan`… مع `glass` / `glass-strong` كصنف CSS مباشر.
المصدر: `styles/index.css` (tokens + `.glass` + `.glass-strong` + scrollbars رفيعة + سلايدر).

## الهيكل
```
src/
  main.tsx               React 19 + BrowserRouter + ThemeProvider
  App.tsx                Routes داخل AppShell (RTL)
  styles/index.css       tokens + glass + tailwind
  theme/ThemeContext.tsx context وضعين + localStorage('osamah-vids-theme')
  lib/                   cn.ts, api.ts (REST client), sse.ts (connectSse)
  components/ui/         GlassCard.tsx, Logo.tsx
  components/layout/     TopBar.tsx, Sidebar.tsx, AppShell.tsx
  features/projects/     store.ts (zustand: projects + live events per id)
  screens/               HomeScreen, NewProjectScreen, ProjectsScreen, EditorScreen, SettingsScreen, GalleryScreen
```

## الشاشات
| الشاشة | المسار | الوصف |
|---|---|---|
| الرئيسية | `/` | بطاقات إحصاءات + آخر المشاريع + إجراءات سريعة |
| مشروع جديد | `/new` | برومبت + كل الخيارات + زر التوليد → يفتح المحرر |
| المشاريع | `/projects` | شبكة المشاريع + فتح/حذف |
| المعرض | `/gallery` | الفيديوهات المنتجة: شبكة/قائمة + ترتيب + مشغّل فيديو (انظر أدناه) |
| المحرر | `/editor/:id` | خط زمني حيّ + معاينة + حقل تعليمات الوكيل |
| الإعدادات | `/settings` | القيم الافتراضية |

## مكوّنات المشاركة
- `GlassCard` — السطح الزجاجي الأساسي (`className + style + onClick`).
- `Logo` — الشعار المتحرك (نقرات ألوان تدرّج cyan→violet→amber + حرف V).
- `TopBar` — شعار + اسم «Osamah vids ai» + زر تبديل الوضع.
- `Sidebar` — تبويبات RTL: الرئيسية، مشروع جديد، المشاريع، **المعرض**، المحرر، الإعدادات.
- `StatusDot` (في Home/Gallery) — نقطة حالة ملونة: emerald جاهز، amber يُنتج، cyan يُصيّر، violet بانتظار، rose فشل.

## اللحظية
`lib/sse.ts` → `connectSse(projectId, onEvent)` يفتح `EventSource('/api/projects/:id/events')` ويوزّعها إلى `features/projects/store.ts` (`pushEvent`)، فتُحدَّث `EditorScreen` حالات المقاطع والمراحل لحظيًا (لا polling).

## مواصفة «المعرض» (Gallery) — المرحلة 2.5
تبويب يعرض الفيديوهات الجاهزة فقط:
- **أسلوب العرض**: مبدّل شبكة (grid) / قائمة (list) — يبقى في الذاكرة (`localStorage`).
- **الترتيب (sort)**: الحجم (MB)، الاسم، تاريخ الإنشاء (الأحدث أولًا/الأقدم أولًا)، آخر فتح. يتطلب من الخادم حقول `sizeMb` و`lastOpened` (انظر `docs/backend.md`, `docs/database.md`).
- **البطاقة**: مصغّرة فعّالة + الاسم + المدة + الحجم + التاريخ + شارة الجودة + أزرار (تشغيل، فتح المحرر، حذف).

## مواصفة المشغّل (VideoPlayer)
نافذة داخلية (لا مشغّل المتصفح الافتراضي) تعمل على `<video>` أصلي:
- **الانتقال**: تالي/سابق ضمن القائمة المرتّبة حاليًا (N/P) + عدّاد `i/n`.
- **التحكم**: تشغيل/إيقاف/استئناف (Space)، مؤشر تقدم + سحب الزمن، ←/→ نطّ (بدأ ±5s).
- **الصوت**: رفع/خفض/كتم (مفاتيح ↑/↓) + سلايدر حجم + أيقونات حالة.
- **أوضاع العرض**: fit (contain) / cover (اقتطاع) / stretch (تمدد) عبر `object-fit` على `<video>`.
- **الجودة**: عارض قائمة الجودة النصي (720p/1080p/1440p) — يطابق `options.quality` (نفس الملف؛ التبديل لاحقًا قد يعيد التوجيه).
- **السرعة**: 0.25 / 0.5 / 0.75 / 1 / 1.25 / 1.5 / 2 عبر `video.playbackRate`.
- **ملء الشاشة**: `video.requestFullscreen()`.
- **التصميم**: شريط علوي زجاجي (الاسم + عدّاد + إغلاق) وشريط سفلي زجاجي بأزرار lucide، تدرّجات على اللمس/المرور، عربي RTL.

## الملاحظات عند التعديل
- `EditorScreen.tsx` يستخدم `React.ReactNode` في `TrackRow` — عرّفها عبر `import type { ReactNode }`.
- `Sidebar.tsx` يتضمن رابطًا تجريبيًا `/editor/demo` — أبقِه أو استبدله بمشكلة حقيقية.
- طريق وصول الملف: `src=/api/projects/{id}/file/{path}` حيث `path` نسبي لمجلد المشروع (مثل `out/final.mp4`).