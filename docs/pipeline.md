# خط الإنتاج — pipeline.md

```mermaid
flowchart LR
  P[برومبت+خيارات] --> S1[1. understand]
  S1 --> S2[2. script]
  S2 --> S3[3. scenes: HTML تصميم (أو JSON)]
  S3 --> S4[4. voice]
  S3 --> S5[5. render capture]
  S4 --> S6[6. audio mix]
  S5 --> S7[7. qc]
  S6 --> S8[8. export]
  S7 --> S8
```

| # | المرحلة | المدخل | المخرج | الأداة |
|---|---|---|---|---|
| 1 | understand | prompt+options | `brief.json` | opencode (JSON) |
| 2 | script | brief | `script.json` (مشاهد + نصوص + مدد) | opencode (JSON) |
| 3 | scenes | script | **`scenes/*.html` (تصميم HTML/CSS/JS — افتراضي)** أو `scenes/*.json` (وضع JSON) | opencode (`generateScenesHtml` أو `generateScenes`+zod) |
| 4 | voice | نصوص المشاهد | `narration/*.mp3` + `narration.json` | edge-tts (venv موطَّن) |
| 5 | render | مشاهد + تصميم | `out/video_only.mp4` | HTML: Playwright `setContent`+`__seek` (لوحة 1920×1080) ثم lanczos؛ JSON: محرك حتمي + ffmpeg |
| 6 | audio | تعليق + موسيقى | `out/audio_mix.wav` | ffmpeg (bed + sidechain duck) |
| 7 | qc | الفيديو | `out/qc.json` | ffprobe (+ luma اختياري) |
| 8 | export | الكل | `out/final.mp4` + `thumb.jpg` | ffmpeg mux |

> التبديل بين وضعَي المشاهد: `render.sceneMode: "html" | "json"` (الافتراضي `html`). راجع `scene-contract-html.md` و ADR-0007.

## قواعد زمنية (مهمّة)
- زمن المشهد الحقيقي = `narrationMs + trailMs(900)` — **لا** يقصّ أي مشهد.
- المحرّك حتمي: `designTime(t)=t` (هوية)، واللقطات على شبكة 30fps.
- التسجيل بسياق واحد متصل (بلا وصلات/وميض أبيض) — راجع ADR-0004.

## أحداث كل مرحلة
تُبثّ عبر SSE بالترتيب: `stage_started → scene_started → scene_generated → scene_rendered → ... → stage_* → done|error`.
