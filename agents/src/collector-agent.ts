// ─────────────────────────────────────────────────────────────────────────────
//  Collector Agent  (v2.0 — upgraded with fractional shareholder splits
//  and Carbon Use Credit (CUC) issuance on rental close)
// ─────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'eventemitter3';
import { X402StreamEngine, ActiveSession } from './x402/stream-engine';
import { CasperMCPClient } from './mcp/casper-mcp-client';
import { AgentMessage, RentalData, PaymentSplit } from './types';
import { v4 as uuidv4 } from 'uuid';
import { DeployUtil, Keys, CLPublicKey } from 'casper-js-sdk';

// ── Fractional shareholder record ─────────────────────────────────────────────
export interface FractionalShare {
  investorAddress: string;   // Casper public key hex
  shareCount:      number;
  totalShares:     number;
}

export interface CollectorAgentConfig {
  streamEngine:      X402StreamEngine;
  casperMCP:         CasperMCPClient;
  backendUrl:        string;
  lendingPoolAddr:   string;
  protocolVault:     string;
  carbonCreditAddr:  string;   // CarbonCredit contract hash (new in v2)
  networkName:       string;
  nodeUrl:           string;
  agentPrivateKey:   string;
}

export class CollectorAgent extends EventEmitter {
  private readonly config: CollectorAgentConfig;
  /** Map of assetId → fractional shareholders (empty = direct ownership) */
  private fractionalShares = new Map<number, FractionalShare[]>();

  constructor(config: CollectorAgentConfig) {
    super();
    this.config = config;

    // Wire up stream engine events
    config.streamEngine.on('stream_payment', (msg: AgentMessage<{ rentalId: number; split: PaymentSplit }>) => {
      void this.onPaymentProcessed(msg.payload.rentalId, msg.payload.split);
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Register fractional shareholders for an asset. */
  registerFractionalShares(assetId: number, shares: FractionalShare[]): void {
    this.fractionalShares.set(assetId, shares);
    this.log(`Asset #${assetId} registered as fractional — ${shares.length} shareholders`);
  }

  /** Begin collecting for a new rental session. */
  startCollecting(rental: RentalData, ownerAddress: string, loanActive: boolean): void {
    const session: ActiveSession = { rental, ownerAddress, loanActive };
    this.config.streamEngine.addSession(session);
    this.config.streamEngine.start();
    this.log(`Collector started for rental #${rental.rentalId}`);
  }

  /** Stop collecting for a completed rental — also issues CUC. */
  stopCollecting(rentalId: number): void {
    const session = this.config.streamEngine.getSession(rentalId);
    this.config.streamEngine.removeSession(rentalId);
    this.log(`Collector stopped for rental #${rentalId}`);

    if (session) {
      // Calculate rental hours: current time minus session startedAt
      const durationMs = Date.now() - session.rental.startedAt;
      const rentalHours = Math.max(0.1, durationMs / (1000 * 3600)); // minimum 0.1 hours for CUC issue
      const assetType = session.rental.assetId === 1 ? 'Excavator' : 'default'; // fallback
      void this.issueCUC(assetType, rentalHours, session.ownerAddress, session.rental.renter);
    }
  }

  // ── Internal Handlers ───────────────────────────────────────────────────────

  private async onPaymentProcessed(rentalId: number, split: PaymentSplit): Promise<void> {
    this.log(`Split for rental #${rentalId}: owner=${split.ownerMotes}, loan=${split.loanRepayMotes}, fee=${split.protocolMotes}`);

    // Parse agent key
    let agentKey: any;
    try {
      agentKey = Keys.Ed25519.parsePrivateKey(Keys.Ed25519.readBase64WithPEM(process.env.AGENT_PRIVATE_KEY ?? ''));
    } catch {
      this.log('WARNING: Using mock key (no valid AGENT_PRIVATE_KEY)');
      agentKey = Keys.Ed25519.new();
    }

    // Determine if asset is fractional — look up rental's assetId
    const assetId = split.assetId ?? 0;
    const shareholders = this.fractionalShares.get(assetId);

    try {
      // ── Owner slice — split among shareholders if fractional ────────────
      if (split.ownerMotes > 0n) {
        if (shareholders && shareholders.length > 0) {
          await this.distributeFractional(agentKey, shareholders, split.ownerMotes);
        } else {
          // Direct ownership — send full owner slice
          await this.dispatchTransfer(agentKey, split.ownerAddress ?? '', split.ownerMotes, 'Owner Split');
        }
      }

      // ── Loan repayment ─────────────────────────────────────────────────
      if (split.loanRepayMotes > 0n) {
        await this.dispatchTransfer(agentKey, this.config.lendingPoolAddr, split.loanRepayMotes, 'Loan Repayment');
      }

      // ── Protocol fee ───────────────────────────────────────────────────
      if ((split.protocolMotes ?? 0n) > 0n) {
        await this.dispatchTransfer(agentKey, this.config.protocolVault, split.protocolMotes!, 'Protocol Fee');
      }

      this.emit('payment_distributed', {
        eventType: 'PAYMENT_DISTRIBUTED' as const,
        source:    'CollectorAgent',
        timestamp: Date.now(),
        payload:   { rentalId, fractional: !!(shareholders?.length) },
        traceId:   uuidv4(),
      } satisfies AgentMessage<{ rentalId: number; fractional: boolean }>);

      this.log(`✓ Payment split dispatched for rental #${rentalId}`);
    } catch (err) {
      this.log(`Failed to dispatch split: ${String(err)}`);
    }
  }

  /**
   * Distribute owner slice proportionally among fractional shareholders.
   * Each shareholder receives: ownerMotes × (shareCount / totalShares)
   */
  private async distributeFractional(
    agentKey:     Keys.AsymmetricKey,
    shareholders: FractionalShare[],
    ownerMotes:   bigint,
  ): Promise<void> {
    this.log(`Distributing ${ownerMotes} motes among ${shareholders.length} shareholders`);
    for (const s of shareholders) {
      const fraction   = s.shareCount / s.totalShares;
      const recipientM = BigInt(Math.floor(Number(ownerMotes) * fraction));
      if (recipientM > 0n) {
        await this.dispatchTransfer(agentKey, s.investorAddress, recipientM,
          `Fractional Share (${s.shareCount}/${s.totalShares})`);
      }
    }
  }

  /**
   * Issue Carbon Use Credits (CUC) on-chain for a completed rental session.
   * Calls the CarbonCredit contract via the backend API.
   */
  private async issueCUC(
    assetType:    string,
    rentalHours:  number,
    owner:        string,
    renter:       string,
  ): Promise<void> {
    const rentalHoursTenths = Math.round(rentalHours * 10);
    const assetTypeCode     = this.assetTypeCode(assetType);
    try {
      const resp = await fetch(`${this.config.backendUrl}/api/v1/carbon/issue`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ assetType, rentalHours, rentalHoursTenths, assetTypeCode, owner, renter }),
      });
      if (resp.ok) {
        const data = await resp.json() as { cucOwner: number; cucRenter: number; txHash: string };
        this.log(`🍃 CUC issued: owner=${data.cucOwner} milliCUC, renter=${data.cucRenter} milliCUC, tx=${data.txHash}`);
        this.emit('cuc_issued', {
          eventType: 'CUC_ISSUED' as const,
          source:    'CollectorAgent',
          timestamp: Date.now(),
          payload:   { assetType, rentalHours, cucOwner: data.cucOwner, cucRenter: data.cucRenter, txHash: data.txHash },
          traceId:   uuidv4(),
        } satisfies AgentMessage<{ assetType: string; rentalHours: number; cucOwner: number; cucRenter: number; txHash: string }>);
      }
    } catch (err) {
      this.log(`CUC issuance failed: ${String(err)}`);
    }
  }

  private async dispatchTransfer(
    sender:       Keys.AsymmetricKey,
    targetBase16: string,
    amountMotes:  bigint,
    label:        string,
  ): Promise<void> {
    let targetPk: CLPublicKey;
    try {
      targetPk = CLPublicKey.fromHex(targetBase16);
    } catch {
      targetPk = Keys.Ed25519.new().publicKey;
    }

    const deployParams = new DeployUtil.DeployParams(sender.publicKey, this.config.networkName, 1, 1_800_000);
    const session      = DeployUtil.ExecutableDeployItem.newTransfer(
      amountMotes.toString(), targetPk, null, uuidv4()
    );
    const payment      = DeployUtil.standardPayment('100000000');
    const deploy       = DeployUtil.makeDeploy(deployParams, session, payment);
    const signed       = DeployUtil.signDeploy(deploy, sender);
    const deployJson   = DeployUtil.deployToJson(signed) as Record<string, unknown>;
    const deployHash   = await this.config.casperMCP.submitDeploy(deployJson);
    this.log(`[${label}] tx: ${deployHash}`);
  }

  private assetTypeCode(assetType: string): number {
    const codes: Record<string, number> = {
      'Agricultural Tractor': 1, 'Excavator': 2, 'Crane': 3,
      'Generator': 4, 'CNC Machine': 5, 'Cinema Camera': 6,
      'Marine Vessel': 7, 'Food Truck': 8,
    };
    return codes[assetType] ?? 0;
  }

  private log(msg: string): void {
    console.log(`[CollectorAgent ${new Date().toISOString()}] ${msg}`);
  }
}
