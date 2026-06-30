// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/marketplace — Marketplace listings with on-chain reputation
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { supabase, isMockDb, readDb, AssetRow, LoanRow, RentalRow } from '../db/supabase';

export const marketplaceRouter = new Hono();

marketplaceRouter.get('/', async (c) => {
  const assetType = c.req.query('type');

  if (isMockDb) {
    const db = readDb();
    
    // Fetch assets, filter by status (Listed or Fractional)
    let filteredAssets = db.assets.filter(a => ['Listed', 'Fractional'].includes(a.status));
    
    if (assetType) {
      filteredAssets = filteredAssets.filter(a => a.asset_type.toLowerCase().includes(assetType.toLowerCase()));
    }

    // Enrich with loans and rentals
    const enriched = filteredAssets.map((asset) => {
      const assetLoans = db.loans.filter(l => l.asset_id === asset.asset_id);
      const assetRentals = db.rentals.filter(r => r.asset_id === asset.asset_id);
      
      const completedRentals = assetRentals.filter(r => r.status === 'Closed').length;
      const loan = assetLoans[0];

      return {
        ...asset,
        rentals: assetRentals,
        loans: assetLoans,
        onChainRentalCount: completedRentals,
        reputationScore:    Math.min(5.0, 4.0 + completedRentals * 0.02).toFixed(1),
        loanActive:         loan?.status === 'Active',
        ltvPercent:         loan ? (loan.ltv_bps / 100).toFixed(1) : null,
      };
    });

    return c.json({
      total: enriched.length,
      items: enriched,
      fetchedAt: new Date().toISOString(),
    });
  }

  // Supabase fallback path
  let query = supabase
    .from('assets')
    .select(`
      *,
      loans(remaining_motes, ltv_bps, status),
      rentals(rental_id, rate_per_minute, total_streamed, status)
    `)
    .in('status', ['Listed', 'Fractional'])
    .order('valuation_usd', { ascending: false });

  if (assetType) query = query.ilike('asset_type', `%${assetType}%`);

  const { data: assets, error } = await query;
  if (error) return c.json({ error: error.message }, 500);

  const enriched = (assets ?? []).map((asset: any) => {
    const rentalHistory = (asset['rentals'] as RentalRow[] | null) ?? [];
    const completedRentals = rentalHistory.filter((r) => r.status === 'Closed').length;
    const loan = (asset['loans'] as LoanRow[] | null)?.[0];

    return {
      ...asset,
      onChainRentalCount: completedRentals,
      reputationScore:    Math.min(5.0, 4.0 + completedRentals * 0.02).toFixed(1),
      loanActive:         loan?.status === 'Active',
      ltvPercent:         loan ? (loan.ltv_bps / 100).toFixed(1) : null,
    };
  });

  return c.json({
    total:   enriched.length,
    items:   enriched,
    fetchedAt: new Date().toISOString(),
  });
});
