// ─────────────────────────────────────────────────────────────────────────────
//  x402 Mock Oracle Server
//  Simulates a pricing API endpoint that demands x402 micropayments.
//  Used for local development and E2E integration tests.
// ─────────────────────────────────────────────────────────────────────────────

import express, { Request, Response } from 'express';
import { X402Client } from './client';

const app  = express();
const PORT = parseInt(process.env['ORACLE_PORT'] ?? '4402', 10);

// Create a verification client (mocked for development)
const verifierClient = {
  verifyPaymentHeader: (_header: string) => true
};

const PAYMENT_AMOUNT  = process.env['ORACLE_PAYMENT_AMOUNT'] ?? '500000'; // 0.0005 CSPR
const ORACLE_ADDRESS  = process.env['ORACLE_WALLET_ADDRESS'] ?? 'mock-oracle-address';

// ── Equipment Pricing Data ───────────────────────────────────────────────────

const pricingDatabase: Record<string, { value_low: number; value_high: number }> = {
  'Agricultural Tractor': { value_low: 8200,  value_high: 9800  },
  'Cinema Camera':        { value_low: 3200,  value_high: 4100  },
  'Generator':            { value_low: 1600,  value_high: 2200  },
  'CNC Machine':          { value_low: 15000, value_high: 22000 },
  'Excavator':            { value_low: 45000, value_high: 65000 },
  'Crane':                { value_low: 80000, value_high: 120000},
  'Food Truck':           { value_low: 25000, value_high: 40000 },
};

// ── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json());

// ── Pricing Endpoint (requires x402 payment) ─────────────────────────────────

app.get('/v1/price', (req: Request, res: Response) => {
  const xPayment = req.headers['x-payment'] as string | undefined;

  // Step 1 — No payment header → return 402 challenge
  if (!xPayment) {
    console.log(`[Oracle] 402 challenge issued to ${req.ip}`);
    res.status(402)
       .set({
         'X-Payment-Address': ORACLE_ADDRESS,
         'X-Payment-Amount':  PAYMENT_AMOUNT,
         'X-Payment-Network': 'casper-testnet',
         'X-Payment-Nonce':   Date.now().toString(),
         'Content-Type':      'application/json',
       })
       .json({ error: 'Payment Required', amount: PAYMENT_AMOUNT, recipient: ORACLE_ADDRESS });
    return;
  }

  // Step 2 — Verify payment signature
  const isValid = verifierClient.verifyPaymentHeader(xPayment);
  if (!isValid) {
    console.log(`[Oracle] Invalid payment signature rejected`);
    res.status(403).json({ error: 'Invalid payment signature' });
    return;
  }

  // Step 3 — Payment verified, serve pricing data
  const assetType = (req.query['type'] as string) ?? 'Agricultural Tractor';
  const pricing   = pricingDatabase[assetType] ?? { value_low: 1000, value_high: 2000 };

  console.log(`[Oracle] Payment accepted — serving price for "${assetType}"`);
  res.json({
    asset_type:  assetType,
    make:        req.query['make'] ?? 'Unknown',
    year_range:  req.query['year_range'] ?? '2018-2022',
    value_low:   pricing.value_low,
    value_high:  pricing.value_high,
    currency:    'USD',
    source:      'Asset402 Mock Oracle v1',
    timestamp:   new Date().toISOString(),
  });
});

// ── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', payment_required: true, amount_motes: PAYMENT_AMOUNT });
});

// ── Start Server ─────────────────────────────────────────────────────────────

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[MockOracle] x402 pricing oracle listening on http://localhost:${PORT}`);
    console.log(`[MockOracle] Payment address: ${ORACLE_ADDRESS}`);
    console.log(`[MockOracle] Payment amount:  ${PAYMENT_AMOUNT} motes`);
  });
}

export { app };
