// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/pricing/surge     — Demand surge multipliers by asset type + region
//  GET /api/v1/pricing/base-rates — Base hourly USD rates by asset type
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono';

export const pricingRouter = new Hono();

// ── Seasonal Surge Calendar ─────────────────────────────────────────────────────
// Mirrors the hardcoded SEASONAL_SURGES in listing-agent.ts.
// In production this would call an external API (x402-gated).
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

// ── GET /api/v1/pricing/base-rates ────────────────────────────────────────────

pricingRouter.get('/base-rates', (c) => {
  const assetType = c.req.query('asset_type');

  if (assetType) {
    const rate = BASE_HOURLY_USD[assetType] ?? BASE_HOURLY_USD.default ?? 60;
    return c.json({ asset_type: assetType, rate_usd_per_hour: rate });
  }

  return c.json({
    base_rates: Object.entries(BASE_HOURLY_USD).map(([type, rate]) => ({
      asset_type:          type,
      rate_usd_per_hour:   rate,
      rate_cspr_per_min:  Math.round((rate / 60) / 0.0234 * 1_000_000_000), // rough CSPR equiv at $0.0234/CSPR
    })),
  });
});