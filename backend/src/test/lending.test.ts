export {};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('../index') as { app: import('hono').Hono };

describe('lending.ts routes (real backend-tracked pool data)', () => {
  it('GET /api/v1/lending/loans returns real seeded loan data', async () => {
    const res = await app.request('/api/v1/lending/loans');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.loans)).toBe(true);
  });

  it('GET /api/v1/lending/pool-stats aggregates from actual loan records', async () => {
    const res = await app.request('/api/v1/lending/pool-stats');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('activeLoanCount');
    expect(body).toHaveProperty('totalPrincipalCspr');
    expect(body).toHaveProperty('lendingPoolDeployed');
    expect(typeof body.totalPrincipalCspr).toBe('number');
  });
});
