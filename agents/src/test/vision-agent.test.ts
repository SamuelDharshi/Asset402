import { VisionAgent } from '../vision-agent';
import type { X402Client } from '../x402/client';

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }));
});

const mockX402Client = { fetch: jest.fn() } as unknown as X402Client;

function makeAgent(anthropicApiKey?: string) {
  return new VisionAgent({
    moondreamApiUrl: 'http://localhost:8080/v1/classify',
    pricingOracleUrl: 'http://localhost:4402/v1/price',
    x402Client: mockX402Client,
    anthropicApiKey,
  });
}

// Access the mocked Anthropic constructor's instance methods.
function getMockedCreate(agent: VisionAgent): jest.Mock {
  return (agent as unknown as { anthropic: { messages: { create: jest.Mock } } }).anthropic.messages.create;
}

describe('VisionAgent.analysePhoto (real Claude vision)', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; jest.clearAllMocks(); });

  it('calls Anthropic and parses a valid classification response', async () => {
    const agent = makeAgent('fake-key');
    getMockedCreate(agent).mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        asset_type: 'Excavator', make: 'Komatsu', model_est: 'PC88MR', year_range: '2019-2022', confidence: 0.9,
      }) }],
    });
    (mockX402Client.fetch as jest.Mock).mockResolvedValue({ value_low: 80000, value_high: 90000 });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ Hash: 'QmRealCid123' }),
    }) as any;

    const result = await agent.analysePhoto('data:image/jpeg;base64,ZmFrZWJhc2U2NA==');
    expect(result.assetType).toBe('Excavator');
    expect(result.make).toBe('Komatsu');
    expect(result.confidence).toBe(0.9);
  });

  it('throws instead of fabricating data when Claude returns malformed JSON', async () => {
    const agent = makeAgent('fake-key');
    getMockedCreate(agent).mockResolvedValue({ content: [{ type: 'text', text: 'not json at all' }] });

    await expect(agent.analysePhoto('ZmFrZWJhc2U2NA==')).rejects.toThrow(/unparseable/i);
  });

  it('falls back to the static pricing table and logs a visible warning when the oracle fails', async () => {
    const agent = makeAgent('fake-key');
    getMockedCreate(agent).mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        asset_type: 'Generator', make: 'Honda', model_est: 'EU7000iS', year_range: '2019-2022', confidence: 0.9,
      }) }],
    });
    (mockX402Client.fetch as jest.Mock).mockRejectedValue(new Error('oracle down'));
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ Hash: 'QmFallback' }) }) as any;
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const result = await agent.analysePhoto('ZmFrZWJhc2U2NA==');
    expect(result.valueUsdLow).toBe(1600); // Generator static estimate
    expect(logSpy.mock.calls.some(call => String(call[0]).includes('PRICING FALLBACK ACTIVE'))).toBe(true);
    logSpy.mockRestore();
  });

  it('returns a real-shaped CID from the IPFS upload, not the old hex-hash pattern', async () => {
    const agent = makeAgent('fake-key');
    getMockedCreate(agent).mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        asset_type: 'Excavator', make: 'Komatsu', model_est: 'PC88MR', year_range: '2019-2022', confidence: 0.9,
      }) }],
    });
    (mockX402Client.fetch as jest.Mock).mockResolvedValue({ value_low: 80000, value_high: 90000 });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ Hash: 'QmRealGatewayCid456' }) }) as any;

    const result = await agent.analysePhoto('ZmFrZWJhc2U2NA==');
    expect(result.ipfsHash).toBe('QmRealGatewayCid456');
    expect(result.ipfsHash).not.toMatch(/^Qmassetpilot/i);
  });

  it('throws when no ANTHROPIC_API_KEY is configured, rather than classifying anyway', async () => {
    const agent = makeAgent(undefined);
    await expect(agent.analysePhoto('ZmFrZWJhc2U2NA==')).rejects.toThrow(/ANTHROPIC_API_KEY/);
  });
});
