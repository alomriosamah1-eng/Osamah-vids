# ADR-0006 — توطين جميع الأدوات داخل المشروع

- **التاريخ**: 2026-10-10
- **الحالة**: مقبول

## السياق
طلب المستخدم الصريح: أي أداة/حزمة يحتاجها المشروع (Playwright، edge-tts، ffmpeg، خطوط…) يجب أن تكون **داخل مجلد المشروع** لا في مواقع خارجية.

## القرار
- حزم npm: `node_modules/` داخل المشروع (workspaces).
- Playwright browsers: `tools/cache/ms-playwright` + `PLAYWRIGHT_BROWSERS_PATH`.
- edge-tts: `tools/python/.venv`.
- ffmpeg/ffprobe: **static build** في `tools/ffmpeg` (لأن النظامي ديناميكي الترجمة بعديد المكتبات).
- خطوط RTL: `assets/fonts`.
- أغلفة موحّدة في `tools/bin/*`.

## التنفيذ
سكربت `tools/bootstrap.mjs` + أمر `npm run tools:vendor` (قابل للإعادة بعد مسح `tools/`).

## الأثر
قابلية نقل المشروع بالكامل، وقابلية إعادة البناء بضغط زر.