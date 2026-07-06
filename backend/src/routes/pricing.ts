// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/pricing/surge      — Demand surge multipliers by asset type + region
//  GET /api/v1/pricing/base-rates — Base hourly USD rates by asset type
//  GET /api/v1/pricing/cspr-price — Live CSPR/USD price from CoinGecko (no API key)
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono';

export const pricingRouter = new Hono();

// ── Live CSPR/USD Price Feed (CoinGecko — free, no API key required) ─────────
// Cache for 60 seconds to avoid hitting rate limits during demos.

let csprPriceCache: { priceUsd: number; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function fetchLiveCsprPrice(): Promise<number> {
  // Return cached value if still fresh
  if (csprPriceCache && Date.now() - csprPriceCache.fetchedAt < CACHE_TTL_MS) {
    return csprPriceCache.priceUsd;
  }

  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=casper-network&vs_currencies=usd';
    const res  = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal:  AbortSignal.timeout(5000), // 5-second hard timeout
    });
    if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);
    const data = (await res.json()) as { 'casper-network'?: { usd?: number } };
    const priceUsd = data['casper-network']?.usd;
    if (!priceUsd || priceUsd <= 0) throw new Error('CoinGecko returned invalid price');

    csprPriceCache = { priceUsd, fetchedAt: Date.now() };
    console.log(`[PricingRoute] CSPR price updated from CoinGecko: $${priceUsd}`);
    return priceUsd;
  } catch (err) {
    console.warn(`[PricingRoute] CoinGecko fetch failed: ${String(err)} — using last-known price`);
    // Fall back to last cached value or a conservative estimate
    return csprPriceCache?.priceUsd ?? 0.023;
  }
}

// ── Seasonal Surge Calendar ─────────────────────────────────────────────────────
// Mirrors the real seasonal demand calendar from listing-agent.ts.
// High-priority surges are detected live by the x402-gated oracle; the calendar
// below serves as the authoritative fallback and primary source for regions.
const SEASONAL_SURGES: Record<string, Array<{
  multiplier: number;
  reason: string;
  startDate: string;
  endDate: string;
  regions?: string[];
}>> = {
  Excavator: [
    { multiplier: 2.5, reason: 'Harvest season — infrastructure deployment surge', startDate: '2026-07-01', endDate: '2026-08-31' },
    { multiplier: 1.8, reason: 'Construction boom, Q3 urban projects', startDate: '2026-07-01', endDate: '2026-09-30' },
    { multiplier: 3.2, reason: 'Post-storm rebuilding efforts', startDate: '2026-09-01', endDate: '2026-09-30', regions: ['TX', 'FL', 'LA'] },
  ],
  Tractor: [
    { multiplier: 2.5, reason: 'Peak harvest season', startDate: '2026-07-15', endDate: '2026-10-31' },
    { multiplier: 1.8, reason: 'Secondary planting window', startDate: '2026-03-15', endDate: '2026-05-15' },
  ],
  Generator: [
    { multiplier: 3.0, reason: 'Hurricane season — emergency demand spike', startDate: '2026-06-01', endDate: '2026-11-30', regions: ['FL', 'TX', 'NC', 'SC'] },
    { multiplier: 2.0, reason: 'Summer peak cooling demand', startDate: '2026-06-15', endDate: '2026-08-31' },
  ],
  'Cinema Camera': [
    { multiplier: 1.6, reason: 'Awards season content production', startDate: '2026-09-01', endDate: '2026-11-30' },
    { multiplier: 1.4, reason: 'Film festival production surge', startDate: '2026-06-01', endDate: '2026-07-31' },
  ],
  Crane: [
    { multiplier: 1.8, reason: 'Construction permit surge, Q3', startDate: '2026-07-01', endDate: '2026-09-30' },
  ],
  // Default for unmapped asset types
  default: [
    { multiplier: 1.3, reason: 'General seasonal demand', startDate: '2026-07-01', endDate: '2026-12-31' },
  ],
};

// ── Base Hourly Rates (USD) ───────────────────────────────────────────────────
const BASE_HOURLY_USD: Record<string, number> = {
  Excavator:         85,
  'Mini Excavator':  65,
  Tractor:           55,
  'Agricultural Tractor': 55,
  Generator:         45,
  'Cinema Camera':   120,
  'Film Camera':     95,
  Crane:             180,
  'Mobile Crane':    210,
  'Cargo Van':       35,
  'Commercial Vehicle': 40,
  'Marine Vessel':   220,
  'Fishing Vessel':  180,
  'Work Vessel':     200,
};

// ── GET /api/v1/pricing/surge ──────────────────────────────────────────────────

pricingRouter.get('/surge', (c) => {
  const assetType = c.req.query('asset_type') ?? 'default';
  const region    = c.req.query('region') ?? 'global';
  const now       = new Date();

  const surges = SEASONAL_SURGES[assetType] ?? SEASONAL_SURGES.default;

  // Filter to currently-active surges
  const active = surges.filter(s => {
    const start = new Date(s.startDate);
    const end   = new Date(s.endDate);
    return now >= start && now <= end && (!s.regions || s.regions.includes(region) || s.regions.includes('global'));
  });

  // Deduplicate by multiplier, take the highest if multiple apply
  const byMultiplier = new Map<number, (typeof surges)[0]>();
  for (const s of active) {
    const existing = byMultiplier.get(s.multiplier);
    if (!existing || s.multiplier > existing.multiplier) {
      byMultiplier.set(s.multiplier, s);
    }
  }

  const result = Array.from(byMultiplier.values())
    .sort((a, b) => b.multiplier - a.multiplier)
    .map(s => ({
      multiplier: s.multiplier,
      reason:     s.reason,
      start_date: s.startDate,
      end_date:   s.endDate,
    }));

  return c.json({ asset_type: assetType, region, surges: result });
});

// ── GET /api/v1/pricing/cspr-price ────────────────────────────────────────────
// Returns the live CSPR/USD exchange rate from CoinGecko (60-second cache).
// No API key required — uses free CoinGecko v3 endpoint.

pricingRouter.get('/cspr-price', async (c) => {
  const priceUsd = await fetchLiveCsprPrice();
  return c.json({
    symbol:     'CSPR',
    price_usd:  priceUsd,
    source:     'coingecko',
    cached:     csprPriceCache !== null && Date.now() - csprPriceCache.fetchedAt < CACHE_TTL_MS,
    fetched_at: csprPriceCache?.fetchedAt ?? null,
  });
});

// ── GET /api/v1/pricing/base-rates ────────────────────────────────────────────

pricingRouter.get('/base-rates', async (c) => {
  const assetType = c.req.query('asset_type');
  // Fetch live CSPR price for accurate motes conversion
  const csprUsd = await fetchLiveCsprPrice();

  if (assetType) {
    const rate = BASE_HOURLY_USD[assetType] ?? 60;
    const ratePerMin = rate / 60;
    const csprPerMin = ratePerMin / csprUsd;
    return c.json({
      asset_type:        assetType,
      rate_usd_per_hour: rate,
      rate_cspr_per_min: parseFloat(csprPerMin.toFixed(6)),
      rate_motes_per_min: Math.round(csprPerMin * 1_000_000_000),
      cspr_price_usd:    csprUsd,
      cspr_source:       'coingecko',
    });
  }

  return c.json({
    cspr_price_usd: csprUsd,
    cspr_source:    'coingecko',
    base_rates: Object.entries(BASE_HOURLY_USD).map(([type, rate]) => {
      const ratePerMin  = rate / 60;
      const csprPerMin  = ratePerMin / csprUsd;
      return {
        asset_type:          type,
        rate_usd_per_hour:   rate,
        rate_cspr_per_min:   parseFloat(csprPerMin.toFixed(6)),
        rate_motes_per_min:  Math.round(csprPerMin * 1_000_000_000),
      };
    }),
  });
});