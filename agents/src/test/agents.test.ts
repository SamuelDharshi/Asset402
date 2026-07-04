import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Keys } from 'casper-js-sdk';
import { ListingAgent, SurgeSignal } from '../listing-agent';
import { MaintenanceOracleAgent } from '../maintenance-oracle-agent';

jest.mock('../lib/casper-rpc', () => {
  const actual = jest.requireActual('../lib/casper-rpc');
  return { ...actual, submitTransfer: jest.fn(), waitForDeploy: jest.fn() };
});
// eslint-disable-next-line @typescript-eslint/no-var-requires
const casperRpcMock = require('../lib/casper-rpc') as { submitTransfer: jest.Mock; waitForDeploy: jest.Mock };

// Mock X402Client and CsprTradeMCPClient
const mockX402Client = {
  fetch: jest.fn(),
} as any;

const mockCsprTradeMCPClient = {} as any;

describe('ListingAgent Demand Surge Engine', () => {
  let agent: ListingAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new ListingAgent({
      csprTradeMCP: mockCsprTradeMCPClient,
      x402Client: mockX402Client,
      backendUrl: 'http://localhost:3001',
      surgeApiUrl: 'http://localhost:4402/v1',
    });
  });

  it('should fall back to seasonal surges when live API call fails or is empty', async () => {
    mockX402Client.fetch.mockRejectedValue(new Error('Network error'));
    
    // Generator has a seasonal surge in Dec
    const signal = await agent.checkDemandSurge('Generator', 'global');
    expect(signal).not.toBeNull();
    expect(signal?.assetType).toBe('Generator');
    expect(signal?.surgeMultiplier).toBe(3.0);
    expect(signal?.reason).toContain('Storm season');
  });

  it('should successfully utilize dynamic surge signals from paid x402 API', async () => {
    const mockSignal = {
      surge_multiplier: 2.2,
      reason: 'Dynamic high demand event',
      valid_until: new Date(Date.now() + 100000).toISOString(),
    };
    mockX402Client.fetch.mockResolvedValue(mockSignal);

    const signal = await agent.checkDemandSurge('Cinema Camera', 'global');
    expect(signal).not.toBeNull();
    expect(signal?.surgeMultiplier).toBe(2.2);
    expect(signal?.reason).toBe('Dynamic high demand event');
  });

  it('applies the seasonal surge multiplier to the published rate', async () => {
    mockX402Client.fetch.mockRejectedValue(new Error('no live surge API'));
    mockCsprTradeMCPClient.getTokenPrice = jest.fn().mockResolvedValue({ symbol: 'CSPR', priceUsd: 0.025, change24h: 0, updatedAt: 'now' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

    const asset = { assetId: 1, assetType: 'Generator', region: 'global' } as any;
    const listing = await agent.publishListing(asset, new Date(), new Date(Date.now() + 86_400_000), 0);

    // Generator base rate $5.5/hr × 3.0 seasonal surge = $16.5/hr, no idle discount.
    expect(listing.surgeActive).toBe(true);
    expect(listing.surgeMultiplier).toBe(3.0);
    expect(listing.rateUsdPerHour).toBeCloseTo(16.5, 2);
  });

  it('applies idle discount and no surge for an asset with no seasonal calendar entry', async () => {
    mockX402Client.fetch.mockRejectedValue(new Error('no live surge API'));
    mockCsprTradeMCPClient.getTokenPrice = jest.fn().mockResolvedValue({ symbol: 'CSPR', priceUsd: 0.025, change24h: 0, updatedAt: 'now' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

    const asset = { assetId: 2, assetType: 'CNC Machine', region: 'global' } as any;
    // 96 idle hours = 2 idle periods × 5% = 10% discount
    const listing = await agent.publishListing(asset, new Date(), new Date(Date.now() + 86_400_000), 96);

    expect(listing.surgeActive).toBe(false);
    expect(listing.surgeMultiplier).toBe(1.0);
    expect(listing.rateUsdPerHour).toBeCloseTo(35.0 * 0.9, 2);
  });
});

describe('MaintenanceOracleAgent Lifecycle', () => {
  let oracle: MaintenanceOracleAgent;

  beforeEach(() => {
    oracle = new MaintenanceOracleAgent({
      x402Client: mockX402Client,
      backendUrl: 'http://localhost:3001',
      serviceFinder: 'http://localhost:4402/v1/services',
      alertThresholdH: 20,
    });
  });

  it('should accumulate operated hours correctly', () => {
    const assetId = 123;
    oracle.recordSession(assetId, 10);
    oracle.recordSession(assetId, 5.5);

    // Analyze asset
    const asset = { assetId, assetType: 'Generator', ownerAddress: '0x123', name: 'Cat Gen' } as any;
    const totalHours = (oracle as any).operatingHours.get(assetId);
    expect(totalHours).toBe(15.5);
  });

  it('should classify asset service status properly based on operating limits', async () => {
    const assetId = 456;
    const asset = { assetId, assetType: 'Generator', ownerAddress: '0x123', name: 'Cat Gen' } as any; // Generator interval is 150h

    // 0 hours operated -> OK
    let prediction = await oracle.analyseAsset(asset);
    expect(prediction.status).toBe('OK');
    expect(prediction.hoursUntilService).toBe(150);

    // 140 hours operated -> DUE_SOON (threshold is 20)
    oracle.recordSession(assetId, 140);
    prediction = await oracle.analyseAsset(asset);
    expect(prediction.status).toBe('DUE_SOON');
    expect(prediction.hoursUntilService).toBe(10);
  });

  it('labels the fallback provider result as a curated-directory fixture, not a live API', async () => {
    mockX402Client.fetch.mockRejectedValue(new Error('no live service-finder API'));
    const asset = { assetId: 456, assetType: 'Generator', ownerAddress: '0x123', name: 'Cat Gen' } as any;

    oracle.recordSession(456, 140); // push into DUE_SOON so findServiceProvider runs
    const prediction = await oracle.analyseAsset(asset);

    expect(prediction.nearestProvider).not.toBeNull();
    expect(prediction.nearestProvider?.source).toBe('curated-directory');
  });
});

describe('MaintenanceOracleAgent.executeBooking', () => {
  let keyPath: string;

  beforeEach(() => {
    jest.clearAllMocks();
    const kp = Keys.Ed25519.new();
    keyPath = path.join(os.tmpdir(), `maint-test-key-${Date.now()}-${Math.random().toString(36).slice(2)}.pem`);
    fs.writeFileSync(keyPath, kp.exportPrivateKeyInPem());
  });
  afterEach(() => { fs.rmSync(keyPath, { force: true }); });

  function makeOracle() {
    return new MaintenanceOracleAgent({
      x402Client: mockX402Client,
      backendUrl: 'http://localhost:3001',
      serviceFinder: 'http://localhost:4402/v1/services',
      alertThresholdH: 20,
      agentPrivateKeyPath: keyPath,
      nodeUrl: 'https://node.testnet.casper.network/rpc',
      networkName: 'casper-test',
      serviceEscrowAddress: `01${'ab'.repeat(32)}`,
    });
  }

  it('submits a real signed deposit transfer for the deposit amount', async () => {
    casperRpcMock.submitTransfer.mockResolvedValue('deadbeef'.repeat(8));
    casperRpcMock.waitForDeploy.mockResolvedValue({ deployHash: 'deadbeef'.repeat(8), blockHeight: 1, effects: [] });
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

    const oracle = makeOracle();
    const result = await oracle.executeBooking(789, 'http://example.com/book', 210);

    expect(casperRpcMock.submitTransfer).toHaveBeenCalledWith(
      expect.objectContaining({ targetPublicKeyHex: `01${'ab'.repeat(32)}` })
    );
    expect(result.depositTxHash).toBe('deadbeef'.repeat(8));
    expect(result.bookingRef).not.toMatch(/^mock-/);
  });

  it('does not report a booking as confirmed when the deposit transfer fails', async () => {
    casperRpcMock.submitTransfer.mockRejectedValue(new Error('RPC unreachable'));

    const oracle = makeOracle();
    await expect(oracle.executeBooking(789, 'http://example.com/book', 210)).rejects.toThrow('RPC unreachable');
  });
});
