// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/v1/rentals/start — Start a rental with EIP-712 signature verification
//  POST /api/v1/rentals/end   — End a rental session
//
//  The renter signs a typed data struct off-chain (see rental_escrow contract
//  verify_rental_agreement). The backend verifies the Ed25519 signature locally,
//  then calls RentalEscrow.start_rental() via MCP submitDeploy.
//
//  This achieves "gasless" rental agreements — the renter never pays gas at signing.
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { CLValueBuilder, CLPublicKey } from 'casper-js-sdk';
import { rentalRepo, assetRepo, logRepo } from '../db/supabase';
import { submitContractCall, waitForDeploy } from '../lib/casper-rpc';
import { log } from 'console';

const NODE_URL = process.env['CASPER_NODE_URL'] ?? 'https://node.testnet.casper.network/rpc';
const NETWORK_NAME = process.env['CASPER_NETWORK'] ?? 'casper-test';
const AGENT_PRIVATE_KEY_PATH = process.env['AGENT_PRIVATE_KEY_PATH'] ?? '';
const RENTAL_ESCROW_ADDR = process.env['RENTAL_ESCROW_ADDR'] ?? '';

export const rentalsRouter = new Hono();

// ── GET /api/v1/rentals/by-asset/:assetId ─────────────────────────────────────
// assetId and rentalId are different ID spaces — the frontend needs this
// lookup before it can subscribe to the correct SSE stream/:rentalId feed.

rentalsRouter.get('/by-asset/:assetId', async (c) => {
  const assetId = parseInt(c.req.param('assetId'), 10);
  const rental = await rentalRepo.findByAssetId(assetId);
  if (!rental) return c.json({ error: 'No rental found for this asset' }, 404);
  return c.json({ rentalId: rental.rental_id, status: rental.status });
});

// ── Verify Ed25519 signature locally (mirrors contract's verify_rental_agreement) ─

/** Reconstruct the exact signing payload from the rental agreement */
function buildSigningPayload(agreement: {
  asset_id:        string;
  renter_hash:     string;
  owner_hash:      string;
  rate_per_minute: string;
  duration_minutes: string;
  valid_until:     string;
  nonce:           string;
}): Buffer {
  const domain = Buffer.from('AssetPilot:RentalEscrow:v1');

  const assetIdBuf = Buffer.alloc(8);
  assetIdBuf.writeBigUInt64LE(BigInt(agreement.asset_id));

  const renterBuf  = Buffer.from(agreement.renter_hash.slice(0, 64), 'hex');
  const ownerBuf   = Buffer.from(agreement.owner_hash.slice(0, 64), 'hex');

  const rateBuf = Buffer.alloc(8);
  rateBuf.writeBigUInt64LE(BigInt(agreement.rate_per_minute));

  const durBuf = Buffer.alloc(8);
  durBuf.writeBigUInt64LE(BigInt(agreement.duration_minutes));

  const untilBuf = Buffer.alloc(8);
  untilBuf.writeBigUInt64LE(BigInt(agreement.valid_until));

  const nonceBuf = Buffer.alloc(8);
  nonceBuf.writeBigUInt64LE(BigInt(agreement.nonce));

  return Buffer.concat([domain, assetIdBuf, renterBuf, ownerBuf, rateBuf, durBuf, untilBuf, nonceBuf]);
}

/** Simple Ed25519 verify using the built-in crypto library */
async function verifyEd25519(
  message: Buffer,
  signature: string,
  publicKey: string,
): Promise<boolean> {
  try {
    // Use Web Crypto API for Ed25519 verification if available
    const sigBytes  = Uint8Array.from(Buffer.from(signature, 'hex'));
    const keyBytes  = Uint8Array.from(Buffer.from(publicKey, 'hex'));
    const msgBytes  = new Uint8Array(message);

    // Import the public key
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'Ed25519' },
      false,
      ['verify'],
    );

    const ok = await crypto.subtle.verify('Ed25519', key, sigBytes, msgBytes);
    return ok;
  } catch {
    // Verification failed or API not available — fallback to conservative deny
    log(`[RentalsRouter] Ed25519 verification unavailable — rejecting for safety`);
    return false;
  }
}

// ── POST /api/v1/rentals/start ─────────────────────────────────────────────────

interface RentalStartBody {
  assetId:        number;
  renter:         string;
  owner:          string;
  ratePerMinute:  string; // motes
  durationMinutes: number;
  validUntil:      number; // unix seconds
  nonce:           number;
  signature:       string; // hex
  renterHash:     string; // hex padded to 32 bytes
  ownerHash:      string;  // hex padded to 32 bytes
}

rentalsRouter.post('/start', async (c) => {
  const body = await c.req.json<RentalStartBody>();

  // ── 1. Signature verification ──────────────────────────────────────────────
  const payload = buildSigningPayload({
    asset_id:        body.assetId.toString(),
    renter_hash:     body.renterHash,
    owner_hash:      body.ownerHash,
    rate_per_minute: body.ratePerMinute,
    duration_minutes: body.durationMinutes.toString(),
    valid_until:     body.validUntil.toString(),
    nonce:           body.nonce.toString(),
  });

  // Check signature age — reject expired agreements (>5 min window)
  const nowSec = Math.floor(Date.now() / 1000);
  if (body.validUntil < nowSec - 300) {
    return c.json({ error: 'Rental agreement has expired' }, 400);
  }

  // Signature verification is always required — there is no bypass for a
  // "mock_sig_"-prefixed value. A prior version of this route explicitly
  // accepted that prefix without checking anything, which meant any caller
  // could start a rental (and the streaming payments that follow from it)
  // with zero proof the renter ever agreed to it.
  const isValid = await verifyEd25519(payload, body.signature, body.renter);
  if (!isValid) {
    log(`[RentalsRouter] Invalid rental agreement signature from ${body.renter.slice(0, 10)}…`);
    return c.json({ error: 'Invalid rental agreement signature' }, 401);
  }

  // ── 2. Create rental record ───────────────────────────────────────────────
  // KNOWN LIMITATION: this does not yet submit a real on-chain
  // RentalEscrow.start_rental() deploy — RentalEscrow was not deployed to
  // testnet as of this pass (see scripts/deployment-results-v3.json once
  // available), and encoding the RentalAgreement struct as Casper
  // RuntimeArgs needs the deployed contract to validate against. The
  // signature verification above is real and enforced; the on-chain
  // recording of the rental start is the remaining gap, tracked for the
  // next pass once RentalEscrow is live.
  const rentalId = Date.now() % 100_000;

  await rentalRepo.upsert({
    rental_id:          rentalId,
    asset_id:           body.assetId,
    renter_address:     body.renter,
    owner_address:      body.owner,
    rate_per_minute:    body.ratePerMinute,
    duration_minutes:   body.durationMinutes,
    total_streamed:     '0',
    status:             'Active',
    started_at:         new Date().toISOString(),
  });

  // Update asset status to Rented
  await assetRepo.updateStatus(body.assetId, 'Rented');

  await logRepo.insert({
    agent_name:       'RentalEscrow',
    action_performed: `rental_signed_${rentalId}`,
    payload:          { assetId: body.assetId, renter: body.renter, rentalId, signatureValid: true },
    status:           'success',
  });

  return c.json({
    success:    true,
    rentalId,
    status:     'Active',
    signedAt:   new Date().toISOString(),
  }, 201);
});

// ── POST /api/v1/rentals/end ──────────────────────────────────────────────────

interface RentalEndBody {
  rentalId:       number;
  totalPaidMotes: string;
}

rentalsRouter.post('/end', async (c) => {
  const body = await c.req.json<RentalEndBody>();
  const { rentalId, totalPaidMotes } = body;

  // Routed through the repo layer (mock-mode-aware) instead of the raw
  // supabase client, which is null when running in local-DB mode.
  const rental = await rentalRepo.findByRentalId(rentalId);
  await rentalRepo.close(rentalId, totalPaidMotes);

  if (rental) {
    // Set asset back to Idle
    await assetRepo.updateStatus(rental.asset_id, 'Idle');
  }

  await logRepo.insert({
    agent_name:       'RentalEscrow',
    action_performed: `rental_closed_${rentalId}`,
    payload:          { rentalId, totalPaidMotes },
    status:           'success',
  });

  return c.json({ success: true, rentalId, closedAt: new Date().toISOString() });
});

// ── POST /api/v1/rentals/rate ─────────────────────────────────────────────────
// Called by the Guardian Agent after it reviews a completed rental session.
// Submits RentalEscrow.update_reputation(address, session_score) on-chain —
// a real, signed, gas-paying deploy against the deployed RentalEscrow
// contract, gated on the same env vars as the mint_asset call in assets.ts.

interface RentalRateBody {
  address:      string; // public key hex of the renter or owner being scored
  sessionScore: number; // 0–100
}

rentalsRouter.post('/rate', async (c) => {
  const body = await c.req.json<RentalRateBody>();

  if (body.sessionScore < 0 || body.sessionScore > 100) {
    return c.json({ error: 'sessionScore must be between 0 and 100' }, 400);
  }

  if (!RENTAL_ESCROW_ADDR || !AGENT_PRIVATE_KEY_PATH) {
    return c.json({ error: 'RentalEscrow not configured (RENTAL_ESCROW_ADDR / AGENT_PRIVATE_KEY_PATH missing)' }, 500);
  }

  let txHash: string;
  try {
    txHash = await submitContractCall({
      nodeUrl:             NODE_URL,
      networkName:         NETWORK_NAME,
      agentPrivateKeyPath: AGENT_PRIVATE_KEY_PATH,
      contractHashHex:     RENTAL_ESCROW_ADDR,
      entryPoint:          'update_reputation',
      args: {
        address:       CLValueBuilder.key(CLPublicKey.fromHex(body.address)),
        session_score: CLValueBuilder.u8(body.sessionScore),
      },
    });
    await waitForDeploy(NODE_URL, txHash);
  } catch (err) {
    console.error('[RentalsRouter] update_reputation deploy failed:', String(err));
    return c.json({ error: 'On-chain reputation update failed', detail: String(err) }, 502);
  }

  await logRepo.insert({
    agent_name:       'GuardianAgent',
    action_performed: 'update_reputation',
    payload:          { ...body },
    status:           'success',
    tx_hash:          txHash,
  });

  return c.json({ success: true, txHash, explorerUrl: `https://testnet.cspr.live/deploy/${txHash}` });
});