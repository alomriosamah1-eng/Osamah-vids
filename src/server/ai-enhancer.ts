import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (aiInstance) return aiInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    aiInstance = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    return aiInstance;
  }
  return null;
}

export interface EnhancePromptResult {
  originalPrompt: string;
  enhancedPrompt: string;
  negativePrompt: string;
  cameraMotion: string;
  lightingStyle: string;
  artStyle: string;
  translationAr?: string;
  translationEn?: string;
}

export async function enhanceVideoPrompt(
  prompt: string,
  style: string = 'cinematic',
  cameraDirective?: string
): Promise<EnhancePromptResult> {
  const ai = getAI();

  if (!ai) {
    return generateFallbackEnhancement(prompt, style, cameraDirective);
  }

  try {
    const systemPrompt = `You are the Lead AI Video Prompt Engineer for Osamah Vids, specializing in Wan2.1 and LTX-Video diffusion transformer models.
Given a user prompt (which may be in Arabic or English), translate and expand it into a masterpiece cinematic video prompt for video diffusion models.
Include precise descriptions of:
- Subject matter and detailed textures
- Camera movement (e.g., smooth aerial drone sweep, low-angle tracking, slow push-in, parallax pan)
- Lighting & Atmosphere (e.g., golden hour sunlight, volumetric god rays, mist, anamorphic lens flares)
- Motion dynamics (e.g., gentle breeze moving foliage, realistic water ripples, steady cinematic speed)

Output strictly valid JSON with this schema:
{
  "enhancedPrompt": "detailed English prompt...",
  "negativePrompt": "unwanted artifacts, blur, etc...",
  "cameraMotion": "drone-cinematic",
  "lightingStyle": "golden-hour-sunlight",
  "artStyle": "photorealistic-cinema",
  "translationAr": "وصف عربي سينمائي مكافئ..."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `User Prompt: "${prompt}"\nPreferred Style: ${style}\nCamera Movement Hint: ${cameraDirective || 'auto'}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.7,
      },
    });

    const text = response.text?.trim();
    if (text) {
      const parsed = JSON.parse(text);
      return {
        originalPrompt: prompt,
        enhancedPrompt: parsed.enhancedPrompt || prompt,
        negativePrompt: parsed.negativePrompt || 'blurry, low quality, distorted, overexposed, static, jittery, watermark',
        cameraMotion: parsed.cameraMotion || cameraDirective || 'drone-cinematic',
        lightingStyle: parsed.lightingStyle || 'natural-cinematic',
        artStyle: parsed.artStyle || 'hyper-realistic',
        translationAr: parsed.translationAr,
        translationEn: parsed.enhancedPrompt,
      };
    }
  } catch (err) {
    console.error('[AIEnhancer] Gemini prompt enhancement failed, falling back:', err);
  }

  return generateFallbackEnhancement(prompt, style, cameraDirective);
}

function generateFallbackEnhancement(
  prompt: string,
  style: string,
  cameraDirective?: string
): EnhancePromptResult {
  const camera = cameraDirective || 'smooth cinematic drone sweep';
  const enhanced = `Breathtaking cinematic masterwork, ${prompt}. Hyper-detailed textures, realistic physics and natural motion, ${camera}, soft atmospheric volumetric lighting, 8k resolution, photorealistic 35mm film lens look, high fidelity depth of field.`;
  
  return {
    originalPrompt: prompt,
    enhancedPrompt: enhanced,
    negativePrompt: 'blurry, low resolution, distorted geometry, jittery artifacts, overexposed, plastic look, watermark, static freeze',
    cameraMotion: cameraDirective || 'drone-cinematic',
    lightingStyle: 'cinematic-volumetric',
    artStyle: style || 'photorealistic-cinema',
  };
}
