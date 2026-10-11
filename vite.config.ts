/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// In development the Vite server proxies REST and WebSocket traffic to the Game Engine,
// so the browser always talks to a single origin (same as the Nginx proxy in production).
const GAME_ENGINE = process.env.VITE_GAME_ENGINE_URL ?? 'http://localhost:8080';
const TELEMETRY = process.env.VITE_TELEMETRY_URL ?? 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': { target: GAME_ENGINE, changeOrigin: true },
      '/ws': { target: GAME_ENGINE.replace(/^http/, 'ws'), ws: true, changeOrigin: true },
      '/telemetry': {
        target: TELEMETRY,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/telemetry/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
