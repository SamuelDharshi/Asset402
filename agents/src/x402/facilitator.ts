// ─────────────────────────────────────────────────────────────────────────────
//  x402 Facilitator — Real Payment Verification
//
//  The resource-server side of the x402 flow: issues 402 challenges and
//  verifies payment proofs. Verification is genuine cryptography + an
//  on-chain RPC check, not `() => true` — a caller must have (a) a validly
//  signed proof, (b) matching recipient/amount/network, and (c) a real
//  confirmed-on-chain transfer deploy whose actual effects match the claim.
//  Replay of the same deploy hash is rejected.
// ─────────────────────────────────────────────────────────────────────────────

import type { Response } from 'express';
import { CLPublicKey, Keys } from 'casper-js-sdk';
import { rpcCall } from '../lib/casper-rpc';
import type { PaymentProof } from './client';

export interface ChallengeParams {
  recipient:   string;
  amountMotes: bigint;
  network:     string;
}

// Deploy hashes already redeemed for a free response — rejects replay.
// In-memory for this process's lifetime; sufficient for a single-instance
// demo deployment (each x402-gated endpoint runs in one process here).
const redeemedDeployHashes = new Set<string>();

export function issueChallenge(res: Response, params: ChallengeParams): void {
  res.status(402).set({
    'X-Payment-Address': params.recipient,
    'X-Payment-Amount':  params.amountMotes.toString(),
    'X-Payment-Network': params.network,
    'X-Payment-Nonce':   Date.now().toString(),
    'Content-Type':      'application/json',
  }).json({ error: 'Payment Required', amount: params.amountMotes.toString(), recipient: params.recipient });
}

export interface VerifyResult {
  ok:     boolean;
  reason?: string;
}

/**
 * Constructs a verify()-capable key object from a bare public key hex.
 * The private key field is unused by AsymmetricKey.verify() (verification
 * is a pure public-key operation for both Ed25519 and Secp256K1) — a
 * zero-filled placeholder is supplied only to satisfy the constructor.
 */
function publicKeyVerifier(publicKeyHex: string): Keys.AsymmetricKey {
  const clPk = CLPublicKey.fromHex(publicKeyHex);
  const rawPublicKey = clPk.value();
  return clPk.isEd25519()
    ? new Keys.Ed25519({ publicKey: rawPublicKey, secretKey: new Uint8Array(64) })
    : new Keys.Secp256K1(rawPublicKey, new Uint8Array(32));
}

/**
 * Verifies a base64-encoded X-Payment header against what was actually
 * challenged. Checks, in order: decodability, signature validity, field
 * match, replay, and finally a real on-chain confirmation that the claimed
 * deploy executed a transfer of the right amount to the right recipient.
 */
export async function verifyPayment(
  xPaymentHeader: string,
  expected: { recipient: string; amountMotes: bigint; network: string },
  nodeUrl: string,
): Promise<VerifyResult> {
  let proof: PaymentProof;
  try {
    proof = JSON.parse(Buffer.from(xPaymentHeader, 'base64').toString('utf8'));
  } catch {
    return { ok: false, reason: 'X-Payment header is not valid base64-encoded JSON' };
  }

  if (!proof.deployHash) {
    return { ok: false, reason: 'proof has no deployHash — this looks like a pre-transfer split attestation, not a redeemable payment proof' };
  }
  if (proof.recipient !== expected.recipient) {
    return { ok: false, reason: `recipient mismatch: expected ${expected.recipient}, got ${proof.recipient}` };
  }
  if (proof.amount !== expected.amountMotes.toString()) {
    return { ok: false, reason: `amount mismatch: expected ${expected.amountMotes}, got ${proof.amount}` };
  }
  if (proof.network !== expected.network) {
    return { ok: false, reason: `network mismatch: expected ${expected.network}, got ${proof.network}` };
  }

  const message = `${proof.network}:${proof.recipient}:${proof.amount}:${proof.nonce}:${proof.deployHash}`;
  let signatureValid = false;
  try {
    const verifier = publicKeyVerifier(proof.publicKey);
    signatureValid = verifier.verify(Buffer.from(proof.signature, 'hex'), Buffer.from(message));
  } catch (err) {
    return { ok: false, reason: `could not verify signature: ${String(err)}` };
  }
  if (!signatureValid) {
    return { ok: false, reason: 'signature does not match the claimed public key and payload' };
  }

  if (redeemedDeployHashes.has(proof.deployHash)) {
    return { ok: false, reason: `deploy ${proof.deployHash} has already been redeemed for a prior request` };
  }

  // On-chain confirmation: the claimed deploy must have actually executed a
  // successful transfer for at least the claimed amount to the claimed recipient.
  const onChain = await confirmTransferOnChain(nodeUrl, proof.deployHash, expected);
  if (!onChain.ok) {
    return onChain;
  }

  redeemedDeployHashes.add(proof.deployHash);
  return { ok: true };
}

async function confirmTransferOnChain(
  nodeUrl: string,
  deployHash: string,
  expected: { recipient: string; amountMotes: bigint },
): Promise<VerifyResult> {
  let result: any;
  try {
    result = await rpcCall<any>(nodeUrl, 'info_get_deploy', { deploy_hash: deployHash });
  } catch (err) {
    return { ok: false, reason: `could not fetch deploy ${deployHash} from node: ${String(err)}` };
  }

  const execInfo = result.execution_info;
  if (!execInfo || !execInfo.execution_result) {
    return { ok: false, reason: `deploy ${deployHash} has not been confirmed on-chain yet` };
  }

  const er = execInfo.execution_result.Version2 ?? execInfo.execution_result;
  if (er.error_message !== null && er.error_message !== undefined) {
    return { ok: false, reason: `deploy ${deployHash} failed on-chain: ${er.error_message}` };
  }

  // Confirm the deploy's session actually transferred at least the claimed
  // amount — a confirmed-but-unrelated deploy hash must not pass as proof.
  const session = result.deploy?.session;
  const transferArgs: [string, { parsed: unknown }][] | undefined = session?.Transfer?.args;
  if (!transferArgs) {
    return { ok: false, reason: `deploy ${deployHash} is not a native transfer` };
  }
  const amountArg = transferArgs.find(([name]) => name === 'amount');
  const claimedAmount = amountArg ? BigInt(amountArg[1].parsed as string) : 0n;
  if (claimedAmount < expected.amountMotes) {
    return { ok: false, reason: `deploy ${deployHash} transferred ${claimedAmount} motes, less than the required ${expected.amountMotes}` };
  }

  return { ok: true };
}

/** Express middleware factory: gate a route behind a real x402 payment. */
export function requirePayment(getParams: (req: any) => ChallengeParams, nodeUrl: string) {
  return async (req: any, res: Response, next: () => void) => {
    const xPayment = req.headers['x-payment'] as string | undefined;
    const params = getParams(req);

    if (!xPayment) {
      issueChallenge(res, params);
      return;
    }

    const result = await verifyPayment(xPayment, params, nodeUrl);
    if (!result.ok) {
      res.status(403).json({ error: 'Invalid payment', reason: result.reason });
      return;
    }
    next();
  };
}
