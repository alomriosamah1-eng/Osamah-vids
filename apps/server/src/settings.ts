import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { paths } from './env.js';
import { config } from './config.js';

export interface Settings {
  model?: string;
}

const FILE = join(paths.root, 'settings.json');

export function loadSettings(): Settings {
  try {
    if (!existsSync(FILE)) return {};
    return JSON.parse(readFileSync(FILE, 'utf8')) as Settings;
  } catch {
    return {};
  }
}

function save(s: Settings): void {
  try { writeFileSync(FILE, JSON.stringify(s, null, 2)); } catch { /* ignore */ }
}

export function applySettings(): Settings {
  const s = loadSettings();
  if (s.model) {
    config.models.understand = s.model;
    config.models.script = s.model;
    config.models.scenes = s.model;
    config.models.edit = s.model;
    config.models.qc = s.model;
  }
  return s;
}

export function updateSettings(patch: Settings): Settings {
  const next = { ...loadSettings(), ...patch };
  save(next);
  applySettings();
  return next;
}
