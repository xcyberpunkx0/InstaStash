// Tiny JSON-backed settings store in the app's userData dir. No external deps.
import { app } from 'electron';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { Settings } from '@/shared/ipc';

function settingsFile(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

let cache: Settings | null = null;

function defaults(): Settings {
  return { downloadDir: app.getPath('downloads') };
}

export async function getSettings(): Promise<Settings> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(settingsFile(), 'utf8');
    cache = { ...defaults(), ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    cache = defaults();
  }
  return cache;
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  cache = next;
  await fs.writeFile(settingsFile(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}
