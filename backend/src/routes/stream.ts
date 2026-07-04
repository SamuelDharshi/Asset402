// ─────────────────────────────────────────────────────────────────────────────
//  Streaming payment processing + SSE event broadcaster
// ─────────────────────────────────────────────────────────────────────────────

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { rentalRepo, loanRepo, logRepo, assetRepo } from '../db/supabase';
import { verifyPayment, type PaymentProof } from '../lib/facilitator';

export const streamRouter = new Hono();

const NODE_URL = process.env['CASPER_NODE_URL'] ?? 'https://node.testnet.casper.network/rpc';
const NETWORK_NAME = process.env['CASPER_NETWORK'] ?? 'casper-test';

interface StreamPaymentBody {
  rentalId:     number;
  assetId:      number;
  amountMotes:  string;
  paymentProof: PaymentProof;
  split:     {
    ownerMotes:       string;
    loanRepayMotes:   string;
    protocolFeeMotes: string;
  };
  loanActive: boolean;
  timestamp:  number;
}

// ── SSE Client Registry ─────────────────────────────────────────────────────
// In production this would be Redis pub/sub. For single-instance demo, use Map.

type SseClient = {
  controller: ReadableStreamDefaultController;
  rentalId:   number;
};

const sseClients = new Map<string, SseClient>();

function broadcastToRental(rentalId: number, event: object) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  const dead: string[] = [];
  for (const [id, client] of sseClients) {
    if (client.rentalId !== rentalId) continue;
    try {
      client.controller.enqueue(new TextEncoder().encode(payload));
    } catch {
      dead.push(id);
    }
  }
  for (const id of dead) {
    sseClients.delete(id);
  }
}

// ── GET /api/v1/stream/events ──────────────────────────────────────────────
// SSE endpoint the frontend subscribes to for live payment events.

streamRouter.get('/events', (c) => {
  const rentalId = parseInt(c.req.query('rentalId') ?? '0', 10);
  const clientIp  = c.req.header('x-forwarded-for') ?? crypto.randomUUID();

  return streamSSE(c, async (stream) => {
    const client: SseClient = {
      controller: stream as unknown as ReadableStreamDefaultController,
      rentalId,
    };
    sseClients.set(clientIp, client);

    await stream.writeSSE({
      event: 'connected',
      data:  JSON.stringify({ rentalId, message: 'SSE connected' }),
    });

    // Send heartbeat every 30s to keep the connection alive
    const heartbeat = setInterval(async () => {
      try {
        await stream.writeSSE({ event: 'heartbeat', data: Date.now().toString() });
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(clientIp);
      }
    }, 30_000);

    // Clean up when client disconnects
    c.req.raw.signal?.addEventListener('abort', () => {
      clearInterval(heartbeat);
      sseClients.delete(clientIp);
    });
  });
});

// ── POST /api/v1/stream/payment ───────────────────────────────────────────────

streamRouter.post('/payment', async (c) => {
  const body = await c.req.json<StreamPaymentBody>();
  const { rentalId, assetId, amountMotes, split, loanActive, paymentProof } = body;

  // ── 1. Verify the payment proof: real signature check + real on-chain
  // RPC confirmation that a matching transfer actually landed. This is only
  // called by CollectorAgent AFTER it has already executed the real
  // transfer (see agents/src/collector-agent.ts:reportStreamPayment), so a
  // real deployHash always exists here to verify against.
  const verification = await verifyPayment(
    paymentProof,
    { recipient: paymentProof.recipient, amountMotes: BigInt(paymentProof.amount), network: NETWORK_NAME },
    NODE_URL,
  );
  if (!verification.ok) {
    return c.json({ error: 'Invalid payment proof', reason: verification.reason }, 403);
  }

  // ── 2. Update rental total_streamed ────────────────────────────────────────
  const rental = await rentalRepo.findByRentalId(rentalId);
  const prevStreamed  = BigInt(rental?.total_streamed ?? '0');
  const newStreamed   = prevStreamed + BigInt(amountMotes);
  await rentalRepo.updateStreamed(rentalId, newStreamed.toString());

  // ── 3. Record loan repayment if active ─────────────────────────────────────
  let loanStatus: string = 'NoLoan';
  if (loanActive && BigInt(split.loanRepayMotes) > 0n) {
    const loan = await loanRepo.findByAssetId(assetId);

    if (loan) {
      const remaining    = BigInt(loan.remaining_motes);
      const repayment    = BigInt(split.loanRepayMotes);
      const newRemaining = remaining > repayment ? remaining - repayment : 0n;
      loanStatus         = newRemaining === 0n ? 'Repaid' : 'Active';

      await loanRepo.updateRemaining(assetId, newRemaining.toString(), loanStatus as 'Active' | 'Repaid');

      // If loan fully repaid, release asset collateral
      if (loanStatus === 'Repaid') {
        await assetRepo.updateStatus(assetId, 'Idle');
      }
    }
  }

  // ── 4. Log agent action ────────────────────────────────────────────────────
  await logRepo.insert({
    agent_name:       'CollectorAgent',
    action_performed: 'stream_payment',
    payload: {
      rentalId,
      assetId,
      amountMotes,
      split,
      loanStatus,
      newTotalStreamed: newStreamed.toString(),
    },
    status: 'success',
  });

  // ── 5. Broadcast SSE event to connected frontend clients ────────────────────
  broadcastToRental(rentalId, {
    eventType:   'STREAM_PAYMENT',
    rentalId,
    assetId,
    amountMotes,
    split,
    loanStatus,
    timestamp: Date.now(),
  });

  return c.json({
    success:        true,
    rentalId,
    totalStreamed:  newStreamed.toString(),
    split,
    loanStatus,
    timestamp:      new Date().toISOString(),
  });
});
