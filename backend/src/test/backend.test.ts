import { app } from '../index';

describe('Backend Gateway API tests', () => {
  it('should return 200 OK for /health endpoint', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });

  it('should return 404 Not Found for invalid endpoints', async () => {
    const res = await app.request('/api/v1/invalid-route');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: 'Route not found' });
  });

  it('should fetch marketplace listings from local DB fallback successfully', async () => {
    const res = await app.request('/api/v1/marketplace');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('items');
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    
    const item = body.items[0];
    expect(item).toHaveProperty('asset_id');
    expect(item).toHaveProperty('status');
    expect(item).toHaveProperty('valuation_usd');
  });

  it('should fetch dynamic pricing rates and surge multipliers', async () => {
    const res = await app.request('/api/v1/pricing/base-rates');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('base_rates');
    expect(Array.isArray(body.base_rates)).toBe(true);

    const surgeRes = await app.request('/api/v1/pricing/surge?asset_type=Generator&region=FL');
    expect(surgeRes.status).toBe(200);
    const surgeBody = await surgeRes.json();
    expect(surgeBody).toHaveProperty('surges');
    expect(Array.isArray(surgeBody.surges)).toBe(true);
  });

  it('should fetch carbon credit (CUC) balances', async () => {
    const address = '020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1';
    const res = await app.request(`/api/v1/carbon/balance/${address}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('address', address);
    expect(body).toHaveProperty('balance_milli_cuc');
  });

  it('should fetch predicted maintenance states for assets', async () => {
    const res = await app.request('/api/v1/maintenance/status');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('assets');
    expect(Array.isArray(body.assets)).toBe(true);
    expect(body.assets.length).toBeGreaterThan(0);

    const asset = body.assets[0];
    expect(asset).toHaveProperty('asset_id');
    expect(asset).toHaveProperty('status');
    expect(asset).toHaveProperty('hours_operated');
    expect(asset).toHaveProperty('service_interval_h');
  });

  it('should process signed maintenance bookings', async () => {
    const payload = {
      asset_id: 1,
      approved_by: '020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1',
      signature: 'mock_signature_test_abc123'
    };
    const res = await app.request('/api/v1/maintenance/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(expect.objectContaining({
      success: true,
      asset_id: 1,
      approved_by: payload.approved_by,
    }));
    expect(body).toHaveProperty('booking_ref');
  });
});
