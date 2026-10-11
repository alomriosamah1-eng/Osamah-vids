# عقد المشهد (Scene Contract) v1

> **ملاحظة**: هذا هو **الوضع البديل** (`render.sceneMode:"json"`). المسار الافتراضي الآن هو تصميم HTML/CSS/JS الذي يولّده الوكيل — راجع `scene-contract-html.md` و ADR-0007.

كل مشهد يُخزَّن في `projects/<slug>/scenes/<id>.json` ويُتحقَّق منه بواسطة zod في `packages/core/src/scene/schema.ts`.

```jsonc
{
  "id": "scene_03",
  "title": "إحصاءات الاتصال",
  "durationMs": 14000,
  "background": { "type": "gradient", "colors": ["#131f38", "#0b101d"], "angle": 135 },
  "layers": [
    { "kind": "counter", "to": 5.5, "unit": "مليار", "position": "center",
      "animation": { "in": "pop", "delay": 300, "dur": 600 } },
    { "kind": "text", "text": "إنسان متصل بالإنترنت", "tone": "title",
      "animation": { "in": "fadeUp", "delay": 900, "dur": 700 } }
  ],
  "onScreenText": "خمسة مليارات إنسان متصل",
  "voiceText": "اليوم، نحو خمسة مليارات وخمسمئة مليون إنسان متصلون بالإنترنت…",
  "musicMood": "warm"
}
```

## أنواع الطبقات (v1)
| kind | الحقول الأساسية | ملاحظات |
|---|---|---|
| `text` | `text`, `tone` (kicker/title/subtitle/body), `align` | يُعرض بخطوط المشروع |
| `counter` | `to`, `from?`, `unit`, `position` | عدّاد تصاعدي |
| `shape` | `shape` (line/rect/circle), `colors` | SVG/CSS |
| `image` | `src`, `fit`, `position` | صورة من `assets/` أو المشروع |
| `chart` | `chart` (bar/line/donut), `data[]`, `labels[]` | رسم متحرك |
| `network` | `density`, `seed` | شبكة عُقد وحزم (نمط try/) |
| `map` | `region`, `points[]` | خريطة مبسّطة |
| `timeline` | `events[]` | شريط زمني زمني |
| `particles` | `count`, `speed` | جسيمات خفيفة |

## الحركة
`animation.in ∈ { fade, fadeUp, pop, slideL, slideR, snap, draw }`، مع `delay` و`dur`. `animation.out` اختياري.

## التحقق
- يفشل أي حقل غير معروف (strict).
- يُعاد المشهد للوكيل مع رسائل zod عند الفشل.
- الإصدار محفوظ في `_contractVersion: 1`.
