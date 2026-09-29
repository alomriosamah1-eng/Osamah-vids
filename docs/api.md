# توثيق واجهات البرمجة (REST API Reference)

جميع مسارات الـ API مسبوقة بـ `/api/v1` وتعتمد صيغة JSON للطلبات والاستجابات.

---

## 1. فحص صحة الخادم (Health Check)
- **المسار**: `GET /api/v1/health`
- **الاستجابة**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "activeJobs": 0,
  "completedVideos": 14,
  "availableModels": ["wan2.1-1.3b", "wan2.1-14b", "ltx-video"],
  "colabWorkerConnected": true
}
```

---

## 2. إنشاء وظيفة توليد فيديو (Create Video Generation Job)
- **المسار**: `POST /api/v1/videos/generate`
- **جسم الطلب (Request Body)**:
```json
{
  "prompt": "A cinematic realistic aerial shot of a Yemeni coffee farm at sunrise...",
  "negativePrompt": "blurry, low quality, distorted, watermark",
  "model": "wan2.1-1.3b",
  "resolution": "720p",
  "aspectRatio": "16:9",
  "duration": 5,
  "fps": 24,
  "seed": 42,
  "cameraMotion": "drone-pan",
  "imageUrl": null
}
```
- **الاستجابة**:
```json
{
  "success": true,
  "jobId": "vid_job_89f3a1e2",
  "status": "queued",
  "message": "Job queued successfully"
}
```

---

## 3. الاستعلام عن حالة الوظيفة (Get Job Status)
- **المسار**: `GET /api/v1/videos/:id`
- **الاستجابة أثناء المعالجة**:
```json
{
  "id": "vid_job_89f3a1e2",
  "status": "generation",
  "progress": 65,
  "step": "Sampling Diffusion Steps (32/50)",
  "elapsedSeconds": 18.4,
  "output": null
}
```
- **الاستجابة عند الاكتمال**:
```json
{
  "id": "vid_job_89f3a1e2",
  "status": "completed",
  "progress": 100,
  "videoUrl": "/storage/videos/vid_job_89f3a1e2.mp4",
  "thumbnailUrl": "/storage/videos/vid_job_89f3a1e2_thumb.jpg",
  "duration": 5,
  "resolution": "720p",
  "generationTimeSec": 24.8,
  "vramUsageGB": 8.19
}
```

---

## 4. قائمة الفيديوهات المحفوظة (List Videos)
- **المسار**: `GET /api/v1/videos`
- **الاستجابة**: قائمة بكافة الفيديوهات المنشأة مع إمكانية الفرز والتصفية والبحث.

---

## 5. حذف فيديو (Delete Video)
- **المسار**: `DELETE /api/v1/videos/:id`
- **الاستجابة**: `{ "success": true, "deletedId": "vid_job_89f3a1e2" }`

---

## 6. تحسين الـ Prompt بالذكاء الاصطناعي (AI Prompt Enhancement)
- **المسار**: `POST /api/v1/prompt/enhance`
- **جسم الطلب**:
```json
{
  "prompt": "مزرعة بن في جبال اليمن عند الشروق",
  "targetStyle": "cinematic-photorealistic",
  "language": "ar"
}
```
- **الاستجابة**:
```json
{
  "originalPrompt": "مزرعة بن في جبال اليمن عند الشروق",
  "enhancedPrompt": "Breathtaking cinematic 8k drone shot of lush Yemeni coffee terraces at golden sunrise, morning mist rolling between high jagged peaks, sunbeams illuminating ripe red coffee cherries on dew-covered trees, smooth dynamic camera descending, 35mm cinema lens, ultra-detailed photorealistic texture, hyper-detailed volumetric atmosphere.",
  "negativePrompt": "blurry, low resolution, overexposed, distorted geometry, cartoon, static image",
  "suggestedParams": {
    "aspectRatio": "16:9",
    "cameraMotion": "orbit-zoom",
    "fps": 24
  }
}
```
