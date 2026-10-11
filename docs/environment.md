# البيئة وتوطين الأدوات — environment.md

## معلومات الجهاز (وقت الإنشاء)
| البند | القيمة |
|---|---|
| نظام التشغيل | Linux x86_64 |
| Node | v20.20.2 |
| npm | 10.8.2 |
| Python | 3.12.3 |
| opencode | 1.18.35 (`/home/osamah/.opencode/bin/opencode`) |
| ffmpeg (نظام) | 6.1.1 (ديناميكي) |
| سعة القرص | ~48GB متاحة |

## سياسة «كل شيء داخل المشروع»
أي أداة/حزمة يحتاجها المشروع تُوطَّن داخله:

| الأداة | موقع التوطين | الطريقة |
|---|---|---|
| حزم npm | `node_modules/` (workspaces) | `npm install` داخل المشروع |
| Playwright browsers | `tools/cache/ms-playwright/` | نسخ من ذاكرة النظام + `PLAYWRIGHT_BROWSERS_PATH` |
| edge-tts | `tools/python/.venv/` | `python3 -m venv` + `pip install edge-tts` |
| ffmpeg/ffprobe | `tools/ffmpeg/` | تنزيل **static build** وفك الضغط |
| الخطوط (Cairo/Noto) | `assets/fonts/` | نسخ من النظام/المشاريع |
| opencode | `tools/bin/opencode` | غلاف/رابط يشير للثنائي (أو نسخة محلية) |

> **ffmpeg**: النظامي ديناميكي الترجمة (يحتاج ~200 مكتبة)؛ لذلك نوطّن **بناء static** مستقل تمامًا داخل `tools/ffmpeg`.

## تنفيذ التوطين
```bash
npm run tools:vendor
```
يقوم بـ:
1. نسخ Playwright browsers المتاحة إلى `tools/cache/ms-playwright` (أو تنزيلها إن لم توجد).
2. إنشاء `tools/python/.venv` وتثبيت `edge-tts`.
3. تنزيل ffmpeg static إلى `tools/ffmpeg/`.
4. نسخ الخطوط العربية إلى `assets/fonts`.
5. إنشاء `tools/bin/{ffmpeg,ffprobe,edge-tts}` أغلفة تشير للنسخ الموطَّنة.

## متغيّرات البيئة وقت التشغيل
```
PLAYWRIGHT_BROWSERS_PATH=<project>/tools/cache/ms-playwright
OSAMAH_FFMPEG=<project>/tools/ffmpeg/ffmpeg
OSAMAH_FFPROBE=<project>/tools/ffmpeg/ffprobe
OSAMAH_EDGE_TTS=<project>/tools/python/.venv/bin/edge-tts
OPENCODE_BIN=<project>/tools/bin/opencode
```

## ملاحظات
- edge-tts يحتاج اتصال إنترنت وقت التوليد (يتصل بخدمة Microsoft).
- Playwright chromium موجود مسبقًا في الجهاز (chromium-1228) — ننسخه لتجنّب تنزيل ~150MB.
