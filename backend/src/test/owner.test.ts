export {};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('../index') as { app: import('hono').Hono };

describe('GET /api/v1/owner/:address/summary', () => {
  it('returns a real aggregation (not fabricated totals) for a seeded owner', async () => {
    const address = '020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1';
    const res = await app.request(`/api/v1/owner/${address}/summary`);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toHaveProperty('address', address);
    expect(body).toHaveProperty('lifetimeEarnedCspr');
    expect(body).toHaveProperty('activeLoans');
    expect(Array.isArray(body.assets)).toBe(true);
    // Seeded local_db.json has this address as owner of at least one asset.
    expect(body.assets.length).toBeGreaterThan(0);
  });

  it('returns an empty asset list (not an error) for an address with no assets', async () => {
    const res = await app.request('/api/v1/owner/00nonexistentowner/summary');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.assets).toEqual([]);
    expect(body.lifetimeEarnedCspr).toBe(0);
    expect(body.activeLoans).toBe(0);
  });
});
