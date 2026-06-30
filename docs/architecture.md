# AssetPilot — System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CASPER NETWORK                           │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐  │
│  │  AssetRegistry  │  │  LendingPool    │  │ RentalEscrow  │  │
│  │  (Odra/Rust)    │  │  (Odra/Rust)    │  │  (Odra/Rust)  │  │
│  │                 │  │                 │  │               │  │
│  │ mint_asset()    │  │ originate_loan()│  │ start_rental()│  │
│  │ update_cond()   │  │ record_repay()  │  │ close_rental()│  │
│  │ set_status()    │  │ trigger_liq()   │  │ eip-712 sig   │  │
│  └────────┬────────┘  └────────┬────────┘  └───────┬───────┘  │
│           │                    │                    │          │
└───────────┼────────────────────┼────────────────────┼──────────┘
            │ CSPR.cloud SSE     │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Bun + Hono)                    │
│                                                                 │
│  POST /api/v1/assets/onboard   →  Vision → Risk → Mint         │
│  POST /api/v1/stream/payment   →  x402 verify + 3-way split    │
│  GET  /api/v1/marketplace      →  Listings + on-chain rep.     │
│                                                                 │
│  CSPR.cloud SSE Listener → Supabase Postgres sync              │
└───────────┬──────────────────────────────────────────┬──────────┘
            │                                          │
            ▼                                          ▼
┌───────────────────────┐                 ┌────────────────────────┐
│   AGENT LAYER (TS)    │                 │   SUPABASE POSTGRES    │
│                       │                 │                        │
│  Orchestrator ──────┐ │                 │  assets                │
│  Vision Agent       │ │                 │  rentals               │
│  Risk Agent ──MCP──►│ │                 │  loans                 │
│  Listing Agent      │ │                 │  agent_logs            │
│  Guardian Agent     │ │                 └────────────────────────┘
│  Collector Agent ◄──┘ │
│                       │
│  x402 Stream Engine   │ ── 60s cron ──► 3-way split
│  X402Client           │ ── 402 pay ───► Pricing Oracle
└───────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NEXT.JS 14 FRONTEND                            │
│                                                                 │
│  /            → Dashboard (streaming balance WOW screen)       │
│  /onboard     → 4-step asset wizard                            │
│  /marketplace → Renter discovery + Book Now                    │
│  /lender      → DeFi LP portfolio                              │
│                                                                 │
│  CSPR.cloud SSE ──► StreamingBalance counter                   │
│  CSPR.click SDK ──► Wallet connect + signing                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Asset Onboarding

```
Owner uploads photo
      │
      ▼ base64
VisionAgent.analysePhoto()
      │ x402 micropayment → Pricing Oracle
      ▼
VisionAnalysisResult { assetType, make, valueUsd, conditionScore }
      │
      ▼
RiskAgent.assessRisk()
      │ Casper MCP → GetAccountHistory
      │ CSPR.trade MCP → get_token_price
      ▼
RiskAssessment { maxLoanMotes, ltvBps, recommendation }
      │
      ▼
POST /api/v1/assets/onboard → assetRepo.upsert()
      │
      ▼ deploy hash
AssetRegistry.mint_asset() on Casper testnet
      │
      ▼ SSE event
CSPR.cloud → CsprCloudSSEListener → supabase.assets.upsert()
```

## Data Flow: x402 Streaming Payment

```
[Every 60 seconds during active rental]

x402StreamEngine.processTick()
      │
      ├─► computeSplit(ratePerMinute)
      │       owner:    64% = 21,760,000 motes
      │       loan:     30% = 10,200,000 motes
      │       fee:       6% =  2,040,000 motes
      │
      ├─► X402Client.signPaymentProof() ← Ed25519(ownerAddress, amount)
      │
      └─► POST /api/v1/stream/payment
              ├─► supabase.rentals.updateStreamed()
              ├─► supabase.loans.updateRemaining()
              └─► if loan.remaining === 0 → release collateral
```

## Casper Technology Usage

| Technology | Component | Specific Use |
|------------|-----------|--------------|
| Odra Framework | 3 contracts | Smart contract business logic |
| x402 Facilitator | Collector + Vision Agents | Per-call API payments + streaming |
| Casper MCP Server | Risk + Collector Agents | Account history, deploy submission |
| CSPR.trade MCP | Risk + Listing Agents | CSPR/USD price for LTV math |
| CSPR.click SDK | Frontend | Wallet connect, meta-tx signing |
| CSPR.cloud SSE | Backend hook | Real-time contract event sync |
| casper-eip-712 | RentalEscrow | Gasless rental agreement verification |
| Casper Testnet | All contracts | `integration-test.cspr.live` |
