// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/v1/lending/loans       — Active loans (real backend-tracked data)
//  GET /api/v1/lending/pool-stats  — Aggregate pool stats derived from those loans
//
//  LendingPool IS now deployed to testnet (LENDING_POOL_ADDR is set — see
//  scripts/deployment-results-v3.json), so `lendingPoolDeployed` below is
//  accurate. But its on-chain `total_liquidity`/`total_outstanding` Vars are
//  stored inside Odra's internal serialized state blob, not as individually
//  addressable named keys — reading them back over plain JSON-RPC would
//  require decoding that internal encoding, which isn't done here. So
//  "total deposits" is still derived from tracked loan principal, not a
//  fabricated number, and `lpDepositFlowAvailable` is reported separately
//  and honestly as false: depositing requires the LP's own wallet to sign a
//  payable deploy (LendingPool.deposit() reads env().attached_value(), see
//  contracts/lending_pool/src/lib.rs test_deposit_uses_attached_value_not_param),
//  and that deploy-building + signing flow isn't wired into ui/lib/casper-click.tsx
//  yet (it only supports signMessage/signTypedData today).
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { readDb, logRepo } from '../db/supabase';

export const lendingRouter = new Hono();

lendingRouter.get('/loan/:assetId', async (c) => {
  const assetId = parseInt(c.req.param('assetId'), 10);
  const db = readDb();
  const loan = db.loans.find(l => l.asset_id === assetId);
  if (!loan) return c.json({ error: 'No loan found for this asset' }, 404);

  const principal = BigInt(loan.principal_motes);
  const remaining = BigInt(loan.remaining_motes);
  const repaid = principal - remaining;
  const pctRepaid = principal > 0n ? Number((repaid * 10000n) / principal) / 100 : 0;

  return c.json({
    assetId,
    status: loan.status,
    principalMotes: loan.principal_motes,
    remainingMotes: loan.remaining_motes,
    pctRepaid,
  });
});

lendingRouter.get('/logs/:assetId', async (c) => {
  const assetId = parseInt(c.req.param('assetId'), 10);
  const logs = await logRepo.findByAssetId(assetId, 30);
  return c.json({
    logs: logs.map(l => ({
      agentName: l.agent_name,
      action: l.action_performed,
      status: l.status,
      timestamp: l.timestamp,
      txHash: l.tx_hash,
    })),
  });
});

lendingRouter.get('/loans', async (c) => {
  const db = readDb();
  const loans = db.loans.map((loan) => {
    const asset = db.assets.find(a => a.asset_id === loan.asset_id);
    return {
      loanId:         loan.id,
      assetId:        loan.asset_id,
      assetName:      asset ? (asset.model_est || asset.asset_type) : `Asset #${loan.asset_id}`,
      borrower:       loan.borrower_address,
      principalMotes: loan.principal_motes,
      remainingMotes: loan.remaining_motes,
      ltvBps:         loan.ltv_bps,
      status:         loan.status,
    };
  });
  return c.json({ loans, total: loans.length });
});

lendingRouter.get('/pool-stats', async (c) => {
  const db = readDb();
  const activeLoans = db.loans.filter(l => l.status === 'Active');

  let totalPrincipal = 0n;
  let totalRemaining = 0n;
  for (const loan of db.loans) {
    totalPrincipal += BigInt(loan.principal_motes || '0');
  }
  for (const loan of activeLoans) {
    totalRemaining += BigInt(loan.remaining_motes || '0');
  }
  const totalRepaid = totalPrincipal - totalRemaining;

  const lendingPoolDeployed = !!process.env['LENDING_POOL_ADDR'] && process.env['LENDING_POOL_ADDR'] !== 'contract_hash_after_deploy';

  return c.json({
    activeLoanCount:      activeLoans.length,
    totalPrincipalCspr:   Number(totalPrincipal) / 1e9,
    totalRemainingCspr:   Number(totalRemaining) / 1e9,
    totalRepaidCspr:      Number(totalRepaid) / 1e9,
    lendingPoolDeployed,
    // Separate from `lendingPoolDeployed`: the contract being live on
    // testnet does not mean self-service LP deposit works yet — that needs
    // a wallet-signed payable deploy the frontend can't build today. See
    // the file header comment for the exact gap.
    lpDepositFlowAvailable: false,
  });
});
