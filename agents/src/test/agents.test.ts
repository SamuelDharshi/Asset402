import { ListingAgent, SurgeSignal } from '../listing-agent';
import { MaintenanceOracleAgent } from '../maintenance-oracle-agent';

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
});
