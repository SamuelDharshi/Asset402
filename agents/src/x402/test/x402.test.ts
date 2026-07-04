// ─────────────────────────────────────────────────────────────────────────────
//  x402 Client + Facilitator tests
//
//  Tests 1-3 are pure crypto/logic — no network, no mocked-away business
//  logic. Test 4 is the flagship real-testnet integration test: it actually
//  spends real (worthless, testnet) CSPR and is skipped unless
//  RUN_TESTNET_E2E=1 is set, since it needs the funded key and ~15-30s to
//  confirm on-chain.
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nacl from 'tweetnacl';
import { Keys, CLPublicKey } from 'casper-js-sdk';
import { X402Client } from '../client';
import { verifyPayment } from '../facilitator';

jest.mock('../../lib/casper-rpc', () => {
  const actual = jest.requireActual('../../lib/casper-rpc');
  return { ...actual, rpcCall: jest.fn() };
});
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { rpcCall } = require('../../lib/casper-rpc') as { rpcCall: jest.Mock };

function makeTempKeyFile(): string {
  const kp = Keys.Ed25519.new();
  const tmpKeyPath = path.join(os.tmpdir(), `x402-test-key-${Date.now()}-${Math.random().toString(36).slice(2)}.pem`);
  fs.writeFileSync(tmpKeyPath, kp.exportPrivateKeyInPem());
  return tmpKeyPath;
}

function makeClient(keyPath: string): X402Client {
  return new X402Client({
    network:             'casper-test',
    nodeUrl:             'https://node.testnet.casper.network/rpc',
    agentPrivateKeyPath: keyPath,
    maxPaymentMotes:     10_000_000n,
  });
}

function successfulTransferRpcResult(amountMotes: string) {
  return {
    execution_info: {
      execution_result: { error_message: null },
      block_height: 12345,
    },
    deploy: {
      session: {
        Transfer: {
          args: [
            ['amount', { parsed: amountMotes }],
            ['target', { parsed: 'deadbeef' }],
          ],
        },
      },
    },
  };
}

describe('X402Client.signPaymentProof', () => {
  let keyPath: string;

  beforeAll(() => { keyPath = makeTempKeyFile(); });
  afterAll(() => { fs.rmSync(keyPath, { force: true }); });

  test('produces a signature independently verifiable with no mocks', () => {
    const client = makeClient(keyPath);
    const proof = client.signPaymentProof({
      recipient:  `01${'11'.repeat(32)}`,
      amount:     '500000',
      network:    'casper-test',
      nonce:      'nonce-1',
      deployHash: 'deadbeef'.repeat(8),
    });

    const message = `${proof.network}:${proof.recipient}:${proof.amount}:${proof.nonce}:${proof.deployHash}`;
    const pubKeyBytes = CLPublicKey.fromHex(proof.publicKey).value();
    const isValid = nacl.sign.detached.verify(
      Buffer.from(message),
      Buffer.from(proof.signature, 'hex'),
      pubKeyBytes,
    );
    expect(isValid).toBe(true);
  });

  test('throws instead of fabricating a signature when the key is invalid', () => {
    expect(() => new X402Client({
      network: 'casper-test',
      nodeUrl: 'https://node.testnet.casper.network/rpc',
      agentPrivateKeyPath: '/nonexistent/path/does-not-exist.pem',
      maxPaymentMotes: 1_000_000n,
    })).toThrow();
  });
});

describe('facilitator.verifyPayment', () => {
  let keyPath: string;
  let client: X402Client;

  beforeEach(() => {
    keyPath = makeTempKeyFile();
    client = makeClient(keyPath);
    rpcCall.mockReset();
  });
  afterEach(() => { fs.rmSync(keyPath, { force: true }); });

  function buildValidHeader(overrides: Partial<{ amount: string; deployHash: string }> = {}) {
    const proof = client.signPaymentProof({
      recipient:  `01${'22'.repeat(32)}`,
      amount:     overrides.amount ?? '500000',
      network:    'casper-test',
      nonce:      'nonce-x',
      deployHash: overrides.deployHash ?? 'cafebabe'.repeat(8),
    });
    return Buffer.from(JSON.stringify(proof)).toString('base64');
  }

  test('rejects a tampered amount before ever touching the network', async () => {
    const header = buildValidHeader({ amount: '500000' });
    const result = await verifyPayment(
      header,
      { recipient: `01${'22'.repeat(32)}`, amountMotes: 999_999n, network: 'casper-test' },
      'https://node.testnet.casper.network/rpc',
    );
    expect(result.ok).toBe(false);
    expect(rpcCall).not.toHaveBeenCalled();
  });

  test('rejects a replayed deploy hash on the second redemption attempt', async () => {
    const deployHash = 'replay-test-hash-' + Date.now();
    const header = buildValidHeader({ amount: '500000', deployHash });
    rpcCall.mockResolvedValue(successfulTransferRpcResult('500000'));

    const first = await verifyPayment(
      header,
      { recipient: `01${'22'.repeat(32)}`, amountMotes: 500_000n, network: 'casper-test' },
      'https://node.testnet.casper.network/rpc',
    );
    expect(first.ok).toBe(true);

    const second = await verifyPayment(
      header,
      { recipient: `01${'22'.repeat(32)}`, amountMotes: 500_000n, network: 'casper-test' },
      'https://node.testnet.casper.network/rpc',
    );
    expect(second.ok).toBe(false);
    expect(second.reason).toMatch(/already been redeemed/);
  });
});

describe('x402 real testnet integration (flagship)', () => {
  const shouldRun = process.env['RUN_TESTNET_E2E'] === '1';
  const maybeTest = shouldRun ? test : test.skip;

  maybeTest('agent pays the local mock oracle with a real on-chain transfer', async () => {
    jest.unmock('../../lib/casper-rpc');
    jest.resetModules();
    // Re-require with the real (unmocked) casper-rpc module for this test only.
    const { app } = require('../mock-server') as { app: import('express').Express };

    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 4402;

    try {
      const { X402Client: RealClient } = require('../client') as { X402Client: typeof X402Client };
      const fundedKeyPath = process.env['AGENT_PRIVATE_KEY_PATH'];
      if (!fundedKeyPath) throw new Error('AGENT_PRIVATE_KEY_PATH must be set to run the real testnet e2e test');

      const realClient = new RealClient({
        network:             process.env['CASPER_NETWORK'] ?? 'casper-test',
        nodeUrl:             process.env['CASPER_NODE_URL'] ?? 'https://node.testnet.casper.network/rpc',
        agentPrivateKeyPath: fundedKeyPath,
        maxPaymentMotes:     10_000_000n,
      });

      const data = await realClient.fetch<{ asset_type: string; value_low: number }>(
        `http://localhost:${port}/v1/price`,
        { method: 'GET', params: { type: 'Excavator' } },
      );
      expect(data.asset_type).toBe('Excavator');
      expect(typeof data.value_low).toBe('number');
    } finally {
      server.close();
    }
  }, 60_000);
});
