import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  // Avoid loading project PostCSS/Tailwind config during tests
  css: {
    postcss: {
      plugins: [],
    },
  },
});
