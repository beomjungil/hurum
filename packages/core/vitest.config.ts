import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test-d.ts', 'testing/**/*.test.ts', 'testing/**/*.test-d.ts'],
    typecheck: {
      enabled: true,
      include: ['src/**/*.test-d.ts', 'testing/**/*.test-d.ts'],
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/**/*.test.ts', 'src/**/*.test-d.ts'],
    },
  },
})
