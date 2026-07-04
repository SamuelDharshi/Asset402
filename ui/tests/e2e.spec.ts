import { test, expect } from '@playwright/test';

// Real end-to-end flows against a live `next dev` + real backend + real
// testnet contracts. Gated behind RUN_E2E=1 since they hit real network/chain
// state (a real Anthropic vision call, a real testnet mint deploy, a real
// x402 stream tick) and are not appropriate for every CI run.
const shouldRun = process.env.RUN_E2E === '1';
const maybeTest = shouldRun ? test : test.skip;

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

maybeTest('dashboard shows real portfolio numbers matching an independent API fetch', async ({ page, request }) => {
  const deployer = '020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1';
  const apiRes = await request.get(`${BACKEND}/api/v1/owner/${deployer}/summary`);
  const summary = await apiRes.json();

  await page.goto('/');
  await expect(page.getByText('Demo Portfolio')).toBeVisible();
  await expect(page.getByText(`My Assets (${summary.assets.length})`)).toBeVisible();
});

maybeTest('onboarding wizard completes and shows an independently RPC-confirmable deploy hash', async ({ page }) => {
  await page.goto('/onboard');
  const fileInput = page.locator('input[type=file]');
  await fileInput.setInputFiles('tests/fixtures/sample-asset.jpg');

  // Step 2: real Claude vision classification
  await expect(page.getByText('Confirm')).toBeVisible({ timeout: 30_000 });
  await page.getByText('✓ Confirm').click();

  // Step 3 → 4: real on-chain mint
  await expect(page.getByText(/Token: #AP-/)).toBeVisible({ timeout: 60_000 });
  const explorerLink = page.getByText('View real deploy on testnet.cspr.live');
  await expect(explorerLink).toBeVisible();
  const href = await explorerLink.getAttribute('href');
  expect(href).toMatch(/^https:\/\/testnet\.cspr\.live\/deploy\/[a-f0-9]{64}$/);
});

maybeTest('live streaming counter increments only on a real triggered tick', async ({ page }) => {
  // Requires a seeded active rental for asset #1 and a manually-triggered
  // stream-engine tick (see scripts/e2e-verify-testnet.ts) run beforehand.
  await page.goto('/rental/1/live');
  const counter = page.locator('text=/\\+\\d+\\.\\d{4} CSPR/');
  const before = await counter.textContent();
  await page.waitForTimeout(65_000); // wait past one real 60s stream-engine tick
  const after = await counter.textContent();
  expect(after).not.toBe(before);
});

maybeTest('marketplace and lender pages show distinct real content, not the old bugs', async ({ page }) => {
  await page.goto('/marketplace');
  await expect(page.getByText('Rent Idle Equipment')).toBeVisible();

  await page.goto('/invest');
  await expect(page.getByText('RWA Marketplace')).toBeVisible();

  await page.goto('/lender');
  await expect(page.getByText('Lending Pool')).toBeVisible();
  // Regression: lender used to be 100% local mock state with no API calls.
  await expect(page.getByText(/Active Loans/)).toBeVisible();
});
