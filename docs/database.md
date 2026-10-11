# قاعدة البيانات / التخزين — ملفات JSON (v1)

## القرار (ADR-0003)
نستخدم **ملفات JSON لكل مشروع** كطبقة تخزين أولى، خلف واجهة `ProjectRepository` في `packages/core`. السبب:
- بيئة التشغيل Node 20.20.2 لا تدعم `node:sqlite` (يحتاج ≥22).
- لا حاجة لمزامنة/تزامن معقّد في نسخة سطح مكتب أحادية المستخدم.
- سهولة النسخ الاحتياطي والاستعراض اليدوي.

قاعدة بيانات SQLite (better-sqlite3) تُضاف لاحقًا **لفهرسة الإحصاءات** فقط دون لمس الواجهة.

## مخطط مجلد المشروع
```
projects/<slug>/
  project.json        # meta: id, title, prompt, options, status, createdAt, updatedAt
  brief.json          # مخرجات مرحلة understand
  script.json         # مشاهد السكربت (نصوص + مدد تقديرية)
  scenes/<id>.json    # عقد المشهد (JSON) بعد التحقق
  narration/<id>.mp3  # التعليق لكل مشهد
  narration.json      # { id: { ms, voice, path } }
  track.json          # نموذج الخط الزمني (مسارات + مقاطع)
  events.ndjson       # سجلّ الأحداث (append-only)
  out/
    video_only.mp4
    audio_mix.wav
    final.mp4
    thumb.jpg
    qc.json
```

## index.json (فهرس المكتبة)
على مستوى الجذر `projects/index.json`: مصفوفة ملخّصات (id, title, status, durationMs, thumb, updatedAt) لبناء صفحة المشاريع بسرعة.

## السلامة
- كتابة atomic: ملف مؤقت + rename.
- `events.ndjson` append-only (سطر JSON واحد لكل حدث).
- لا تُخزَّن أي مفاتيح سرية في ملفات المشاريع.
