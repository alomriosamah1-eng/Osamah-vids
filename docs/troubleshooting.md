# دليل استكشاف الأخطاء وإصلاحها (Troubleshooting Guide)

## 1. مشكلة نفاد ذاكرة الـ GPU (CUDA Out of Memory)
- **السبب**: تشغيل دقة 720p أو إطارات طويلة دون تفعيل `enable_model_cpu_offload` أو `enable_vae_tiling`.
- **الحل**:
  1. تفعيل تفريغ الذاكرة للمعالج:
  ```python
  pipe.enable_model_cpu_offload()
  pipe.vae.enable_tiling()
  ```
  2. استخدام صيغة FP8 أو BF16 بدلاً من FP32.

---

## 2. بطء الاتصال بالـ Colab Worker
- **السبب**: انقطاع نفق ngrok أو Localtunnel أو انتهاء جلسة Colab المجانية بعد فترة خمول.
- **الحل**:
  1. إعادة تشغيل الخلية البرمجية في كولاب واستخراج رابط نفق جديد.
  2. تحديث رابط الـ Worker في لوحة إعدادات Osamah Vids.

---

## 3. رسالة خطأ CORS في GitHub Pages
- **السبب**: عدم السماح بنطاق صفحة GitHub Pages في الـ Backend.
- **الحل**: ضبط إعدادات `cors({ origin: '*' })` أو إضافة نطاقك المخصص في `server.ts`.
