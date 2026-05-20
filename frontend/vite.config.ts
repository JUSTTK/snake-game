import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const manualChunks = (id: string) => {
  const normalizedId = id.replace(/\\/g, '/');

  if (!normalizedId.includes('/node_modules/')) {
    return undefined;
  }

  if (normalizedId.includes('/@react-three/drei/')) {
    return 'three-drei';
  }

  if (
    normalizedId.includes('/@react-three/fiber/') ||
    normalizedId.includes('/react-reconciler/')
  ) {
    return 'three-fiber';
  }

  if (normalizedId.includes('/three/src/renderers/')) {
    return 'three-renderers';
  }

  if (normalizedId.includes('/three/src/materials/')) {
    return 'three-materials';
  }

  if (
    normalizedId.includes('/three/src/geometries/') ||
    normalizedId.includes('/three/src/objects/')
  ) {
    return 'three-geometry';
  }

  if (
    normalizedId.includes('/three/src/math/') ||
    normalizedId.includes('/three/src/core/') ||
    normalizedId.includes('/three/src/utils.js')
  ) {
    return 'three-foundation';
  }

  if (
    normalizedId.includes('/three/src/scenes/') ||
    normalizedId.includes('/three/src/cameras/') ||
    normalizedId.includes('/three/src/lights/') ||
    normalizedId.includes('/three/src/textures/') ||
    normalizedId.includes('/three/src/helpers/')
  ) {
    return 'three-scene';
  }

  if (normalizedId.includes('/three/')) {
    return 'three-core';
  }

  if (
    normalizedId.includes('/react-router/') ||
    normalizedId.includes('/react-router-dom/') ||
    normalizedId.includes('/@remix-run/router/')
  ) {
    return 'router';
  }

  if (
    normalizedId.includes('/react/') ||
    normalizedId.includes('/react-dom/') ||
    normalizedId.includes('/scheduler/')
  ) {
    return 'react-core';
  }

  if (normalizedId.includes('/zustand/')) {
    return 'state';
  }

  return 'vendor';
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8081',
        ws: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
