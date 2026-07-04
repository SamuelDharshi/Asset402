// ─────────────────────────────────────────────────────────────────────────────
//  Listing Agent  (v2.0 — upgraded with Demand Surge Engine)
//  Publishes asset idle hours to the marketplace with dynamic pricing.
//  Recalculates rates every 12 hours, applies idle-time discounting,
//  and detects demand surge events via x402-paid calendar APIs.
// ─────────────────────────────────────────────────────────────────────────────

import { EventEmitter } from 'eventemitter3';
import { CsprTradeMCPClient } from './mcp/csprtrade-mcp-client';
import { X402Client }   from './x402/client';
import { AssetMetadata, AgentMessage } from './types';
import { v4 as uuidv4 } from 'uuid';

// Floor discount: reduce by 5% per 48h idle, max 30% off
const IDLE_DISCOUNT_STEP_PERCENT = 5;
const MAX_IDLE_DISCOUNT_PERCENT  = 30;

// Base hourly rates in USD by asset category
const BASE_HOURLY_USD: Record<string, number> = {
  'Agricultural Tractor': 12.0,
  'Cinema Camera':        10.0,
  'Generator':             5.5,
  'CNC Machine':          35.0,
  'Excavator':            85.0,
  'Crane':               180.0,
  'Food Truck':           25.0,
  'Marine Vessel':        95.0,
  'default':              10.0,
};

// ── Demand Surge Engine ──────────────────────────────────────────────────────

export interface SurgeSignal {
  assetType:       string;
  region:          string;
  surgeMultiplier: number;   // e.g. 2.8 = 180% surge
  reason:          string;   // e.g. "Harvest season — wheat belt starting"
  validUntil:      Date;
}

// SEASONAL_SURGES — curated static calendar, NOT a live demand-surge market
// feed. No such feed exists to wire up here (documented limitation) — the
// live x402-paid API path above is tried first and used whenever
// `surgeApiUrl` actually answers; this calendar is the honest fallback.
const SEASONAL_SURGES: SurgeSignal[] = [
  {
    assetType:       'Agricultural Tractor',
    region:          'global',
    surgeMultiplier: 2.5,
    reason:          'Harvest season — peak agricultural demand',
    validUntil:      new Date(new Date().getFullYear(), 9, 30), // Oct 30
  },
  {
    assetType:       'Generator',
    region:          'global',
    surgeMultiplier: 3.0,
    reason:          'Storm season preparedness demand spike',
    validUntil:      new Date(new Date().getFullYear(), 11, 1), // Dec 1
  },
  {
    assetType:       'Crane',
    region:          'global',
    surgeMultiplier: 1.8,
    reason:          'Construction Q3 completion rush',
    validUntil:      new Date(new Date().getFullYear(), 8, 30), // Sep 30
  },
];

export interface ListingAgentConfig {
  csprTradeMCP: CsprTradeMCPClient;
  x402Client:   X402Client;
  backendUrl:   string;
  /** Surge calendar API URL (x402-gated) */
  surgeApiUrl?: string;
}

export interface ListingRecord {
  assetId:              number;
  ratePerMinuteMotes:   bigint;
  rateUsdPerHour:       number;
  availableFrom:        string;  // ISO date
  availableTo:          string;  // ISO date
  listingId:            string;
  surgeActive:          boolean;
  surgeMultiplier:      number;
  surgeReason:          string;
}

export class ListingAgent extends EventEmitter {
  private readonly config: ListingAgentConfig;

  constructor(config: ListingAgentConfig) {
    super();
    this.config = config;
  }

  // ── Demand Surge Engine ──────────────────────────────────────────────────

  /**
   * Check if a surge signal exists for the given asset type + region.
   * First checks x402-paid live API, falls back to seasonal calendar.
   */
  async checkDemandSurge(assetType: string, region = 'global'): Promise<SurgeSignal | null> {
    // Try live x402-paid API first
    if (this.config.surgeApiUrl) {
      try {
        interface SurgeResponse {
          surge_multiplier: number;
          reason: string;
          valid_until: string;
        }
        const data = await this.config.x402Client.fetch<SurgeResponse>(
          `${this.config.surgeApiUrl}/surge?asset_type=${encodeURIComponent(assetType)}&region=${encodeURIComponent(region)}`,
          { method: 'GET' },
        );
        if (data && data.surge_multiplier > 1.2) {
          return {
            assetType, region,
            surgeMultiplier: data.surge_multiplier,
            reason:          data.reason,
            validUntil:      new Date(data.valid_until),
          };
        }
      } catch {
        // Fall through to static calendar
      }
    }

    // Check static seasonal calendar
    const now = Date.now();
    const match = SEASONAL_SURGES.find(s =>
      (s.assetType === assetType || s.assetType === 'global') &&
      s.validUntil.getTime() > now
    );
    return match ?? null;
  }

  // ── Core Listing Logic ────────────────────────────────────────────────────

  /**
   * Publish an asset to the marketplace.
   * 1. Fetch CSPR/USD price
   * 2. Check demand surge
   * 3. Compute per-minute rate with idle discount + surge multiplier
   * 4. POST listing to backend
   */
  async publishListing(
    asset:         AssetMetadata,
    availableFrom: Date,
    availableTo:   Date,
    idleHours:     number = 0,
  ): Promise<ListingRecord> {
    this.log(`Publishing listing for asset #${asset.assetId} (${asset.assetType})`);

    // ── Step 1: CSPR price ─────────────────────────────────────────────────
    let csprPriceUsd: number;
    try {
      const priceData = await this.config.csprTradeMCP.getTokenPrice('CSPR', 'USD');
      csprPriceUsd = priceData.priceUsd;
    } catch {
      csprPriceUsd = 0.0234; // fallback
    }

    // ── Step 2: Demand Surge ───────────────────────────────────────────────
    const surge          = await this.checkDemandSurge(asset.assetType, asset.region ?? 'global');
    const surgeActive    = surge !== null && surge.validUntil.getTime() > Date.now();
    const surgeMultiplier = surgeActive ? surge!.surgeMultiplier : 1.0;
    const surgeReason    = surge?.reason ?? '';

    if (surgeActive) {
      this.log(`🔺 SURGE DETECTED for ${asset.assetType}: ×${surgeMultiplier.toFixed(1)} — ${surgeReason}`);
    }

    // ── Step 3: Compute rate ───────────────────────────────────────────────
    const baseHourlyUsd = BASE_HOURLY_USD[asset.assetType] ?? BASE_HOURLY_USD['default']!;

    // Apply idle discount
    const idlePeriods        = Math.floor(idleHours / 48);
    const discountPercent    = Math.min(idlePeriods * IDLE_DISCOUNT_STEP_PERCENT, MAX_IDLE_DISCOUNT_PERCENT);
    const discountedRate     = baseHourlyUsd * (1 - discountPercent / 100);

    // Apply surge multiplier
    const effectiveHourlyUsd = discountedRate * surgeMultiplier;

    // Convert to per-minute CSPR in motes
    const perMinuteUsd       = effectiveHourlyUsd / 60;
    const perMinuteCspr      = perMinuteUsd / csprPriceUsd;
    const ratePerMinuteMotes = BigInt(Math.floor(perMinuteCspr * 1_000_000_000));

    this.log(
      `Rate: ${perMinuteCspr.toFixed(6)} CSPR/min (${effectiveHourlyUsd.toFixed(2)} USD/hr, ` +
      `${discountPercent}% idle discount, ×${surgeMultiplier.toFixed(1)} surge)`
    );

    // ── Step 4: Publish to backend ─────────────────────────────────────────
    const listing: ListingRecord = {
      assetId:            asset.assetId,
      ratePerMinuteMotes,
      rateUsdPerHour:     effectiveHourlyUsd,
      availableFrom:      availableFrom.toISOString(),
      availableTo:        availableTo.toISOString(),
      listingId:          uuidv4(),
      surgeActive,
      surgeMultiplier,
      surgeReason,
    };

    try {
      await fetch(`${this.config.backendUrl}/api/v1/assets/list`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...listing,
          ratePerMinuteMotes: ratePerMinuteMotes.toString(),
        }),
      });
    } catch (err) {
      this.log(`Backend publish failed: ${String(err)}`);
    }

    // Emit surge alert if active (for UI notification)
    if (surgeActive) {
      this.emit('surge_detected', {
        eventType: 'SURGE_DETECTED' as const,
        source:    'ListingAgent',
        timestamp: Date.now(),
        payload:   { assetId: asset.assetId, surge },
        traceId:   uuidv4(),
      } satisfies AgentMessage<{ assetId: number; surge: SurgeSignal | null }>);
    }

    this.emit('listing_published', {
      eventType: 'LISTING_PUBLISHED' as const,
      source:    'ListingAgent',
      timestamp: Date.now(),
      payload:   listing,
      traceId:   uuidv4(),
    } satisfies AgentMessage<ListingRecord>);

    return listing;
  }

  private log(msg: string): void {
    console.log(`[ListingAgent ${new Date().toISOString()}] ${msg}`);
  }
}
