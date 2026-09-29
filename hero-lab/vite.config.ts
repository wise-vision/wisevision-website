import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root: here,
  resolve: {
    // src/hero lives outside hero-lab; point its bare imports at hero-lab's node_modules
    alias: { three: resolve(here, 'node_modules/three'), '@hero': resolve(here, '../src/hero') },
    dedupe: ['three'],
  },
  server: { fs: { allow: [resolve(here, '..')] }, port: 4317, strictPort: true },
  preview: { port: 4317, strictPort: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      input: { index: resolve(here, 'index.html'), preview: resolve(here, 'preview.html') },
    },
  },
});
