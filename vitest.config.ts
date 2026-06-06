import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environmentMatchGlobs: [
      ['tests/card.test.ts', 'happy-dom'],
    ],
  },
});
