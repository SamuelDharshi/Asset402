// ─────────────────────────────────────────────────────────────────────────────
//  GET  /api/v1/carbon/balance/:address     — CUC balance from deployed contract
//  GET  /api/v1/carbon/history/:address    — CUC transfer history
//  POST /api/v1/carbon/transfer             — Transfer CUCs to another address
//  POST /api/v1/carbon/redeem               — Redeem CUCs for rental fee discount
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { isMockDb, logRepo, loanRepo } from '../db/supabase';

export const carbonRouter = new Hono();

// ── GET /api/v1/carbon/balance/:address ─────────────────────────────────────

carbonRouter.get('/balance/:address', async (c) => {
  const address = c.req.param('address');

  if (isMockDb) {
    // In mock mode: derive a balance from the local agent_logs history via
    // the repo layer (never touches the raw supabase client, which is null
    // in this mode).
    const logs = await logRepo.findCarbonRelated('CollectorAgent', 1000);
    const cucIssued = logs.length;
    // Simulate a balance (mock balances that increase with each CUC issuance)
    return c.json({
      address,
      balance_milli_cuc: cucIssued * 500,  // each CUC = 1000 milliCUC
      total_earned_cuc: cucIssued,
      unit: 'milliCUC',
      source: 'mock',
    });
  }

  try {
    // Query the deployed CarbonCredit contract via the node RPC
    const nodeUrl = process.env['CASPER_NODE_URL'] ?? 'https://node.testnet.casper.network/rpc';
    const contractHash = process.env['CARBON_CREDIT_ADDR'] ?? '';
    const key = `hash-${contractHash.replace('hash-', '')}`;

    const stateQuery = await fetch(nodeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id:      1,
        method:  'state_get_item',
        params:  {
          state_root_hash: '', // will be resolved by the node
          key,
          path: [],
        },
      }),
    });

    const json = await stateQuery.json() as { result?: { stored_value?: { CLValue?: { json?: string } } } };
    const raw = json?.result?.stored_value?.CLValue?.json ?? '{}';

    // The CarbonCredit contract stores `balances: Mapping<Address, u64>` in milliCUC
    // Parse the address-keyed balance map
    let balanceMilliCuc = 0;
    try {
      const parsed = JSON.parse(raw);
      const addrKey = Object.keys(parsed).find(k => k.includes(address.slice(0, 8).toLowerCase()));
      if (addrKey) balanceMilliCuc = parsed[addrKey] ?? 0;
    } catch { /* parse fallback */ }

    return c.json({
      address,
      balance_milli_cuc: Number(balanceMilliCuc),
      unit: 'milliCUC',
      source: 'chain',
    });
  } catch (err) {
    console.error('[Carbon API] balance query failed:', String(err));
    return c.json({ address, balance_milli_cuc: 0, unit: 'milliCUC', source: 'error' }, 500);
  }
});

// ── GET /api/v1/carbon/history/:address ──────────────────────────────────────

carbonRouter.get('/history/:address', async (c) => {
  const address = c.req.param('address');

  // Routed through logRepo (mock-mode-aware) instead of calling the raw
  // supabase client directly — that client is null in mock mode, which is
  // exactly what was crashing this route on every request before.
  const logs = await logRepo.findCarbonRelated('CollectorAgent', 50);

  const history = logs.map((log) => ({
    action: log.action_performed,
    timestamp: log.timestamp,
    payload: log.payload,
    status: log.status,
  }));

  return c.json({ address, history, total: history.length });
});

// ── POST /api/v1/carbon/redeem ───────────────────────────────────────────────
// Redeem CUCs for a rental fee discount.
//
// The CarbonCredit contract now has a real `redeem_for_discount(amount)`
// entrypoint (contracts/carbon_credits/src/lib.rs) that burns milliCUC from
// `env().caller()`'s own balance and returns a DiscountVoucher. That
// entrypoint MUST be called by the CUC holder's own wallet — burning from
// "caller", not from an address parameter — so the backend agent key cannot
// submit it on the redeemer's behalf without impersonating them. Wiring
// this fully means the frontend prepares the deploy and the user's
// CSPR.click wallet signs it directly, then this route (or a follow-up one)
// verifies the resulting deploy before applying the loan discount below.
// That client-signing step is not yet built, so this route still applies
// the discount to the off-chain loan record only.

carbonRouter.post('/redeem', async (c) => {
  const body = await c.req.json<{
    redeemerAddress: string;
    amountMilliCuc:   number;
    rentalId?:        number;
    assetId?:         number;
  }>();

  const { amountMilliCuc, rentalId, assetId } = body;

  if (amountMilliCuc <= 0) {
    return c.json({ error: 'amountMilliCuc must be positive' }, 400);
  }

  // Store the redemption record in agent_logs
  await logRepo.insert({
    agent_name:       'RedeemAgent',
    action_performed: `CUC_REDEEM_${amountMilliCuc}_milliCUC`,
    payload:          { rentalId, assetId, redeemAmountMilliCuc: amountMilliCuc },
    status:           'success',
  });

  // If an active rental is specified, record the discount on the loan
  if (rentalId && assetId) {
    // Convert milliCUC to CSPR motes at current rate (1 CUC = $1 discount, CSPR at $0.0234)
    const discountMotes = BigInt(Math.floor((amountMilliCuc / 1000) / 0.0234 * 1_000_000_000));
    const loan = await loanRepo.findByAssetId(assetId);
    if (loan) {
      const currentRemaining = BigInt(loan.remaining_motes);
      const newRemaining = currentRemaining > discountMotes ? currentRemaining - discountMotes : 0n;
      await loanRepo.updateRemaining(assetId, newRemaining.toString(), newRemaining === 0n ? 'Repaid' : undefined);
    }
  }

  return c.json({
    success:          true,
    redeemedMilliCuc:  amountMilliCuc,
    discountCode:     `CUC-${Date.now()}`,
    timestamp:        new Date().toISOString(),
  });
});