# عقد مشهد HTML/CSS/JS (v1)

> المسار الافتراضي لتوليد تصميم الفيديو. راجع ADR-0007. للمسار القديم راجع `scene-contract.md`.

## الفكرة
لكل مشهد يُنتج الوكيل **مستند HTML واحد قائم بذاته** يوضع في `projects/<id>/scenes/scene_NN.html`.
ثم يلتقطه الخادم حتميًّا عبر Playwright (`captureHtmlFrames`) إطارًا إطارًا.

## العقد الإلزامي (يفرضه المحوّل ويلتقطه المحرّك)
| الاسم | النوع | الوصف |
|---|---|---|
| `window.__ready` | `boolean` | يُضبط `true` بعد بناء الـDOM وتجهيزه. ينتظره المُلتقِط قبل `__seek`. |
| `window.__seek(tMs, durMs)` | `function` | تُحدّث الـDOM لتعكس لحظة الزمن `tMs` (من 0 إلى `durMs`). **المصدر الوحيد للحركة.** |

يمرّر المُلتقِط `tMs = frame*1000/fps` لكل إطار، و`durMs` = مدّة المشهد الحقيقية (سرد + ذيل).

## قواعد إلزامية
1. مستند واحد كامل: `<!doctype html><html dir="rtl" lang="ar"> … </html>`.
2. **ممنوع موارد خارجية**: لا روابط، لا خطوط من الإنترنت، لا صور عن بُعد، لا `fetch` (الشبكة محجوبة أصلًا).
3. **حتمية تامة**: ممنوع CSS `animation`/`transition`، وممنوع `setTimeout`/`Date.now`/عشوائية غير مزروعة. يُجمَّد `requestAnimationFrame`.
4. لوحة التصميم: `body` بمقاس `100vw×100vh` بلا تمرير، واستخدام `vw/vh/%` للتجاوب. الأساس 1920×1080 (أفقي) / 1080×1920 (عمودي).
5. الخط: `"Cairo","Noto Sans Arabic","Noto Kufi Arabic",system-ui,sans-serif` (متوفّرة محليًّا عبر fontconfig).
6. تصميم احترافي: تدرجات/شبكات خلفية، بطاقات زجاجية (`backdrop-filter`)، ظلال، أيقونات SVG، أعداد/مخططات، خطوط زمنية.
7. المخرَج كود HTML فقط بلا شرح.

## كيف يُحجَّم الخرج
يُلتقط بلوحة الأساس (مثلًا 1920×1080)، ثم `encodeImageSequence(..., outW, outH)` يحجّم بـ`scale=W:H:flags=lanczos` إلى دقّة المشروع (720p/1080p/1440p).

## التحييد في الالتقاط
- حجب كل الطلبات غير `data:`/`about:`/`blob:` عبر `page.route`.
- `page.addInitScript`: تعطيل `requestAnimationFrame`.
- حقن `BASE_STYLE`: تصفير الهوامش + `overflow:hidden` + `animation:none!important; transition:none!important`.

## التبديل
في الإعدادات: `render.sceneMode: "html" | "json"` (الافتراضي `html`).
- `html` → `generateScenesHtml` + `captureHtmlFrames` + تحجيم.
- `json` → `generateScenes` (zod) + `captureFrames` (المحرك القديم).

## مثال مصغّر
```html
<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>
body{margin:0;height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 30% 20%,#1b3a5b,#050b14);color:#fff}
h1{font-size:8vh;margin:0}
</style></head><body>
<h1 id="t">مرحبًا</h1>
<script>
window.__ready=false;
window.__seek=function(t,d){document.getElementById('t').style.opacity=Math.min(1,t/800);};
window.__seek(0,1);window.__ready=true;
</script></body></html>
```
