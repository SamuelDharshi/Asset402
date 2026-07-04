// ─────────────────────────────────────────────────────────────────────────────
//  Collector Agent  (v2.0 — upgraded with fractional shareholder splits
//  and Carbon Use Credit (CUC) issuance on rental close)
// ─────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'eventemitter3';
import { X402StreamEngine, ActiveSession } from './x402/stream-engine';
import { CasperMCPClient } from './mcp/casper-mcp-client';
import { AgentMessage, RentalData, PaymentSplit } from './types';
import { v4 as uuidv4 } from 'uuid';
import { Keys, CLValueBuilder } from 'casper-js-sdk';
import { loadAgentKey } from './lib/casper-key';
import { submitTransfer, submitContractCall } from './lib/casper-rpc';

// ── Fractional shareholder record ─────────────────────────────────────────────
export interface FractionalShare {
  investorAddress: string;   // Casper public key hex
  shareCount:      number;
  totalShares:     number;
}

interface StreamTickPayload {
  rentalId:     number;
  assetId:      number;
  ownerAddress: string;
  loanActive:   boolean;
  split:        PaymentSplit;
}

export interface CollectorAgentConfig {
  streamEngine:      X402StreamEngine;
  /** Retained for future read-only status queries; payment submission goes
   *  through direct RPC (see lib/casper-rpc.ts), not this MCP client. */
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
  private readonly agentKey: Keys.AsymmetricKey;
  /** Map of assetId → fractional shareholders (empty = direct ownership) */
  private fractionalShares = new Map<number, FractionalShare[]>();

  constructor(config: CollectorAgentConfig) {
    super();
    this.config = config;
    // Loaded once at construction — a bad/missing key must fail fast at startup,
    // not be silently replaced by a random throwaway key on the first payment tick.
    this.agentKey = loadAgentKey(config.agentPrivateKey);
    this.log(`Signing key loaded: ${this.agentKey.publicKey.toHex().slice(0, 12)}...`);

    // Wire up stream engine events
    config.streamEngine.on('stream_payment', (msg: AgentMessage<StreamTickPayload>) => {
      void this.onPaymentProcessed(msg.payload);
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

  /**
   * Executes the REAL on-chain transfers for a stream tick, then reports
   * the confirmed result to the backend with a genuine x402 payment proof
   * bound to the owner-transfer's real deploy hash. The backend only ever
   * sees this call after money has actually moved — never before.
   */
  private async onPaymentProcessed(tick: StreamTickPayload): Promise<void> {
    const { rentalId, assetId, ownerAddress, loanActive, split } = tick;
    this.log(`Split for rental #${rentalId}: owner=${split.ownerMotes}, loan=${split.loanRepayMotes}, fee=${split.protocolMotes}`);

    const agentKey = this.agentKey;
    const shareholders = this.fractionalShares.get(assetId);

    try {
      // ── Owner slice — split among shareholders if fractional ────────────
      let ownerDeployHash = '';
      if (split.ownerMotes > 0n) {
        if (shareholders && shareholders.length > 0) {
          const hashes = await this.distributeFractional(agentKey, shareholders, split.ownerMotes);
          // Representative proof for the backend report — a full per-shareholder
          // proof isn't modeled by the single-recipient x402 proof shape below;
          // documented simplification for this pass.
          ownerDeployHash = hashes[0] ?? '';
        } else {
          ownerDeployHash = await this.dispatchTransfer(agentKey, ownerAddress, split.ownerMotes, 'Owner Split');
        }
      }

      // ── Loan repayment ─────────────────────────────────────────────────
      // lendingPoolAddr is a CONTRACT hash, not an account — a native
      // transfer can't target it. record_repayment() is a real signed
      // contract-call deploy that updates the loan's on-chain
      // remaining_motes ledger (see contracts/lending_pool/src/lib.rs).
      // NOTE (documented limitation): record_repayment does not itself hold
      // or move the corresponding CSPR — the contract's own comment above
      // record_repayment explains this slice is tracked, not custodied, by
      // this contract. Full fund-custody for loan disbursement/repayment
      // would require a broader LendingPool redesign beyond this pass.
      if (split.loanRepayMotes > 0n) {
        await this.dispatchLoanRepayment(agentKey, assetId, split.loanRepayMotes);
      }

      // ── Protocol fee ───────────────────────────────────────────────────
      if ((split.protocolMotes ?? 0n) > 0n) {
        await this.dispatchTransfer(agentKey, this.config.protocolVault, split.protocolMotes!, 'Protocol Fee');
      }

      // ── Report the now-confirmed result to the backend ───────────────────
      await this.reportStreamPayment(rentalId, assetId, ownerAddress, loanActive, split, ownerDeployHash);

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
   * POSTs the confirmed payment to the backend with a real x402 proof bound
   * to `ownerDeployHash` — the backend's facilitator.verifyPayment() can
   * genuinely confirm this on-chain, unlike the pre-transfer attestations
   * this route used to accept.
   */
  private async reportStreamPayment(
    rentalId:        number,
    assetId:         number,
    ownerAddress:    string,
    loanActive:      boolean,
    split:           PaymentSplit,
    ownerDeployHash: string,
  ): Promise<void> {
    const nonce = uuidv4();
    const message = `${this.config.networkName}:${ownerAddress}:${split.ownerMotes}:${nonce}:${ownerDeployHash}`;
    const sigBytes = this.agentKey.sign(Buffer.from(message));
    const paymentProof = {
      network:    this.config.networkName,
      recipient:  ownerAddress,
      amount:     split.ownerMotes.toString(),
      nonce,
      deployHash: ownerDeployHash,
      signature:  Buffer.from(sigBytes).toString('hex'),
      publicKey:  this.agentKey.publicKey.toHex(),
      timestamp:  Date.now(),
    };

    try {
      const response = await fetch(`${this.config.backendUrl}/api/v1/stream/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rentalId,
          assetId,
          amountMotes: split.ownerMotes.toString(),
          paymentProof,
          split: {
            ownerMotes:       split.ownerMotes.toString(),
            loanRepayMotes:   split.loanRepayMotes.toString(),
            protocolFeeMotes: (split.protocolMotes ?? split.protocolFeeMotes).toString(),
          },
          loanActive,
          timestamp: Date.now(),
        }),
      });
      if (!response.ok) {
        throw new Error(`Gateway returned ${response.status}: ${await response.text()}`);
      }
      this.log(`Reported stream payment for rental #${rentalId} to backend`);
    } catch (err) {
      this.log(`Backend report failed for rental #${rentalId}: ${String(err)}`);
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
  ): Promise<string[]> {
    this.log(`Distributing ${ownerMotes} motes among ${shareholders.length} shareholders`);
    const deployHashes: string[] = [];
    for (const s of shareholders) {
      const fraction   = s.shareCount / s.totalShares;
      const recipientM = BigInt(Math.floor(Number(ownerMotes) * fraction));
      if (recipientM > 0n) {
        const hash = await this.dispatchTransfer(agentKey, s.investorAddress, recipientM,
          `Fractional Share (${s.shareCount}/${s.totalShares})`);
        deployHashes.push(hash);
      }
    }
    return deployHashes;
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

  /**
   * Submits a real signed native CSPR transfer directly to the testnet RPC
   * node (not the external Casper MCP server, whose availability is
   * unverified — see agents/src/lib/casper-rpc.ts). `targetBase16` MUST be a
   * real public-key hex; an invalid target throws rather than silently
   * redirecting funds to a freshly-generated, unrecoverable random key.
   */
  private async dispatchTransfer(
    sender:       Keys.AsymmetricKey,
    targetBase16: string,
    amountMotes:  bigint,
    label:        string,
  ): Promise<string> {
    const deployHash = await submitTransfer({
      nodeUrl:            this.config.nodeUrl,
      networkName:        this.config.networkName,
      sender,
      targetPublicKeyHex: targetBase16,
      amountMotes,
      transferId:         Date.now(),
      context:            label,
    });
    this.log(`[${label}] tx: ${deployHash}`);
    return deployHash;
  }

  /**
   * Records a streaming repayment on-chain via a real contract-call deploy
   * to LendingPool.record_repayment(asset_id, amount_motes) — this is what
   * actually moves the loan-repayment progress bar the PRD's live-streaming
   * screen shows; it is not a self-reported/logged-only number.
   */
  private async dispatchLoanRepayment(
    sender:      Keys.AsymmetricKey,
    assetId:     number,
    amountMotes: bigint,
  ): Promise<void> {
    const deployHash = await submitContractCall({
      nodeUrl:         this.config.nodeUrl,
      networkName:     this.config.networkName,
      sender,
      contractHashHex: this.config.lendingPoolAddr,
      entryPoint:      'record_repayment',
      args: {
        asset_id:     CLValueBuilder.u64(assetId),
        amount_motes: CLValueBuilder.u128(amountMotes.toString()),
      },
    });
    this.log(`[Loan Repayment] tx: ${deployHash}`);
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
