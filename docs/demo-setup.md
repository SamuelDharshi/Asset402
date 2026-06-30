# Asset402 — Demo Setup Guide

> *Your idle assets. Earning. Autonomously.* — Casper Agentic Buildathon 2026

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust + Cargo | stable 1.78+ | `curl https://sh.rustup.rs -sSf \| sh` |
| cargo-odra | 2.8.0 | `cargo install cargo-odra` |
| wasm32 target | — | `rustup target add wasm32-unknown-unknown` |
| Node.js | 20+ | https://nodejs.org |
| npm | 9+ | Bundled with Node.js |
| ts-node | 10+ | `npm i -g ts-node typescript` |

---

## Port Allocation

| Service | Port | Command |
|---------|------|---------|
| Frontend (Next.js) | **3000** | `npm run dev` in `frontend/` |
| Backend (Hono API) | **3001** | `npm run dev` in `backend/` |
| x402 Mock Oracle | **4402** | `npm run mock-oracle` in `agents/` |

---

## 1. Clone & Install

```bash
git clone https://github.com/your-org/asset402
cd asset402
```

### Contracts
```bash
cd contracts
cargo check                          # verify all 5 crates compile
cargo test                           # run unit tests (Odra TestEnv)
```

### Agents
```bash
cd agents
npm install
cp .env.example .env                 # fill in your keys
npm run mock-oracle &                # start local x402 oracle on :4402
```

### Backend
```bash
cd backend
npm install
cp .env.example .env                 # fill in Supabase URL/key if needed
npm run dev                          # starts on port 3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev                          # starts on port 3000
```

---

## 2. Deployed Contract Addresses (Casper Testnet)

| Contract | Hash | Explorer |
|----------|------|----------|
| AssetRegistry | `hash-1120c2a6...` | [View on testnet.cspr.live](https://testnet.cspr.live/deploy/e69b9da937de5ea373274a1e982cfc047818e8a8774bb2899f1e758e76e47e40) |
| LendingPool | (see scripts/deployment-results.json) | — |
| RentalEscrow | (see scripts/deployment-results.json) | — |
| FractionalRegistry | `hash-420db8ac...` | [View on testnet.cspr.live](https://testnet.cspr.live/deploy/c2fe89ca4e5623d83cb51e704466f0ee65c9af4ecfbc0159f75900ca6c64eee5) |
| CarbonCredit | `hash-95dfa716...` | [View on testnet.cspr.live](https://testnet.cspr.live/deploy/1099eed33b0bd0db0062152a7026f670f73f26edea4427c115f8b341debe13cb) |

---

## 3. Deploy Contracts to Casper Testnet

```bash
# Build WASM
cd contracts
cargo odra build -b casper

# Deploy using the deployment script (handles all 5 contracts)
cd scripts
npm install
node deploy-v2-testnet.js
```

After deployment, the script writes hashes to `scripts/deployment-results-v2.json`. Update:
- `agents/.env` — CONTRACT_ADDR vars
- `backend/.env` — CONTRACT_ADDR vars

---

## 4. Run E2E Simulation

```bash
cd scripts
npm install
ts-node simulate-ecosystem.ts
```

Expected output:
```
══ Step 1: Generate Mock Wallets ══
  ✓ Owner wallet:    01a3f8e2...
  ✓ Renter wallet:   02bc91f0... (1000.0000 CSPR)
  ✓ DeFi LP wallet:  03de72a1... (100000.0000 CSPR)
...
══ Step 10: Validation Report ══
  Owner balance delta: +0.2176 CSPR
  Loan repaid so far:  28.2 CSPR (40.3%)
  Split verified: ✓ No motes lost
✅ E2E Simulation completed successfully!
```

---

## 5. Run Mock Oracle (x402)

```bash
cd agents
ORACLE_PAYMENT_AMOUNT=500000 npm run mock-oracle
# Listening on http://localhost:4402
# GET /v1/price → 402 challenge
# GET /v1/price + X-Payment: → 200 pricing data
```

Test it:
```bash
curl http://localhost:4402/v1/price
# → 402 Payment Required

curl http://localhost:4402/health
# → { "status": "ok", "payment_required": true }
```

---

## 6. API Endpoints Reference

| Method | URL | Description |
|--------|-----|-------------|
| GET | `http://localhost:3001/health` | Backend health check |
| GET | `http://localhost:3001/api/v1/assets` | All registered assets |
| GET | `http://localhost:3001/api/v1/marketplace` | Active rental listings |
| GET | `http://localhost:3001/api/v1/pricing/surge?asset_type=Generator` | Demand surge signals |
| GET | `http://localhost:3001/api/v1/maintenance/status` | Maintenance oracle predictions |
| POST | `http://localhost:3001/api/v1/maintenance/approve` | Approve maintenance booking |
| GET | `http://localhost:3001/api/v1/carbon/balance/:address` | CUC balance |
| POST | `http://localhost:3001/api/v1/stream/payment` | Process x402 streaming payment |

---

## 7. Full Demo Flow (30-Second Silent Demo)

1. **Open** http://localhost:3000 → Owner Dashboard
2. **Click** "Register New Asset" → 4-step onboarding wizard
3. **Drop** any photo → Vision Agent analyses (2s)
4. **Confirm** → Sequential checkmarks animate
5. **Click** "Get Funds Now" → Loan originates
6. **Watch** streaming CSPR counter increment (live from backend SSE)
7. **Click** 🌿 Carbon → View CUC balance earned from rental activity
8. **Click** 🔧 Maintenance → See AI-predicted service schedule
9. **Open** http://localhost:3000/marketplace → Renter view
10. **Open** http://localhost:3000/lender → LP portfolio

---

## 8. Error Handling Reference

| Scenario | Guard |
|----------|-------|
| LTV > 70% | `LtvExceedsMaximum` reverted on-chain |
| Expired rental agreement | `AgreementExpired` reverted |
| Signature replay (same nonce) | `NonceAlreadyUsed` reverted |
| Bad Ed25519 signature | `InvalidSignature` reverted |
| Non-guardian condition update | `NotGuardian` reverted |
| Non-collector repayment | `NotCollectorAgent` reverted |
| x402 proof expired (> 5 min) | Rejected by stream route |
| Node timeout | Auto-retry with 5s backoff (SSE listener) |
| No Supabase credentials | Auto-fallback to local JSON DB (`backend/src/db/local_db.json`) |

---

## 9. Local DB Fallback

When Supabase credentials are not configured, the backend automatically uses a local JSON file database at `backend/src/db/local_db.json`. This is pre-seeded with:

- 4 demo assets (Excavator, Marine Vessel, Generator, Cinema Camera)
- 1 active loan (Excavator, 74% repaid)
- 1 active rental (Excavator, rental #101)
- Sample agent activity logs

The frontend seamlessly falls back to the `FALLBACK_ASSETS` array in `page.tsx` if the backend is unavailable, ensuring the demo is always functional.
