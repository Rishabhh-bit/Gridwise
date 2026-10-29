import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  envDir: '..',
  plugins: [react()],
  build: { rollupOptions: { output: { manualChunks: { charts: ['recharts'], world: ['three', '@react-three/fiber'] } } } },
  server: { host: '0.0.0.0', allowedHosts: true, proxy: { '/api': 'http://127.0.0.1:8000' } },
  preview: { host: '0.0.0.0', allowedHosts: true, proxy: { '/api': 'http://127.0.0.1:8000' } },
});
