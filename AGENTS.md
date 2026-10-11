# AGENTS.md — قواعد العمل للوكيل (opencode)

هذا الملف مُلزِم لأي وكيل يعمل على مستودع **Osamah vids ai**. اقرأه قبل أي تعديل.

## 1) قواعد ذهبية
1. **كل شيء داخل المشروع**: أي حزمة/أداة/مورد نحتاجه يجب أن يُوطَّن داخل مجلد المشروع (`node_modules` داخل المشروع، `tools/` للأدوات الثنائية، `assets/` للأصول). **لا** نعتمد على مسارات خارجية مثل `/home/osamah/program/بلاي رايت` أو `~/.cache` في وقت التشغيل. وقت التصميم يمكن النسخ منها للتوطين فقط.
2. **لا تعليقات في الكود** إلا عند الضرورة القصوى.
3. **لا commit** إلا بطلب صريح.
4. **RTL + عربي** في كل النصوص الظاهرة.
5. **التوثيق المستمر الآلي** إلزامي (القسم 2).

## 2) التوثيق المستمر الآلي (إلزامي)
بعد **كل** تغيير ذي معنى:
1. أضف سطرًا في `docs/progress/CHANGELOG.md` بصيغة:
   `- YYYY-MM-DD HH:MM | <phase> | <file(s)> | <what changed> | <verified how>`
2. إن غيّرت المعمارية/التدفّق: حدّث `docs/architecture.md` (مخططات Mermaid) وأضف/حدّث ADR في `docs/adr/`.
3. إن أضفت نقطة API: حدّث `docs/backend.md`.
4. إن أضفت مكوّن واجهة/شاشة: حدّث `docs/frontend.md`.
5. إن لم يُتحقّق تغيير عمليًّا، لا تُعلن انتهاءه — اكتب في السجلّ أنه غير متحقَّق.

## 3) المعمارية (ملخّص)
```
web (React) ──HTTP/SSE──> server (Node) ──adapters──> { opencode, edge-tts, playwright, ffmpeg }
                              │
                        packages/core (domain + zod scene schema)
                        packages/render-engine (deterministic scene renderer)
```
- الواجهة **عرض فقط** (تُرسل أوامر وتقرأ لقطات/أحداث).
- المنطق النقيّ في `packages/core`.
- كل I/O خارجي عبر محوّل (adapter) في `apps/server/src/adapters`.
- التقدّم يُبثّ عبر SSE (`GET /api/projects/:id/events`).

## 4) عقد المشهد
- الوكيل يُخرج **JSON** مطابقًا لمخطط `packages/core/src/scene/schema.ts` (zod).
- أي مشهد لا يجتاز التحقق يُعاد للوكيل مع رسالة الخطأ (دورة تصحيح).
- **ممنوع** أن يولّد الوكيل HTML/CSS/JS خامًّا في المسار الافتراضي (انظر ADR-0002).

## 5) ربط opencode
- الأمر المعتمد: `opencode run --format json --agent <name> --model <m> --auto --thinking "<prompt>"`.
- القراءة: NDJSON سطرًا سطرًا؛ الأحداث `step_start | text | reasoning | tool_use | step_finish | error`.
- تُحلَّل أدوات `tool_use` و`text` النهائية؛ يُستخرج JSON الناتج ثم يُتحقَّق بـ zod.
- الوكيل المخصّص: `video-agent` في `opencode.json` بصلاحيات محصورة.

## 6) أوامر مفيدة
```bash
npm run tools:vendor   # توطين الأدوات داخليًا (مرّة واحدة أو بعد مسح tools/)
npm run dev            # web + server + electron
npm run dev:web        # واجهة فقط (Vite) على :5173
npm run dev:server     # خادم فقط على :8799
npm run build          # بناء web + server + desktop
npm run typecheck      # فحص الأنواع
```

## 7) البيئة
- Node 20.20.2، Python 3.12، ffmpeg (سيُوطَّن static في `tools/ffmpeg`).
- Playwright browsers تُوطَّن في `tools/cache/ms-playwright` عبر `PLAYWRIGHT_BROWSERS_PATH`.
- edge-tts في `tools/python/.venv`.
