import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// lxn-ui's first test suite (SearchSelect, 2026-08-13) — no consumer-side
// alias/symlink concerns here (unlike appraisal-customer/-offer's own
// vitest.config.ts, which exist to survive `npm link`ing THIS package), so
// this stays a plain react() + jsdom setup.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'jsdom',
  },
});
