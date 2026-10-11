// ProjectRepository — إدارة ملفات المشاريع (JSON atomic) خلف واجهة نظيفة.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { paths } from '../env.js';
import { ProjectMeta, ProjectOptions, slugify } from '@osamah/core';
import { emit } from '../events/sse.js';

export interface ProjectRecord extends ProjectMeta {
  script?: unknown;
  track?: unknown;
}

function atomicWrite(p: string, data: unknown): void {
  const tmp = p + '.tmp';
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  renameSync(tmp, p);
}

function readJson<T>(p: string): T | null {
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as T;
  } catch {
    return null;
  }
}

// حجم الملف النهائي بالـ MB (من out/final.mp4 إن وُجد)
function finalSizeMb(id: string): number | undefined {
  const p = join(paths.projects, id, 'out', 'final.mp4');
  if (!existsSync(p)) return undefined;
  const st = statSync(p, { throwIfNoEntry: false });
  return st ? Math.round((st.size / (1024 * 1024)) * 100) / 100 : undefined;
}

// يزوّد الـ meta بالمشتقات (sizeMb/lastOpened) — تعبئة للعرض دون تعديل الملف
function hydrate(meta: ProjectMeta): ProjectMeta {
  return { ...meta, sizeMb: finalSizeMb(meta.id) ?? meta.sizeMb };
}

export function projectDir(id: string): string {
  return join(paths.projects, id);
}

export function listProjects(): ProjectMeta[] {
  if (!existsSync(paths.projects)) return [];
  const idx = readJson<{ projects: ProjectMeta[] }>(join(paths.projects, 'index.json'));
  if (idx) return idx.projects.filter((p) => !p.id.startsWith('.')).map(hydrate);
  return readdirSync(paths.projects, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => readJson<ProjectMeta>(join(paths.projects, d.name, 'project.json')))
    .filter((x): x is ProjectMeta => !!x)
    .map(hydrate)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getProject(id: string): ProjectRecord | null {
  const rec = readJson<ProjectRecord>(join(paths.projects, id, 'project.json'));
  if (rec) {
    const p = join(paths.projects, id, 'out', 'final.mp4');
    if (existsSync(p) && !rec.sizeMb) rec.sizeMb = finalSizeMb(id);
  }
  return rec;
}

// يسجّل آخر وقت فتح مشروع (يدعم ترتيب "آخر فتح" في المعرض)
export function markOpened(id: string): ProjectMeta | null {
  const meta = getProject(id);
  if (!meta) return null;
  const updated = { ...meta, lastOpened: new Date().toISOString() };
  saveProjectMeta(updated);
  return updated;
}

export function saveProjectMeta(meta: ProjectMeta): void {
  const dir = projectDir(meta.id);
  mkdirSync(dir, { recursive: true });
  atomicWrite(join(dir, 'project.json'), meta);
  saveIndex();
  emit(meta.id, { type: 'project_meta', meta });
}

export function createProject(input: { prompt: string; options: ProjectOptions; title?: string }): ProjectMeta {
  const id = randomUUID().slice(0, 8);
  const meta: ProjectMeta = {
    id,
    slug: slugify(input.title || input.prompt),
    title: input.title || input.prompt.slice(0, 40),
    prompt: input.prompt,
    options: input.options,
    status: 'queued',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    durationMs: input.options.durationSeconds * 1000,
  };
  const dir = projectDir(id);
  mkdirSync(join(dir, 'scenes'), { recursive: true });
  mkdirSync(join(dir, 'narration'), { recursive: true });
  mkdirSync(join(dir, 'out'), { recursive: true });
  mkdirSync(join(dir, 'events'), { recursive: true });
  saveProjectMeta(meta);
  saveIndex();
  return meta;
}

export function deleteProject(id: string): boolean {
  const dir = projectDir(id);
  if (!existsSync(dir) || id.startsWith('.')) return false;
  // حذف آمن: ننقل لمجلد المهملات ثم نحذفه
  try {
    mkdirSync(join(paths.projects, '.trash'), { recursive: true });
    const target = join(paths.projects, '.trash', id);
    rmSync(target, { recursive: true, force: true });
    renameSync(dir, target);
    saveIndex();
    return true;
  } catch {
    return false;
  }
}

export function appendEvent(id: string, event: unknown): void {
  try {
    const p = join(paths.projects, id, 'events.ndjson');
    writeFileSync(p, JSON.stringify(event) + '\n', { flag: 'a' });
  } catch { /* ignore */ }
}

function saveIndex(): void {
  const projects = readdirSync(paths.projects, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => readJson<ProjectMeta>(join(paths.projects, d.name, 'project.json')))
    .filter((x): x is ProjectMeta => !!x)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  atomicWrite(join(paths.projects, 'index.json'), { projects });
}