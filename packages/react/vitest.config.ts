import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.test-d.ts', 'src/**/*.test-d.tsx'],
    typecheck: {
      enabled: true,
      include: ['src/**/*.test-d.ts', 'src/**/*.test-d.tsx'],
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/index.ts', 'src/**/*.test.*'],
    },
  },
})
