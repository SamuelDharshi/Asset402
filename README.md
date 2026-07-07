# Asset402 ⚡
### **Your Idle Assets. Earning. Autonomously.**

*One photograph. Six AI agents. Real-time x402 streaming RWA dividends on the Casper Network.*

---

[![Built on Casper](https://img.shields.io/badge/Built%20on-Casper%20Network-E5172F?style=for-the-badge)](https://casper.network)
[![Odra Framework](https://img.shields.io/badge/Contracts-Odra%202.8.0-FFE500?style=for-the-badge)](https://odra.dev)
[![License](https://img.shields.io/badge/License-Apache%202.0-060608?style=for-the-badge)](LICENSE)
[![Network](https://img.shields.io/badge/Network-Casper%20Testnet-00C2FF?style=for-the-badge)](https://testnet.cspr.live)

---

## 🔗 Live on Casper Testnet — All 5 Contracts Deployed

> All smart contracts are fully deployed and verifiable on **Casper Testnet**. No simulations. No placeholders.

| Contract | Role | Deploy Hash | Explorer |
|----------|------|------------|---------|
| **AssetRegistry** | Mint & manage RWA NFT tokens | `e69b9da937...` | [View ↗](https://testnet.cspr.live/deploy/e69b9da937de5ea373274a1e982cfc047818e8a8774bb2899f1e758e76e47e40) |
| **LendingPool** | DeFi collateral loans (70% LTV) | `19d90edb46...` | [View ↗](https://testnet.cspr.live/deploy/19d90edb4670dab12feafd54a615aad3000915ed7266dfbcd7f60893b6a7b994) |
| **RentalEscrow** | On-chain rental escrow | `24f8c1007a...` | [View ↗](https://testnet.cspr.live/deploy/24f8c1007a2d33915205e35d21c0274422c25758915ccb7843c76a420ba3f061) |
| **CarbonCredit** | Carbon Use Credits (CUC) | `ece020fd29...` | [View ↗](https://testnet.cspr.live/deploy/ece020fd29788916cd07a38a1428c8dfb170248b7a52c1e4126992f645dc544f) |
| **FractionalRegistry** | Fractional ownership shares | `c57734aa22...` | [View ↗](https://testnet.cspr.live/deploy/c57734aa220967b69a7b0eb6439681abd29142838f6b5564b78cdfa3cb8bea9c) |

**Deployer wallet:** [`020394ccdb...cea1`](https://testnet.cspr.live/account/020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1)

### ⚡ Live Demo Transactions
- **`mint_asset`** (AssetRegistry): [`07fd959c79b81fc2f7c0b412e5259343037797923b0fb1ef8d92785d8d14bb78`](https://testnet.cspr.live/deploy/07fd959c79b81fc2f7c0b412e5259343037797923b0fb1ef8d92785d8d14bb78) — Mints the "Komatsu PC88 Mini Excavator" RWA token on-chain.
- **`issue_cuc`** (CarbonCredit): [`1cd01af28cee928b334cdf704a93ec9b071105a05b7f57b022a38acddf360ec2`](https://testnet.cspr.live/deploy/1cd01af28cee928b334cdf704a93ec9b071105a05b7f57b022a38acddf360ec2) — Issues 3.2 CUC for the 10.0-hour rental period to owner/renter addresses.

---

## 📖 1. The Core Idea: Real-World Asset (RWA) Metamorphosis

Across the globe, over **$17 Trillion** in productive physical assets—excavators, generators, agricultural tractors, marine vessels—sit idle for up to 65% of their lifespans. Meanwhile, SMEs face an **$8.1 Trillion** financing gap because banks won't lend against physical assets that lack a verifiable digital identity.

**Asset402** solves this by deploying a decentralized, multi-agent network that tokenizes physical assets, opens up collateralized DeFi credit, structures fractional co-ownership, and streams lease payments in real-time.

```
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|  Physical Asset  | --> |   AI Agent Mesh   | --> |  Casper Network  |
|  (Tractor/Gear)  |     |  (Onboard & Run)  |     | (Yield Stream)   |
|                  |     |                   |     |                  |
+------------------+     +-------------------+     +------------------+
```

### The Three Core Innovations:
1. **Per-Minute Rental Income Streams**: Micropayments flow from renter to owner every 60 seconds via Casper's native **x402 protocol**. No monthly billing delays—owners watch their balance tick up dynamically.
2. **DeFi Credit & Repayment Routing**: Lock your tokenized machine as collateral to access a loan up to 70% LTV. As the machine is rented, **30% of the streamed rental income is automatically routed to pay down the principal**. The machine literally pays off its own loan.
3. **The Self-Maintaining Machine**: The AI Maintenance Oracle monitors operational telemetry, schedules service with local providers, and signs off payment approvals using gasless Casper signatures.

---

## 🎨 2. App Lifecycle & Data Flows (Visualized)

### E2E Lifecycle Flow Chart
```
 [ Owner Takes Photo ] 
         │
         ▼
 ┌────────────────────────────────────────────────────────┐
 │ 1. Vision Agent: Moondream2 analyzes image & metadata  │
 └────────────────────────────────────────────────────────┘
         │
         ▼
 ┌────────────────────────────────────────────────────────┐
 │ 2. Orchestrator: mint_asset → AssetRegistry (Testnet)  │
 └────────────────────────────────────────────────────────┘
         │
         ▼
 ┌────────────────────────────────────────────────────────┐
 │ 3. Risk Agent: Sets LTV (70%) & Issues Liquidity Loan  │
 └────────────────────────────────────────────────────────┘
         │
         ▼
 ┌────────────────────────────────────────────────────────┐
 │ 4. Listing Agent: CoinGecko CSPR/USD → Dynamic Rate    │
 └────────────────────────────────────────────────────────┘
         │
         ▼
 ┌────────────────────────────────────────────────────────┐
 │ 5. Collector Agent: x402 Ed25519-Signed Split Payments │
 └────────────────────────────────────────────────────────┘
         │
         ▼
 ┌────────────────────────────────────────────────────────┐
 │ 6. Guardian Agent: issue_cuc → CarbonCredit (Testnet)  │
 └────────────────────────────────────────────────────────┘
```

### The x402 3-Way Streaming Split
When an asset is actively leased, rental payments are automatically routed as they arrive:
```
                   +------------------------+
                   |  Renter payment stream  |
                   +------------------------+
                               │
                               ▼
                   +------------------------+
                   | x402 Stream Splitter   |
                   | (BigInt motes math)    |
                   +------------------------+
                     /         │          \
                    /          │           \
             64%   /     30%   │       6%   \
                  /            │             \
                 ▼             ▼              ▼
           +-----------+ +-----------+  +-----------+
           |   Owner   | | Loan Pay  |  | Protocol  |
           |  Wallet   | | (Lender)  |  |   Vault   |
           +-----------+ +-----------+  +-----------+
```

---

## 🔄 3. System Sequence Diagram

```
Owner       VisionAgent     LendingPool    Marketplace    Renter       Collector       Oracle
  │              │               │              │           │              │             │
  │──Photo Upload─>              │              │           │              │             │
  │              │──mint_asset──>│              │           │              │             │
  │              │  (Testnet TX) │              │           │              │             │
  │              │               │──List Asset─>│           │              │             │
  │              │               │              │──Rent RWA─>              │             │
  │              │               │              │           │──Pay x402───>│             │
  │              │               │              │           │  (Per-Min)   │──64%──────> Owner
  │              │               │              │           │              │──30%──────> LoanRepay
  │              │               │              │           │              │──6%───────> ProtocolVault
  │              │               │              │           │              │             │
  │              │               │              │           │              │             │──Monitor Hours
  │              │               │              │           │              │             │  (OVERDUE check)
  │              │               │              │           │              │             │──issue_cuc ──> Testnet TX
  │<─────────────│───────────────│──────────────│───────────│──────────────│─────────────│──Schedule Service
  │──Ed25519 Sign (booking proof)────────────────────────────────────────────────────>  │
```

---

## 🗂 4. Project Structure

```
asset402/
├── contracts/              # Odra 2.8 Smart Contracts (Rust/WASM) — ALL DEPLOYED ✅
│   ├── asset_registry/     # RWA NFT — mint_asset, update_condition, status lifecycle
│   ├── lending_pool/       # DeFi LP deposits + 70% LTV collateral loans
│   ├── rental_escrow/      # Gasless rental (Ed25519 booking proof verification)
│   ├── fractional_registry/# Fractional equity share offerings + income distribution
│   └── carbon_credits/     # Carbon Use Credit (CUC) minting — 3.2 CUC per 10h rental
│
├── agents/                 # Multi-Agent Coordination Mesh (TypeScript)
│   └── src/
│       ├── orchestrator.ts       # Central state router
│       ├── vision-agent.ts       # Moondream2 image analysis
│       ├── risk-agent.ts         # Casper MCP + CSPR.trade MCP LTV setting
│       ├── listing-agent.ts      # Dynamic pricing + CoinGecko CSPR/USD surge index
│       ├── guardian-agent.ts     # 150h service interval monitoring
│       ├── collector-agent.ts    # x402 stream routing + CUC issuance
│       └── x402/
│           ├── client.ts         # 402 intercept + real Ed25519 signing + waitForDeploy
│           ├── stream-engine.ts  # 60s cron + BigInt 3-way motes split (64/30/6)
│           └── facilitator.ts    # x402 proof verification (real sig + RPC confirm)
│
├── backend/                # Node.js + Hono API Gateway (port 3001)
│   └── src/
│       ├── routes/
│       │   ├── assets.ts         # mint_asset → Testnet, condition updates
│       │   ├── stream.ts         # POST /payment (Ed25519 verify), SSE events
│       │   ├── pricing.ts        # Live CoinGecko CSPR/USD, surge calendar
│       │   ├── carbon.ts         # CUC balance, mint, redeem
│       │   ├── maintenance.ts    # Maintenance predictions, Ed25519 booking
│       │   ├── lending.ts        # LTV calculations, loan origination
│       │   └── marketplace.ts    # Asset catalog, rental booking
│       └── lib/
│           ├── facilitator.ts    # Real payment proof verification
│           └── casper-rpc.ts     # submitContractCall → live Testnet RPC
│
├── ui/                     # Next.js 16 Portal (Black & Gold Glassmorphic theme)
│   └── app/
│       ├── page.tsx               # Main Dashboard (live income counter)
│       ├── carbon/page.tsx        # CUC Hub
│       ├── invest/page.tsx        # Fractional Marketplace
│       ├── lender/page.tsx        # LP Portfolio
│       └── maintenance/page.tsx   # Maintenance Oracle signing panel
│
└── scripts/
    ├── submit-real-transactions.js  # Submits mint_asset + issue_cuc to Testnet
    ├── deploy-and-verify-testnet.js # Full contract deployment + verification
    └── e2e-verification-report.json # All 5 contracts verified on-chain ✅
```

---

## 🛠 5. Setup & Running Locally

### Prerequisites
- **Rust (Nightly)** — for Odra contract compilation
- **Node.js v18+** — for agents, backend, frontend
- **Casper Testnet wallet** — for signing real deploys

### 1. Smart Contracts (Pre-compiled — no action needed)
All 5 WASM files are in `contracts/wasm/` and already deployed to testnet.
```bash
# To verify locally:
cd contracts && cargo check
```

### 2. Multi-Agent Layer
```bash
cd agents
npm install
cp .env.example .env   # Real contract hashes already set
npm run dev
```

### 3. Hono API Gateway (port 3001)
```bash
cd backend
npm install
npm run dev
# GET /api/v1/pricing/cspr-price  → live CoinGecko feed
# POST /api/v1/stream/payment     → real Ed25519 verification
```

### 4. Next.js Frontend (port 3000)
```bash
cd ui
npm install
npm run dev
```

### 5. Submit Real On-Chain Transactions
```bash
# First fund wallet at: https://testnet.faucet.casperlabs.io/
# Address: 020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1

cd scripts
node submit-real-transactions.js
# Submits mint_asset + issue_cuc — prints live explorer links
```

---

## 🧪 6. E2E Walkthrough

Once servers are running, open **`http://localhost:3000`**:

### Step 1: Connect Casper Wallet
Click **Connect Wallet** in the top-right. Hooks into `ClickProvider` which detects `window.CasperWallet` or falls back to the deployer address.

### Step 2: Buy Fractional Shares (Marketplace)
Navigate to `/invest` → Select an RWA pool (Caterpillar Generator, Marine Vessel) → **Buy Shares** triggers Ed25519-signed purchase.

### Step 3: View Lender Yields (Lend)
Navigate to `/lender` → Accrued interest counters tick in real-time from x402 stream payments. APY: **12.5%**.

### Step 4: Burn CUC for Rental Offsets (Carbon Hub)
Navigate to `/carbon` → Input quantity → **Redeem Discount** burns CUC on-chain and generates a discount code (motes offset).

### Step 5: Sign Maintenance Bookings
Navigate to `/maintenance` → Oracle checks hours (e.g. generator 162h > 150h limit = `OVERDUE`) → **Approve Booking** triggers Ed25519 signing.

---

## 🧪 7. Test Suite (78 Tests — Zero Mocks on Business Logic)

```bash
cd backend && npm test   # 36 tests — 6 suites
cd agents  && npm test   # 42 tests — 6 suites
```

| Module | Tests | What's Real |
|--------|-------|-------------|
| RWA Asset Catalog | 4 | Real asset CRUD, status lifecycle |
| Dynamic Pricing & Surge | 4 | Real seasonal calendar math |
| Carbon Credit (CUC) Hub | 4 | Real issue/redeem logic |
| Maintenance Oracle API | 4 | Real 150h threshold classification |
| ListingAgent Surge Engine | 4 | Real date-range multiplier logic |
| MaintenanceOracleAgent | 4 | Real OVERDUE/DUE_SOON scheduling |
| X402 Stream Split | 4 | Real BigInt 64/30/6 bps motes split |
| Ed25519 Booking Proof | 4 | Real `Keys.Ed25519.new()` signing |

> **Note on RPC transport**: `casper-rpc.rpcCall` is mocked in tests to avoid real CSPR spend in CI. All business logic (split math, signing, scheduling) runs against real implementations.

---

## 🏆 8. Hackathon Grading Checklist

| Component | Status | PRD Section |
|-----------|--------|-------------|
| **5 WASM Smart Contracts** | ✅ **Live on Testnet** | §12 |
| **AssetRegistry mint_asset** | ✅ Deploy confirmed Block #8330843 | §B1 |
| **x402 Micropayments (3-way split)** | ✅ BigInt 64/30/6 bps | §B3 |
| **DeFi LTV Credit (70%)** | ✅ LendingPool deployed | §B2 |
| **Carbon CUC Token** | ✅ CarbonCredit deployed | §Sig-3 |
| **Maintenance Oracle** | ✅ 150h service interval + Ed25519 booking | §Sig-2 |
| **Fractional Ownership** | ✅ FractionalRegistry deployed | §Sig-1 |
| **Live CSPR/USD Price Feed** | ✅ CoinGecko (no API key) | §Sig-4 |
| **6 AI Agents** | ✅ Orchestrated via EventEmitter | §10 |
| **Next.js 16 UI** | ✅ Premium glassmorphic dashboard | §9 |
| **78 Tests — Zero Logic Mocks** | ✅ All passing | — |

---

## ⚠️ Why Only Casper

1. **Native x402 protocol** — Casper supports 402 Payment Required natively; no EVM workarounds
2. **Odra 2.8 framework** — Production-grade Rust contract framework with on-chain events and CES
3. **Ed25519 native signing** — Casper's native key type eliminates the need for separate signing infrastructure
4. **`casper-js-sdk` direct RPC** — No reliance on centralized bridges; every transfer hits the node directly
5. **0-gas-fee reads** — `query_global_state` RPC calls are free; ideal for the Maintenance Oracle's continuous polling
