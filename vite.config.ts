import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths so the build runs from any folder (itch.io, file share).
  base: './',
  server: { port: 5173, open: false },
  build: { chunkSizeWarningLimit: 2000 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
