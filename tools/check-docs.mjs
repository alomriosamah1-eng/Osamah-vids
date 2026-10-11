#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'docs');

const errors = [];
const ok = (p) => existsSync(p) && statSync(p).isFile() && readFileSync(p, 'utf8').trim().length > 0;

const index = join(DOCS, 'index.md');
if (!ok(index)) {
  errors.push('missing or empty: docs/index.md');
} else {
  const src = readFileSync(index, 'utf8');
  for (const m of src.matchAll(/`([^`]+\.md)`/g)) {
    const rel = m[1];
    const p = rel.includes('/') ? join(DOCS, rel) : join(DOCS, rel);
    if (!ok(p)) errors.push(`index references missing/empty doc: docs/${rel}`);
  }
}

for (const req of ['README.md', 'AGENTS.md', 'osamah-vids-ai.config.json', 'opencode.json']) {
  if (!ok(join(ROOT, req))) errors.push(`missing or empty: ${req}`);
}

const adrDir = join(DOCS, 'adr');
if (!existsSync(adrDir)) {
  errors.push('missing dir: docs/adr');
} else {
  const adrs = readdirSync(adrDir).filter((f) => /^ADR-\d+.*\.md$/.test(f));
  if (adrs.length === 0) errors.push('no ADR files found in docs/adr');
  for (const f of adrs) {
    const p = join(adrDir, f);
    if (!ok(p)) errors.push(`empty ADR: docs/adr/${f}`);
  }
}

const changelog = join(DOCS, 'progress', 'CHANGELOG.md');
if (!ok(changelog)) {
  errors.push('missing or empty: docs/progress/CHANGELOG.md');
} else if (!/^-\s+\d{4}-\d{2}-\d{2}/m.test(readFileSync(changelog, 'utf8'))) {
  errors.push('CHANGELOG.md has no dated entries');
}

if (errors.length) {
  console.error('[check-docs] فشل الفحص:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('[check-docs] كل الوثائق المطلوبة موجودة وغير فارغة ✅');
