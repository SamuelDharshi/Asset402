// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/owner/:address/summary — Owner Dashboard aggregation
//  Real aggregation over the repo layer (mock-mode-aware) — no fabricated
//  totals. "Today" figures come from actual stream_payment log entries
//  timestamped within the last 24 hours, not a client-side fake counter.
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { assetRepo, loanRepo, rentalRepo, logRepo } from '../db/supabase';

export const ownerRouter = new Hono();

const MOTES_PER_CSPR = 1_000_000_000n;

ownerRouter.get('/:address/summary', async (c) => {
  const address = c.req.param('address');
  const assets = await assetRepo.findByOwner(address);

  let lifetimeEarnedMotes = 0n;
  let activeLoans = 0;
  const assetSummaries = [];

  for (const asset of assets) {
    const [rental, loan] = await Promise.all([
      rentalRepo.findByAssetId(asset.asset_id),
      loanRepo.findByAssetId(asset.asset_id),
    ]);

    if (rental) {
      lifetimeEarnedMotes += BigInt(rental.total_streamed || '0');
    }
    if (loan?.status === 'Active') {
      activeLoans += 1;
    }

    assetSummaries.push({
      assetId:        asset.asset_id,
      assetType:      asset.asset_type,
      make:           asset.make,
      modelEst:       asset.model_est,
      status:         asset.status,
      conditionScore: asset.condition_score,
      valuationUsd:   asset.valuation_usd,
      loan: loan ? { status: loan.status, remainingMotes: loan.remaining_motes, principalMotes: loan.principal_motes } : null,
      rental: rental ? { status: rental.status, ratePerMinute: rental.rate_per_minute, totalStreamed: rental.total_streamed } : null,
    });
  }

  // "Today" delta: real stream_payment log entries from the last 24h whose
  // assetId belongs to this owner.
  const ownedAssetIds = new Set(assets.map(a => a.asset_id));
  const recentPayments = await logRepo.findRecentByAction('stream_payment', 1000);
  const oneDayAgo = Date.now() - 24 * 3600 * 1000;
  let todayDeltaMotes = 0n;
  for (const log of recentPayments) {
    if (new Date(log.timestamp).getTime() < oneDayAgo) continue;
    const payload = log.payload as { assetId?: number; split?: { ownerMotes?: string } } | undefined;
    if (payload?.assetId !== undefined && ownedAssetIds.has(payload.assetId) && payload.split?.ownerMotes) {
      todayDeltaMotes += BigInt(payload.split.ownerMotes);
    }
  }

  // Carbon credits attributable to this owner (CUC_ISSUED logs where they were the owner recipient).
  const carbonLogs = await logRepo.findCarbonRelated('CollectorAgent', 1000);
  const ownerCarbonLogs = carbonLogs.filter(l => (l.payload as { owner?: string } | undefined)?.owner === address);
  const carbonCreditsEarned = ownerCarbonLogs.length;

  return c.json({
    address,
    lifetimeEarnedCspr: Number(lifetimeEarnedMotes) / Number(MOTES_PER_CSPR),
    todayDeltaCspr:     Number(todayDeltaMotes) / Number(MOTES_PER_CSPR),
    activeLoans,
    carbonCreditsEarned,
    assets: assetSummaries,
  });
});
