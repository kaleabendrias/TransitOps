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
    include: ['unit_tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/domain/models/**/*.ts',
        'src/domain/policies/**/*.ts',
        'src/domain/scoring/**/*.ts',
      ],
      exclude: [
        'src/domain/**/index.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
      reportsDirectory: 'coverage/unit',
      reporter: ['text', 'text-summary', 'json-summary'],
    },
  },
});
