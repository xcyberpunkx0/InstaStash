// Serves the Next.js static export (out/) over a privileged custom scheme in
// production. The export references assets with root-absolute URLs
// (/_next/...), which break under file:// — loadFile would resolve them
// against the drive root. With a `standard` scheme they resolve against the
// scheme host and land back in this handler.
import { app, net, protocol } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveStaticPath } from './resolve-static-path';

export const APP_SCHEME = 'instastash-app';

export const APP_SCHEME_SPEC: Electron.CustomScheme = {
  scheme: APP_SCHEME,
  privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true },
};

/** Entry URL the production window loads. */
export const APP_URL = `${APP_SCHEME}://bundle/`;

/** Must run after app.whenReady(). */
export function handleAppProtocol(): void {
  const outDir = path.join(app.getAppPath(), 'out');
  protocol.handle(APP_SCHEME, (request) => {
    const filePath = resolveStaticPath(outDir, new URL(request.url).pathname);
    if (!filePath) return new Response('not found', { status: 404 });
    return net.fetch(pathToFileURL(filePath).toString());
  });
}
