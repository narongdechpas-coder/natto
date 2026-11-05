import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// base './' so the static build works on GitHub Pages / any sub-path.
// Two pages: the app (index.html) and the presentation (presentation.html), sharing one dataset.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'index.html'),
        presentation: resolve(__dirname, 'presentation.html'),
        pilot: resolve(__dirname, 'presentation-pilot.html'),
      },
    },
  },
});
