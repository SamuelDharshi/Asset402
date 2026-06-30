// ─────────────────────────────────────────────────────────────────────────────
//  Risk Agent
//  Scores borrowing risk and computes max loan amounts.
//  Integrates: Casper MCP Server + CSPR.trade MCP for on-chain data + prices.
// ─────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'eventemitter3';
import { CasperMCPClient }    from './mcp/casper-mcp-client';
import { CsprTradeMCPClient } from './mcp/csprtrade-mcp-client';
import { RiskAssessment, VisionAnalysisResult, AgentMessage } from './types';
import { v4 as uuidv4 } from 'uuid';

const MOTES_PER_CSPR = 1_000_000_000n;
const MAX_LTV_BPS    = 7000; // 70%
const LIQ_LTV_BPS   = 8500; // 85%

export interface RiskAgentConfig {
  casperMCP:    CasperMCPClient;
  csprTradeMCP: CsprTradeMCPClient;
}

export class RiskAgent extends EventEmitter {
  private readonly casper:    CasperMCPClient;
  private readonly csprTrade: CsprTradeMCPClient;

  constructor(config: RiskAgentConfig) {
    super();
    this.casper    = config.casperMCP;
    this.csprTrade = config.csprTradeMCP;
  }

  /**
   * Full risk assessment pipeline:
   * 1. Fetch owner account history from Casper MCP
   * 2. Fetch CSPR spot price from CSPR.trade MCP
   * 3. Run decision matrix
   * 4. Return loan parameters
   */
  async assessRisk(
    ownerPublicKey:  string,
    assetId:         number,
    visionResult:    VisionAnalysisResult,
  ): Promise<RiskAssessment> {
    this.log(`Assessing risk for asset #${assetId} (${visionResult.assetType})`);

    // ── Step 1: On-chain history via Casper MCP ────────────────────────────
    let history;
    try {
      history = await this.casper.getAccountHistory(ownerPublicKey);
      this.log(`Account history: ${history.deployCount} deploys, age ${history.accountAge} days`);
    } catch (err) {
      console.warn(`[RiskAgent] Casper MCP unavailable — using fallback account data: ${String(err)}`);
      history = { accountAge: 365, deployCount: 10, transferCount: 5 }; // Safe defaults
    }

    // ── Step 2: CSPR price from CSPR.trade MCP ────────────────────────────
    let priceData;
    try {
      priceData = await this.csprTrade.getTokenPrice('CSPR', 'USD');
      this.log(`CSPR price: $${priceData.priceUsd}`);
    } catch (err) {
      console.warn(`[RiskAgent] CSPR.trade MCP unavailable — using fallback price: ${String(err)}`);
      priceData = { priceUsd: 0.0234, change24h: 0, symbol: 'CSPR' }; // Last known fallback
    }

    // ── Step 3: Decision Matrix ────────────────────────────────────────────
    const midValuationUsd  = (visionResult.valueUsdLow + visionResult.valueUsdHigh) / 2;
    const maxLoanUsd       = midValuationUsd * MAX_LTV_BPS / 10_000;
    const maxLoanCspr      = maxLoanUsd / priceData.priceUsd;
    const maxLoanMotes     = BigInt(Math.floor(maxLoanCspr * Number(MOTES_PER_CSPR)));
    const riskScore        = this.computeRiskScore(history, visionResult, priceData.change24h);
    const recommendation   = this.makeRecommendation(riskScore, visionResult.conditionScore);

    this.log(
      `Max loan: ${maxLoanCspr.toFixed(2)} CSPR ($${maxLoanUsd.toFixed(2)}), ` +
      `risk score: ${riskScore}/100, recommendation: ${recommendation}`
    );

    const assessment: RiskAssessment = {
      assetId:          assetId,
      valuationUsd:     midValuationUsd,
      csprPriceUsd:     priceData.priceUsd,
      maxLoanCspr:      maxLoanCspr,
      maxLoanMotes:     maxLoanMotes,
      ltvBps:           MAX_LTV_BPS,
      riskScore,
      liquidationLtvBps: LIQ_LTV_BPS,
      recommendation,
    };

    this.emit('risk_assessed', {
      eventType: 'RISK_ASSESSED' as const,
      source:    'RiskAgent',
      timestamp: Date.now(),
      payload:   assessment,
      traceId:   uuidv4(),
    } satisfies AgentMessage<RiskAssessment>);

    return assessment;
  }

  // ── Decision Matrix ─────────────────────────────────────────────────────────

  /**
   * Composite risk scoring algorithm.
   *
   * | Factor                    | Max Points |
   * |---------------------------|-----------|
   * | Account age (> 180 days)  |    25     |
   * | Deploy count (> 10)       |    20     |
   * | Condition score           |    30     |
   * | CSPR price stability      |    25     |
   *
   * Lower risk score = safer to lend.
   */
  private computeRiskScore(
    history:     { accountAge: number; deployCount: number },
    vision:      VisionAnalysisResult,
    change24h:   number,
  ): number {
    let score = 0;

    // Account age factor (older = lower risk)
    if      (history.accountAge > 365) score += 0;
    else if (history.accountAge > 180) score += 10;
    else if (history.accountAge > 90)  score += 20;
    else                               score += 35;

    // Deploy activity factor
    if      (history.deployCount > 50) score += 0;
    else if (history.deployCount > 10) score += 10;
    else                               score += 20;

    // Asset condition factor (poor condition = higher risk)
    if      (vision.conditionScore >= 80) score += 0;
    else if (vision.conditionScore >= 60) score += 15;
    else                                  score += 30;

    // Market volatility factor
    const absChange = Math.abs(change24h);
    if      (absChange < 2)  score += 0;
    else if (absChange < 5)  score += 5;
    else if (absChange < 10) score += 10;
    else                     score += 25;

    return Math.min(100, score);
  }

  private makeRecommendation(
    riskScore:      number,
    conditionScore: number,
  ): 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW' {
    if (riskScore <= 30 && conditionScore >= 60) return 'APPROVE';
    if (riskScore >= 70 || conditionScore < 40)  return 'REJECT';
    return 'MANUAL_REVIEW';
  }

  private log(msg: string): void {
    console.log(`[RiskAgent ${new Date().toISOString()}] ${msg}`);
  }
}
