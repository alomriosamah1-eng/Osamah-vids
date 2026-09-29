# معمارية منصة Osamah Vids (System Architecture)

تم تصميم منصة **Osamah Vids** بمعمارية قابلة للتوسع والتطوير مستقبلاً (Scalable & Decoupled Architecture)، تفصل بشكل كامل بين واجهة المستخدم (Frontend)، خادم الوسائط والوظائف (Backend API & Job Queue)، ومحركات الذكاء الاصطناعي (AI Model Workers / Providers)، وطبقة التخزين (Storage Layer).

---

## 1. المخطط العام للنظام (High-Level Architecture)

```
┌─────────────────────────────────────────────────────────┐
│              Frontend Layer (React 19 + Vite)           │
│  - Arabic RTL / English LTR                             │
│  - Prompt Studio & AI Prompt Enhancer                   │
│  - Real-time Video Studio & Video Player (Cinema Mode)  │
│  - Video History, Filter & Statistics                   │
│  - Remote GPU & Colab Worker Connect Console            │
└───────────────────────────┬─────────────────────────────┘
                            │ REST API / HTTPS Polling
                            ▼
┌─────────────────────────────────────────────────────────┐
│             Backend API & Orchestration Layer           │
│                    (Node.js / Express)                  │
│  - REST Endpoints (/api/v1/videos/*, /api/v1/health)    │
│  - In-Memory & Persistent Async Job Queue Manager       │
│  - Server-Side Gemini Prompt Engineering Engine         │
│  - Remote GPU Worker Bridge & Health Dispatcher         │
└─────────────┬─────────────────────────────┬─────────────┘
              │                             │
              ▼                             ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│   AI Model Providers      │ │       Storage Layer       │
│   (Abstraction Layer)     │ │                           │
│ ┌───────────────────────┐ │ │ - Local Static Media      │
│ │ Wan2.1 (1.3B / 14B)   │ │ │ - Thumbnail Generator     │
│ ├───────────────────────┤ │ │ - Cloud Storage Adapter   │
│ │ LTX-Video Turbo       │ │ │   (GCS / S3 compatible)   │
│ ├───────────────────────┤ │ │ - JSON Metadata Store     │
│ │ Colab GPU Worker      │ │ └───────────────────────────┘
│ ├───────────────────────┤ │
│ │ Direct Render Engine  │ │
│ └───────────────────────┘ │
└───────────────────────────┘
```

---

## 2. طبقة تجريد النماذج (Model Provider Abstraction)

تسمح واجهة `ModelProvider` بإضافة أو تبديل نماذج توليد الفيديو دون أي تغيير في الـ Frontend أو الـ Job Queue:

```typescript
export interface VideoGenerationParams {
  prompt: string;
  enhancedPrompt?: string;
  negativePrompt?: string;
  model: 'wan2.1-1.3b' | 'wan2.1-14b' | 'ltx-video' | 'hunyuan-video';
  resolution: '480p' | '720p' | '1080p';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '21:9';
  duration: number; // in seconds (3, 5, 8, 10)
  fps: number; // 16, 24, 30
  seed?: number;
  imageUrl?: string; // for Image-to-Video
  cameraMotion?: 'pan' | 'tilt' | 'zoom' | 'orbit' | 'dolly' | 'static';
}
```

---

## 3. دورة حياة المهمة (Job State Machine)

```
[ POST /api/v1/videos/generate ]
             │
             ▼
        [ QUEUED ] (في انتظار بدء المعالجة)
             │
             ▼
      [ PROCESSING ] (تحميل أوزان النموذج وتشفير الـ Prompt)
             │
             ▼
      [ GENERATION ] (Diffusion Transformer Sampling & Denoising)
             │
             ▼
       [ RENDERING ] (فك تشفير Wan-VAE وتحويل الإطارات إلى MP4)
             │
             ├───────────────┬───────────────┐
             ▼                               ▼
       [ COMPLETED ]                    [ FAILED ]
   (حفظ MP4 وتوليد الغلاف)          (تسجيل سبب الخطأ وإعادة المحاولة)
```

---

## 4. طبقة التخزين (Storage Strategy)
- تخزين وسائط الفيديو والـ Thumbnails داخل مجلد `storage/videos/` محلياً.
- تخزين سجل الوظائف والبيانات الوصفية داخل `storage/jobs.json`.
- دعم التصدير والربط المباشر مع Google Cloud Storage (GCS) أو AWS S3 عبر الـ Storage Adapter.
