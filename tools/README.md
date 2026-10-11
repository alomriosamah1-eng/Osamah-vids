# tools/ — الأدوات الموطَّنة داخل المشروع

policy: **كل ما يحتاجه المشروع موجود هنا** (انظر `docs/adr/ADR-0006-vendor-tools.md`).

| المسار | المحتوى |
|---|---|
| `cache/ms-playwright/` | متصفحات Playwright (عبر `PLAYWRIGHT_BROWSERS_PATH`) |
| `python/.venv/` | بيئة Python + `edge-tts` |
| `ffmpeg/` | ffmpeg/ffprobe **static** |
| `bin/` | أغلفة: `ffmpeg`, `ffprobe`, `edge-tts`, `opencode` |
| `env.sh` | متغيّرات البيئة (يُولَّد آليًا) |

## التجديد
```bash
npm run tools:vendor   # إعادة التوطين بعد مسح tools/ أو للنقل
```
المسارات المُوجَّهة في `tools/env.sh` يُحمّلها الخادم (`apps/server`) عند الإقلاع إذا وُجدت.