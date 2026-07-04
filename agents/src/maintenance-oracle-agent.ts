// ─────────────────────────────────────────────────────────────────────────────
//  Maintenance Oracle Agent  (v2.0 — New Agent)
//  Tracks asset operating hours, predicts maintenance needs,
//  sources service providers via x402, and auto-books on approval.
// ─────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'eventemitter3';
import { X402Client }   from './x402/client';
import { AgentMessage, AssetMetadata } from './types';
import { v4 as uuidv4 } from 'uuid';
import { Keys } from 'casper-js-sdk';
import { loadAgentKey } from './lib/casper-key';
import { submitTransfer, waitForDeploy } from './lib/casper-rpc';

// No live global equipment-service-provider marketplace API exists to wire up
// (documented limitation, see PRD honesty callouts) — this is a curated seed
// directory, not a stand-in for a real API. Every entry is labeled
// `source: 'curated-directory'` so callers can distinguish it from a
// hypothetical future live API response (`source: 'live-api'`).
const KNOWN_SERVICE_PROVIDERS: Record<string, { name: string; rating: number; estimatedCostUsd: number }> = {
  'default':        { name: 'Sigma Field Services',   rating: 4.8, estimatedCostUsd: 210 },
  'Excavator':      { name: 'Sigma Heavy Equipment',  rating: 4.7, estimatedCostUsd: 340 },
  'Cinema Camera':  { name: 'Sigma Cine Services',     rating: 4.8, estimatedCostUsd: 210 },
  'Generator':      { name: 'Sigma Power Services',    rating: 4.6, estimatedCostUsd: 180 },
};

// Documented fallback CSPR/USD rate, used only when no live rate is supplied
// to executeBooking() — same honesty pattern as risk-agent.ts's fallback price.
const FALLBACK_CSPR_USD_RATE = 0.0234;

// ── Manufacturer service intervals (hours) by asset category ─────────────────
const SERVICE_INTERVAL_HOURS: Record<string, number> = {
  'Agricultural Tractor':  250,
  'Excavator':             500,
  'Crane':                1000,
  'Generator':             150,
  'CNC Machine':           300,
  'Cinema Camera':         200,
  'Food Truck':            200,
  'Marine Vessel':         250,
  'default':               200,
};

// ── Carbon formula constants ─────────────────────────────────────────────────
const MFGR_CARBON_KG: Record<string, number> = {
  'Agricultural Tractor': 18_000,
  'Excavator':            45_000,
  'Crane':               120_000,
  'Generator':             4_500,
  'CNC Machine':          12_000,
  'Cinema Camera':           800,
  'Marine Vessel':        55_000,
  'default':               5_000,
};
const ASSET_LIFETIME_HOURS: Record<string, number> = {
  'Agricultural Tractor':  8_000,
  'Excavator':            15_000,
  'Crane':                20_000,
  'Generator':             6_000,
  'CNC Machine':          12_000,
  'Cinema Camera':         4_000,
  'Marine Vessel':        20_000,
  'default':               8_000,
};

export interface MaintenancePrediction {
  assetId:            number;
  assetType:          string;
  totalHoursOperated: number;
  hoursUntilService:  number;
  serviceIntervalH:   number;
  nearestProvider: {
    name:             string;
    rating:           number;
    estimatedCostUsd: number;
    availableDate:    string;
    bookingUrl:       string;
    /** 'live-api' if a real service-finder endpoint answered, 'curated-directory'
     *  if this came from the static KNOWN_SERVICE_PROVIDERS fixture. */
    source:           'live-api' | 'curated-directory';
  } | null;
  status: 'OK' | 'DUE_SOON' | 'OVERDUE';
}

export interface MaintenanceOracleConfig {
  x402Client:   X402Client;
  backendUrl:   string;
  /** URL of the service-provider finder API (x402-gated) */
  serviceFinder: string;
  /** Warning threshold: alert when within this many hours of service */
  alertThresholdH: number;
  /** Path to the agent's Casper secret-key PEM, for signing real deposit transfers. */
  agentPrivateKeyPath?: string;
  nodeUrl?:     string;
  networkName?: string;
  /** Real Casper account (public-key hex) that receives service deposits —
   *  no real external provider account exists, so this documented
   *  placeholder ("service escrow") is the actual on-chain destination.
   *  The money movement is real even though the provider match is a fixture. */
  serviceEscrowAddress?: string;
}

export class MaintenanceOracleAgent extends EventEmitter {
  private readonly config: MaintenanceOracleConfig;
  /** In-memory map of assetId → total hours operated */
  private operatingHours = new Map<number, number>();
  private agentKey: Keys.AsymmetricKey | null = null;

  constructor(config: MaintenanceOracleConfig) {
    super();
    this.config = config;
    if (config.agentPrivateKeyPath) {
      this.agentKey = loadAgentKey(config.agentPrivateKeyPath);
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Record rental session hours for an asset.
   * Called by CollectorAgent when a rental closes.
   */
  recordSession(assetId: number, rentalHours: number): void {
    const prev = this.operatingHours.get(assetId) ?? 0;
    this.operatingHours.set(assetId, prev + rentalHours);
    this.log(`Asset #${assetId}: +${rentalHours.toFixed(2)}h → total ${(prev + rentalHours).toFixed(2)}h`);
  }

  /**
   * Analyse maintenance needs for a single asset.
   * Returns a MaintenancePrediction and emits 'maintenance_alert' if near/overdue.
   */
  async analyseAsset(asset: AssetMetadata): Promise<MaintenancePrediction> {
    const totalH   = this.operatingHours.get(asset.assetId) ?? 0;
    const interval = SERVICE_INTERVAL_HOURS[asset.assetType] ?? SERVICE_INTERVAL_HOURS['default']!;
    const lastService = totalH - (totalH % interval);
    const hoursUntil  = interval - (totalH - lastService);

    let status: MaintenancePrediction['status'] = 'OK';
    if (hoursUntil <= 0)                              status = 'OVERDUE';
    else if (hoursUntil <= this.config.alertThresholdH) status = 'DUE_SOON';

    let nearestProvider: MaintenancePrediction['nearestProvider'] = null;

    if (status !== 'OK') {
      nearestProvider = await this.findServiceProvider(asset);
    }

    const prediction: MaintenancePrediction = {
      assetId:            asset.assetId,
      assetType:          asset.assetType,
      totalHoursOperated: totalH,
      hoursUntilService:  Math.max(0, hoursUntil),
      serviceIntervalH:   interval,
      nearestProvider,
      status,
    };

    if (status !== 'OK') {
      this.log(`⚠️  Asset #${asset.assetId} maintenance ${status}: ${hoursUntil.toFixed(1)}h until service`);
      this.emit('maintenance_alert', {
        eventType: 'MAINTENANCE_ALERT' as const,
        source:    'MaintenanceOracleAgent',
        timestamp: Date.now(),
        payload:   prediction,
        traceId:   uuidv4(),
      } satisfies AgentMessage<MaintenancePrediction>);
    }

    return prediction;
  }

  /**
   * Execute an approved maintenance booking.
   *
   * There is no real external service-provider payment API to call — the
   * deposit is instead a REAL signed CSPR transfer to the documented
   * service-escrow account (`config.serviceEscrowAddress`). The money
   * movement and on-chain proof are genuine; only the "provider" side is a
   * curated fixture (see KNOWN_SERVICE_PROVIDERS above).
   */
  async executeBooking(
    assetId:     number,
    bookingUrl:  string,
    depositUsd:  number,
    csprUsdRate: number = FALLBACK_CSPR_USD_RATE,
  ): Promise<{ bookingRef: string; depositTxHash: string }> {
    this.log(`Booking maintenance for asset #${assetId} — deposit $${depositUsd}`);
    void bookingUrl; // retained in the signature for callers/tests; no live booking endpoint to call

    if (!this.agentKey || !this.config.nodeUrl || !this.config.networkName || !this.config.serviceEscrowAddress) {
      throw new Error(
        'executeBooking requires agentPrivateKeyPath, nodeUrl, networkName, and serviceEscrowAddress ' +
        'to be configured — a real deposit transfer cannot be signed without them.'
      );
    }

    const depositMotes = BigInt(Math.round((depositUsd / csprUsdRate) * 1_000_000_000));
    const bookingRef = uuidv4();
    let depositTxHash: string;
    try {
      depositTxHash = await submitTransfer({
        nodeUrl:            this.config.nodeUrl,
        networkName:        this.config.networkName,
        sender:             this.agentKey,
        targetPublicKeyHex: this.config.serviceEscrowAddress,
        amountMotes:        depositMotes,
        context:            `maintenance deposit for asset #${assetId}`,
      });
      await waitForDeploy(this.config.nodeUrl, depositTxHash);
    } catch (err) {
      this.log(`Deposit transfer failed for asset #${assetId}: ${String(err)}`);
      throw err; // booking must not be reported "Confirmed" on a failed payment
    }

    // Record maintenance on-chain via backend
    try {
      await fetch(`${this.config.backendUrl}/api/v1/assets/maintenance`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ assetId, bookingRef, depositTxHash, depositUsd }),
      });
    } catch (err) {
      this.log(`On-chain maintenance record failed: ${String(err)}`);
    }

    this.log(`✓ Booking confirmed: ref=${bookingRef} tx=${depositTxHash}`);
    this.emit('booking_confirmed', {
      eventType: 'MAINTENANCE_BOOKED' as const,
      source:    'MaintenanceOracleAgent',
      timestamp: Date.now(),
      payload:   { assetId, bookingRef, depositTxHash, depositUsd },
      traceId:   uuidv4(),
    } satisfies AgentMessage<{ assetId: number; bookingRef: string; depositTxHash: string; depositUsd: number }>);

    return { bookingRef, depositTxHash };
  }

  /**
   * Calculate Carbon Use Credits (milliCUC) for a completed rental session.
   * Called by Guardian Agent on rental close.
   * Returns milliCUC (1 CUC = 1000 milliCUC).
   */
  calculateCUC(assetType: string, rentalHours: number): number {
    const mfgrCarbon  = MFGR_CARBON_KG[assetType]        ?? MFGR_CARBON_KG['default']!;
    const lifetimeH   = ASSET_LIFETIME_HOURS[assetType]   ?? ASSET_LIFETIME_HOURS['default']!;
    // CUC = (mfgr_carbon / lifetime_hours) × rental_hours × 0.3 (shared use factor)
    const cucAmount   = (mfgrCarbon / lifetimeH) * rentalHours * 0.3;
    const milliCUC    = Math.round(cucAmount * 1000);
    this.log(`CUC calc: ${rentalHours.toFixed(2)}h × ${assetType} → ${(cucAmount).toFixed(3)} CUC (${milliCUC} milliCUC)`);
    return milliCUC;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async findServiceProvider(
    asset: AssetMetadata,
  ): Promise<MaintenancePrediction['nearestProvider']> {
    try {
      interface FinderResp {
        name: string; rating: number; cost_usd: number;
        available_date: string; booking_url: string;
      }
      const data = await this.config.x402Client.fetch<FinderResp>(
        `${this.config.serviceFinder}?asset_type=${encodeURIComponent(asset.assetType)}&region=${encodeURIComponent(asset.region ?? 'global')}`,
        { method: 'GET' },
      );
      return {
        name:             data.name,
        rating:           data.rating,
        estimatedCostUsd: data.cost_usd,
        availableDate:    data.available_date,
        bookingUrl:       data.booking_url,
        source:           'live-api',
      };
    } catch {
      // No live service-finder API exists to call — this is the
      // documented curated-directory fallback, clearly labeled as such.
      const provider = KNOWN_SERVICE_PROVIDERS[asset.assetType] ?? KNOWN_SERVICE_PROVIDERS['default']!;
      return {
        name:             provider.name,
        rating:           provider.rating,
        estimatedCostUsd: provider.estimatedCostUsd,
        availableDate:    new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        bookingUrl:       `${this.config.serviceFinder}/book`,
        source:           'curated-directory',
      };
    }
  }

  private log(msg: string): void {
    console.log(`[MaintenanceOracle ${new Date().toISOString()}] ${msg}`);
  }
}
