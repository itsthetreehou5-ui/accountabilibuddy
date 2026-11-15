import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], base: '/map-lab/', build: { outDir: 'dist', emptyOutDir: true, sourcemap: false }, server: { proxy: { '/api': { target: process.env.ABB_API_URL || 'https://accountabilibuddy.itsthetreehou5.workers.dev', changeOrigin: true } } } });
