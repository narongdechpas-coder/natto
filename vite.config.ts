import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the static build works on GitHub Pages / any sub-path.
export default defineConfig({
  base: './',
  plugins: [react()],
});
