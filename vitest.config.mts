import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
    /* las fechas se formatean en es-AR y los días se cuentan en hora local: que no dependa de la compu */
    env: { TZ: 'America/Argentina/Buenos_Aires' },
  },
});
