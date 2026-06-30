# Asset402 🌾

**Your idle assets. Earning. Autonomously.**

> *One photo. Five agents. Real-time x402 streaming income on Casper Network.*

[![Built on Casper](https://img.shields.io/badge/Built%20on-Casper%20Network-E5172F?style=flat-square)](https://casper.network)
[![Odra Framework](https://img.shields.io/badge/Contracts-Odra%202.8.0-00D4AA?style=flat-square)](https://odra.dev)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square)](LICENSE)

---

## What is Asset402?

Asset402 is an autonomous multi-agent protocol on Casper Network that transforms idle physical assets — tractors, cameras, generators — into live, yield-bearing DeFi positions.

**The flow:** Owner takes one photo → 5 AI agents handle everything else: RWA token minting, DeFi loan issuance, marketplace listing, real-time x402 streaming payments, and condition monitoring. The tractor pays off its own loan.

---

## Project Structure

```
asset402/
├── contracts/              # Odra smart contracts (Rust, WASM target)
│   ├── asset_registry/     # RWA NFT — mint, condition, status
│   ├── lending_pool/       # DeFi LP deposits + 70% LTV loans
│   ├── rental_escrow/      # Gasless rental (casper-eip-712)
│   ├── fractional_registry/# Fractional equity share offerings (v2.0)
│   └── carbon_credits/     # Carbon Credit (CUC) minting utility (v2.0)
├── agents/                 # 5 AI agents (Node.js + TypeScript)
│   └── src/
│       ├── orchestrator.ts       # Central state router
│       ├── vision-agent.ts       # Moondream2 image analysis
│       ├── risk-agent.ts         # Casper MCP + CSPR.trade MCP
│       ├── listing-agent.ts      # Dynamic pricing
│       ├── guardian-agent.ts     # 72h condition monitoring
│       ├── collector-agent.ts    # x402 stream routing
│       ├── x402/
│       │   ├── client.ts         # 402 intercept + Ed25519 signing
│       │   ├── stream-engine.ts  # 60s cron + 3-way split
│       │   └── mock-server.ts    # Local pricing oracle
│       └── mcp/
│           ├── casper-mcp-client.ts    # GetAccountHistory etc.
│           └── csprtrade-mcp-client.ts # get_token_price
├── backend/                # Node.js + Hono API gateway
│   └── src/
│       ├── index.ts               # App entry + SSE boot
│       ├── routes/                # assets, stream, marketplace
│       ├── db/                    # Supabase client + schema.sql + local JSON DB
│       └── hooks/cspr-cloud-sse.ts# Real-time event sync
├── frontend/               # Next.js 14 App Router
│   └── app/
│       ├── page.tsx               # Dashboard (THE WOW screen)
│       ├── onboard/page.tsx       # 4-step wizard
│       ├── marketplace/page.tsx   # Renter view
│       └── lender/page.tsx        # LP portfolio
└── scripts/
    └── simulate-ecosystem.ts     # Full E2E lifecycle simulation
```

---

## Quick Start

```bash
# 1. Install dependencies
cd contracts && cargo check
cd agents && npm install
cd backend && npm install
cd frontend && npm install

# 2. Start local development
cd agents && npm run mock-oracle &   # x402 oracle on :4402
cd backend && npm run dev &          # API gateway on :3001
cd frontend && npm run dev           # Dashboard on :3000
```

---

## Casper Technology Stack

| Technology | Role |
|------------|------|
| **Odra Framework** | All 5 smart contracts — upgradable, WASM native |
| **x402** | Agent-to-API micropayments + per-minute rental streaming |
| **Casper MCP Server** | Account history, deploy submission |
| **CSPR.trade MCP** | CSPR/USD price feeds for LTV calculation |
| **CSPR.click SDK** | Wallet connection + meta-transaction signing |
| **CSPR.cloud SSE** | Real-time event sync (no polling) |
| **casper-eip-712** | Gasless rental agreement verification |

---

## Smart Contract Tests

```bash
cd contracts
cargo test                     # Run all unit tests
```

---

## The WOW Moment

> *"Every 60 seconds, 0.034 CSPR lands. The Collector Agent splits it: 64% to the owner, 30% repays the loan, 6% to the protocol. The loan repayment bar moves on its own. The tractor is paying off its own loan. Autonomously."*

---

*Built for Casper Agentic Buildathon 2026*
*Apache 2.0 License*
