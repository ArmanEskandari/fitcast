import { fileURLToPath } from 'node:url';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  server: {
    // In dev, forward the serverless AI functions to the local dev-api server
    // (`pnpm dev:api`). In production the host runs `api/` natively.
    proxy: {
      '/api': 'http://localhost:5200',
    },
  },
});
