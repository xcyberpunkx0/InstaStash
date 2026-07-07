import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { resolveStaticPath } from './resolve-static-path';

const outDir = path.resolve('/app/out');

describe('resolveStaticPath', () => {
  it('maps the root path to index.html', () => {
    expect(resolveStaticPath(outDir, '/')).toBe(path.join(outDir, 'index.html'));
  });

  it('maps asset paths into the out directory', () => {
    expect(resolveStaticPath(outDir, '/_next/static/chunks/main.js')).toBe(
      path.join(outDir, '_next', 'static', 'chunks', 'main.js'),
    );
  });

  it('decodes percent-encoded characters', () => {
    expect(resolveStaticPath(outDir, '/some%20file.png')).toBe(
      path.join(outDir, 'some file.png'),
    );
  });

  it('rejects path traversal', () => {
    expect(resolveStaticPath(outDir, '/../secret.txt')).toBeNull();
    expect(resolveStaticPath(outDir, '/..%2F..%2Fsecret.txt')).toBeNull();
    expect(resolveStaticPath(outDir, '/_next/../../secret.txt')).toBeNull();
  });

  it('rejects malformed percent-encoding and null bytes', () => {
    expect(resolveStaticPath(outDir, '/%zz')).toBeNull();
    expect(resolveStaticPath(outDir, '/file%00.js')).toBeNull();
  });
});
