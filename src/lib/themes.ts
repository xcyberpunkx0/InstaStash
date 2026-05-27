// ─── Theme registry ────────────────────────────────────────────────────────
//
// Color tokens for every theme live in globals.css under [data-theme="<id>"]
// rules. This file is the single source of truth for which themes exist and
// what their swatches look like in the picker UI.

export interface ThemeSwatch {
  paper: string;
  ink: string;
  accent: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  swatch: ThemeSwatch;
}

export const THEMES: readonly ThemeDefinition[] = [
  { id: '',         name: 'Aurora',   description: 'white paper + gemini iridescent', swatch: { paper: '#FAFBFC', ink: '#0F1117', accent: '#4F8DF6' } },
  { id: 'solar',    name: 'Solar',    description: 'pale cream + marigold',           swatch: { paper: '#FCF5E6', ink: '#231C0E', accent: '#D77A1F' } },
  { id: 'rose',     name: 'Rose',     description: 'soft blush + garnet',             swatch: { paper: '#F9F1EE', ink: '#2A1A1F', accent: '#C0394F' } },
  { id: 'sky',      name: 'Sky',      description: 'pale blue + true blue',           swatch: { paper: '#F4F7FC', ink: '#0E1A2A', accent: '#2D7BD9' } },
  { id: 'mint',     name: 'Mint',     description: 'cream-green + emerald',           swatch: { paper: '#F1F7F3', ink: '#0F1F18', accent: '#2EA66C' } },
  { id: 'lavender', name: 'Lavender', description: 'pale lilac + violet',             swatch: { paper: '#F5F3FB', ink: '#181028', accent: '#7C3FF2' } },
] as const;

export const DEFAULT_THEME_ID = '';
export const THEME_STORAGE_KEY = 'auravault.theme';

export function applyTheme(id: string): void {
  if (typeof document === 'undefined') return;
  if (id) document.documentElement.dataset.theme = id;
  else delete document.documentElement.dataset.theme;
}

export function readStoredTheme(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_THEME_ID;
  } catch {
    return DEFAULT_THEME_ID;
  }
}

export function writeStoredTheme(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) window.localStorage.setItem(THEME_STORAGE_KEY, id);
    else window.localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
