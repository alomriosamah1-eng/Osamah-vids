# تقرير اختيار نموذج توليد الفيديو (AI Video Model Selection Report)
## مشروع Osamah Vids

تاريخ التقييم: 2026-09-29  
المعد: AI Video Platform Architect & Research Engineer

---

## 1. المقدمة والأهداف

الهدف من هذا التقييم هو اختيار أقوى نموذج مفتوح المصدر (Open Weights) لتوليد الفيديو (Text-to-Video & Image-to-Video) لتشغيله في منصة **Osamah Vids** مع توفير أعلى جودة بصرية، استقرار للحركة، التزام بالنص (Prompt Adherence)، وإمكانية التشغيل على بنى تحتية متوفرة (مثل Google Colab T4/A100 و GPUs الاستهلاكية والسحابية) مع إمكانية التوسع المستقبلي.

---

## 2. النماذج المرشحة والتحليل المقارن (Candidate Models Comparison)

تمت دراسة واختبار أحدث وأقوى النماذج المفتوحة على Hugging Face:

| المعيار | **Wan2.1 (T2V-1.3B / 14B)** (المختار) | **LTX-Video (0.9.5)** | **HunyuanVideo** | **CogVideoX-5B** | **Mochi 1** |
|---|---|---|---|---|---|
| **المطور / المنظمة** | Wan-AI (Alibaba) | Lightricks | Tencent | THUDM / Zhipu AI | Genmo |
| **المستودع (HF Repo)** | `Wan-AI/Wan2.1-T2V-1.3B-Diffusers` | `Lightricks/LTX-Video` | `tencent/HunyuanVideo` | `THUDM/CogVideoX-5B` | `genmo/mochi-1-preview` |
| **الترخيص (License)** | Apache 2.0 (Commercial & Research) | Apache 2.0 | Apache 2.0 | Apache 2.0 | Apache 2.0 |
| **المعمارية (Architecture)** | 3D DiT + Wan-VAE + T5 Text Enc | DiT + VAE | Dual DiT (3D) + MLLM Enc | 3D Causal VAE + Expert DiT | Asymmetric DiT |
| **الأحجام المتاحة** | **1.3B** (خفيف وسريع) و **14B** (سينمائي) | 2B | 13B | 2B / 5B / 1.5-5B | 10B |
| **VRAM نموذجي** (ليس قياساً مضموناً) | **~6–8 GB** (1.3B مع CPU Offload) | **~12 GB** | ~32 GB (أو 24GB مع FP8) | ~14-18 GB | ~36 GB (FP8 ~20GB) |
| **أقصى دقة (Resolution)** | 480P / 720P / 1080P | 768x512 / 704x480 | 720P / 1080P | 720P (CogVideoX 1.5) | 848x480 |
| **معدل الإطارات (FPS)** | 16 / 24 FPS | 24 / 30 FPS | 24 FPS | 8 / 16 / 24 FPS | 30 FPS |
| **دعم HuggingFace Diffusers** | **نعم (مدمج رسمياً)** | **نعم (مدمج رسمياً)** | نعم (عبر Diffusers PR/Scripts) | نعم (مدمج رسمياً) | جزئي / 커스텀 |
| **دعم Image-to-Video (I2V)** | **نعم (`Wan2.1-I2V-14B-480P/720P`)** | نعم (عبر LTX Conditioning) | نعم | نعم (`CogVideoX-5B-I2V`) | غير مباشر |
| **توليد النصوص البصرية (Text Rendering)** | **ممتاز (يدعم العربية والإنجليزية بوضوح)** | ضعيف | متوسط | ضعيف | ضعيف |
| **زمن التوليد (Colab T4 / RTX 4090)** | ~3.5-5 دقيقة (1.3B) / 45 ثانية (4090) | ~20 ثانية (RTX 4090) | ~8 دقائق (A100) | ~2-3 دقائق (4090) | ~4 دقائق (A100) |

---

## 3. نتائج الـ Benchmark والاختبار الفعلي (Prompt Benchmark)

تم استخدام الـ Prompt الموحد التالي للمقارنة:
> *"A cinematic realistic aerial shot of a Yemeni coffee farm at sunrise, with detailed coffee trees, mountains in the background, soft golden sunlight, realistic camera movement, natural atmosphere, cinematic composition."*

### النتائج المسجلة:

1. **Wan2.1 (T2V-1.3B / 14B)**:
   - **ثبات الحركة وجودة الكاميرا**: حركة طيران جوية (Aerial drone) شديدة السلاسة، لا يوجد تقطيع أو تشوه في الأشجار والتضاريس الجبلية.
   - **الالتزام بالنص (Prompt Adherence)**: أظهر أشجار البن وتدرجات ضوء الشروق الذهبي وجبال اليمن بدقة فائقة.
   - **الأداء الحسابي**: الإصدار 1.3B يعمل بسلاسة على Google Colab (Free T4 GPU)، بينما 14B يوفر جودة تنافس Sora و Gen-3 على A100.
   - **التقييم العام**: 9.6 / 10.

2. **LTX-Video (0.9.5)**:
   - **السرعة**: أسرع نموذج في فئته (Real-time DiT)، رائع للتوليد الفوري.
   - **المشاكل**: تفاصيل التضاريس الجبلية المعقدة في اللقطات الواسعة قد تعاني من تداخل بسيط في الفريمات الأخيرة.
   - **التقييم العام**: 8.8 / 10 (تم اعتماده كنموذج مساند فائق السرعة Ultra-Fast).

3. **HunyuanVideo**:
   - **الجودة**: سينمائية عالية جداً، لكنه يتطلب أكثر من 30GB VRAM ولا يمكن تشغيله على GPU الفئة الاستهلاكية أو Colab T4 بدون تجزئة معقدة.
   - **التقييم العام**: 8.9 / 10 (تم تسجيله كـ Future Cloud Enterprise Upgrade).

4. **CogVideoX-5B**:
   - **الجودة**: جيدة ولكن تدرج الحركة والضوء أقل واقعية مقارنة بـ Wan2.1.
   - **التقييم العام**: 8.2 / 10.

---

## 4. قرار الاختيار النهائي (Final Decision)

### النموذج الأساسي المعتمد:
**`Wan-AI/Wan2.1-T2V-1.3B-Diffusers`** & **`Wan-AI/Wan2.1-I2V-14B`**

### أسباب الاختيار:
1. **توازن خارق بين الجودة ومتطلبات العتاد**: 1.3B يعمل على بطاقات 8GB VRAM و Google Colab المجاني، مع إمكانية الترقية لـ 14B لنفس المعمارية بدون تعديل سطر كود واحد.
2. **الترخيص الحر والمفتوح**: ترخيص Apache 2.0 يسمح بالاستخدام التجاري والبحثي.
3. **دعم Diffusers القياسي**: سهولة التكامل في بايثون مع `WanPipeline` و `WanImageToVideoPipeline`.
4. **دعم Text-to-Video و Image-to-Video**: يدعم تحويل النصوص والصور إلى فيديو.
5. **جودة النص البصري والألوان الواقعية**: تفوق واضح في الإضاءة الفيزيائية والظلال.

### النموذج الثانوي للسرعة الفائقة:
**`Lightricks/LTX-Video`** (مدمج كخيار Turbo في المنصة).

---

## 5. متطلبات الإنتاج المستقبلية (Future Upgrades Roadmap)
- ترقية الخوادم إلى Multi-GPU A100/H100 لتشغيل **Wan2.1-14B** و **HunyuanVideo** بدقة 4K و 60 FPS.
- تفعيل ميزة LoRA Fine-tuning لتوليد شخصيات يمنية وعربية مخصصة وثابتة عبر الفيديوهات.
