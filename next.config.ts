import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Static export for the Electron renderer: emits a self-contained `out/`
  // folder of HTML/JS/CSS that the desktop app loads from disk. No Node server,
  // no API routes (that logic now lives in the Electron main process).
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
