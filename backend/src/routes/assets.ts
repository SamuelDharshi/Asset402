// ─────────────────────────────────────────────────────────────────────────────
//  Asset management routes + SSE broadcaster for frontend asset updates
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { assetRepo, loanRepo, logRepo, maintenanceRepo } from '../db/supabase';

export const assetsRouter = new Hono();

// ── Backend SSE Client Registry ────────────────────────────────────────────
// In-memory map for the SSE asset events broadcaster.

type AssetSseClient = {
  controller: ReadableStreamDefaultController;
  filterAssetId?: number;
};

const assetSseClients = new Map<string, AssetSseClient>();

export function broadcastAssetUpdate(assetId: number, data: object) {
  const payload = `data: ${JSON.stringify({ asset_id: assetId, ...data })}\n\n`;
  const dead: string[] = [];
  for (const [id, client] of assetSseClients) {
    if (client.filterAssetId !== undefined && client.filterAssetId !== assetId) continue;
    try {
      client.controller.enqueue(new TextEncoder().encode(payload));
    } catch {
      dead.push(id);
    }
  }
  for (const id of dead) assetSseClients.delete(id);
}

// ── SSE endpoint ────────────────────────────────────────────────────────────

assetsRouter.get('/events', (c) => {
  const assetIdFilter = parseInt(c.req.query('assetId') ?? '0', 10) || undefined;
  const clientId = crypto.randomUUID();

  return streamSSE(c, async (stream) => {
    const client: AssetSseClient = {
      controller: stream as unknown as ReadableStreamDefaultController,
      filterAssetId: assetIdFilter,
    };
    assetSseClients.set(clientId, client);

    await stream.writeSSE({ event: 'connected', data: JSON.stringify({ assetId: assetIdFilter ?? 'all' }) });

    const heartbeat = setInterval(async () => {
      try {
        await stream.writeSSE({ event: 'heartbeat', data: Date.now().toString() });
      } catch {
        clearInterval(heartbeat);
        assetSseClients.delete(clientId);
      }
    }, 30_000);

    c.req.raw.signal?.addEventListener('abort', () => {
      clearInterval(heartbeat);
      assetSseClients.delete(clientId);
    });
  });
});

// ── POST /api/v1/assets/onboard ────────────────────────────────────────────────

// ── POST /api/v1/assets/onboard ───────────────────────────────────────────────

assetsRouter.post('/onboard', async (c) => {
  const body = await c.req.json<{
    ownerPublicKey: string;
    assetType:      string;
    make:           string;
    modelEst:       string;
    valuationUsd:   number;
    conditionScore: number;
    ipfsPhotoHash:  string;
  }>();

  // Mock: In production this deploys the Odra contract via Casper MCP
  // Returns a deterministic asset_id for demo purposes
  const mockAssetId = Date.now() % 100_000;

  const asset = await assetRepo.upsert({
    asset_id:        mockAssetId,
    owner_address:   body.ownerPublicKey,
    asset_type:      body.assetType,
    make:            body.make,
    model_est:       body.modelEst,
    valuation_usd:   body.valuationUsd,
    condition_score: body.conditionScore,
    ipfs_photo_hash: body.ipfsPhotoHash,
    status:          'Idle',
    mint_tx_hash:    `mock_tx_${Date.now()}`,
  });

  await logRepo.insert({
    agent_name:       'OrchestratorAgent',
    action_performed: 'mint_asset',
    payload:          { assetId: mockAssetId, ...body },
    status:           'success',
  });

  return c.json({ success: true, assetId: mockAssetId, asset }, 201);
});

// ── POST /api/v1/assets/list ──────────────────────────────────────────────────

assetsRouter.post('/list', async (c) => {
  const body = await c.req.json<{
    assetId:              number;
    ratePerMinuteMotes:   string;
    rateUsdPerHour:       number;
    availableFrom:        string;
    availableTo:          string;
    listingId:            string;
  }>();

  await assetRepo.updateStatus(body.assetId, 'Listed');
  await logRepo.insert({
    agent_name:       'ListingAgent',
    action_performed: 'publish_listing',
    payload:          body,
    status:           'success',
  });

  return c.json({ success: true, listingId: body.listingId });
});

// ── POST /api/v1/assets/update-condition ──────────────────────────────────────

assetsRouter.post('/update-condition', async (c) => {
  const body = await c.req.json<{
    assetId:           number;
    newConditionScore: number;
    newValuationUsd:   number;
    newPhotoHash:      string;
  }>();

  await assetRepo.upsert({
    asset_id:        body.assetId,
    condition_score: body.newConditionScore,
    valuation_usd:   body.newValuationUsd,
    ipfs_photo_hash: body.newPhotoHash,
  });

  await logRepo.insert({
    agent_name:       'GuardianAgent',
    action_performed: 'update_condition',
    payload:          body,
    status:           'success',
  });

  // Mock deploy hash
  const deployHash = `guardian_update_${Date.now()}`;
  return c.json({ success: true, deployHash });
});

// ── GET /api/v1/assets/:id ────────────────────────────────────────────────────

assetsRouter.get('/:id', async (c) => {
  const assetId = parseInt(c.req.param('id'), 10);
  const asset   = await assetRepo.findById(assetId);
  return c.json(asset);
});

// ── GET /api/v1/assets ────────────────────────────────────────────────────────

assetsRouter.get('/', async (c) => {
  const status = c.req.query('status');
  if (status) {
    const statuses = status.split(',') as Array<'Idle'|'Listed'|'Rented'|'Locked'>;
    const { data } = await (await import('../db/supabase')).supabase
      .from('assets')
      .select('*')
      .in('status', statuses);
    return c.json(data ?? []);
  }
  const assets = await assetRepo.findAvailable();
  return c.json(assets);
});

// ── POST /api/v1/assets/maintenance ───────────────────────────────────────────
// Called by the MaintenanceOracleAgent after the owner approves service auto-booking.
// Records the booking in the maintenance_records table and updates asset status.

assetsRouter.post('/maintenance', async (c) => {
  const body = await c.req.json<{
    assetId:        number;
    bookingRef:     string;
    depositTxHash:  string;
    depositUsd:     number;
    provider:       string;
    serviceType:    string;
    scheduledAt:    string;
  }>();

  const record = await maintenanceRepo.insert({
    asset_id:       body.assetId,
    booking_ref:    body.bookingRef,
    deposit_tx_hash: body.depositTxHash,
    cost_usd:       body.depositUsd,
    provider:       body.provider,
    service_type:   body.serviceType,
    status:         'Confirmed',
    scheduled_at:   body.scheduledAt,
  });

  // Update asset status to Maintenance to show the "Service Due" badge is being resolved
  await assetRepo.updateStatus(body.assetId, 'Maintenance');

  await logRepo.insert({
    agent_name:       'MaintenanceOracleAgent',
    action_performed: 'maintenance_booking_confirmed',
    payload:          { assetId: body.assetId, bookingRef: body.bookingRef, provider: body.provider, costUsd: body.depositUsd },
    status:           'success',
    tx_hash:          body.depositTxHash,
  });

  return c.json({ success: true, maintenanceId: record.id, bookingRef: body.bookingRef }, 201);
});

// ── GET /api/v1/assets/maintenance/:assetId ─────────────────────────────────────

assetsRouter.get('/maintenance/:assetId', async (c) => {
  const assetId = parseInt(c.req.param('assetId'), 10);
  const records = await maintenanceRepo.findByAssetId(assetId);
  return c.json(records);
});

// ── POST /api/v1/lending/repay ────────────────────────────────────────────────

assetsRouter.post('/lending/repay', async (c) => {
  const body = await c.req.json<{ rentalId: number; amountMotes: string }>();

  // Fetch the rental to find the asset
  const { data: rental } = await (await import('../db/supabase')).supabase
    .from('rentals')
    .select('asset_id, total_streamed')
    .eq('rental_id', body.rentalId)
    .single();

  if (!rental) return c.json({ error: 'Rental not found' }, 404);

  const loan = await (await import('../db/supabase')).supabase
    .from('loans')
    .select('remaining_motes')
    .eq('asset_id', rental.asset_id)
    .single();

  if (!loan.data) return c.json({ loanStatus: 'NoLoan' });

  const remaining = BigInt(loan.data.remaining_motes as string);
  const repayment = BigInt(body.amountMotes);
  const newRemaining = remaining > repayment ? remaining - repayment : 0n;
  const loanStatus = newRemaining === 0n ? 'Repaid' : 'Active';

  await loanRepo.updateRemaining(rental.asset_id as number, newRemaining.toString(), loanStatus as 'Active' | 'Repaid');

  // Update total_streamed on rental
  const prevStreamed = BigInt(rental.total_streamed as string ?? '0');
  await (await import('../db/supabase')).supabase
    .from('rentals')
    .update({ total_streamed: (prevStreamed + repayment).toString() })
    .eq('rental_id', body.rentalId);

  await logRepo.insert({
    agent_name:       'CollectorAgent',
    action_performed: 'record_repayment',
    payload:          { rentalId: body.rentalId, amountMotes: body.amountMotes, newRemaining: newRemaining.toString(), loanStatus },
    status:           'success',
  });

  return c.json({ loanStatus, newRemaining: newRemaining.toString() });
});
