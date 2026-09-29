import { PromptPreset } from '../types/client.ts';

export const translations = {
  ar: {
    brandName: 'Osamah Vids',
    tagline: 'حوّل فكرتك إلى فيديو سينمائي بالذكاء الاصطناعي',
    subTagline: 'منصة احترافية مدعومة بأحدث النماذج المفتوحة عالمياً (Wan2.1 / LTX-Video) مع طابور معالجة لحظي وجودة سينمائية فائقة.',
    
    // Navigation
    navCreate: 'إنشاء فيديو',
    navHistory: 'المحفوظات',
    navBenchmarks: 'مقارنة النماذج والـ VRAM',
    navColab: 'ربط Google Colab / GPU',
    navDocs: 'التوثيق والمعمارية',
    langToggle: 'English',

    // Creation Tabs
    tabTextToVideo: 'نص إلى فيديو (Text to Video)',
    tabImageToVideo: 'صورة إلى فيديو (Image to Video)',
    
    // Prompt Inputs
    promptPlaceholder: 'صف مشهد الفيديو بالتفصيل... (مثال: لقطة سينمائية جوية لمزارع البن في جبال اليمن عند شروق الشمس، مع حركة كاميرا درامية وتفاصيل ندى الصباح)',
    enhanceWithAI: 'تحسين سينمائي بالذكاء الاصطناعي',
    enhancingPrompt: 'جارِ تحليل وتحسين الوصف...',
    enhancedBadge: 'تم تحسين الوصف بمحرك السينما',
    showEnhancedPrompt: 'عرض الوصف الموسّع',
    hideEnhancedPrompt: 'إخفاء الوصف الموسّع',
    
    // Presets
    presetsTitle: 'نماذج وقوالب إبداعية جاهزة',
    yemeniBenchmarkPreset: 'مزارع البن اليمنية (Benchmark القياسي)',
    
    // Image to Video
    uploadImageTitle: 'اسحب صورة البداية أو انقر للرفع',
    uploadImageSub: 'يدعم صيغ JPG و PNG حتى 20 ميغابايت لتوليد حركة سينمائية مستمرة',
    removeImage: 'إزالة الصورة',
    
    // Settings
    settingsTitle: 'إعدادات الإخراج والإنتاج',
    modelLabel: 'نموذج التوليد (Model)',
    modelDefaultBadge: 'الموصى به افتراضياً',
    aspectRatioLabel: 'نسبة العرض (Aspect Ratio)',
    durationLabel: 'المدة الزمنية (Duration)',
    resolutionLabel: 'الدقة (Resolution)',
    fpsLabel: 'معدل الإطارات (FPS)',
    cameraMotionLabel: 'حركة الكاميرا (Camera Motion)',
    negativePromptLabel: 'الكلمات السلبية (Negative Prompt)',
    negativePromptPlaceholder: 'ما ترغب في تجنبه (مثال: ضبابي، حركة متقطعة، تشوه هندسي)',
    seedLabel: 'البذرة العشوائية (Seed)',
    seedPlaceholder: 'اتركه فارغاً للتوليد العشوائي',
    advancedOptions: 'خيارات متقدمة',
    hideAdvancedOptions: 'إخفاء الخيارات المتقدمة',
    
    // Camera motions
    motionDrone: 'طيران دروني سينمائي (Drone Sweep)',
    motionPan: 'تحريك أفقي (Pan)',
    motionTilt: 'تحريك رأسي (Tilt)',
    motionZoom: 'تقريب ديناميكي (Zoom In/Out)',
    motionOrbit: 'دوران مداري حول الهدف (Orbit)',
    motionDolly: 'دفع سينمائي أمامي (Dolly)',
    motionStatic: 'كاميرا ثابتة مع حركة بيئية (Static)',
    
    // Generate Button
    generateButton: 'إنشاء الفيديو الآن',
    generatingButton: 'جارِ معالجة وتوليد الفيديو...',
    
    // Job Progress
    statusQueued: 'في قائمة الانتظار',
    statusProcessing: 'تجهيز النموذج وتشفير النص',
    statusGeneration: 'توليد الإطارات (Diffusion Sampling)',
    statusRendering: 'فك التشفير وضغط MP4 (Wan-VAE)',
    statusCompleted: 'اكتمل التوليد بنجاح',
    statusFailed: 'فشل التوليد',
    
    // Video Player & Actions
    play: 'تشغيل',
    pause: 'إيقاف',
    fullscreen: 'شاشة كاملة',
    loop: 'تكرار',
    downloadVideo: 'تنزيل ملف الفيديو (MP4)',
    generateAgain: 'إعادة التوليد بنفس الإعدادات',
    createVariation: 'إنشاء تنويعة جديدة',
    copyPrompt: 'نسخ الـ Prompt',
    promptCopied: 'تم نسخ النص إلى الحافظة!',
    deleteVideo: 'حذف الفيديو',
    confirmDelete: 'هل أنت متأكد من رغبتك في حذف هذا الفيديو؟',
    videoDetails: 'تفاصيل الإنتاج والعتاد',
    modelUsed: 'النموذج المستخدم:',
    resolutionUsed: 'الدقة:',
    fpsUsed: 'الإطارات في الثانية:',
    durationUsed: 'المدة:',
    genTimeUsed: 'زمن التوليد الفعلي:',
    vramUsed: 'استهلاك VRAM:',
    seedUsed: 'رقم الـ Seed:',
    fileSize: 'حجم الملف:',
    
    // History
    historyTitle: 'سجل الفيديوهات المنشأة',
    historySubtitle: 'جميع الفيديوهات التي تم توليدها وحفظها في التخزين الدائم.',
    emptyHistory: 'لا توجد فيديوهات منشأة حتى الآن. ابدأ بكتابة فكرتك لتوليد أول فيديو!',
    searchHistory: 'بحث في سجل الفيديوهات...',
    filterAll: 'الكل',
    totalGenerated: 'إجمالي الفيديوهات',
    avgGenTime: 'متوسط زمن التوليد',
    activeWorker: 'حالة الـ Worker',
    
    // Colab & Worker Modal
    workerModalTitle: 'ربط Google Colab / GPU Worker المخصص',
    workerModalDesc: 'يمكنك تشغيل نموذج Wan2.1 أو LTX-Video مباشرة على Google Colab (مجاناً باستخدام T4 GPU) أو على خادم GPU خاص وربطه بالمنصة.',
    workerUrlLabel: 'رابط خادم التوليد (Worker URL / Tunnel)',
    workerUrlPlaceholder: 'https://xxxx.loca.lt أو https://xxxx.ngrok-free.app',
    connectWorker: 'حفظ وتفعيل الـ Worker',
    disconnectWorker: 'فصل واستخدام المعالج المدمج',
    workerConnected: 'متصل بنجاح بالخادم المخصص',
    workerDisconnected: 'يتم استخدام محرك التوليد المدمج',
    step1Colab: '1. افتح النوت بوك في Google Colab من مجلد colab/osamah_vids_wan21_worker.ipynb',
    step2Colab: '2. اختر Runtime -> T4 GPU ثم شغّل الخلايا لتثبيت Wan2.1 و Diffusers',
    step3Colab: '3. انسخ رابط النفق الناتج والصقه في الحقل أعلاه',
    
    // Benchmark Tab
    benchmarkTitle: 'مقارنة نماذج توليد الفيديو مفتوحة المصدر (SOTA Benchmarks)',
    benchmarkSub: 'دراسة هندسية شاملة لاختيار أفضل النماذج المتوفرة على Hugging Face حسب معايير الجودة، VRAM، والترخيص.',
    
    // Toasts
    jobCreatedToast: 'تم إدراج وظيفة الفيديو في الطابور بنجاح',
    jobCompletedToast: 'تم إتمام توليد الفيديو وجاهز للعرض!',
    jobFailedToast: 'حدث خطأ أثناء معالجة الفيديو',
    deleteSuccessToast: 'تم حذف الفيديو بنجاح',
  },
  en: {
    brandName: 'Osamah Vids',
    tagline: 'Transform Your Ideas into Cinematic AI Videos',
    subTagline: 'Professional AI Video Generation Platform powered by SOTA open-source models (Wan2.1 / LTX-Video) with real-time job queue and cinema quality.',
    
    // Navigation
    navCreate: 'Create Video',
    navHistory: 'History Vault',
    navBenchmarks: 'Model & VRAM Benchmarks',
    navColab: 'Connect Colab / GPU',
    navDocs: 'Docs & Architecture',
    langToggle: 'العربية',

    // Creation Tabs
    tabTextToVideo: 'Text to Video',
    tabImageToVideo: 'Image to Video',
    
    // Prompt Inputs
    promptPlaceholder: 'Describe your scene in rich detail... (e.g., Cinematic aerial shot of Yemeni coffee farm at sunrise, mountains in background, volumetric morning light, smooth camera)',
    enhanceWithAI: 'AI Cinematic Enhance',
    enhancingPrompt: 'Enhancing prompt with cinematic director...',
    enhancedBadge: 'Enhanced by AI Director',
    showEnhancedPrompt: 'Show Expanded Prompt',
    hideEnhancedPrompt: 'Hide Expanded Prompt',
    
    // Presets
    presetsTitle: 'Creative Presets & Benchmarks',
    yemeniBenchmarkPreset: 'Yemeni Coffee Farm (Official Benchmark)',
    
    // Image to Video
    uploadImageTitle: 'Drag initial frame or click to upload',
    uploadImageSub: 'Supports JPG & PNG up to 20MB for consistent cinematic video animation',
    removeImage: 'Remove Image',
    
    // Settings
    settingsTitle: 'Production & Render Settings',
    modelLabel: 'Generation Model',
    modelDefaultBadge: 'Recommended Default',
    aspectRatioLabel: 'Aspect Ratio',
    durationLabel: 'Duration',
    resolutionLabel: 'Resolution',
    fpsLabel: 'Frame Rate (FPS)',
    cameraMotionLabel: 'Camera Motion',
    negativePromptLabel: 'Negative Prompt',
    negativePromptPlaceholder: 'Elements to avoid (e.g., blurry, distorted, watermark, jittery)',
    seedLabel: 'Random Seed',
    seedPlaceholder: 'Leave empty for random seed',
    advancedOptions: 'Advanced Options',
    hideAdvancedOptions: 'Hide Advanced Options',
    
    // Camera motions
    motionDrone: 'Cinematic Drone Sweep',
    motionPan: 'Horizontal Pan',
    motionTilt: 'Vertical Tilt',
    motionZoom: 'Dynamic Zoom In/Out',
    motionOrbit: 'Orbital Circle Around Subject',
    motionDolly: 'Dolly Push Forward',
    motionStatic: 'Static Camera with Dynamic Physics',
    
    // Generate Button
    generateButton: 'Generate Video Now',
    generatingButton: 'Processing & Generating Video...',
    
    // Job Progress
    statusQueued: 'Queued in Processing Pipeline',
    statusProcessing: 'Loading Model Weights & Encoding Latents',
    statusGeneration: 'Sampling Diffusion Transformer Steps',
    statusRendering: 'Wan-VAE Latent Decoding & MP4 Packaging',
    statusCompleted: 'Completed Successfully',
    statusFailed: 'Generation Failed',
    
    // Video Player & Actions
    play: 'Play',
    pause: 'Pause',
    fullscreen: 'Fullscreen',
    loop: 'Loop',
    downloadVideo: 'Download MP4',
    generateAgain: 'Generate Again (Same Settings)',
    createVariation: 'Create New Variation',
    copyPrompt: 'Copy Prompt',
    promptCopied: 'Prompt copied to clipboard!',
    deleteVideo: 'Delete Video',
    confirmDelete: 'Are you sure you want to delete this video?',
    videoDetails: 'Production & Hardware Specs',
    modelUsed: 'Model:',
    resolutionUsed: 'Resolution:',
    fpsUsed: 'FPS:',
    durationUsed: 'Duration:',
    genTimeUsed: 'Actual Gen Time:',
    vramUsed: 'VRAM Usage:',
    seedUsed: 'Seed:',
    fileSize: 'File Size:',
    
    // History
    historyTitle: 'Generated Video Vault',
    historySubtitle: 'All videos generated and persisted in permanent storage.',
    emptyHistory: 'No videos created yet. Describe your vision to generate your first video!',
    searchHistory: 'Search videos by prompt or model...',
    filterAll: 'All',
    totalGenerated: 'Total Videos',
    avgGenTime: 'Avg Gen Time',
    activeWorker: 'Worker Status',
    
    // Colab & Worker Modal
    workerModalTitle: 'Connect Google Colab / Dedicated GPU Worker',
    workerModalDesc: 'Run Wan2.1 or LTX-Video directly on Google Colab (Free T4 GPU) or private GPU server and stream generation to Osamah Vids.',
    workerUrlLabel: 'Worker URL / Public Tunnel Endpoint',
    workerUrlPlaceholder: 'https://xxxx.loca.lt or https://xxxx.ngrok-free.app',
    connectWorker: 'Save & Connect Worker',
    disconnectWorker: 'Disconnect & Use Native Engine',
    workerConnected: 'Connected to Dedicated GPU Worker',
    workerDisconnected: 'Using Native Render Engine',
    step1Colab: '1. Open the notebook in Google Colab from colab/osamah_vids_wan21_worker.ipynb',
    step2Colab: '2. Select Runtime -> T4 GPU and run cells to load Wan2.1 diffusers',
    step3Colab: '3. Copy the public tunnel URL and paste it above',
    
    // Benchmark Tab
    benchmarkTitle: 'SOTA Open Source Video Models Benchmark',
    benchmarkSub: 'In-depth engineering research comparing Hugging Face video models based on quality, VRAM, and licensing.',
    
    // Toasts
    jobCreatedToast: 'Video generation job queued successfully',
    jobCompletedToast: 'Video generation completed and ready to play!',
    jobFailedToast: 'An error occurred during video processing',
    deleteSuccessToast: 'Video deleted successfully',
  }
};

export const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: 'yemeni-coffee',
    titleAr: 'مزارع البن اليمنية (Benchmark القياسي)',
    titleEn: 'Yemeni Mountain Coffee Terraces (Benchmark)',
    promptAr: 'لقطة سينمائية جوية لمزرعة بن يمنية عريقة في قمم الجبال عند شروق الشمس، مع أشجار البن وتدلي حبات الكرز الحمراء، جبال شامخة في الخلفية مع ضباب صباحي، حركة كاميرا درامية ناعمة، وإضاءة شمس ذهبية.',
    promptEn: 'A cinematic realistic aerial shot of a Yemeni coffee farm at sunrise, with detailed coffee trees, mountains in the background, soft golden sunlight, realistic camera movement, natural atmosphere, cinematic composition.',
    aspectRatio: '16:9',
    cameraMotion: 'drone-cinematic',
    model: 'wan2.1-1.3b',
    category: 'heritage',
  },
  {
    id: 'cyberpunk-city',
    titleAr: 'مدينة سايبربانك مستقبلية ماطرة',
    titleEn: 'Rainy Cyberpunk Metropolis',
    promptAr: 'لقطة سينمائية لشارع مستقبلي في مدينة نيون تحت المطر الكثيف، انعكاسات أضواء النيون على الشارع المبلل، سيارات طائرة تمر في السماء، تفاصيل 8k فائقة الدقة وحركة كاميرا أمامية متدفقة.',
    promptEn: 'Cinematic tracking shot through a rain-slicked cyberpunk street at night, glowing neon reflections in puddles, flying vehicles cruising between towering holographic skyscrapers, atmospheric steam, 8k photorealistic photogrammetry.',
    aspectRatio: '16:9',
    cameraMotion: 'dolly',
    model: 'wan2.1-1.3b',
    category: 'scifi',
  },
  {
    id: 'nature-macro',
    titleAr: 'ماكرو فائق الدقة لقطرات الندى على ورقة شجر',
    titleEn: 'Hyper-Realistic Macro Water Droplets',
    promptAr: 'لقطة ماكرو مكبرة لقطرة ندى صافية على ورقة شجر خضراء استوائية، تعكس أشعة الشمس الصباحية مع حركة انزلاق بطيئة للقطرة ونسيم خفيف يحرك الورقة بدقة فيزيائية.',
    promptEn: 'Extreme macro cinematic close-up of crystal clear morning water droplets perched on vibrant green tropical monstera leaf, sunlight refracting rainbow caustics, soft depth of field, subtle organic leaf sway.',
    aspectRatio: '1:1',
    cameraMotion: 'zoom',
    model: 'ltx-video',
    category: 'nature',
  },
  {
    id: 'historical-sanaa',
    titleAr: 'صنعاء القديمة والبيوت الحجرية',
    titleEn: 'Ancient Old Sanaa Architecture at Dusk',
    promptAr: 'لقطة بانورامية درامية لبيوت مدينة صنعاء القديمة بطرازها المعماري التراثي الفريد والقمريات الملونة عند الغروب، مع دخان خفيف يتصاعد وسماء شفق أرجوانية.',
    promptEn: 'Breathtaking cinematic wide angle shot of historic Old City of Sanaa with iconic multistorey burnt brick and white gypsum gypsum architecture, stained glass qamariya windows glowing at twilight, soft purple dusk sky.',
    aspectRatio: '16:9',
    cameraMotion: 'pan',
    model: 'wan2.1-1.3b',
    category: 'heritage',
  },
];
