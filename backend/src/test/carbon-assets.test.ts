import * as fs from 'fs';
import * as path from 'path';

jest.mock('../lib/casper-rpc', () => ({
  submitContractCall: jest.fn(),
  waitForDeploy: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const casperRpcMock = require('../lib/casper-rpc') as {
  submitContractCall: jest.Mock;
  waitForDeploy: jest.Mock;
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('../index') as { app: import('hono').Hono };

const DB_PATH = path.join(__dirname, '..', 'db', 'local_db.json');

function readDbFile() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}
function writeDbFile(data: unknown) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

describe('carbon.ts /history route (regression for mock-mode crash)', () => {
  it('returns 200 in mock mode instead of crashing on a null supabase client', async () => {
    const address = '020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1';
    const res = await app.request(`/api/v1/carbon/history/${address}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('history');
    expect(Array.isArray(body.history)).toBe(true);
  });

  it('returns only carbon/CUC-related log entries, filtered by agent', async () => {
    const db = readDbFile();
    const before = db.agent_logs.length;
    db.agent_logs.push(
      { id: 'log-carbon-1', agent_name: 'CollectorAgent', action_performed: 'CUC_ISSUED_test', payload: {}, status: 'success', timestamp: new Date().toISOString() },
      { id: 'log-unrelated-1', agent_name: 'CollectorAgent', action_performed: 'stream_payment', payload: {}, status: 'success', timestamp: new Date().toISOString() },
    );
    writeDbFile(db);

    try {
      const res = await app.request('/api/v1/carbon/history/anyaddress');
      const body = await res.json();
      const actions = body.history.map((h: { action: string }) => h.action);
      expect(actions).toContain('CUC_ISSUED_test');
      expect(actions).not.toContain('stream_payment');
    } finally {
      const db2 = readDbFile();
      db2.agent_logs = db2.agent_logs.slice(0, before);
      writeDbFile(db2);
    }
  });
});

describe('carbon.ts /redeem route (regression for always-negative discount bug)', () => {
  it('subtracts the discount from the loan\'s actual current remaining balance', async () => {
    const db = readDbFile();
    const originalLoans = JSON.parse(JSON.stringify(db.loans));
    db.loans = [{
      id: 'test-loan-1', asset_id: 999, borrower_address: 'x',
      principal_motes: '100000000000', remaining_motes: '50000000000',
      ltv_bps: 7000, status: 'Active', originated_at: new Date().toISOString(),
    }];
    writeDbFile(db);

    try {
      const res = await app.request('/api/v1/carbon/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redeemerAddress: 'x', amountMilliCuc: 1000, rentalId: 1, assetId: 999 }),
      });
      expect(res.status).toBe(200);

      const dbAfter = readDbFile();
      const loan = dbAfter.loans.find((l: { asset_id: number }) => l.asset_id === 999);
      const remaining = BigInt(loan.remaining_motes);
      // 1 CUC = $1 discount at $0.0234/CSPR ≈ 42_735_042_735 motes — must be
      // SUBTRACTED from 50_000_000_000, never a flat negative value.
      expect(remaining).toBeGreaterThanOrEqual(0n);
      expect(remaining).toBeLessThan(50_000_000_000n);
    } finally {
      const dbRestore = readDbFile();
      dbRestore.loans = originalLoans;
      writeDbFile(dbRestore);
    }
  });
});

describe('assets.ts /onboard route (de-mocked)', () => {
  // ASSET_REGISTRY_ADDR / AGENT_PRIVATE_KEY_PATH are loaded from backend/.env
  // via dotenv/config (index.ts's first import) before assets.ts reads them
  // at module scope — both are already real, non-placeholder values there,
  // so no env stubbing is needed here.
  beforeEach(() => { jest.clearAllMocks(); });

  it('submits a real mint_asset deploy and returns a real (non-mock) asset ID and tx hash', async () => {
    casperRpcMock.submitContractCall.mockResolvedValue('realdeployhash'.padEnd(64, '0'));
    casperRpcMock.waitForDeploy.mockResolvedValue({ deployHash: 'realdeployhash'.padEnd(64, '0'), blockHeight: 1, effects: [] });

    const res = await app.request('/api/v1/assets/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerPublicKey: '020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1',
        assetType: 'Excavator', make: 'Komatsu', modelEst: 'PC88MR',
        valuationUsd: 85000, conditionScore: 82, ipfsPhotoHash: 'QmTest',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.asset.mint_tx_hash).not.toMatch(/^mock_tx_/);
    expect(body.asset.mint_tx_hash).toBe('realdeployhash'.padEnd(64, '0'));
    expect(typeof body.assetId).toBe('number');
    expect(casperRpcMock.submitContractCall).toHaveBeenCalledWith(
      expect.objectContaining({ entryPoint: 'mint_asset' })
    );
  });

  it('returns an error response (not a fake success) when the on-chain deploy fails', async () => {
    casperRpcMock.submitContractCall.mockRejectedValue(new Error('insufficient balance'));

    const res = await app.request('/api/v1/assets/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerPublicKey: '020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1',
        assetType: 'Excavator', make: 'Komatsu', modelEst: 'PC88MR',
        valuationUsd: 85000, conditionScore: 82, ipfsPhotoHash: 'QmTest',
      }),
    });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});
