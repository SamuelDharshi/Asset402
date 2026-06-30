// ─────────────────────────────────────────────────────────────────────────────
//  Orchestrator Agent — Central State Router
//  Routes tasks between all 5 agents based on physical-world events.
//  This is the top-level entry point for the Asset402 agent system.
// ─────────────────────────────────────────────────────────────────────────────

import 'dotenv/config';
import { EventEmitter } from 'eventemitter3';
import { VisionAgent }    from './vision-agent';
import { RiskAgent }      from './risk-agent';
import { ListingAgent }   from './listing-agent';
import { GuardianAgent }  from './guardian-agent';
import { CollectorAgent } from './collector-agent';
import { MaintenanceOracleAgent } from './maintenance-oracle-agent';
import { X402Client, createX402ClientFromEnv } from './x402/client';
import { X402StreamEngine } from './x402/stream-engine';
import { CasperMCPClient }    from './mcp/casper-mcp-client';
import { CsprTradeMCPClient } from './mcp/csprtrade-mcp-client';
import {
  AgentMessage, AssetMetadata, VisionAnalysisResult,
  RiskAssessment, RentalData,
} from './types';

// ────────────────────────────────────────────────────────────────────────────

const BACKEND_URL     = process.env['BACKEND_URL']      ?? 'http://localhost:3000';
const CASPER_MCP_URL  = process.env['CASPER_MCP_URL']   ?? 'https://mcp.cspr.cloud';
const CSPRTRADE_URL   = process.env['CSPRTRADE_MCP_URL']?? 'https://mcp.cspr.trade';
const MOONDREAM_URL   = process.env['MOONDREAM_API_URL'] ?? 'http://localhost:8080/v1/classify';
const ORACLE_URL      = process.env['ORACLE_URL']       ?? 'http://localhost:4402/v1/price';
const PROTOCOL_VAULT  = process.env['PROTOCOL_VAULT']   ?? '0'.repeat(64);
const LENDING_POOL    = process.env['LENDING_POOL_ADDR'] ?? '0'.repeat(64);
const ASSET_REGISTRY  = process.env['ASSET_REGISTRY_ADDR'] ?? '0'.repeat(64);

// ────────────────────────────────────────────────────────────────────────────

export class OrchestratorAgent extends EventEmitter {
  private readonly vision:            VisionAgent;
  private readonly risk:              RiskAgent;
  private readonly listing:           ListingAgent;
  private readonly guardian:          GuardianAgent;
  private readonly collector:         CollectorAgent;
  private readonly maintenanceOracle: MaintenanceOracleAgent;

  constructor() {
    super();

    const casperMCP    = new CasperMCPClient({
      serverUrl: CASPER_MCP_URL,
      apiKey:    process.env['CASPER_MCP_API_KEY'],
    });
    const csprTradeMCP = new CsprTradeMCPClient({ serverUrl: CSPRTRADE_URL });
    const x402Client   = createX402ClientFromEnv();

    this.vision = new VisionAgent({
      moondreamApiUrl:  MOONDREAM_URL,
      pricingOracleUrl: ORACLE_URL,
      x402Client,
    });

    this.risk = new RiskAgent({ casperMCP, csprTradeMCP });

    this.listing = new ListingAgent({
      csprTradeMCP,
      x402Client,
      backendUrl: BACKEND_URL,
      surgeApiUrl: `${BACKEND_URL}/api/v1/pricing`,
    });

    this.guardian = new GuardianAgent({
      visionAgent:    this.vision,
      backendUrl:     BACKEND_URL,
      checkIntervalH: 72,
    });

    const streamEngine = new X402StreamEngine({
      x402Client,
      casperMCP,
      backendUrl:      BACKEND_URL,
      protocolVault:   PROTOCOL_VAULT,
      lendingPoolAddr: LENDING_POOL,
    });

    this.collector = new CollectorAgent({
      streamEngine,
      casperMCP,
      backendUrl:      BACKEND_URL,
      lendingPoolAddr: LENDING_POOL,
      protocolVault:   PROTOCOL_VAULT,
      carbonCreditAddr: process.env['CARBON_CREDIT_ADDR'] ?? '0'.repeat(64),
      networkName:     process.env['CASPER_NETWORK'] ?? 'casper-test',
      nodeUrl:         process.env['CASPER_NODE_URL'] ?? 'https://node.testnet.casper.network/rpc',
      agentPrivateKey: process.env['AGENT_PRIVATE_KEY'] ?? '',
    });

    this.maintenanceOracle = new MaintenanceOracleAgent({
      x402Client,
      backendUrl: BACKEND_URL,
      serviceFinder: `${BACKEND_URL}/api/v1/services/finder`,
      alertThresholdH: 10,
    });

    this.wireEventBus();
  }

  // ── Public Triggers ─────────────────────────────────────────────────────────

  /**
   * TRIGGER: Owner uploads a photo.
   * Pipeline: Vision → Risk → Mint → List
   */
  async onPhotoUploaded(ownerPublicKey: string, base64Image: string): Promise<{
    asset:      VisionAnalysisResult;
    risk:       RiskAssessment;
    assetId:    number;
    listingId:  string;
  }> {
    this.log('EVENT: PHOTO_UPLOADED — starting pipeline');

    // Step 1: Vision
    const visionResult = await this.vision.analysePhoto(base64Image);

    // Step 2: Risk assessment
    const riskResult = await this.risk.assessRisk(ownerPublicKey, 0, visionResult);

    if (riskResult.recommendation === 'REJECT') {
      throw new Error(`Risk assessment rejected: score ${riskResult.riskScore}/100`);
    }

    // Step 3: Mint asset on-chain via backend
    const mintRes = await fetch(`${BACKEND_URL}/api/v1/assets/onboard`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ownerPublicKey,
        assetType:     visionResult.assetType,
        make:          visionResult.make,
        modelEst:      visionResult.modelEst,
        valuationUsd:  Math.round((visionResult.valueUsdLow + visionResult.valueUsdHigh) / 2),
        conditionScore: visionResult.conditionScore,
        ipfsPhotoHash: visionResult.ipfsHash,
      }),
    });

    const { assetId } = await mintRes.json() as { assetId: number };
    this.log(`Asset minted on-chain: #${assetId}`);

    // Step 4: List on marketplace
    const now  = new Date();
    const end  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const listingRecord = await this.listing.publishListing(
      { assetId, assetType: visionResult.assetType } as AssetMetadata,
      now, end, 0,
    );

    return { asset: visionResult, risk: riskResult, assetId, listingId: listingRecord.listingId };
  }

  /**
   * TRIGGER: Renter starts a rental session.
   */
  async onRentalStarted(rental: RentalData, ownerAddress: string, loanActive: boolean): Promise<void> {
    this.log(`EVENT: RENTAL_STARTED — session #${rental.rentalId}`);
    this.collector.startCollecting(rental, ownerAddress, loanActive);
    this.guardian.start();
  }

  /**
   * TRIGGER: Rental session closed.
   */
  async onRentalClosed(rentalId: number): Promise<void> {
    this.log(`EVENT: RENTAL_CLOSED — session #${rentalId}`);
    this.collector.stopCollecting(rentalId);
  }

  // ── Event Bus Wiring ────────────────────────────────────────────────────────

  private wireEventBus(): void {
    this.vision.on('vision_complete',    (msg: AgentMessage<VisionAnalysisResult>) => {
      this.log(`Bus: VisionAgent → ${msg.eventType}`);
    });
    this.risk.on('risk_assessed',        (msg: AgentMessage<RiskAssessment>) => {
      this.log(`Bus: RiskAgent → ${msg.eventType} (${msg.payload.recommendation})`);
    });
    this.listing.on('listing_published', (msg: AgentMessage<unknown>) => {
      this.log(`Bus: ListingAgent → ${msg.eventType}`);
    });
    this.guardian.on('condition_checked', (msg: AgentMessage<unknown>) => {
      this.log(`Bus: GuardianAgent → ${msg.eventType}`);
    });
    this.collector.on('loan_repaid',     (msg: AgentMessage<unknown>) => {
      this.log(`Bus: CollectorAgent → LOAN_REPAID 🎉`);
      void this.onLoanRepaid(msg);
    });
  }

  private async onLoanRepaid(msg: AgentMessage<unknown>): Promise<void> {
    const { rentalId } = msg.payload as { rentalId: number };
    // Notify backend to release collateral
    await fetch(`${BACKEND_URL}/api/v1/lending/release-collateral`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rentalId }),
    }).catch(err => this.log(`Release collateral failed: ${String(err)}`));
  }

  private log(msg: string): void {
    console.log(`[Orchestrator ${new Date().toISOString()}] ${msg}`);
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

if (require.main === module) {
  console.log('🚀 Asset402 Orchestrator starting...');
  const orchestrator = new OrchestratorAgent();
  console.log('✅ All 5 agents initialised and ready');
  console.log(`   Backend: ${BACKEND_URL}`);
  console.log(`   Casper MCP: ${CASPER_MCP_URL}`);
}
