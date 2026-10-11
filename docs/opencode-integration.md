# ربط opencode — opencode-integration.md

## المخططان
| الوضع | الاستخدام | الأمر |
|---|---|---|
| A — CLI (v1) | توليد/فهم/سكربت/مشاهد/تعديل | `opencode run --format json … "<prompt>"` |
| B — Server+SDK (لاحقًا) | بثّ بالحرف + صلاحيات تفاعلية | `opencode serve` + `@opencode-ai/sdk` (`event.subscribe`) |

نبدأ بـ **A** لأنّه بسيط ومتين ضد تغيّر النسخ.

## الأمر المعتمد
```bash
opencode run --format json \
  --agent video-agent \
  --model opencode/big-pickle \
  --auto --thinking \
  --title "job:<id>" \
  "<PROMPT>"
```
- المخرجات: **NDJSON** على stdout؛ كل سطر حدث `{type, timestamp, sessionID, part|error}`.
- الأنواع: `step_start | text | reasoning | tool_use | step_finish | error`.
- استخراج النتيجة: ضمّ أحداث `text` (`part.text`) ثم استخراج أطول `{…}` (بعد PERF المتوقّف عند قوس التّوازن) → `JSON.parse` → zod.

## الوكيل والصلاحيات
- معرّف في `opencode.json` باسم `video-agent` (primary) و`video-qc` (subagent).
- الصلاحيات: `read/grep/glob/list/webfetch/websearch = allow`، و`bash/edit/task = deny`.
- نموذج افتراضي: `opencode/big-pickle` (من `osamah-vids-ai.config.json`).

## الموثوقية
- timeout (300s)، سقف stdout (8MB)، تغليف stderr.
- محاولات إعادة + دورة تصحيح عند فشل تحقّق zod.
- عند الفشل: تُسجَّل `warn` ولا تُسقط المشروع (تدهور لطيف).

## ملاحظات تحقّق ميداني
- يلزم التأكّد عمليًا: تمرير البرومبت (موضعيّ في argv) مقابل stdin. سنختبر في المرحلة 4 ونوثّق النتيجة في `progress/CHANGELOG.md`.
- `--thinking` لازم لأحداث `reasoning`؛ التنبيه أنّ `text` يصل عند إقفال الجزء (لا deltas) — لذا التقدّم الخشن من `step_*`/`tool_use`، والبثّ الحرفي من الوضع B لاحقًا.
