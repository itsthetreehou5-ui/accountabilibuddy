import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
export default defineConfig({ plugins: [react(),cloudflare()], base: '/map-lab/', build: { outDir: 'dist', emptyOutDir: true, sourcemap: false }, server: { proxy: { '/api': { target: 'https://accountabilibuddy.itsthetreehou5.workers.dev', changeOrigin: true } } } });
