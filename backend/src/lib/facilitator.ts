// ─────────────────────────────────────────────────────────────────────────────
//  x402 Facilitator (backend copy) — Real Payment Verification
//
//  Duplicated from agents/src/x402/facilitator.ts (documented pragmatic
//  choice — no shared workspace package exists between agents/ and backend/).
//  Verifies that a payment proof is genuinely signed AND that the claimed
//  deploy actually executed a matching on-chain transfer — not `() => true`.
// ─────────────────────────────────────────────────────────────────────────────

import { CLPublicKey, Keys } from 'casper-js-sdk';
import { rpcCall } from './casper-rpc';

export interface PaymentProof {
  network:    string;
  recipient:  string;
  amount:     string;
  nonce:      string;
  deployHash: string;
  signature:  string;
  publicKey:  string;
  timestamp:  number;
}

export interface VerifyResult {
  ok:      boolean;
  reason?: string;
}

const redeemedDeployHashes = new Set<string>();

function publicKeyVerifier(publicKeyHex: string): Keys.AsymmetricKey {
  const clPk = CLPublicKey.fromHex(publicKeyHex);
  const rawPublicKey = clPk.value();
  return clPk.isEd25519()
    ? new Keys.Ed25519({ publicKey: rawPublicKey, secretKey: new Uint8Array(64) })
    : new Keys.Secp256K1(rawPublicKey, new Uint8Array(32));
}

export async function verifyPayment(
  xPaymentProof: PaymentProof,
  expected: { recipient: string; amountMotes: bigint; network: string },
  nodeUrl: string,
): Promise<VerifyResult> {
  const proof = xPaymentProof;

  if (!proof.deployHash) {
    return { ok: false, reason: 'proof has no deployHash — not a redeemable payment proof' };
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

  const onChain = await confirmTransferOnChain(nodeUrl, proof.deployHash, expected);
  if (!onChain.ok) return onChain;

  redeemedDeployHashes.add(proof.deployHash);
  return { ok: true };
}

async function confirmTransferOnChain(
  nodeUrl: string,
  deployHash: string,
  expected: { amountMotes: bigint },
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
