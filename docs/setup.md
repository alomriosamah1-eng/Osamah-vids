# دليل التثبيت والتشغيل المحلي (Setup & Running Guide)

## 1. المتطلبات الأساسية
- Node.js 18+ أو 20+
- npm أو pnpm أو yarn
- بيئة Python 3.10+ مع PyTorch 2.1+ و CUDA (إذا كنت تريد تشغيل النموذج محلياً)
- مفتاح Google Gemini API (اختياري للـ Prompt Enhancer الذكي)

---

## 2. خطوات التثبيت السريع للواجهة والخادم

```bash
# 1. تثبيت الحزم المطلوبة
npm install

# 2. تشغيل بيئة التطوير (Full-stack Server + Vite Frontend)
npm run dev

# 3. فتح التطبيق في المتصفح
# http://localhost:3000
```

---

## 3. تشغيل الـ Colab GPU Worker (لحوسبة نموذج Wan2.1 مجاناً)
1. افتح الملف `colab/osamah_vids_wan21_worker.ipynb` في Google Colab.
2. اختر Runtime -> Change runtime type -> T4 GPU (أو A100).
3. شغّل خلايا التثبيت لتحميل `diffusers`, `torch`, ونموذج `Wan-AI/Wan2.1-T2V-1.3B-Diffusers`.
4. انسخ رابط الـ Tunnel (مثل ngrok أو Localtunnel) والصقه في إعدادات المنصة داخل **Osamah Vids** لربط التوليد مباشرة بالـ Colab GPU!
