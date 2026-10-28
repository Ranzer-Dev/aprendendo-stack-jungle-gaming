import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      perFile: true,
      lines: 95,
      branches: 95,
      functions: 75,
      statements: 95,
      exclude: [
        'dist/**',
        'node_modules/**',
        'src/main.ts',
        '**/*.module.ts',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/*.interface.ts',
        'tests/**',
      ],
    },
  },
});
