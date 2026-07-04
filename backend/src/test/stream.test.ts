import { Keys } from 'casper-js-sdk';

jest.mock('../lib/casper-rpc', () => ({
  rpcCall: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { rpcCall } = require('../lib/casper-rpc') as { rpcCall: jest.Mock };

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('../index') as { app: import('hono').Hono };

const NETWORK = process.env['CASPER_NETWORK'] ?? 'casper-test';

function signProof(overrides: Partial<{ amount: string; recipient: string; deployHash: string }> = {}) {
  const kp = Keys.Ed25519.new();
  const recipient = overrides.recipient ?? `01${'33'.repeat(32)}`;
  const amount = overrides.amount ?? '5000000';
  const nonce = 'test-nonce-' + Date.now();
  const deployHash = overrides.deployHash ?? ('streamtest' + Date.now()).padEnd(64, '0');
  const message = `${NETWORK}:${recipient}:${amount}:${nonce}:${deployHash}`;
  const sig = kp.sign(Buffer.from(message));

  return {
    proof: {
      network: NETWORK, recipient, amount, nonce, deployHash,
      signature: Buffer.from(sig).toString('hex'),
      publicKey: kp.publicKey.toHex(),
      timestamp: Date.now(),
    },
    recipient, amount, deployHash,
  };
}

function successfulTransferRpcResult(amountMotes: string) {
  return {
    execution_info: { execution_result: { error_message: null }, block_height: 1 },
    deploy: { session: { Transfer: { args: [['amount', { parsed: amountMotes }], ['target', { parsed: 'x' }]] } } },
  };
}

function paymentBody(proof: ReturnType<typeof signProof>['proof'], amount: string) {
  return {
    rentalId: 101, assetId: 1, amountMotes: amount,
    paymentProof: proof,
    split: { ownerMotes: amount, loanRepayMotes: '0', protocolFeeMotes: '0' },
    loanActive: false, timestamp: Date.now(),
  };
}

describe('POST /api/v1/stream/payment (facilitator-verified)', () => {
  beforeEach(() => { rpcCall.mockReset(); });

  it('accepts a real, verifiable payment proof', async () => {
    const { proof, amount } = signProof();
    rpcCall.mockResolvedValue(successfulTransferRpcResult(amount));

    const res = await app.request('/api/v1/stream/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentBody(proof, amount)),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('rejects a tampered proof amount (signature no longer matches) without ever hitting the RPC', async () => {
    const { proof, amount } = signProof();
    const tamperedBody = paymentBody(proof, amount);
    // Change the proof's claimed amount post-signing — the signature was
    // computed over the original amount, so this must fail verification.
    tamperedBody.paymentProof = { ...proof, amount: '1' };

    const res = await app.request('/api/v1/stream/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tamperedBody),
    });

    expect(res.status).toBe(403);
    expect(rpcCall).not.toHaveBeenCalled();
  });

  it('rejects a replayed deploy hash on the second submission', async () => {
    const { proof, amount, deployHash } = signProof({ deployHash: 'replay-stream-' + Date.now() });
    rpcCall.mockResolvedValue(successfulTransferRpcResult(amount));

    const first = await app.request('/api/v1/stream/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentBody(proof, amount)),
    });
    expect(first.status).toBe(200);

    const second = await app.request('/api/v1/stream/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentBody(proof, amount)),
    });
    expect(second.status).toBe(403);
    const body = await second.json();
    expect(body.reason).toMatch(/already been redeemed/);
    void deployHash;
  });

  it('rejects a malformed payload missing the payment proof', async () => {
    const res = await app.request('/api/v1/stream/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rentalId: 101, assetId: 1, amountMotes: '5000000' }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
