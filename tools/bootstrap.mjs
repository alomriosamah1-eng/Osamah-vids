#!/usr/bin/env node
// tools/bootstrap.mjs
// يوطّن كل الأدوات داخل المشروع: Playwright browsers، Python venv + edge-tts،
// ffmpeg static، الخطوط، وأغلفة tools/bin. قابل للإعادة بعد مسح tools/.
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS = join(ROOT, 'tools');
const CACHE = join(TOOLS, 'cache');
const MS_PW = join(CACHE, 'ms-playwright');
const PYVENV = join(TOOLS, 'python', '.venv');
const FFDIR = join(TOOLS, 'ffmpeg');
const BIN = join(TOOLS, 'bin');
const FONTS = join(ROOT, 'assets', 'fonts');

const log = (s) => console.log(`\n[vendor] ${s}`);
const sh = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: opts.stdio ?? 'inherit', encoding: 'utf8', env: opts.env ?? process.env });
  if (r.status !== 0 && !opts.ignore) {
    console.error(`[vendor] FAILED: ${cmd} ${args.join(' ')} (${r.status})`);
    if (r.stderr) console.error(r.stderr.slice(0, 1200));
    process.exit(1);
  }
  return r;
};

mkdirSync(MS_PW, { recursive: true });
mkdirSync(FFDIR, { recursive: true });
mkdirSync(BIN, { recursive: true });
mkdirSync(FONTS, { recursive: true });

// ---------- 1) Playwright browsers ----------
const pwSources = [
  '/home/osamah/.cache/ms-playwright',
  join(process.env.HOME || '~', '.cache', 'ms-playwright'),
  '/root/.cache/ms-playwright',
];
let didCopy = false;
for (const src of pwSources) {
  if (existsSync(src)) {
    sh('cp', ['-rn', join(src, '.'), MS_PW], { ignore: true });
    const have = readFileSync(join(TOOLS, '..', 'package.json')) ? 1 : 0;
    const n = execFileSync('bash', ['-c', `ls "${MS_PW}" | wc -l`]).toString().trim();
    log(`Playwright browsers: ${n} folders copied from ${src}`);
    didCopy = true;
    break;
  }
}
if (!didCopy && !existsSync(JOIN_FIRST(MS_PW))) {
  log('No cached Playwright browsers; you will need `npx playwright install chromium` after npm install.');
}

function JOIN_FIRST(p) { return join(p, 'chromium-headless_shell-1228'); }

// ---------- 2) Python venv + edge-tts ----------
if (!existsSync(join(PYVENV, 'bin', 'python'))) {
  log('creating python venv + installing edge-tts…');
  mkdirSync(dirname(PYVENV), { recursive: true });
  sh('python3', ['-m', 'venv', PYVENV]);
  sh(join(PYVENV, 'bin', 'pip'), ['install', '--quiet', 'edge-tts==7.2.8']);
}
const etEdge = join(PYVENV, 'bin', 'edge-tts');
if (process.env.PIP_CACHE_DISABLED) log('pip cache disabled flag set');
log(`edge-tts venv ready: ${etEdge}`);

// ---------- 3) ffmpeg static ----------
const ffBin = join(FFDIR, 'ffmpeg');
let ffOk = existsSync(ffBin);
if (!ffOk) {
  const tmp = mkdtempSync(join(tmpdir(), 'ovai-ff-'));
  const url = 'https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz';
  log(`downloading static ffmpeg… (${url})`);
  const r = spawnSync('curl', ['-fL', '--retry', '2', '--retry-delay', '1', '--connect-timeout', '15', '--max-time', '180', '-o', join(tmp, 'ff.tar.xz'), url], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('[vendor] static download failed; falling back to system ffmpeg. Re-run later: npm run tools:vendor');
  } else {
    sh('tar', ['-xJf', join(tmp, 'ff.tar.xz'), '-C', tmp]);
    const dirs = execFileSync('bash', ['-c', `ls -d ${tmp}/*/ 2>/dev/null | head -1`]).toString().trim();
    const dir = dirs ? join(...dirs.split('/').filter(Boolean)) : tmp;
    copyFileSync(join(dir, 'ffmpeg'), ffBin);
    copyFileSync(join(dir, 'ffprobe'), join(FFDIR, 'ffprobe'));
    rmSync(tmp, { recursive: true, force: true });
    try { sh('chmod', ['+x', ffBin, join(FFDIR, 'ffprobe')], { ignore: true }); } catch {}
    log('ffmpeg/ffprobe static vendored');
    ffOk = true;
  }
} else {
  log('ffmpeg static already present');
}

// ---------- 4) fonts ----------
const fontSources = [
  ['/usr/share/fonts/truetype/cairo/Cairo-Regular.ttf', null],
  ['/usr/share/fonts/opentype/noto/NotoNaskhArabic-Regular.ttf', null],
  ['/home/osamah/program/Osamah-vids/assets', null],
];
let fontsCopied = 0;
for (const [src] of fontSources) {
  if (existsSync(src)) {
    try {
      cpSync(src, FONTS, { recursive: true, filter: (p) => /\.(ttf|otf|woff2?)$/.test(p) });
      fontsCopied += execFileSync('bash', ['-c', `ls "${FONTS}" | grep -c -E 'ttf|otf|woff' || true`]).toString().trim();
      break;
    } catch {}
  }
}
log(fontsCopied ? `fonts copied (${fontsCopied})` : 'no fonts found; using system font stack at runtime');

// ---------- 5) bin wrappers ----------
if (ffOk) {
  writeFileSync(join(BIN, 'ffmpeg'), `#!/usr/bin/env bash\nexec "${FFDIR}/ffmpeg" "$@"\n`);
  writeFileSync(join(BIN, 'ffprobe'), `#!/usr/bin/env bash\nexec "${FFDIR}/ffprobe" "$@"\n`);
}
writeFileSync(join(BIN, 'edge-tts'), `#!/usr/bin/env bash\nexec "${PYVENV}/bin/edge-tts" "$@"\n`);
writeFileSync(join(BIN, 'opencode'), `#!/usr/bin/env bash\nexec "${process.env.OPENCODE_BIN || '/home/osamah/.opencode/bin/opencode'}" "$@"\n`);
for (const f of ['ffmpeg', 'ffprobe', 'edge-tts', 'opencode']) {
  if (existsSync(join(BIN, f))) { try { sh('chmod', ['+x', join(BIN, f)], { ignore: true }); } catch {} }
}

log('tools vendored. wrappers in tools/bin — run via OPENCODE_BIN/FFMPEG env or tools/bin directly.');

// ---------- 6) environment export ----------
const env = [
  `export PLAYWRIGHT_BROWSERS_PATH="${MS_PW}"`,
  ffOk ? `export OSAMAH_FFMPEG="${ffBin}"` : `# OSAMAH_FFMPEG not set (static ffmpeg missing) — server falls back to system ffmpeg`,
  ffOk ? `export OSAMAH_FFPROBE="${join(FFDIR, 'ffprobe')}"` : `# OSAMAH_FFPROBE not set (static ffprobe missing)`,
  `export OSAMAH_EDGE_TTS="${etEdge}"`,
  `export OPENCODE_BIN="${join(BIN, 'opencode')}"`,
].join('\n');
writeFileSync(join(TOOLS, 'env.sh'), env + '\n');
log('wrote tools/env.sh — source it or let the server load it.');