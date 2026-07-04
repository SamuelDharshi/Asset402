// ─────────────────────────────────────────────────────────────────────────────
//  x402 Stream Engine — Collector Agent Payment Processor
//  Fires every 60 seconds during active rentals.
//  Performs the 3-way split: 64% owner / 30% loan repayment / 6% protocol fee
// ─────────────────────────────────────────────────────────────────────────────

import cron from 'node-cron';
import { EventEmitter } from 'eventemitter3';
import { X402Client } from './client';
import { CasperMCPClient } from '../mcp/casper-mcp-client';
import { PaymentSplit, RentalData } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Split constants (basis points, must sum to 10000)
const OWNER_BPS     = 6400n;  // 64%
const LOAN_BPS      = 3000n;  // 30%
const PROTOCOL_BPS  = 600n;   // 6%
const BPS_DENOM     = 10000n;

export interface StreamEngineConfig {
  x402Client:      X402Client;
  casperMCP:       CasperMCPClient;
  backendUrl:      string;   // POST to /api/v1/stream/payment
  protocolVault:   string;   // vault address for protocol fees
  lendingPoolAddr: string;   // LendingPool contract address
}

export interface ActiveSession {
  rental:          RentalData;
  ownerAddress:    string;
  loanActive:      boolean;
}

export class X402StreamEngine extends EventEmitter {
  private readonly config:   StreamEngineConfig;
  private activeSessions:    Map<number, ActiveSession> = new Map();
  private cronTask:          cron.ScheduledTask | null  = null;

  constructor(config: StreamEngineConfig) {
    super();
    this.config = config;
  }

  // ── Session Management ──────────────────────────────────────────────────────

  addSession(session: ActiveSession): void {
    this.activeSessions.set(session.rental.rentalId, session);
    this.log(`Session #${session.rental.rentalId} added (asset ${session.rental.assetId})`);
  }

  getSession(rentalId: number): ActiveSession | undefined {
    return this.activeSessions.get(rentalId);
  }

  removeSession(rentalId: number): void {
    this.activeSessions.delete(rentalId);
    this.log(`Session #${rentalId} removed`);
  }

  // ── Cron Engine ─────────────────────────────────────────────────────────────

  /** Start the 60-second cron trigger. */
  start(): void {
    if (this.cronTask) return;
    this.log('Stream engine starting — firing every 60 seconds');
    this.cronTask = cron.schedule('* * * * *', () => void this.processTick());
  }

  /** Stop all streaming. */
  stop(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      this.log('Stream engine stopped');
    }
  }

  // ── Per-Tick Processing ─────────────────────────────────────────────────────

  /**
   * Called every 60 seconds.
   * For each active session:
   * 1. Compute the per-minute payment amount
   * 2. Calculate 3-way split
   * 3. Build x402 payment proofs
   * 4. Submit to backend gateway (which calls the Odra contract)
   */
  async processTick(): Promise<void> {
    if (this.activeSessions.size === 0) return;
    this.log(`Processing tick for ${this.activeSessions.size} active rental(s)`);

    for (const [rentalId, session] of this.activeSessions) {
      try {
        await this.processSession(rentalId, session);
      } catch (err) {
        this.log(`Error processing session #${rentalId}: ${String(err)}`);
      }
    }
  }

  /**
   * Computes the 3-way split and emits `stream_payment` for CollectorAgent
   * to actually execute. This deliberately does NOT sign an x402 proof or
   * POST to the backend here — at this point no real transfer has happened
   * yet, so there is no deployHash to attest to. CollectorAgent performs
   * the real on-chain transfers first (onPaymentProcessed), then reports
   * the confirmed result to the backend itself with a genuine payment proof
   * bound to the real deploy hash.
   */
  private async processSession(rentalId: number, session: ActiveSession): Promise<void> {
    const { rental, ownerAddress, loanActive } = session;
    const amountMotes = rental.ratePerMinute; // motes per minute

    const split = this.computeSplit(amountMotes);
    this.log(
      `Session #${rentalId}: ${amountMotes} motes → ` +
      `owner:${split.ownerMotes} loan:${split.loanRepayMotes} fee:${split.protocolFeeMotes}`
    );

    this.emit('stream_payment', {
      eventType: 'STREAM_PAYMENT' as const,
      source:    'CollectorAgent',
      timestamp: Date.now(),
      payload:   { rentalId, assetId: rental.assetId, ownerAddress, loanActive, split },
      traceId:   uuidv4(),
    });
  }

  // ── Split Math ──────────────────────────────────────────────────────────────

  /**
   * Compute the 3-way payment split.
   * Uses integer arithmetic (motes = BigInt) to avoid floating-point drift.
   *
   * | Party    | Share | Basis Points |
   * |----------|-------|--------------|
   * | Owner    |  64%  |    6400      |
   * | Loan     |  30%  |    3000      |
   * | Protocol |   6%  |     600      |
   */
  computeSplit(totalMotes: bigint): PaymentSplit {
    const ownerMotes       = (totalMotes * OWNER_BPS)    / BPS_DENOM;
    const loanRepayMotes   = (totalMotes * LOAN_BPS)     / BPS_DENOM;
    const protocolFeeMotes = (totalMotes * PROTOCOL_BPS) / BPS_DENOM;

    // Remainder goes to owner to avoid any dust loss
    const distributed = ownerMotes + loanRepayMotes + protocolFeeMotes;
    const dust        = totalMotes - distributed;

    return {
      totalMotes,
      ownerMotes:       ownerMotes + dust,
      loanRepayMotes,
      protocolFeeMotes,
    };
  }

  private log(msg: string): void {
    console.log(`[StreamEngine ${new Date().toISOString()}] ${msg}`);
  }
}
