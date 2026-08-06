import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-only sandbox for building components in isolation. There is no build
// script — lxn-ui ships raw src/ (see package.json "main"), consumers
// compile it through their own bundler, so this config only ever runs
// `vite` (dev server), never `vite build`.
export default defineConfig({
  plugins: [react()],
  // Customer 5299, Disclosures 5199, Offer 5399 (see their vite.config.ts) —
  // distinct pinned port so this can run alongside them.
  server: { port: 5499, strictPort: true },
});
