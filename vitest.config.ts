import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: [
      'packages/**/tests/**/*.test.ts',
      'apps/**/tests/**/*.test.ts',
      'tests/**/*.test.ts'
    ],
    globals: true,
    environment: 'node',
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/tests/**']
    },
    setupFiles: [],
  },
  resolve: {
    conditions: ['node'],
    extensions: ['.ts', '.tsx', '.js', '.mjs'],
    alias: {
      '@api-contracts': '/Users/tahmeedrahim/Documents/Projects/NDC/packages/api-contracts/src',
      '@domain-ndc': '/Users/tahmeedrahim/Documents/Projects/NDC/packages/domain-ndc/src',
      '@clients-rxnorm': '/Users/tahmeedrahim/Documents/Projects/NDC/packages/clients-rxnorm/src',
      '@clients-openfda': '/Users/tahmeedrahim/Documents/Projects/NDC/packages/clients-openfda/src',
      '@data-cache': '/Users/tahmeedrahim/Documents/Projects/NDC/packages/data-cache/src',
      '@core-config': '/Users/tahmeedrahim/Documents/Projects/NDC/packages/core-config/src',
      '@core-guardrails': '/Users/tahmeedrahim/Documents/Projects/NDC/packages/core-guardrails/src',
      '@utils': '/Users/tahmeedrahim/Documents/Projects/NDC/packages/utils/src',
    }
  }
});

