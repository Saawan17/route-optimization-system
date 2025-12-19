import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      include: "**/*.{jsx,tsx,js,ts}",
    }),
  ],
  server: {
    port: 3000,
    host: true, // Allow external connections (needed for Docker)
  },
  build: {
    outDir: 'build', // Keep same output directory as CRA for consistency
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
  },
  define: {
    global: 'window', // ✅ Fix SockJS "global is not defined" error
  },
});
