// ─────────────────────────────────────────────────────────────────────────────
//  Maintenance Oracle API
//  GET  /api/v1/maintenance/status  — per-asset maintenance predictions
//  POST /api/v1/maintenance/approve — record a signed booking approval
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { isMockDb, readDb, logRepo } from '../db/supabase';

export const maintenanceRouter = new Hono();

// Asset-type specific service intervals (hours of operation)
const SERVICE_INTERVAL_H: Record<string, number> = {
  Generator:        150,
  Excavator:        500,
  'Mini Excavator': 300,
  Tractor:          400,
  'Cinema Camera':  200,
  Crane:            250,
  'Work Vessel':    600,
  'Marine Vessel':  600,
  default:          300,
};

// Demo nearest-provider data by asset type
const PROVIDERS: Record<string, { name: string; rating: number; distance_km: number; cost_usd: number }> = {
  Generator:       { name: 'PowerGen Services Dubai',    rating: 4.9, distance_km: 18, cost_usd: 420 },
  Excavator:       { name: 'Komatsu Care Network',       rating: 4.8, distance_km: 12, cost_usd: 850 },
  'Cinema Camera': { name: 'Sigma Cine Services London', rating: 4.8, distance_km:  8, cost_usd: 210 },
  Tractor:         { name: 'AgriMach Field Services',    rating: 4.7, distance_km: 35, cost_usd: 320 },
  Crane:           { name: 'Heavy Lift Support Co.',     rating: 4.6, distance_km: 22, cost_usd: 640 },
  'Marine Vessel': { name: 'MarineServ International',   rating: 4.7, distance_km: 45, cost_usd: 1200 },
  default:         { name: 'Universal Equipment Services', rating: 4.5, distance_km: 25, cost_usd: 400 },
};

const DUE_SOON_THRESHOLD_H = 20; // within 20 hours = DUE_SOON

interface AssetRow {
  asset_id:       number;
  asset_type:     string;
  model_est?:     string;
  hours_operated?: number;
  [key: string]: unknown;
}

function predictMaintenance(asset: AssetRow) {
  const hoursOperated = asset.hours_operated ?? 0;
  const assetType     = asset.asset_type ?? 'default';
  const interval      = SERVICE_INTERVAL_H[assetType] ?? SERVICE_INTERVAL_H['default']!;
  const remainder     = hoursOperated % interval;
  const hoursUntil    = interval - remainder;

  let status: 'OK' | 'DUE_SOON' | 'OVERDUE';
  if (hoursUntil <= 0)                   status = 'OVERDUE';
  else if (hoursUntil <= DUE_SOON_THRESHOLD_H) status = 'DUE_SOON';
  else                                   status = 'OK';

  const provider = PROVIDERS[assetType] ?? PROVIDERS['default']!;

  return {
    asset_id:            asset.asset_id,
    asset_type:          assetType,
    name:                asset.model_est ?? asset.asset_type ?? `Asset #${asset.asset_id}`,
    status,
    hours_operated:      hoursOperated,
    service_interval_h:  interval,
    hours_until_service: hoursUntil,
    nearest_provider:    status !== 'OK' ? provider : null,
  };
}

// ── GET /api/v1/maintenance/status ─────────────────────────────────────────────

maintenanceRouter.get('/status', async (c) => {
  try {
    let assetList: any[] = [];

    if (isMockDb) {
      const db = readDb();
      assetList = db.assets as any[];
    } else {
      const { supabase } = await import('../db/supabase');
      const { data } = await supabase.from('assets').select('*');
      assetList = (data ?? []) as any[];
    }

    const predictions = assetList.map(predictMaintenance);
    // Sort: OVERDUE first, then DUE_SOON, then OK
    predictions.sort((a, b) => {
      const order = { OVERDUE: 0, DUE_SOON: 1, OK: 2 };
      return order[a.status] - order[b.status];
    });

    return c.json({
      total:       predictions.length,
      assets:      predictions,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Maintenance] status error:', err);
    return c.json({ error: 'Failed to fetch maintenance status' }, 500);
  }
});

// ── POST /api/v1/maintenance/approve ───────────────────────────────────────────

maintenanceRouter.post('/approve', async (c) => {
  const body = await c.req.json<{
    asset_id:    number;
    approved_by: string;
    signature?:  string;
  }>();

  const { asset_id, approved_by, signature } = body;

  if (!asset_id || !approved_by) {
    return c.json({ error: 'Missing asset_id or approved_by' }, 400);
  }

  const bookingRef = `MNT-${asset_id}-${Date.now().toString(36).toUpperCase()}`;

  await logRepo.insert({
    agent_name:       'MaintenanceOracleAgent',
    action_performed: 'maintenance_approved',
    payload: {
      asset_id,
      approved_by,
      signature: signature?.slice(0, 32) ?? '',
      booking_ref: bookingRef,
    },
    status: 'success',
  });

  return c.json({
    success:     true,
    booking_ref: bookingRef,
    asset_id,
    approved_by,
    approved_at: new Date().toISOString(),
    message:     `Maintenance booking ${bookingRef} confirmed`,
  });
});
