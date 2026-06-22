// Bundles the Electron main + preload from TypeScript into dist-electron/.
// Uses esbuild so the `@/` path alias and src/lib/* logic resolve, while
// keeping electron and binary-backed packages external (loaded from node_modules
// at runtime / unpacked by electron-builder).
import esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  logLevel: 'info',
  tsconfig: 'tsconfig.json',
  // electron is provided by the runtime; these reference on-disk binaries and
  // must stay in node_modules (electron-builder unpacks them).
  external: ['electron', 'youtube-dl-exec', 'ffmpeg-static'],
};

const targets = [
  { entryPoints: { main: 'electron/main.ts' }, outdir: 'dist-electron' },
  { entryPoints: { preload: 'electron/preload.ts' }, outdir: 'dist-electron' },
];

if (watch) {
  for (const t of targets) {
    const ctx = await esbuild.context({ ...shared, ...t });
    await ctx.watch();
  }
  console.log('[build-electron] watching for changes…');
} else {
  for (const t of targets) {
    await esbuild.build({ ...shared, ...t });
  }
  console.log('[build-electron] build complete');
}
