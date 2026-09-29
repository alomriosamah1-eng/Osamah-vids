# دليل النشر والسحابية (Deployment & GitHub Pages)

## 1. نشر الواجهة الأمامية على GitHub Pages
الواجهة الأمامية لمنصة Osamah Vids تم تصميمها كـ SPA (Single Page Application) متوافقة بالكامل مع GitHub Pages و Vercel و Cloudflare Pages.

### خطوات التجهيز لـ GitHub Pages:
1. بناء المشروع:
```bash
npm run build
```
2. يتم إنتاج الملفات المجمعة داخل مجلد `dist/`.
3. قم بتهيئة `VITE_API_BASE_URL` في متغيرات البيئة ليشير إلى عنوان الـ Backend السحابي عبر HTTPS (مثل Google Cloud Run أو Railway أو VPS).

---

## 2. نشر خادم الـ Backend على Google Cloud Run / Docker

### بناء وتشغيل الحاوية:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 3. تكوين بيئة الاتصال الآمنة (HTTPS & CORS)
- السماح بالنطاقات المعتمدة في CORS (`Access-Control-Allow-Origin`).
- استخدام الـ Headers المشفرة لمنع تسريب الـ Tokens أو الـ Keys.
