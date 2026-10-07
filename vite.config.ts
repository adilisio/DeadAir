import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  // The title screen shows package.json's version.
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // Relative asset paths so the build runs from any folder (itch.io, file share).
  base: './',
  server: { port: 5173, open: false },
  build: { chunkSizeWarningLimit: 2000 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
