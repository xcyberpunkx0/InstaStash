// Maps a URL pathname from the app protocol onto a file inside the static
// export directory. Pure (no electron imports) so it stays unit-testable.
import path from 'node:path';

/**
 * Resolve `urlPathname` to an absolute file path inside `outDir`, or null if
 * the path is malformed or escapes the directory. `/` serves index.html.
 */
export function resolveStaticPath(outDir: string, urlPathname: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;

  const rel = decoded.replace(/^\/+/, '');
  const abs = path.join(outDir, rel === '' ? 'index.html' : rel);

  // Traversal guard: the resolved path must stay inside outDir.
  const escape = path.relative(outDir, abs);
  if (escape.startsWith('..') || path.isAbsolute(escape)) return null;
  return abs;
}
