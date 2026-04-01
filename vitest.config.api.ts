import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, './src/domain'),
      '@adapters': path.resolve(__dirname, './src/adapters'),
      '@services': path.resolve(__dirname, './src/services'),
      '@presentation': path.resolve(__dirname, './src/presentation'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },
  test: {
    environment: 'node',
    include: ['API_tests/**/*.test.ts'],
    setupFiles: ['API_tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/services/**/*.ts',
        'src/adapters/**/*.ts',
      ],
      exclude: [
        'src/services/index.ts',
        'src/services/container.ts',
        'src/adapters/**/index.ts',
        'src/adapters/indexeddb/db.ts',
        'src/services/tab-id.ts',
        'src/services/hold-sync.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
      reportsDirectory: 'coverage/api',
      reporter: ['text', 'text-summary', 'json-summary'],
    },
  },
});
