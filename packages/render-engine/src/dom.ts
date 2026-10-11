// DOM layer renderer — يبني عناصر DOM لحظة الطلب من عقد مشهد.
// يُستخدم في صفحة التسجيل (HEADLESS) وفي محرر المعاينة.
import type { Scene, SceneLayer } from '@osamah/core';
import { animateIn, layerTransform, clamp, easeOutCubic } from './engine.js';

export function mountScene(container: HTMLElement, scene: Scene): void {
  container.innerHTML = '';
  container.style.setProperty('--cbg1', scene.background.colors[0] ?? '#0b101d');
  container.style.setProperty('--cbg2', scene.background.colors[1] ?? scene.background.colors[0] ?? '#0b101d');
  container.style.background =
    scene.background.type === 'solid'
      ? (scene.background.colors[0] ?? '#0b101d')
      : `linear-gradient(${scene.background.angle}deg, var(--cbg1), var(--cbg2))`;

  scene.layers.forEach((layer, i) => {
    container.appendChild(renderLayer(layer, i, scene));
  });
}

function renderLayer(layer: SceneLayer, i: number, scene: Scene): HTMLElement {
  const el = document.createElement('div');
  el.className = `ov-layer ov-${layer.kind}`;
  el.dataset.layer = String(i);
  el.style.position = 'absolute';
  el.style.left = '0';
  el.style.top = '0';
  el.style.width = '100%';
  el.style.height = '100%';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.pointerEvents = 'none';

  switch (layer.kind) {
    case 'text': {
      el.style.fontWeight = CSS_FONT_WEIGHT[layer.tone] ?? '500';
      el.style.fontSize = CSS_FONT_SIZE[layer.tone] ?? '40px';
      el.style.color = layer.color ?? CSS_COLOR[layer.tone] ?? '#eef3ff';
      el.style.textAlign = layer.align ?? 'center';
      el.style.justifyContent = alignMap(layer.align);
      el.textContent = layer.text;
      break;
    }
    case 'counter': {
      el.classList.add('ov-counter');
      el.dataset.to = String(layer.to);
      el.dataset.from = String(layer.from);
      el.dataset.dec = String(layer.decimals);
      el.dataset.prefix = layer.prefix;
      el.dataset.suffix = layer.suffix;
      el.style.fontSize = '110px';
      el.style.fontWeight = '800';
      el.style.color = '#4ceaff';
      el.textContent = formatNumber(layer.from, layer.decimals, layer.prefix, layer.suffix);
      break;
    }
    case 'shape': {
      el.style.background = layer.color;
      el.style.width = `${layer.width ?? 160}px`;
      el.style.height = `${layer.height ?? 8}px`;
      if (layer.shape === 'circle') {
        el.style.width = `${layer.radius ?? 120}px`;
        el.style.height = `${layer.radius ?? 120}px`;
        el.style.borderRadius = '50%';
      } else if (layer.shape === 'rect') {
        el.style.borderRadius = '14px';
      } else {
        el.style.borderRadius = '99px';
        el.style.height = '6px';
      }
      break;
    }
    case 'chart': {
      const box = document.createElement('div');
      box.className = 'ov-chart';
      box.style.cssText = 'width:60%;height:46%;display:flex;align-items:flex-end;gap:18px;justify-content:center';
      const max = Math.max(...layer.data);
      layer.data.forEach((v) => {
        const bar = document.createElement('div');
        bar.style.cssText = `flex:1;background:${layer.color};border-radius:8px 8px 0 0;opacity:.85;height:60%`;
        bar.style.height = `${(v / max) * 100}%`;
        box.appendChild(bar);
      });
      el.appendChild(box);
      break;
    }
    case 'network': {
      const cv = document.createElement('canvas');
      cv.className = 'ov-network';
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
      el.appendChild(cv);
      break;
    }
    case 'timeline': {
      el.style.alignItems = 'flex-start';
      const line = document.createElement('div');
      line.className = 'ov-timeline';
      line.style.cssText = 'width:78%;display:flex;align-items:center;gap:14px;position:relative;height:90px';
      layer.events.forEach((ev) => {
        const dot = document.createElement('div');
        dot.style.cssText = `display:flex;flex-direction:column;align-items:center;color:#eef4ff;font-family:Cairo,sans-serif`;
        const d = document.createElement('span');
        d.style.cssText = `background:${layer.color};width:14px;height:14px;border-radius:50%`;
        const y = document.createElement('span');
        y.textContent = ev.year;
        y.style.cssText = 'font-weight:800;font-size:18px;margin-top:6px';
        const l = document.createElement('span');
        l.textContent = ev.label;
        l.style.cssText = 'font-size:13px;color:rgba(255,255,255,.75);text-align:center;max-width:150px';
        dot.append(d, y, l);
        line.appendChild(dot);
      });
      el.appendChild(line);
      break;
    }
  }

  // الحالة الحيّة تُطبَّق لاحقًا عبر applyLayer(el, i, t, scene)
  return el;
}

export function applyLayer(el: HTMLElement, scene: Scene, t: number): void {
  const i = Number(el.dataset.layer ?? 0);
  const layer = scene.layers[i];
  if (!layer) return;
  const a = 'animation' in layer ? layer.animation : undefined;
  const p = animateIn(a, t);
  el.style.opacity = String(p);
  el.style.transform = layerTransform(a, p);

  if (layer.kind === 'counter' && el.dataset.to) {
    const to = Number(el.dataset.to);
    const from = Number(el.dataset.from ?? 0);
    const dec = Number(el.dataset.dec ?? 0);
    const seg = el.dataset.to === 'counter' ? 0 : 1;
    const span = Math.max(a?.delay ?? 0, 600);
    const prog = clamp((t - (a?.delay ?? 0)) / span);
    const v = from + (to - from) * easeOutCubic(prog);
    el.textContent = formatNumber(v, dec, el.dataset.prefix ?? '', el.dataset.suffix ?? '');
    void seg;
  }

  if (layer.kind === 'network' && el.querySelector('canvas')) {
    const cv = el.querySelector('canvas') as HTMLCanvasElement;
    updateNetwork(cv, layer, t);
  }
}

function updateNetwork(cv: HTMLCanvasElement, layer: { seed?: number; color?: string; density?: number }, t: number): void {
  const w = cv.clientWidth || 1920;
  const h = cv.clientHeight || 1080;
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  const n = Math.round(40 + (layer.density ?? 0.3) * 80);
  const nodes: Array<[number, number]> = [];
  let seed = layer.seed ?? 1;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < n; i++) nodes.push([rnd() * w, rnd() * h]);
  ctx.strokeStyle = (layer.color ?? '#4ceaff') + '22';
  ctx.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      const d = Math.hypot(dx, dy);
      if (d < 200) {
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }
    }
  }
  ctx.fillStyle = layer.color ?? '#4ceaff';
  for (const [x, y] of nodes) {
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  void t;
}

export function resetSceneDom(container: HTMLElement): void {
  container.querySelectorAll('.ov-layer').forEach((el) => {
    (el as HTMLElement).style.opacity = '0';
    (el as HTMLElement).style.transform = 'none';
  });
}

function alignMap(a: string | undefined): string {
  if (a === 'left') return 'flex-start';
  if (a === 'right') return 'flex-end';
  return 'center';
}

function formatNumber(v: number, dec: number, prefix: string, suffix: string): string {
  const fmt = v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return `${prefix}${fmt}${suffix}`;
}

const CSS_FONT_SIZE: Record<string, string> = {
  kicker: '34px',
  title: '110px',
  subtitle: '40px',
  body: '40px',
};
const CSS_FONT_WEIGHT: Record<string, string> = {
  kicker: '700',
  title: '900',
  subtitle: '600',
  body: '500',
};
const CSS_COLOR: Record<string, string> = {
  kicker: '#4ceaff',
  title: '#f4f8ff',
  subtitle: '#aab9d8',
  body: '#aab9d8',
};