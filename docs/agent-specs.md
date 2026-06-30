# AssetPilot Agent Specifications

> This document is the authoritative technical reference for all six AI agents in the AssetPilot protocol.  
> It supplements `AssetPilot_Final_PRD.md` Section 10 (Agent Architecture) with full implementation-level detail.

**Version:** 2.0 Final  
**Network:** Casper Testnet (`integration-test.cspr.cloud`)  
**Updated:** June 28, 2026

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Agent 1 — Vision Agent](#2-agent-1--vision-agent)
3. [Agent 2 — Risk Agent](#3-agent-2--risk-agent)
4. [Agent 3 — Listing Agent](#4-agent-3--listing-agent)
5. [Agent 4 — Collector Agent](#5-agent-4--collector-agent)
6. [Agent 5 — Guardian Agent](#6-agent-5--guardian-agent)
7. [Agent 6 — Maintenance Oracle](#7-agent-6--maintenance-oracle)
8. [Signing Keys & Permissions](#8-signing-keys--permissions)
9. [Event Wiring](#9-event-wiring)
10. [Error Handling Strategy](#10-error-handling-strategy)

---

## 1. Architecture Overview

Six specialized agents orchestrated by a central **Orchestrator** (`agents/src/orchestrator.ts`). Each agent is an `EventEmitter`-style TypeScript class with a defined trigger, input, and output. Events flow through the orchestrator's internal event bus.

```
                    ┌──────────────────────────┐
                    │     ORCHESTRATOR          │
                    │   (orchestrator.ts)       │
                    │   State machine            │
                    └─────────────┬──────────────┘
                                  │
    ┌───────────┬───────────┬────┴────┬───────────┬───────────┐
    │           │           │         │           │           │
    ▼           ▼           ▼         ▼           ▼           ▼
Vision     Risk       Listing   Guardian    Collector  Maintenance
Agent      Agent      Agent     Agent       Agent      Oracle Agent
```

**Technology stack:** Node.js + TypeScript, LangChain tools, eventemitter3, node-cron, x402-client.

---

## 2. Agent 1 — Vision Agent

**File:** `agents/src/vision-agent.ts` (194 LOC)  
**Role:** Identify, classify, and value physical assets from photographs.  
**Trigger:** New photo submitted via `onPhotoUploaded()` on the Orchestrator.

### Input
- `base64Image: string` — JPEG/PNG image as base64 string

### Process (4 steps)
1. **Classification**: Send to Moondream2 multimodal API at `MOONDREAM_API_URL`
   - Fields returned: `asset_type`, `make`, `model`, `year_range`, `confidence (0–1)`
   - Falls back to 3-asset mock when API unavailable
2. **Pricing**: Call `x402Client.fetch(pricingOracleUrl)` paying 0.0003 CSPR per call
   - Returns `{ value_low, value_high }` in USD
   - Falls back to hardcoded USD ranges for unmapped asset types
3. **Condition scoring**: Compute `80 + (confidence - 0.5) * 40 - entropyPenalty`
   - Entropy penalty: -5 if image < 50KB (low-resolution)
4. **IPFS upload**: Mock CID generation from `Qmassetpilot:${image.length}`

### Output (`VisionAnalysisResult`)
```typescript
interface VisionAnalysisResult {
  assetType:      string;   // e.g. "Agricultural Tractor"
  make:           string;   // e.g. "Mahindra"
  modelEst:       string;   // e.g. "575 DI"
  yearRange:      string;   // e.g. "2017–2020"
  valueUsdLow:    number;   // $8,200
  valueUsdHigh:   number;   // $9,800
  conditionScore: number;   // 0–100
  confidence:     number;   // 0–1
  ipfsHash:       string;   // Qm…
}
```

### Events Emitted
- `vision_complete` → to orchestrator bus

### x402 Payment
- **Oracle call cost**: ~0.0003 CSPR per valuation
- **Payment model**: Agent pays oracle per-call (no subscription)

---

## 3. Agent 2 — Risk Agent

**File:** `agents/src/risk-agent.ts` (149 LOC)  
**Role:** Score borrower risk, calculate max loan, assess LTV health.  
**Trigger:** After Vision Agent completes `vision_complete`.

### Input
- `ownerPublicKey: string` — Casper account hex public key
- `assetId: number`
- `visionResult: VisionAnalysisResult`

### Process
1. `casperMCP.getAccountHistory(publicKey)` — fetches deploy count, account age, transfer count
2. `csprTradeMCP.getTokenPrice('CSPR', 'USD')` — fetches live CSPR/USD rate (default: $0.0234)
3. **Risk scoring** (0–100, lower = safer):
   - Account age: >365d → +0, 180–365 → +10, 90–180 → +20, <90 → +35
   - Deploy count: >50 → +0, 10–50 → +10, <10 → +20
   - Condition score: ≥80 → +0, 60–79 → +15, <60 → +30
   - Price stability: <2% change → +0, 2–5% → +5, 5–10% → +10, >10% → +25
4. Max loan = `valuation_usd × 0.70 / cspr_usd`

### Output (`RiskAssessment`)
```typescript
interface RiskAssessment {
  assetId:           number;
  valuationUsd:      number;
  csprPriceUsd:     number;
  maxLoanCspr:      number;
  maxLoanMotes:     bigint;
  ltvBps:            number;  // 7000 = 70%
  riskScore:         number;  // 0–100
  liquidationLtvBps: number;  // 8500 = 85%
  recommendation:    'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';
}
```

### MCP Integrations
| Tool | Used For |
|------|---------|
| `GetAccountHistory` | Borrower on-chain history for risk scoring |
| `GetTokenPrice` | CSPR/USD rate for LTV calculation |

### Error Handling
- MCP failures fall back to safe defaults (365d age, 10 deploys, $0.0234 CSPR)
- Risk score: 50 (moderate) on fallback

---

## 4. Agent 3 — Listing Agent

**File:** `agents/src/listing-agent.ts` (243 LOC)  
**Role:** Price, publish, and dynamically re-price assets on the marketplace.  
**Trigger:** After asset is minted by `onPhotoUploaded()` pipeline. Also every 12 hours for re-pricing and on demand surge triggers.

### Process
1. `csprTradeMCP.getTokenPrice('CSPR', 'USD')` for rate conversion
2. `GET ${surgeApiUrl}/surge?asset_type=X&region=Y` for demand surge multiplier
3. Base rate lookup from `BASE_HOURLY_USD` table
4. Apply idle discount: -5% per 48h idle, max 30%
5. Apply surge multiplier
6. `POST ${backendUrl}/api/v1/assets/list` to make asset available

### Demand Surge Calendar (Built-in)
```typescript
const SEASONAL_SURGES = {
  Excavator: [{ multiplier: 2.5, reason: 'Harvest season', ... }],
  Generator: [{ multiplier: 3.0, reason: 'Hurricane season', ... }],
  // ...  includes regional filters
};
```

### x402 Payments
- `GET surge` call costs ~0.0001 CSPR per request

---

## 5. Agent 4 — Collector Agent

**File:** `agents/src/collector-agent.ts` (222 LOC)  
**Role:** Stream x402 rental income to owner, repay loan, and distribute protocol fee every 60 seconds.

### Trigger
- `startCollecting(rental, ownerAddress, loanActive)` — called when a rental begins
- `stopCollecting(rentalId)` — called when rental ends

### Stream Engine (X402StreamEngine)
- **60-second cron** using `node-cron` (`stream-engine.ts`)
- On each tick:
  1. Compute 3-way split: `owner 64% | loan 30% | protocol 6%`
  2. Sign payment proof with `x402Client.signPaymentProof(...)`
  3. `POST /api/v1/stream/payment` with the signed proof
  4. Emit `stream_payment` event

### Streaming Split Formula
```
amounts.motes = rental.ratePerMinute  (e.g. 68_000_000 motes = 0.068 CSPR)
ownerMotes       = amount * 64 / 100
loanRepayMotes   = amount * 30 / 100
protocolFeeMotes = amount * 6 / 100
// Remainder (rounding dust) added to owner
```

### Events Emitted
- `stream_payment` → triggers `onPaymentProcessed` in Collector
- `loan_repaid` → triggers `onLoanRepaid` in Orchestrator (releases collateral)

### Fractional Shareholder Support
- `registerFractionalShares(assetId, shares[])` — register shareholders
- When shares registered, the 64% owner's portion is further split N-ways
- `fractional_token.distribute_income()` is called on-chain

### On rental close
- Issues CUC to asset owner and renter via `issueCUC(asset_type, rental_hours)`
- Stops the cron timer and removes session from engine

---

## 6. Agent 5 — Guardian Agent

**File:** `agents/src/guardian-agent.ts` (184 LOC)  
**Role:** Maintain on-chain accuracy of asset state through periodic photo check-ins and carbon issuance.

### Trigger
- Configurable interval (default: 72 hours)
- Also fires after every rental session completion

### Process (every check-in)
1. Prompt owner via in-app notification for a "quick photo check-in"
2. Pass photo to Vision Agent → returns `new_condition_score`, `new_valuation_usd`, `damage_delta`
3. **Condition improved**: `contract.update_condition()` via MCP `submitDeploy`
4. **Condition degraded >10pts**: Trigger `risk_agent.triggerLiquidation()`
5. **No change (within ±5pts)**: Log timestamp only

### Carbon Use Credit Issuance (on rental close)
```
carbon_kg_emitted_by_manufacturing = MFGR_CARBON_FACTORS[asset_type]  // kg CO2
rental_kg_co2_saved = carbon_kg_emitted_by_manufacturing / ASSET_LIFETIME_HOURS * hours_rented
cuc_amount = rental_kg_co2_saved * 0.3  // 30% of savings claimed as CUC
cuc_issued_to_owner = cuc_amount * 0.5
cuc_issued_to_renter = cuc_amount * 0.5
```

### On-Chain Call
- `AssetRegistry.update_condition(asset_id, score, valuation, photo_hash, timestamp)`
- `CarbonCredit.issue_cuc(owner, renter, asset_type, hours_tenths)`

---

## 7. Agent 6 — Maintenance Oracle

**File:** `agents/src/maintenance-oracle-agent.ts` (241 LOC)  
**Role:** Predict maintenance needs, source service providers, auto-book and pay for service.

### Trigger
- After every Guardian check-in
- After every rental session (accumulate operating hours)

### Operating Hour Tracking
```typescript
recordSession(assetId, rentalHours)  // Called by Collector on rental close
// Stores in-memory Map<assetId, totalOperatingHours>
// In production: persisted to supabase/maintenance_log
```

### Service Interval Table (hours)
```typescript
SERVICE_INTERVAL_HOURS = {
  Excavator: 500h, Crane: 1000h, Generator: 150h,
  'Cinema Camera': 200h, Tractor: 300h, ...
  default: 200h
}
```

### Prediction Flow
1. `checkMaintenanceDue(assetId)` — compute `hours_until_service = interval - (totalH - last_service_h)`
2. If `hours_until_service < alertThresholdH`:
   - Emit `maintenance_alert` event
   - `findServiceProvider(asset)` via x402-gated API or fallback to mock "Sigma Field Services"
3. `analyseAsset(asset)` returns `MaintenancePrediction`: `{ status, hoursRemaining, serviceDue, sensorHealth, ... }`

### Auto-Booking Flow (on owner approval)
1. `executeBooking(assetId, bookingUrl, depositUsd)`
2. `x402Client.fetch(bookingUrl, { method: 'POST', ... })` paying deposit via x402
3. `POST ${backendUrl}/api/v1/assets/maintenance` — backend records booking and updates contract
4. Mark asset service record as `Confirmed`

### x402 Payments
- **Service provider discovery**: ~0.0004 CSPR per call
- **Booking deposit**: variable, set per provider (e.g. $210 = ~8,974,358 motes)

---

## 8. Signing Keys & Permissions

| Agent | Key Role | Permissions on-chain |
|-------|---------|---------------------|
| **Orchestrator** | `AGENT_PRIVATE_KEY` | Calls `AssetRegistry.mint_asset()` via MCP |
| **Vision Agent** | None | No on-chain signing |
| **Risk Agent** | None | Read-only (MCP queries) |
| **Listing Agent** | None | Read-only (MCP) + REST calls |
| **Collector Agent** | `AGENT_PRIVATE_KEY` | Calls `LendingPool.record_repayment()` via MCP, submits payment deploys |
| **Guardian Agent** | `AGENT_PRIVATE_KEY` | Calls `AssetRegistry.update_condition()`, `CarbonCredit.issue_cuc()` |
| **Maintenance Oracle** | `AGENT_PRIVATE_KEY` | Calls `AssetRegistry.record_maintenance()` |

**Key Security Note**: Each agent uses a dedicated Casper account with weighted key thresholds matching the principle of least privilege:
- `CollectorAgent` key weight: can call `record_repayment`, cannot call `update_condition`
- `GuardianAgent` key weight: can call `update_condition`, cannot transfer funds

---

## 9. Event Wiring

| Trigger Event | Receiving Agent | Action |
|---|---|---|
| `vision_complete` | Risk → Orchestrator | Starts risk assessment pipeline |
| `risk_assessed` | Listing → Orchestrator | Publishes listing or skips |
| `listing_published` | Orchestrator | Confirms asset active |
| `rental_signed` | Collector | Starts stream engine |
| `stream_payment` | Collector | Updates loan repayment state |
| `loan_repaid` | Orchestrator | Releases asset collateral |
| `condition_checked` | Guardian | Records on-chain update |
| `rental_closed` | Guardian + Collector | Issues CUC, stops streaming |
| `maintenance_alert` | Orchestrator | Notifies owner |
| `booking_confirmed` | Orchestrator | Updates contract record |

---

## 10. Error Handling Strategy

### Network Failures (MCP, REST)
- **3 retries** with exponential backoff: 500ms → 1s → 2s
- After all retries exhausted: **log and continue** with safe default values
- Example (Risk Agent): MCP failure → `accountAge = 365`, `deployCount = 10` (default safe)

### On-Chain Failures (deploys)
- `submitDeploy` failure → retry up to 3 times
- After retry exhaustion: log deploy hash (pending), continue operation
- Do **not** block the agent loop on deploy failure

### x402 Payment Failures
- If streaming payment fails → re-queue for next tick (no payment is dropped)
- If `collect()` returns an error stream continues to next tick
- Loan state not updated until payment confirmed

### Invalid State
- If `risk_recommendation === 'REJECT'`: throw error, do not mint asset
- If `loanStatus === 'Liquidated'`: pause streaming, notify owner
- If `condition_score < 30`: trigger immediate guardian review