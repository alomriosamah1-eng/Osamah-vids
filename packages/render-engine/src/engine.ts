// محرّك تشغيل حتمي — يرسم عقد المشهد على زمن t (بلا حالة عشوائية).
// يعمل في المتصفح أثناء التسجيل (window.__loadScene/__seek) وفي المعاينة الحيّة.
import type { Scene, Animation } from '@osamah/core';

export function clamp(v: number, lo = 0, hi = 1): number {
  return Math.min(hi, Math.max(lo, v));
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function animateIn(a: Animation | undefined, t: number): number {
  const d = a?.delay ?? 0;
  const dur = a?.dur ?? 500;
  const p = clamp((t - d) / dur);
  switch (a?.in ?? 'fade') {
    case 'fade': return easeOutCubic(p);
    case 'fadeUp': return easeOutCubic(p);
    case 'pop': return easeOutExpo(p);
    case 'slideL': return easeOutCubic(p);
    case 'slideR': return easeOutCubic(p);
    case 'snap': return p >= 1 ? 1 : 0;
    default: return easeOutCubic(p);
  }
}

export function layerTransform(a: Animation | undefined, p: number): string {
  const px = (1 - p) * 24;
  switch (a?.in ?? 'fade') {
    case 'fadeUp': return `translate3d(0,${px}px,0)`;
    case 'slideL': return `translate3d(${-px}px,0,0)`;
    case 'slideR': return `translate3d(${px}px,0,0)`;
    case 'pop': return `scale(${0.7 + p * 0.3})`;
    default: return 'none';
  }
}

// هل الطبقة مرئية عند الزمن t (مع مراعاة الخروج)؟
export function isVisible(a: Animation | undefined, t: number, sceneDur: number, outGapMs = 300): boolean {
  const dIn = a?.delay ?? 0;
  const durIn = a?.dur ?? 500;
  const dOut = (a?.out?.delay ?? sceneDur - outGapMs) || sceneDur - outGapMs;
  return t >= dIn && t < dOut + (a?.out?.dur ?? 300);
}

export const contractVersion = 1;