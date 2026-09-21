import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  // @ts-expect-error - vite version mismatch between vitest and project
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/vitest.setup.ts'],
    // The Playwright E2E specs (tests/e2e-pw/**) use @playwright/test's runner,
    // not vitest — collecting them here throws "did not expect test.beforeEach()".
    // Keep vitest's defaults and just carve out the Playwright dir + its report.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/e2e-pw/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
