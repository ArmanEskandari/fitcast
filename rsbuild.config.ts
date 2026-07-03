import { fileURLToPath } from 'node:url';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  html: {
    // viewport-fit=cover lets the UI extend under the notch/home indicator so
    // `env(safe-area-inset-*)` reports real values on mobile.
    meta: {
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
    },
  },
  resolve: {
    alias: {
      '@': srcDir,
    },
    // Let explicit `.js` specifiers resolve to their `.ts` source. The `api/`
    // serverless functions run as native Node ESM, which requires extensions
    // on relative imports; this keeps those same imports building here too.
    extensionAlias: {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
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
