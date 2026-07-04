// ─────────────────────────────────────────────────────────────────────────────
//  x402 Client — Real Casper Implementation
//
//  There is no published `@casper/x402` npm package — the PRD's reference to
//  it doesn't resolve to anything installable. This is a from-scratch,
//  spec-compatible implementation of the HTTP 402 challenge/response flow:
//  every payment here is a genuine signed CSPR transfer submitted to the
//  Casper testnet RPC node and confirmed on-chain before the request retries.
//  A failed signature throws; it never fabricates a "mock-signature-*" value.
// ─────────────────────────────────────────────────────────────────────────────

import { Keys } from 'casper-js-sdk';
import { loadAgentKey } from '../lib/casper-key';
import { submitTransfer, waitForDeploy, parsePublicKeyOrThrow } from '../lib/casper-rpc';

export interface X402ClientConfig {
  network:            string;
  nodeUrl:            string;
  agentPrivateKeyPath: string;
  maxPaymentMotes:    bigint;
}

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

export class X402Client {
  private readonly keyPair:    Keys.AsymmetricKey;
  private readonly nodeUrl:    string;
  private readonly network:    string;
  private readonly maxPayment: bigint;

  constructor(config: X402ClientConfig) {
    this.nodeUrl    = config.nodeUrl;
    this.network    = config.network;
    this.maxPayment = config.maxPaymentMotes;
    // Throws immediately on a missing/invalid key — no silent throwaway-key fallback.
    this.keyPair = loadAgentKey(config.agentPrivateKeyPath);
  }

  /**
   * Signs an x402 payment proof over the fields the facilitator will check.
   *
   * Two call shapes:
   *  - Agent-to-oracle payments (fetch() below) always pass a real
   *    `deployHash` from an already-submitted, already-confirmed transfer —
   *    the facilitator's verifyPayment() requires this to be non-empty and
   *    on-chain-confirmed before it accepts the proof.
   *  - Streaming split announcements (stream-engine.ts) sign BEFORE any
   *    transfer exists — the actual CSPR movement for each slice happens
   *    afterward via collector-agent.ts's dispatchTransfer. For this case
   *    `deployHash` is omitted; the resulting proof is an attestation of the
   *    intended split, not a redeemable x402 payment proof, and must not be
   *    passed to verifyPayment().
   *
   * Throws if signing fails; never returns a fabricated signature.
   */
  signPaymentProof(params: {
    recipient:  string;
    amount:     string;
    network:    string;
    nonce:      string;
    deployHash?: string;
  }): PaymentProof {
    const timestamp = Date.now();
    const deployHash = params.deployHash ?? '';
    const message = `${params.network}:${params.recipient}:${params.amount}:${params.nonce}:${deployHash}`;
    const sigBytes = this.keyPair.sign(Buffer.from(message));

    return {
      network:    params.network,
      recipient:  params.recipient,
      amount:     params.amount,
      nonce:      params.nonce,
      deployHash,
      signature:  Buffer.from(sigBytes).toString('hex'),
      publicKey:  this.keyPair.publicKey.toHex(),
      timestamp,
    };
  }

  /**
   * Fetches a URL, handling HTTP 402 Payment Required by hand:
   *   1. Initial request.
   *   2. On 402, read X-Payment-Address / X-Payment-Amount / X-Payment-Network
   *      / X-Payment-Nonce headers (the contract mock-server.ts already
   *      emits — the de facto spec here, since no real "@casper/x402" exists).
   *   3. Submit a real signed CSPR transfer for that exact amount, to that
   *      exact recipient, on the specified network.
   *   4. Wait for on-chain confirmation.
   *   5. Attach a signed X-Payment proof referencing the confirmed deploy
   *      hash and retry the original request once.
   */
  async fetch<T>(url: string, options: {
    method?:  string;
    params?:  Record<string, string | number>;
    body?:    unknown;
    headers?: Record<string, string>;
  } = {}): Promise<T> {
    const fullUrl = this.buildUrl(url, options.params);
    const baseInit: RequestInit = {
      method:  options.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    };

    const initialResponse = await fetch(fullUrl, baseInit);

    if (initialResponse.status !== 402) {
      if (!initialResponse.ok) {
        throw new Error(`HTTP ${initialResponse.status}: ${await initialResponse.text()}`);
      }
      return initialResponse.json() as Promise<T>;
    }

    // ── 402 challenge received — pay for real ──────────────────────────────
    const recipient = initialResponse.headers.get('X-Payment-Address');
    const amountStr = initialResponse.headers.get('X-Payment-Amount');
    const network   = initialResponse.headers.get('X-Payment-Network') ?? this.network;
    const nonce     = initialResponse.headers.get('X-Payment-Nonce') ?? Date.now().toString();

    if (!recipient || !amountStr) {
      throw new Error(`402 response from ${fullUrl} is missing X-Payment-Address/X-Payment-Amount headers`);
    }

    const amountMotes = BigInt(amountStr);
    if (amountMotes > this.maxPayment) {
      throw new Error(
        `x402 payment of ${amountMotes} motes exceeds configured ceiling of ${this.maxPayment} motes for ${fullUrl}`
      );
    }

    // Validate the recipient is a real public key up front — fail loudly
    // rather than let a malformed challenge silently misdirect funds.
    parsePublicKeyOrThrow(recipient, `x402 payment to ${fullUrl}`);

    const deployHash = await submitTransfer({
      nodeUrl:            this.nodeUrl,
      networkName:        network,
      sender:             this.keyPair,
      targetPublicKeyHex: recipient,
      amountMotes,
      context:            `x402 payment to ${fullUrl}`,
    });

    await waitForDeploy(this.nodeUrl, deployHash);

    const proof = this.signPaymentProof({ recipient, amount: amountStr, network, nonce, deployHash });
    const xPaymentHeader = Buffer.from(JSON.stringify(proof)).toString('base64');

    const paidResponse = await fetch(fullUrl, {
      ...baseInit,
      headers: { ...baseInit.headers, 'X-Payment': xPaymentHeader },
    });

    if (!paidResponse.ok) {
      throw new Error(`HTTP ${paidResponse.status} after paying x402 challenge: ${await paidResponse.text()}`);
    }

    return paidResponse.json() as Promise<T>;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private buildUrl(base: string, params?: Record<string, string | number>): string {
    if (!params || Object.keys(params).length === 0) return base;
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
    ).toString();
    return `${base}?${qs}`;
  }
}

export function createX402ClientFromEnv(): X402Client {
  const agentPrivateKeyPath = process.env['AGENT_PRIVATE_KEY_PATH'] ?? '';
  const network             = process.env['CASPER_NETWORK'] ?? 'casper-test';
  const nodeUrl             = process.env['CASPER_NODE_URL'] ?? 'https://node.testnet.casper.network/rpc';
  const maxPaymentMotes     = BigInt(process.env['X402_MAX_PAYMENT_MOTES'] ?? '1000000');

  return new X402Client({ agentPrivateKeyPath, network, nodeUrl, maxPaymentMotes });
}
