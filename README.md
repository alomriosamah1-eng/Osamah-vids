# 🎬 Osamah Vids — منصة توليد الفيديو السينمائي بالذكاء الاصطناعي

منصة حقيقية وقابلة للتشغيل والإنتاج لتوليد الفيديو بالذكاء الاصطناعي (Text-to-Video & Image-to-Video) مدعومة بأقوى النماذج مفتوحة المصدر عالمياً: **Wan2.1 (T2V-1.3B / 14B)** و **LTX-Video (0.9.5)** بترخيص **Apache 2.0**.

---

## 🌟 المزايا الرئيسية (Core Features)

- **واجهة مستخدم احترافية بالكامل**:
  - دعم كامل للغة العربية (RTL مع خط Cairo) والإنجليزية (LTR مع خط Plus Jakarta Sans) مع تبديل فوري.
  - تصميم متجاوب (Responsive) على كافة الشاشات من الموبايل (320px) وحتى الشاشات الكبيرة (1920px).
- **أحدث نماذج الذكاء الاصطناعي المفتوحة (SOTA Models)**:
  - **Wan2.1 (T2V-1.3B)**: النموذج الأساسي المعتمد (~8.19 GB VRAM، يعمل على Colab T4 و RTX GPUs).
  - **Wan2.1 (T2V-14B Cinema)**: النسخة السينمائية العملاقة بدقة وتفاصيل خيالية (A100 / 24GB+ VRAM).
  - **LTX-Video (0.9.5)**: النموذج فائق السرعة (Real-time DiT) للتوليد اللحظي.
- **نظام طابور ومعالجة غير متزامن (Asynchronous Job Queue)**:
  - تتبع لحظي لكافة مراحل التوليد: `queued` ➔ `processing` ➔ `generation` ➔ `rendering` ➔ `completed` / `failed`.
- **موجّه الذكاء الاصطناعي لتحسين النصوص (AI Prompt Enhancer)**:
  - تحويل وتوسيع الأوصاف البسيطة إلى برومبتات سينمائية غنية بإضاءة الفوليومترك، حركة الكاميرا، وكلمات النفي السلبية.
- **مشغل فيديو سينمائي متكامل (Cinema Video Player)**:
  - تحكم بالسرعة (0.5x إلى 2x)، شاشة كاملة، تكرار (Loop)، وتنزيل مباشر لملف MP4 الحقيقي.
- **سجل المحفوظات والتخزين الدائم (Permanent Storage Vault)**:
  - حفظ الفيديوهات مع البيانات الوصفية (Model, Resolution, Seed, Peak VRAM, Gen Time).
- **جسر الربط مع Google Colab و GPU Workers**:
  - نوت بوك كولاب جاهز للتشغيل بضغطة زر واحدة لتوليد الفيديوهات على كروت T4 و A100 مجاناً.

---

## 🏗️ المعمارية (Architecture)

```
Frontend (React 19 + Tailwind CSS)
    ↓  REST API
Backend (Node.js Express + Job Queue Manager)
    ↓
AI Model Abstraction (Wan2.1 Pipeline / LTX-Video / Colab Worker / Render Engine)
    ↓
Permanent Media Storage (Local / Cloud Storage Adapter)
```

---

## 🚀 التشغيل المحلي (Quickstart)

```bash
# 1. تثبيت الحزم
npm install

# 2. تشغيل بيئة التطوير
npm run dev

# 3. افتح في المتصفح
# http://localhost:3000
```

---

## 📓 تشغيل Google Colab Worker

1. افتح النوت بوك من `colab/osamah_vids_wan21_worker.ipynb` في Google Colab.
2. اختر Runtime -> T4 GPU.
3. شغّل خلايا التثبيت وافتح نفق الاتصال (Localtunnel / ngrok).
4. الصق رابط النفق في نافذة "ربط Google Colab" داخل المنصة لتوجيه التوليد إلى الـ GPU مباشرة.

---

## 📜 التوثيق الشامل (Documentation)

- [اختيار النموذج والـ Benchmark](docs/model-selection.md)
- [المعمارية التقنية](docs/architecture.md)
- [واجهات البرمجة REST API](docs/api.md)
- [دليل التثبيت والتشغيل](docs/setup.md)
- [دليل النشر وسحابية GitHub Pages](docs/deployment.md)
- [دليل الفحص والاختبارات](docs/testing.md)
- [استكشاف الأخطاء وإصلاحها](docs/troubleshooting.md)
