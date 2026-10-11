// تسجيل حتمي — صفحة يتحكم بها Playwright عبر window.__ready/__loadScene/__seek.
import { mountScene, applyLayer } from '../dist/index.js';

const stage = document.getElementById('stage');
const q = new URLSearchParams(location.search);
const w = Number(q.get('w') || 1920);
const h = Number(q.get('h') || 1080);

stage.style.width = w + 'px';
stage.style.height = h + 'px';

let currentScene = null;

window.__loadScene = (scene) => {
  currentScene = scene;
  const el = stage;
  el.innerHTML = '';
  mountScene(el, scene);
};

window.__seek = (t) => {
  if (!currentScene) return;
  stage.querySelectorAll('.ov-layer').forEach((el) => applyLayer(el, currentScene, t));
};

document.fonts.ready.then(() => {
  window.__ready = true;
});