import { RiskAgent } from '../risk-agent';
import type { CasperMCPClient } from '../mcp/casper-mcp-client';
import type { CsprTradeMCPClient } from '../mcp/csprtrade-mcp-client';
import type { VisionAnalysisResult } from '../types';

function makeVisionResult(overrides: Partial<VisionAnalysisResult> = {}): VisionAnalysisResult {
  return {
    assetType:      'Excavator',
    make:           'Komatsu',
    modelEst:       'PC88MR',
    yearRange:      '2019-2022',
    valueUsdLow:    78_000,
    valueUsdHigh:   92_000,
    conditionScore: 82,
    confidence:     0.9,
    ipfsHash:       'QmTestHash',
    ...overrides,
  };
}

describe('RiskAgent.assessRisk', () => {
  test('approves within LTV using live MCP data and marks usedFallbackData false', async () => {
    const casperMCP = {
      getAccountHistory: jest.fn().mockResolvedValue({
        publicKey: '01aa', deployCount: 80, transferCount: 40, accountAge: 400, firstActivity: '2024-01-01', balance: '1000',
      }),
    } as unknown as CasperMCPClient;
    const csprTradeMCP = {
      getTokenPrice: jest.fn().mockResolvedValue({ symbol: 'CSPR', priceUsd: 0.025, change24h: 1, updatedAt: 'now' }),
    } as unknown as CsprTradeMCPClient;

    const agent = new RiskAgent({ casperMCP, csprTradeMCP });
    const result = await agent.assessRisk('01deadbeef', 1, makeVisionResult());

    expect(result.usedFallbackData).toBe(false);
    expect(result.recommendation).toBe('APPROVE');
    expect(result.maxLoanCspr).toBeCloseTo((85_000 * 0.7) / 0.025, 0);
  });

  test('flags usedFallbackData true when both MCP calls fail, without throwing', async () => {
    const casperMCP = {
      getAccountHistory: jest.fn().mockRejectedValue(new Error('MCP down')),
    } as unknown as CasperMCPClient;
    const csprTradeMCP = {
      getTokenPrice: jest.fn().mockRejectedValue(new Error('MCP down')),
    } as unknown as CsprTradeMCPClient;

    const agent = new RiskAgent({ casperMCP, csprTradeMCP });
    const result = await agent.assessRisk('01deadbeef', 1, makeVisionResult());

    expect(result.usedFallbackData).toBe(true);
    // Fallback still produces a usable assessment, not a crash.
    expect(result.maxLoanMotes).toBeGreaterThan(0n);
  });

  test('rejects when LTV exceeds max regardless of fallback state', async () => {
    const casperMCP = {
      getAccountHistory: jest.fn().mockRejectedValue(new Error('down')),
    } as unknown as CasperMCPClient;
    const csprTradeMCP = {
      getTokenPrice: jest.fn().mockRejectedValue(new Error('down')),
    } as unknown as CsprTradeMCPClient;

    const agent = new RiskAgent({ casperMCP, csprTradeMCP });
    // Poor condition score should push toward REJECT regardless of the
    // fallback path being used.
    const result = await agent.assessRisk('01deadbeef', 1, makeVisionResult({ conditionScore: 20 }));

    expect(result.recommendation).toBe('REJECT');
  });

  test('always caps ltvBps at the 70% maximum it computes against', async () => {
    const casperMCP = {
      getAccountHistory: jest.fn().mockResolvedValue({
        publicKey: '01aa', deployCount: 80, transferCount: 40, accountAge: 400, firstActivity: '2024-01-01', balance: '1000',
      }),
    } as unknown as CasperMCPClient;
    const csprTradeMCP = {
      getTokenPrice: jest.fn().mockResolvedValue({ symbol: 'CSPR', priceUsd: 0.025, change24h: 0, updatedAt: 'now' }),
    } as unknown as CsprTradeMCPClient;

    const agent = new RiskAgent({ casperMCP, csprTradeMCP });
    const result = await agent.assessRisk('01deadbeef', 1, makeVisionResult());

    expect(result.ltvBps).toBe(7000);
    expect(result.liquidationLtvBps).toBe(8500);
  });
});
