import { defineConfig } from '@playwright/test';

// These tests exercise real flows against a live backend + testnet, gated
// behind RUN_E2E=1 (see tests/e2e.spec.ts) since they hit real network/chain
// state — not appropriate for every CI run, but real when they do run.
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  use: {
    baseURL: process.env.NEXT_PUBLIC_SITE_URL_LOCAL || 'http://localhost:3000',
  },
});
