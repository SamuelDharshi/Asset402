# Asset402 â€” Final Product Requirements Document
### *The Autonomous Idle Asset Economy on Casper Network*

---

> **Version:** 2.0 â€” Final  
> **Hackathon:** Casper Agentic Buildathon 2026  
> **Track:** Casper Innovation Track (AI + DeFi + RWA)  
> **Tagline:** *Every idle asset is a sleeping economy. Wake it up.*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Global Problem â€” $17 Trillion Sleeping](#2-the-global-problem)
3. [The Solution â€” Asset402](#3-the-solution)
4. [Why This Wins the Hackathon](#4-why-this-wins)
5. [Why Casper and Only Casper](#5-why-casper-and-only-casper)
6. [Target Users â€” Global Archetypes](#6-target-users)
7. [Core Feature Set](#7-core-feature-set)
8. [Signature Features â€” What Makes This Irreplaceable](#8-signature-features)
9. [UX Architecture â€” The Heart of This Product](#9-ux-architecture)
10. [Agent Architecture â€” The Six Agents](#10-agent-architecture)
11. [Smart Contract Architecture (Odra)](#11-smart-contract-architecture)
12. [x402 Integration â€” Two Novel Uses](#12-x402-integration)
13. [MCP Server Integration](#13-mcp-server-integration)
14. [Full Casper Ecosystem Technology Map](#14-casper-ecosystem-technology-map)
15. [How to Use Casper Developer Docs](#15-how-to-use-casper-developer-docs)
16. [Frontend Tech Stack](#16-frontend-tech-stack)
17. [Development Milestones â€” 4 Weeks](#17-development-milestones)
18. [Hackathon Demo Script](#18-hackathon-demo-script)
19. [Business Model](#19-business-model)
20. [Long-Term Roadmap](#20-long-term-roadmap)
21. [Appendix â€” Design System & API Reference](#21-appendix)

---

## 1. Executive Summary

**Asset402** is a multi-agent autonomous protocol on Casper Network that transforms any idle productive physical asset â€” construction equipment, farm machinery, vehicles, generators, studio gear, cold storage, maritime vessels â€” into a self-operating DeFi position with real-time income streaming.

An asset owner photographs their equipment once. Six specialized AI agents handle everything after that: RWA tokenization via Odra smart contracts, DeFi loan origination, dynamic rental marketplace listing, fractional co-ownership structuring, real-time x402 micropayment streaming during active use, predictive maintenance scheduling, and autonomous carbon credit issuance.

**Three innovations that have never been built on any blockchain:**

1. **Streaming Asset Income via x402**: As equipment is actively being rented, CSPR micropayments flow from renter to owner per-minute â€” not per-session, not per-day, per-minute â€” using Casper's native x402 protocol. The owner watches their balance grow in real-time with zero manual involvement.

2. **Fractional Co-Ownership with ERC-3643 Alignment**: High-value assets ($50,000+ excavators, maritime vessels, aircraft equipment) are split into compliance-grade fractional tokens using Casper's upgradable contracts and ERC-3643 structure, enabling global DeFi investors to co-own productive assets and earn proportional streaming income.

3. **Maintenance Oracle Agent with x402 Auto-Pay**: An AI agent monitors asset health through telemetry and periodic photo analysis, predicts maintenance needs before breakdown, sources the best service provider, and autonomously pays for the service booking using x402 â€” the first time a physical asset has ever scheduled and paid for its own maintenance.

---

## 2. The Global Problem â€” $17 Trillion Sleeping

### The Idle Asset Crisis

The world has a utilization problem that nobody talks about. Across every continent, in every industry, productive physical assets sit idle for the majority of their lives:

| Asset Category | Global Count | Average Idle Time | Est. Value Idle Daily |
|---|---|---|---|
| Construction equipment | 4.5 million units | 65% idle | $2.9B/day |
| Agricultural machinery | 28 million units | 60% idle (seasonal) | $4.1B/day |
| Commercial vehicles | 7 million units | 40% idle | $3.2B/day |
| Marine vessels (small) | 3.7 million units | 75% idle | $1.8B/day |
| Generator sets | 12 million units | 70% idle | $2.6B/day |
| Event & AV equipment | 800,000 units | 55% idle | $0.9B/day |
| Medical equipment (SME) | 2.1 million units | 50% idle | $1.5B/day |

**Total estimated idle productive asset value: $17 trillion globally.**

This is not a niche problem. It is one of the largest misallocations of capital in the modern economy.

### The Three Compounding Failures

**Failure 1: The Financing Invisibility Trap**

The World Bank estimates a global SME financing gap of **$8.1 trillion**. The primary reason: small and medium businesses own productive assets but cannot access credit against them because those assets have no digital identity. A 10-year-old excavator in Ghana, a fishing trawler in Vietnam, or a CNC machine in Poland simply do not exist on any financial ledger. Banks won't lend against what they cannot see, verify, or monitor.

**Failure 2: The Peak Season Availability Crisis**

Equipment is unavailable at exactly the moments it is most needed. During harvest season, planting windows, construction booms, and event seasons, rental prices surge 200â€“400% and equipment is still impossible to find. During off-seasons, the same assets sit rusting and earning zero. The global equipment rental market ($900B+) has no real-time matching layer. Booking is still phone-call or manual-form based in 80% of markets.

**Failure 3: The Maintenance Neglect Spiral**

Equipment owners globally underinvest in maintenance because they don't have cash when maintenance is due â€” they have cash after renting, not before. This creates a spiral: deferred maintenance â†’ equipment breakdown â†’ no rental income â†’ no cash for maintenance. It is estimated that **$340 billion** in equipment value is destroyed annually through avoidable maintenance neglect, primarily affecting SME owners who lack working capital buffers.

### What Exists Today and Why It Fails

| Existing Solution | What It Does | Why It Fails |
|---|---|---|
| Traditional equipment rental companies | Lease equipment to renters | Excludes individual asset owners; takes 40â€“60% margin |
| Peer-to-peer rental apps (Fat Llama, Spinlister) | Connect owners and renters | Cash-only or card, no DeFi; no collateral lending |
| Equipment finance banks | Loan against equipment | Requires 3-year financial history, physical valuation, collateral deed |
| DeFi lending protocols | Crypto-native collateral loans | Only accept on-chain crypto assets; cannot accept physical RWA |
| Trringo, JFarm, etc. (agri-rental apps) | Platform-specific equipment booking | Closed platform; no lending; no streaming payments; no global interop |

**The gap: there is no protocol that simultaneously tokenizes a physical asset, enables DeFi lending against it, lists it for peer-to-peer rental, streams micropayment income in real-time, and autonomously manages the entire lifecycle â€” all without the owner doing anything after the first photograph.**

Asset402 is that protocol.

---

## 3. The Solution

### One Photo. Six Agents. Autonomous Economy.

Asset402 collapses the entire lifecycle of a productive physical asset â€” from invisible to income-generating â€” into a single photograph and a set of autonomous agents that never stop working.

```
ðŸ“¸  OWNER TAKES ONE PHOTO
        â”‚
        â–¼
ðŸ”  VISION AGENT
    Identifies asset type, make, model, age, condition
    Pays for market pricing API via x402 (per call)
        â”‚
        â–¼
ðŸ“Š  RISK AGENT
    Scores asset, calculates LTV, sources DeFi liquidity
    Queries CSPR.trade MCP for live CSPR/USD rate
        â”‚
        â–¼
ðŸª™  RWA TOKEN MINTED ON CASPER (Odra contract)
    Upgradable token holds: identity, valuation, condition,
    rental history, maintenance record, carbon score
        â”‚
        â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
        â–¼                          â–¼
ðŸ’° INSTANT DeFi LOAN          ðŸŒ MARKETPLACE LISTING
   Up to 70% LTV in CSPR         AI-priced idle hours
   From Lending Pool contract     Listed globally in seconds
        â”‚                          â”‚
        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                   â–¼
        ðŸ”„ RENTER BOOKS & USES ASSET
           x402 streams CSPR/minute to owner
           Collector Agent splits: owner + lender + protocol
                   â”‚
                   â–¼
        ðŸ›¡ï¸ MAINTENANCE ORACLE AGENT
           Monitors health, predicts failures
           Auto-books and pays for service via x402
                   â”‚
                   â–¼
        ðŸ‘ï¸ GUARDIAN AGENT
           72-hour photo check-ins
           Updates on-chain asset record via upgradable contract
           Issues carbon credit for each shared-use session
```

Every node in this flow is autonomous. No human action is required after the photograph.

---

## 4. Why This Wins

### The Parking Blox Bridge

Casper's most celebrated live mainnet RWA project is **Parking Blox** (AmeriCorp) â€” parking revenue tokenized on-chain. The judges know it, built it, and are proud of it. Asset402 takes that exact concept and:

- Generalizes it from **one asset class (parking)** to **every productive physical asset on earth**
- Adds **autonomous AI agents** so it operates without any human management
- Adds **real-time streaming payments (x402)** â€” not batch settlement
- Adds **DeFi collateralization** â€” instant liquidity before rental income arrives
- Adds **predictive maintenance** â€” the asset manages its own upkeep
- Adds **fractional co-ownership** â€” ERC-3643 aligned for institutional compliance

The judges will see this as: *"We proved physical assets belong on Casper. Someone just built the universal engine for it."*

### What the Competition Will Submit

Every team in this hackathon will pick from the four example builds: yield routers, RWA oracles, DAO governance bots, or KYC agents. These are fine submissions. They do not have a story. They do not have a single moment that makes someone stop breathing.

Asset402 has three of those moments:

1. **The photo â†’ loan in 90 seconds** (WOW 1)
2. **The live CSPR counter climbing in real-time while equipment is being used** (WOW 2)
3. **The asset scheduling and paying for its own maintenance** (WOW 3)

These are not UI tricks. They are new behaviors for the world.

### Anti-Herd Position

| Hackathon Herd | Asset402 |
|---|---|
| Yield router (example build #1) | âŒ |
| RWA oracle (example build #2) | âŒ |
| Multi-agent DAO (example build #3) | âŒ |
| KYC/compliance agent (example build #4) | âŒ |
| Generic DeFi dashboard | âŒ |
| Physical asset streaming economy with fractional ownership and autonomous maintenance | âœ… |

---

## 5. Why Casper and Only Casper

This product is **architecturally impossible** to build with the same elegance on Ethereum, Solana, Base, or any other chain. Not because Casper is generally better â€” but because specific Casper primitives are direct prerequisites for specific Asset402 features.

### x402 â€” Streaming Micropayments (Casper-Native)

The per-minute x402 rental income stream is economically viable **only** on Casper. On Ethereum, gas for 480 micro-transactions per 8-hour rental day would cost more than the rental itself. On Solana, variable compute fees make autonomous budgeting impossible for agents. Casper's x402 protocol is HTTP-native, chainspec-priced, and designed for exactly this: machine-to-machine micropayment streams. No other chain has this.

### Upgradable Smart Contracts â€” Asset Records That Evolve

The Guardian Agent updates asset condition scores on-chain. The Maintenance Oracle Agent records service history. The Vision Agent improves its valuation model over time. All of this requires **modifying stored contract state and logic** without burning the existing RWA token. Casper's upgradable contract model allows `contract.update_condition()` and `contract.update_metadata()` to fire autonomously. Ethereum requires proxy patterns; Solana requires anchor migrations. On Casper it is a first-class feature.

### Deterministic Finality â€” Streaming Requires Certainty

When the Collector Agent routes a micropayment split at T+60 seconds, it needs to know with certainty that the renter's payment landed. Casper's Zug consensus delivers **deterministic, irreversible finality** â€” not probabilistic confirmation. The streaming payment agent does not need retry logic, confirmation-count logic, or re-org protection. Confirmed is confirmed. This simplifies agent code dramatically and makes the real-time income counter on the UI completely reliable.

### Predictable Fees â€” Agent Economics at Scale

The Maintenance Oracle Agent and Collector Agent each submit hundreds of transactions per day across the entire Asset402 fleet. On any gas-auction chain, transaction cost variance makes autonomous agent budgeting impossible: if gas spikes 10x, the agent's treasury depletes unpredictably. Casper's fixed, chainspec-defined fees mean **every agent can budget its transaction costs to six decimal places**. This is a prerequisite for autonomous operation, not a nice-to-have.

### ERC-3643 Alignment â€” Fractional Ownership at Institutional Scale

Asset402's fractional co-ownership feature (described in Section 8) uses compliance-grade token standards. Casper is actively implementing **ERC-3643** (the global standard for security tokens) as part of its Manifest. Asset402's fractional tokens are architecturally pre-aligned with this: they will automatically gain institutional compliance tooling as Casper ships ERC-3643. No other chain is building this in the same way.

### Account Model with Key Weights â€” Agent Identity

Casper's unified account/contract model allows AI agents to hold autonomous on-chain identities with **programmable spending keys and weight-based authorization**. Each of the six Asset402 agents has its own Casper account with scoped permissions. The Guardian Agent can update metadata but cannot move funds. The Collector Agent can distribute payments but cannot modify RWA records. This permission model is native to Casper â€” not a contract add-on.

---

## 6. Target Users â€” Global Archetypes

### Archetype 1: The Solo Equipment Owner (Primary)
**Who:** A small contractor in Brazil who owns two excavators. A farmer in Kenya with a tractor. A photographer in Berlin with $40,000 in idle camera gear. A generator owner in Nigeria running idle backup power.  
**Problem:** Equipment sits unused 50â€“65% of the time. Bank won't lend against it. Finding renters is a part-time job. Collecting payment is chased manually.  
**Job to be done:** "Make my equipment earn while I sleep, without me managing anything."

### Archetype 2: The Renter (Secondary)
**Who:** A construction startup in Vietnam needing a crane for 2 weeks. A documentary filmmaker in South Africa needing a drone rig for 5 days. A disaster relief NGO needing generators for 3 days in a remote location.  
**Problem:** Renting is fragmented, cash-based, and trust-dependent. No verifiable reputation for the equipment or the owner.  
**Job to be done:** "Find, book, use, and pay for equipment as frictionlessly as ordering a ride."

### Archetype 3: The DeFi Yield Seeker (Tertiary)
**Who:** A CSPR holder seeking real-world-backed yield. A DeFi liquidity provider tired of purely crypto-correlated returns.  
**Problem:** DeFi yield today comes from crypto collateral. When markets drop, everything drops together.  
**Job to be done:** "Earn yield backed by assets generating real cash flow, independent of crypto market movements."

### Archetype 4: The Fractional Co-Investor (New in v2)
**Who:** A group of 10 investors who want exposure to a $200,000 marine vessel's rental income. An infrastructure DAO wanting productive asset exposure.  
**Problem:** High-value productive assets are inaccessible to small investors. There is no compliant fractional vehicle.  
**Job to be done:** "Own a piece of a real productive asset and receive proportional streaming income automatically."

---

## 7. Core Feature Set

### A â€” Asset Owner (Supply Side)

**A1. Visual Asset Onboarding**
Single photograph â†’ Vision Agent â†’ AI identifies type, make, model, age, condition in under 5 seconds. Owner confirms or adjusts. No forms, no appraisers, no bank visits.

**A2. RWA Token Minting (Odra)**
Confirmed asset metadata is minted as an upgradable RWA NFT on Casper Testnet via Odra. Token fields: asset type, owner wallet, current valuation (USD + CSPR), condition score (0â€“100), GPS region, idle schedule, maintenance history, carbon credits issued.

**A3. Instant DeFi Loan**
Protocol's LendingPool contract offers up to 70% LTV collateralized loan in CSPR, disbursed immediately. Repayment comes autonomously from rental income via Collector Agent â€” no EMI, no fixed repayment date.

**A4. Fractional Co-Ownership Structuring** *(Signature Feature)*
For assets valued above $30,000, owner can optionally enable fractional tokenization: the RWA token is split into up to 1,000 fractional shares listed on an investment marketplace. Co-investors purchase shares and receive proportional streaming income.

**A5. Live Income Dashboard**
Real-time CSPR balance counter powered by CSPR.cloud Streaming API. Rental rate, session time, loan repayment progress, agent activity log â€” all live, all automatic.

**A6. Maintenance Oracle Notifications** *(Signature Feature)*
Asset receives automated health analysis. When maintenance is predicted, owner receives a notification: "Your excavator's hydraulic oil is due in ~4 operating days. Press âœ“ to let Asset402 book and pay for the service automatically."

### B â€” Renter (Demand Side)

**B1. Global Marketplace Discovery**
Filter by asset type, location radius, availability window, price range. Each listing shows on-chain reputation (rental count, condition score history, renter reviews recorded on Casper).

**B2. One-Tap x402 Booking**
Connect CSPR.click wallet â†’ select window â†’ sign rental agreement (casper-eip-712 typed data, gasless) â†’ x402 stream activates at rental start. No upfront lump payment. Pay only for time actually used.

**B3. Pay-As-You-Use Streaming**
x402 debits renter's wallet per-minute during active rental window. Early return = stream stops, no refund needed. Overage = stream continues. Simple.

**B4. On-Chain Rental Receipt**
Permanent, verifiable rental record issued on Casper at completion. Contributes to renter's on-chain reputation score, usable across any Asset402 listing globally.

### C â€” DeFi Lender

**C1. Liquidity Pool Deposits**
Deposit CSPR â†’ receive interest-bearing pool tokens â†’ earn yield from real-world asset rentals.

**C2. Portfolio Intelligence**
Active loans by asset type, geographic distribution, LTV health factors, projected APY, streaming repayment rate. Updated live via CSPR.cloud.

**C3. Autonomous Repayment**
Collector Agent routes a slice of every x402 payment directly to loan repayment. Lenders are never chasing borrowers.

### D â€” Fractional Co-Investor (New)

**D1. Investment Marketplace**
Browse high-value assets available for fractional co-ownership. See: asset photo, condition score, rental utilization history, projected monthly income per share.

**D2. Fractional Share Purchase**
Buy fractional shares via CSPR.click. Shares are ERC-3643 aligned (compliant security token structure). Each share entitles holder to proportional streaming income.

**D3. Streaming Dividend Distribution**
Each x402 rental payment is automatically split among all fractional shareholders by the Collector Agent, proportional to share ownership. No dividend declaration. No manual distribution. Streaming.

---

## 8. Signature Features â€” What Makes This Irreplaceable

### Signature Feature 1: Fractional Co-Ownership (The "Real Estate Fund for Physical Assets")

**The Problem**: A $180,000 deep-sea fishing vessel generates $4,200/month in rental income when listed on Asset402. One person cannot easily buy into this. But 180 investors paying $1,000 each, each earning $23/month in streaming income? That is a compelling financial product.

**The Implementation**:
- Owner enables fractional mode for assets above $30,000
- Odra contract mints the RWA token + issues up to 1,000 fractional sub-tokens (ERC-3643 aligned)
- A "capital raise" period allows investors to buy fractional tokens at $X/share
- Once fully subscribed, the owner receives full capital upfront; investors receive proportional x402 streaming income forever (until they sell their share)
- Casper's upgradable contracts allow governance parameters (minimum share count, income distribution logic) to be updated as Casper's ERC-3643 implementation rolls out in 2026

**Why judges will love this**: Casper's Manifest explicitly targets ERC-3643 compliant security tokens. Asset402 is the first protocol to use this in the context of real productive assets with streaming income â€” directly validating Casper's roadmap investment.

---

### Signature Feature 2: Maintenance Oracle Agent (The "Asset That Pays for Its Own Upkeep")

**The Problem**: Across the global equipment rental market, **67% of equipment downtime is caused by maintenance issues that could have been predicted**. An idle, broken machine earns nothing. But maintenance requires cash the owner often doesn't have between rental sessions.

**The Solution**:
The Maintenance Oracle Agent continuously runs three data threads:
1. **Operating hours tracking**: pulled from Guardian Agent check-in data and renter session durations
2. **Manufacturer service schedule**: ingested from a database of standard service intervals
3. **Condition score trend**: tracked across Guardian Agent photo analyses

When the agent calculates that service is due within the next 10 operating hours, it:
1. Sources the nearest qualified service provider (API call, paid via x402)
2. Gets a service quote
3. Presents to owner: "Book maintenance for $340? âœ“ Approve / âœ— Skip"
4. On approval, places booking and pays deposit via x402 micropayment â€” automatically
5. Writes a `maintenance_record` entry to the upgradable RWA token on Casper

**The WOW**: This is the world's first physical asset that autonomously schedules and pays for its own maintenance. The Casper judges will immediately recognize this as x402's most powerful use case: **not human-to-merchant payments, but asset-to-service-provider payments**.

---

### Signature Feature 3: Carbon Credit Issuance Per Rental (The "Green Sharing Economy Ledger")

**The Problem**: Shared use of physical assets reduces the total number of assets that need to be manufactured. Every rental session on Asset402 represents embodied carbon **not emitted** from manufacturing an additional unit. But this impact is unmeasured and unclaimed.

**The Implementation**:
After every completed rental session, the Guardian Agent:
1. Calculates the carbon equivalent avoided (formula based on asset type Ã— rental hours Ã— manufacturing carbon factor)
2. Issues a verified **Carbon Use Credit (CUC)** as a lightweight Casper NFT
3. The CUC is assigned to both the asset owner (for sharing their asset) and the renter (for choosing to rent vs. buy)
4. CUCs accumulate in users' wallets and can be:
   - Traded on CSPR.trade
   - Used for discount on future Asset402 rental fees
   - Aggregated and sold on voluntary carbon markets via a bridge protocol

**Why judges will love this**: Casper's Manifest mentions sustainability. Asset402 creates a verifiable, on-chain ledger of the sharing economy's environmental impact â€” every rental session permanently recorded on Casper with a carbon equivalent. This is a narrative asset for Casper's PR, not just a feature.

---

### Signature Feature 4: The Demand Surge Engine (AI-Driven Peak Pricing)

**The Problem**: During harvest season, construction booms, hurricane preparedness periods, and major events, equipment demand surges 300â€“500%. Owners who have listed at flat rates lose enormous potential income. Renters who need equipment urgently cannot find it.

**The Implementation**:
The Listing Agent continuously monitors:
- Seasonal calendars for 47 agricultural crop types across 12 major regions
- Construction permit data (via x402-paid public API)
- Weather alert systems (for generator surge demand)
- Major event calendars (sport events, concerts, exhibitions)

When a demand surge is predicted for an asset category in an owner's region, the Listing Agent:
1. Notifies the owner: "Excavator demand in your area is expected to surge 280% next week due to infrastructure project commencement. Recommended price: increase from $45/hr to $126/hr. Auto-adjust? âœ“"
2. On approval, updates the on-chain listing price via the Odra contract
3. Sends early-access notifications to renters who have bookmarked that asset type

**The WOW**: An equipment owner in the Philippines gets a notification on Monday that Typhoon season preparedness demand will spike generator rental prices by Thursday. Their generator earns 3x normal rate because an AI agent saw it coming. No human analyst. No market research. Autonomous.

---

## 9. UX Architecture

> **Design Principle**: *Blockchain invisible. Asset visible. Income undeniable.*

Every design decision in Asset402 flows from a single principle taken directly from Casper's Manifest: *"For users, blockchain should be invisible. One tap. Done."*

A farmer in Kenya, a contractor in Brazil, and a photographer in Germany should all be able to use Asset402 without understanding what a smart contract is. What they understand is their asset's photo, their balance climbing, and their loan shrinking.

---

### 9.1 Design Language

**Color System** â€” Casper-aligned dark UI:

```
Background:      #0D0E14   (near-black, Casper primary dark)
Surface:         #161820   (card backgrounds)
Elevated:        #1E2030   (modals, inputs)
Brand Red:       #E5172F   (Casper red â€” primary CTA only)
Earning Teal:    #00D4AA   (live streaming state â€” ONLY color that pulses)
Text/Primary:    #F2F4F8
Text/Secondary:  #8A94A6
Success:         #22C55E
Warning:         #F59E0B
Carbon Green:    #4ADE80   (carbon credit events)
Border:          rgba(255,255,255,0.06)
Border/Focus:    rgba(0, 212, 170, 0.4)
```

**Typography:**
- Headlines: `DM Sans` â€” bold, modern, large numbers feel authoritative
- Body: `Inter` â€” consistent with Casper docs
- Monospace: `JetBrains Mono` â€” agent activity feed, transaction IDs

**Motion System:**
- **Earning Pulse**: When x402 stream is live â†’ the CSPR balance counter increments every 60 seconds with a teal glow that breathes in and out. This is the single most important animation in the entire product.
- **Carbon Credit Ping**: A subtle green flash when a Carbon Use Credit is issued at rental close.
- **Maintenance Alert Shake**: A gentle orange shake on the asset card when maintenance is due.
- **Agent Log Scroll**: Terminal-style auto-scroll on the agent activity feed, teal text on near-black.

---

### 9.2 Screen Architecture

#### Screen 1: Owner Dashboard

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  â—† Asset402               [0x1a3f...e8b2]   âš™ï¸    â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                       â”‚
â”‚  Portfolio Overview                                   â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚  â”‚  Lifetime Earned      Active Loans            â”‚    â”‚
â”‚  â”‚  2,847 CSPR           1 active               â”‚    â”‚
â”‚  â”‚                                               â”‚    â”‚
â”‚  â”‚  Today               Carbon Credits           â”‚    â”‚
â”‚  â”‚  +47.3 CSPR â†‘        ðŸƒ 23 CUC earned        â”‚    â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â”‚                                                       â”‚
â”‚  MY ASSETS  (4)                                      â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”‚
â”‚  â”‚  ðŸšœ Komatsu PC88 Excavator                  â”‚     â”‚
â”‚  â”‚     â— RENTED â€” streaming now                 â”‚     â”‚
â”‚  â”‚     +0.068 CSPR/min Â· Loan 74% repaid       â”‚     â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”‚
â”‚  â”‚  ðŸš¢ Marine Work Vessel 12m                  â”‚     â”‚
â”‚  â”‚     â—‘ FRACTIONAL â€” 340/1000 shares sold     â”‚     â”‚
â”‚  â”‚     Capital raise: 6 days remaining         â”‚     â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”‚
â”‚  â”‚  âš¡ Caterpillar XQ230 Generator             â”‚     â”‚
â”‚  â”‚     âšª IDLE â€” Listed $1.80/hr               â”‚     â”‚
â”‚  â”‚     ðŸ”” Demand surge predicted: +180% Thu    â”‚     â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”     â”‚
â”‚  â”‚  ðŸ“· RED Monstro Cinema Camera Kit           â”‚     â”‚
â”‚  â”‚     ðŸ”§ Maintenance due in ~3 operating hrs  â”‚     â”‚
â”‚  â”‚     [ Auto-book service: $210 ] âœ“  âœ—        â”‚     â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜     â”‚
â”‚                                                       â”‚
â”‚               [ + Register Asset ]                    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Design Notes:**
- The excavator card has a live teal pulse behind the CSPR/min number
- The demand surge alert is the orange banner â€” only appears when the Listing Agent triggers it
- The maintenance card shows an inline approval prompt (two buttons: green checkmark, red X) â€” owner does not leave the screen
- Carbon credit count refreshes live via CSPR.cloud SSE

---

#### Screen 2: Asset Onboarding (The 4-Step WOW Sequence)

```
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
  STEP 1 / 4 â€” Photograph Your Asset
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚                                  â”‚
  â”‚      CAMERA VIEWFINDER           â”‚
  â”‚                                  â”‚
  â”‚   â—ˆ Center your asset in frame  â”‚
  â”‚                                  â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         [ ðŸ“¸ Capture Asset ]

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
  STEP 2 / 4 â€” AI Identification
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
  âœ“ Asset Identified

  Category     Construction Equipment
  Type         Mini Excavator
  Make / Model Komatsu PC88MR (est.)
  Year Range   2019 â€“ 2022
  Condition    82 / 100  (Very Good)

  Market Value   $78,400 â€“ $91,200 USD

  Is this correct?
  [ âœ“ Confirm ]       [ âœŽ Adjust ]

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
  STEP 3 / 4 â€” Minting On-Chain Identity
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
  âœ“  Creating asset record on Casper
  âœ“  Calculating loan eligibility
  âœ“  Publishing to global marketplace
  âœ“  Enabling carbon credit tracking

  Your excavator is live on Casper Network.
  Token: #AP-00847

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
  STEP 4 / 4 â€” Unlock Your Options
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
  Choose how to activate your asset:

  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  ðŸ’° GET INSTANT LOAN            â”‚
  â”‚  Up to 54,880 CSPR (~$63,350)  â”‚
  â”‚  Repaid automatically from      â”‚
  â”‚  rental income Â· 70% LTV       â”‚
  â”‚              [ Get Funds ]     â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  ðŸŒ OPEN TO CO-INVESTORS        â”‚
  â”‚  Sell fractional shares of your â”‚
  â”‚  asset's rental income stream  â”‚
  â”‚  Raise up to full asset value  â”‚
  â”‚       [ Set Up Fractional ]    â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  ðŸ“£ LIST FOR RENTAL ONLY        â”‚
  â”‚  No loan Â· Earn rental income   â”‚
  â”‚  AI sets optimal pricing       â”‚
  â”‚         [ List Asset ]         â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

#### Screen 3: LIVE STREAMING â€” The WOW Screen

This is the screen shown for 30 silent seconds in the demo. It must be perfect.

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  â† Back         ðŸšœ Komatsu PC88 Excavator     â— LIVE â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                       â”‚
â”‚   â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—      â”‚
â”‚   â•‘                                           â•‘      â”‚
â”‚   â•‘       STREAMING INCOME                    â•‘      â”‚
â”‚   â•‘                                           â•‘      â”‚
â”‚   â•‘         +  8 4 . 2 1 7  C S P R          â•‘      â”‚
â”‚   â•‘              â†‘ updating live              â•‘      â”‚
â”‚   â•‘                                           â•‘      â”‚
â”‚   â•‘     Rate:    0.068 CSPR / minute          â•‘      â”‚
â”‚   â•‘     Session: 20h 41m active               â•‘      â”‚
â”‚   â•‘     Renter:  â˜…â˜…â˜…â˜…â˜…  (44 sessions)        â•‘      â”‚
â”‚   â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•      â”‚
â”‚              â† teal breathing glow â†’                  â”‚
â”‚                                                       â”‚
â”‚   AUTONOMOUS PAYMENT SPLIT (per 60s)                 â”‚
â”‚   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€         â”‚
â”‚   You receive       0.043 CSPR  (64%)                â”‚
â”‚   Loan repayment    0.021 CSPR  (30%)                â”‚
â”‚   Protocol fee      0.004 CSPR  (6%)                 â”‚
â”‚                                                       â”‚
â”‚   LOAN REPAYMENT                                      â”‚
â”‚   â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘  74% complete              â”‚
â”‚   54,880 borrowed Â· 14,269 remaining                  â”‚
â”‚   Est. repaid: 22 more rental days                    â”‚
â”‚                                                       â”‚
â”‚   CARBON CREDITS THIS SESSION                         â”‚
â”‚   ðŸƒ +3.2 CUC  (6.8 kg COâ‚‚e avoided)               â”‚
â”‚                                                       â”‚
â”‚   AGENT ACTIVITY                                      â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”‚
â”‚   â”‚ > x402 payment confirmed    0.068 CSPR   â”‚       â”‚
â”‚   â”‚ > Loan repayment routed     0.021 CSPR   â”‚       â”‚
â”‚   â”‚ > You credited              0.043 CSPR   â”‚       â”‚
â”‚   â”‚ > Carbon Oracle: 0.032 CUC issued        â”‚       â”‚
â”‚   â”‚ > LTV Health: GOOD          72.4%        â”‚       â”‚
â”‚   â”‚ > Guardian check: in 51h                 â”‚       â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Design Notes:**
- The CSPR number uses a large, bold monospace typeface (DM Sans 56px)
- Every 60 seconds: the number increments + the card glows teal for 800ms + the agent log scrolls one entry
- Carbon credit counter increments at session close with a green flash
- No wallet addresses, no contract hashes, no blockchain terminology visible here

---

#### Screen 4: Fractional Investment Marketplace

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  â—† Invest in Real Assets           [Filter] [Sort]   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                       â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  ðŸš¢ Marine Work Vessel â€” Gulf of Mexico       â”‚   â”‚
â”‚  â”‚  Owner: â˜…â˜…â˜…â˜…â˜…  Â·  On-chain since: 14 months  â”‚   â”‚
â”‚  â”‚                                               â”‚   â”‚
â”‚  â”‚  Asset Value:    $184,000                     â”‚   â”‚
â”‚  â”‚  Shares:         1,000  Â·  $184/share         â”‚   â”‚
â”‚  â”‚  Projected APY:  18.4%  (based on 14mo hist.) â”‚   â”‚
â”‚  â”‚  Shares left:    660 / 1,000                  â”‚   â”‚
â”‚  â”‚  Closes in:      6 days                       â”‚   â”‚
â”‚  â”‚                                               â”‚   â”‚
â”‚  â”‚  Your income: ~$33.8/month per share (CSPR)  â”‚   â”‚
â”‚  â”‚              [ Buy Shares ]                   â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚                                                       â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  ðŸ—ï¸  50T Liebherr Mobile Crane â€” Germany      â”‚   â”‚
â”‚  â”‚  Owner: â˜…â˜…â˜…â˜…â˜†  Â·  On-chain since: 7 months   â”‚   â”‚
â”‚  â”‚                                               â”‚   â”‚
â”‚  â”‚  Asset Value:    $620,000                     â”‚   â”‚
â”‚  â”‚  Shares:         500  Â·  $1,240/share         â”‚   â”‚
â”‚  â”‚  Projected APY:  14.1%                        â”‚   â”‚
â”‚  â”‚  Shares left:    188 / 500                    â”‚   â”‚
â”‚  â”‚                                               â”‚   â”‚
â”‚  â”‚  Your income: ~$145.8/month per share (CSPR) â”‚   â”‚
â”‚  â”‚              [ Buy Shares ]                   â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

#### Screen 5: Maintenance Oracle Prompt

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  ðŸ”§ Maintenance Prediction                           â”‚
â”‚  ðŸ“· RED Monstro Cinema Camera Kit                    â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                       â”‚
â”‚  The Maintenance Agent detected:                     â”‚
â”‚                                                       â”‚
â”‚  â–¸ Sensor calibration due     3 hrs usage remaining  â”‚
â”‚  â–¸ Battery cycle health       71% (service at 70%)   â”‚
â”‚  â–¸ Last professional service  147 operating hours agoâ”‚
â”‚                                                       â”‚
â”‚  Nearest Qualified Provider:                         â”‚
â”‚  Sigma Cine Services, London â€” 4.8â˜… Â· 23 reviews     â”‚
â”‚  Estimated service cost: $210 Â· Available: Thu 9am   â”‚
â”‚                                                       â”‚
â”‚  If approved, Asset402 will:                       â”‚
â”‚  âœ“ Book the appointment automatically               â”‚
â”‚  âœ“ Pay the $210 deposit via x402                   â”‚
â”‚  âœ“ Update your asset's service record on Casper     â”‚
â”‚  âœ“ Adjust your rental listing to show "serviced"    â”‚
â”‚                                                       â”‚
â”‚   [ âœ“ Approve & Auto-Book ]   [ âœ— Skip this time ]  â”‚
â”‚                                                       â”‚
â”‚   The $210 will come from your earned balance.       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

### 9.3 UX Rules Governing Every Screen

1. **Zero blockchain words** on main flows. "Mint," "deploy," "gas," "smart contract," "token hash" â€” none of these appear on owner-facing screens. The agent log (collapsible, power user only) uses technical terms. Main UI never does.
2. **One primary CTA per screen.** No choice paralysis. Every screen has one red or teal button that represents the most important next action.
3. **Agent activity always accessible.** A collapsible "Agent Log" drawer available on all screens for users who want to audit what is happening on-chain.
4. **Income always in two currencies.** CSPR amount shown large; USD/EUR equivalent shown small beneath. Both visible always.
5. **No wallet-first flows.** Marketplace, asset browser, and investment listings are all visible without connecting a wallet. Wallet connection triggers only at "List Asset," "Book Now," or "Buy Shares."

---

## 10. Agent Architecture

Asset402 is orchestrated by six specialized AI agents. Each has a defined role, tool set, trigger condition, and spending authorization (Casper scoped key model).

```
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚        ORCHESTRATOR             â”‚
                    â”‚  State machine + task routing   â”‚
                    â”‚  Casper MCP: state queries      â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                    â”‚
         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
         â”‚                          â”‚                       â”‚
         â–¼                          â–¼                       â–¼
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”          â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚  VISION     â”‚          â”‚   RISK       â”‚        â”‚  LISTING     â”‚
  â”‚  AGENT      â”‚          â”‚   AGENT      â”‚        â”‚  AGENT       â”‚
  â”‚  (Identify) â”‚          â”‚ (Underwrite) â”‚        â”‚  (Price+List)â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜          â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜        â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                    â”‚
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚               â”‚                â”‚
                    â–¼               â–¼                â–¼
             â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
             â”‚ GUARDIAN â”‚  â”‚  COLLECTOR   â”‚  â”‚ MAINTENANCE  â”‚
             â”‚  AGENT   â”‚  â”‚    AGENT     â”‚  â”‚   ORACLE     â”‚
             â”‚(Monitor) â”‚  â”‚  (Pay/Split) â”‚  â”‚  (Predict)   â”‚
             â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

### Agent 1: Vision Agent

**Role**: Identify, classify, and value physical assets from photographs

**Tools Used**:
- Image classification model (Moondream2 multimodal, via API)
- Equipment market pricing APIs (paid per-call via x402)
- CSPR.cloud REST API (store valuation metadata)

**Trigger**: New asset photo submitted OR Guardian Agent sends new check-in photo

**Process**:
```
1. Receive base64 image from frontend
2. Run classification â†’ {asset_type, make_est, model_est, year_range, condition_0_100}
3. Detect damage signals (rust, dents, missing parts) â†’ condition_deductions
4. Call market_pricing_API via x402 (POST /price, payment header auto-attached)
5. Return structured asset profile + confidence score to Orchestrator
```

**x402 Use**: Vision Agent pays the market pricing oracle approximately 0.0005 CSPR per valuation call. No API key, no monthly subscription. Autonomous per-call billing.

---

### Agent 2: Risk Agent

**Role**: Underwrite the asset for DeFi lending; continuously monitor active loans

**Tools Used**:
- Casper MCP Server (owner wallet history, account age)
- CSPR.trade MCP (live CSPR/USD rate for LTV calculation)
- External credit signal API (x402 payment per query)

**Trigger**: After Vision Agent completes; daily re-run on all active loans

**Process**:
```
1. Receive asset valuation
2. Query owner on-chain history via Casper MCP
   â†’ Account age, rental history, prior repayment rate
3. Fetch CSPR/USD via CSPR.trade MCP
4. Calculate: max_loan = (asset_value_usd Ã— 0.70) / cspr_usd
5. Set liquidation_threshold at 85% LTV
6. Return risk_profile + loan_parameters to Orchestrator
7. (Ongoing) Re-evaluate LTV daily; if CSPR drops 15%+ â†’ alert + margin call logic
```

---

### Agent 3: Listing Agent

**Role**: Price, list, and dynamically re-price assets on the rental marketplace

**Tools Used**:
- Demand Surge Engine (regional event/seasonal calendar APIs â€” x402 paid)
- CSPR.trade MCP (for real-time rate-setting in CSPR/minute)
- CSPR.cloud REST API (write listing metadata)
- Odra contract (update listing_status field)

**Trigger**: After RWA token minted; every 12 hours for re-pricing; on demand surge signal

**Process**:
```
1. Receive asset metadata + owner's availability schedule
2. Query comparable rates in asset category + region via x402 API
3. Calculate base_rate_cspr_per_min = (market_hourly_rate / 60) / cspr_usd
4. Check demand surge calendar â†’ if surge predicted: increase rate Ã— surge_multiplier
5. Publish listing + rate to CSPR.cloud + update Odra listing field
6. Every 12h: if no bookings in 48h â†’ reduce rate 5% (floor: 60% of base)
7. On demand surge signal â†’ notify owner + request auto-adjust approval
```

---

### Agent 4: Collector Agent

**Role**: Distribute x402 streaming payments in real-time across all stakeholders

**Trigger**: Every 60 seconds during active rental session

**Tools Used**:
- x402 Facilitator (verify payment proof)
- Casper MCP Server (submit micro-distribution transactions)
- Odra LendingPool contract (record repayment)
- Odra FractionalToken contract (distribute to co-investors, if applicable)

**Process**:
```
1. Receive confirmed x402 payment (e.g., 0.068 CSPR)
2. Calculate distribution:
   â€” Standard (no fractional): owner 64%, loan 30%, protocol 6%
   â€” Fractional mode: owner's share (64%) â†’ split among all fractional holders
3. Submit distribution batch to Casper via MCP Server
4. Call lendingpool.record_repayment(asset_id, amount)
5. If fractional: call fractional_token.distribute(asset_id, amount_per_share)
6. If loan fully repaid: call lendingpool.release_collateral(asset_id)
7. Log each step to CSPR.cloud streaming event feed
```

---

### Agent 5: Guardian Agent

**Role**: Maintain real-world accuracy of the on-chain asset record through periodic check-ins

**Trigger**: Every 72 hours (configurable per asset class); after every rental session completion

**Tools Used**:
- Push notification service (prompt owner)
- Vision Agent (re-analyze new photo)
- Odra AssetRegistry contract (update condition + maintenance record)
- Carbon Oracle (calculate and issue Carbon Use Credits)

**Process**:
```
1. Send notification to owner: "Quick photo check-in (30 seconds)"
2. Owner submits new photo
3. Guardian passes to Vision Agent â†’ new condition_score, damage_delta
4. Compare to previous score:
   - No change (Â±5pts): log timestamp only
   - Improved: update contract.update_condition(new_score)
   - Degraded >10pts: flag to Risk Agent for LTV review
5. After rental completion:
   â†’ Calculate carbon_impact = asset_type_factor Ã— session_hours Ã— manufacturing_carbon_per_unit
   â†’ Mint Carbon Use Credit NFT on Casper (small Odra contract)
   â†’ Assign proportional CUC to owner + renter wallets
```

---

### Agent 6: Maintenance Oracle Agent (New)

**Role**: Predict maintenance needs, source service providers, auto-book and pay

**Trigger**: After every Guardian check-in; after every rental session (accumulate hours)

**Tools Used**:
- Manufacturer service schedule database (x402 paid API)
- Operating hours tracker (from session data)
- Service provider discovery API (x402 paid)
- x402 client (autonomous payment for service booking deposit)
- Odra AssetRegistry (write maintenance_record)

**Process**:
```
1. After each session: add rental_hours to cumulative_operating_hours
2. Pull manufacturer service schedule via x402 API:
   â†’ service_due_at_hours[] = [250, 500, 1000, 2000]
3. Calculate: hours_to_next_service = service_due_at - current_hours
4. If hours_to_next_service < 15:
   a. Query service_provider_api via x402 â†’ nearest provider + quote
   b. Push approval notification to owner
5. On owner approval:
   a. Book appointment via provider API (x402 payment for deposit)
   b. Call contract.record_maintenance(asset_id, provider, date, service_type)
   c. Update listing to show "Freshly Serviced" badge
6. If degradation detected by Guardian Agent: trigger immediate maintenance check
```

**The Novel x402 Use**: The Maintenance Oracle Agent is paying a service provider on behalf of a physical asset â€” the asset is, in effect, paying for its own maintenance. This is machine-to-merchant autonomous commerce, the canonical x402 use case.

---

## 11. Smart Contract Architecture

All contracts built with **Odra Framework** on **Casper Testnet**.

### Contract 1: AssetRegistry (Core RWA NFT)

```rust
// Odra Framework â€” AssetRegistry contract

#[odra::module]
pub struct AssetRegistry {
    assets: Mapping<AssetId, AssetMetadata>,
    owner_assets: Mapping<Address, Vec<AssetId>>,
    condition_history: Mapping<AssetId, Vec<ConditionRecord>>,
    maintenance_log: Mapping<AssetId, Vec<MaintenanceRecord>>,
    carbon_credits_issued: Mapping<AssetId, u64>,
    total_assets: Variable<u64>,
}

#[odra::module]
impl AssetRegistry {

    // Called by Orchestrator after Vision + Risk Agent complete
    pub fn mint_asset(
        &mut self,
        owner: Address,
        asset_type: String,
        make_model_est: String,
        valuation_usd: u64,
        condition_score: u8,
        ipfs_photo_hash: String,
        listing_mode: ListingMode, // Standard | Fractional
    ) -> AssetId { ... }

    // Called by Guardian Agent every 72h (UPGRADABLE â€” model improves over time)
    pub fn update_condition(
        &mut self,
        asset_id: AssetId,
        new_condition: u8,
        new_valuation_usd: u64,
        photo_hash: String,
        timestamp: u64,
    ) { ... }

    // Called by Maintenance Oracle Agent after service
    pub fn record_maintenance(
        &mut self,
        asset_id: AssetId,
        provider_name: String,
        service_type: String,
        cost_cspr: u128,
        tx_hash: String, // x402 payment proof
    ) { ... }

    // Called by Guardian Agent after each completed rental
    pub fn issue_carbon_credit(
        &mut self,
        asset_id: AssetId,
        owner: Address,
        renter: Address,
        cuc_amount: u64, // in micro-CUC
    ) { ... }

    // Called by Listing Agent
    pub fn set_listing(
        &mut self,
        asset_id: AssetId,
        status: ListingStatus,
        rate_cspr_per_min: u128,
    ) { ... }

    // Called by Collector Agent when loan fully repaid
    pub fn release_collateral(&mut self, asset_id: AssetId) { ... }

}

// KEY CASPER FEATURE: update_condition() and record_maintenance() exist because
// Casper contracts are UPGRADABLE. As AI models improve valuation accuracy,
// the contract logic can be upgraded without burning the existing RWA token.
```

---

### Contract 2: LendingPool

```rust
#[odra::module]
pub struct LendingPool {
    deposits: Mapping<Address, u128>,
    loans: Mapping<AssetId, LoanData>,
    total_liquidity: Variable<u128>,
    utilization_rate: Variable<u16>,  // bps
    protocol_fee_bps: Variable<u16>,
}

#[odra::module]
impl LendingPool {

    // Called when owner selects "Get Instant Loan"
    pub fn originate_loan(
        &mut self,
        asset_id: AssetId,
        borrower: Address,
        amount_cspr: u128,
        ltv_bps: u16,
        collateral_value_usd: u64,
    ) { ... }

    // Called by Collector Agent every 60s during active rental
    pub fn record_repayment(
        &mut self,
        asset_id: AssetId,
        amount_cspr: u128,
    ) -> LoanStatus { ... }  // returns Partial | Cleared | Liquidated

    // Called by Risk Agent if LTV breaches threshold
    pub fn trigger_liquidation(&mut self, asset_id: AssetId) { ... }

    // Lender deposit/withdrawal
    pub fn deposit(&mut self, amount_cspr: u128) { ... }
    pub fn withdraw(&mut self, amount_cspr: u128) { ... }

}
```

---

### Contract 3: FractionalToken (ERC-3643 aligned)

```rust
#[odra::module]
pub struct FractionalToken {
    asset_shares: Mapping<AssetId, ShareDistribution>,
    investor_holdings: Mapping<Address, Mapping<AssetId, u32>>,
    income_accrued: Mapping<Address, u128>,
    total_shares: Mapping<AssetId, u32>,
}

#[odra::module]
impl FractionalToken {

    // Owner calls to enable fractional mode
    pub fn enable_fractional(
        &mut self,
        asset_id: AssetId,
        total_shares: u32,       // e.g. 1000
        price_per_share_cspr: u128,
        raise_deadline: u64,
    ) { ... }

    // Investor purchases shares
    pub fn buy_shares(
        &mut self,
        asset_id: AssetId,
        share_count: u32,
        buyer: Address,
    ) { ... }

    // Called by Collector Agent â€” distributes income to all shareholders
    pub fn distribute_income(
        &mut self,
        asset_id: AssetId,
        total_amount: u128,
    ) { ... }  // splits proportionally to all holders automatically

    // Investor claims accrued income
    pub fn claim_income(&mut self, asset_id: AssetId) { ... }

    // Secondary market transfer (ERC-3643 aligned compliance hook)
    pub fn transfer_shares(
        &mut self,
        asset_id: AssetId,
        to: Address,
        share_count: u32,
        compliance_signature: Signature,
    ) { ... }

}
```

---

### Contract 4: RentalEscrow (with casper-eip-712)

```rust
#[odra::module]
pub struct RentalEscrow {
    active_rentals: Mapping<RentalId, RentalData>,
    completed_rentals: Mapping<Address, Vec<RentalId>>,
    reputation_scores: Mapping<Address, ReputationData>,
}

#[odra::module]
impl RentalEscrow {

    // Called at rental start â€” verifies casper-eip-712 typed signature
    // GASLESS: renter signed off-chain; protocol covers on-chain cost
    pub fn start_rental(
        &mut self,
        asset_id: AssetId,
        renter: Address,
        duration_minutes: u64,
        rate_per_minute_cspr: u128,
        signed_agreement: Signature, // casper-eip-712 typed data
    ) -> RentalId { ... }

    // Called by Collector Agent at rental close
    pub fn close_rental(
        &mut self,
        rental_id: RentalId,
        total_paid_cspr: u128,
    ) { ... }

    // Called by Guardian Agent after session review
    pub fn update_reputation(
        &mut self,
        address: Address,
        session_score: u8,
    ) { ... }

}
```

**casper-eip-712 Usage**: The rental agreement is signed off-chain by the renter as human-readable typed data: *"I am renting [Komatsu PC88, asset #AP-00847] for [8 hours] at [0.068 CSPR/minute], starting [2026-07-01 08:00 UTC]."* This signature is verified by the contract. No gas charged to the renter at signing. Only at the first x402 payment does value move.

---

### Contract 5: CarbonUseCredit (CUC)

```rust
#[odra::module]
pub struct CarbonUseCredit {
    balances: Mapping<Address, u64>,
    total_issued: Variable<u64>,
    metadata: Mapping<u64, CUCRecord>,
}

#[odra::module]
impl CarbonUseCredit {
    // Called by Guardian Agent after each rental completion
    pub fn mint(
        &mut self,
        recipient_owner: Address,
        recipient_renter: Address,
        amount_micro_cuc: u64,
        asset_type: String,
        session_hours: u32,
        co2_equivalent_grams: u64,
    ) { ... }

    // CUC transfer for trading on CSPR.trade
    pub fn transfer(&mut self, to: Address, amount: u64) { ... }

    // Redemption for rental fee discount
    pub fn redeem_for_discount(&mut self, amount: u64) -> DiscountVoucher { ... }
}
```

---

## 12. x402 Integration â€” Two Novel Uses

Asset402 demonstrates x402 in two architecturally distinct contexts. No other hackathon submission will do this.

### Use A: Agent-to-Oracle Micropayments (Vision + Maintenance + Listing Agents)

Every time an agent needs external data, it pays per-call using x402:

```
Vision Agent needs equipment market price:

1. Agent sends: GET https://asset-oracle.net/v1/price?type=excavator&year=2020
2. Oracle returns: HTTP 402 Payment Required
                   X-Payment-Address: 0xoracle...server
                   X-Payment-Amount:  300000  (0.0003 CSPR)
                   X-Payment-Network: casper-testnet
3. Agent signs payment via CSPR.click Agent Skill
4. Agent retries with: X-Payment: casper:0xoracle...:300000:sig_ed...
5. Oracle verifies via x402 Facilitator â†’ returns 200 OK + price data
```

**Economics**: Vision Agent pays ~0.0003 CSPR per valuation. Risk Agent pays ~0.0002 CSPR per credit signal query. Listing Agent pays ~0.0001 CSPR per demand data pull. Maintenance Oracle pays ~0.0004 CSPR per service provider discovery call. All costs are predictable, autonomous, and zero-subscription.

---

### Use B: Renter-to-Owner Streaming (Collector Agent)

Pre-authorized x402 stream, activated at rental start:

```javascript
// Streaming authorization signed at rental start (casper-eip-712)
const streamAuth = {
  type: 'Asset402Stream',
  asset_id: 'AP-00847',
  renter: '0x1a3f...e8b2',
  owner: '0x9c4b...f2a1',
  rate_per_interval: '68000',    // 0.068 CSPR in motes
  interval_seconds: 60,
  max_sessions: 1,
  expiry: rental_end_timestamp,
};
// Signed once by renter. Collector Agent fires every 60s autonomously.

// Collector Agent fires every 60 seconds:
const streamPayment = await x402Client.streamPay({
  to: escrow_contract,
  amount: '68000',  // 0.068 CSPR
  authorization: streamAuth,
  stream_id: rental_id,
});
// â†’ Verified by x402 Facilitator â†’ distributed by Collector Agent â†’ logged to CSPR.cloud
```

**This is the world's first physical-asset-to-DeFi income streaming implementation.**

---

### x402 Integration Code

```javascript
// /agents/x402-client.js â€” shared client for all agents
import { createX402Client } from '@casper/x402';

export const x402Agent = createX402Client({
  network: 'testnet',
  agentKey: process.env.AGENT_PRIVATE_KEY,
  maxPaymentCeiling: '1000000',  // 0.001 CSPR per call ceiling
  facilitatorUrl: 'https://x402-facilitator.cspr.cloud',
});

// Vision Agent usage:
const pricingData = await x402Agent.fetch(
  'https://asset-oracle.net/v1/price',
  { params: { type: 'excavator', year_range: '2019-2022', region: 'EU' } }
);

// Maintenance Oracle usage:
const serviceProvider = await x402Agent.fetch(
  'https://service-finder.net/v1/nearest',
  { params: { asset_type: 'cinema_camera', lat: 51.5, lng: -0.12, service: 'calibration' } }
);

// Collector Agent streaming:
await x402Agent.streamPay({
  escrow: rentalEscrowContractHash,
  stream_id: rentalId,
  amount_motes: '68000',
  authorization_signature: rentalSignature,
});
```

**Reference**: https://github.com/make-software/casper-x402/tree/master/examples  
**API Docs**: https://docs.cspr.cloud/x402-facilitator-api/reference

---

## 13. MCP Server Integration

### MCP Server 1: Casper MCP Server

Used by: Risk Agent, Collector Agent, Guardian Agent, Orchestrator

**Risk Agent â€” Query owner wallet history:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "GetAccountHistory",
    "arguments": {
      "public_key": "01ab3f...e8b2",
      "limit": 100,
      "filter": "transfers_only"
    }
  }
}
```
**Returns**: Transfer count, average transaction size, account age, prior Asset402 interactions

**Collector Agent â€” Submit payment distribution:**
```json
{
  "method": "tools/call",
  "params": {
    "name": "SubmitDeploy",
    "arguments": {
      "deploy": "[signed_distribution_deploy_hex]",
      "chain_name": "integration-test"
    }
  }
}
```

**Setup**: https://docs.cspr.cloud/agentic-tools/mcp-server  
**GitHub**: https://github.com/msanlisavas/casper-mcp

---

### MCP Server 2: CSPR.trade MCP

Used by: Risk Agent (LTV), Listing Agent (rate-setting), Fractional Token (income projection)

```json
{
  "method": "tools/call",
  "params": {
    "name": "get_token_price",
    "arguments": {
      "token": "CSPR",
      "quote": "USD",
      "include_24h_change": true
    }
  }
}
```
**Returns**: `{ cspr_usd: 0.0234, change_24h: "+3.2%", timestamp: 1751000000 }`

**Endpoint**: https://mcp.cspr.trade

---

## 14. Casper Ecosystem Technology Map

| Technology | Where Used | How It's Used |
|---|---|---|
| **Odra Framework** | All 5 smart contracts | AssetRegistry (RWA NFT), LendingPool, FractionalToken, RentalEscrow, CarbonUseCredit â€” all Odra (Rust) |
| **Odra Upgradable Contracts** | AssetRegistry | Guardian + Maintenance Agents update condition/maintenance records on-chain without redeployment |
| **x402 Micropayments** | Vision, Risk, Listing, Maintenance, Collector Agents | Dual use: (A) agents paying oracles per-call; (B) renter streaming income per-minute |
| **Casper MCP Server** | Risk Agent, Collector Agent, Orchestrator | Account history queries, deploy submission, state monitoring |
| **CSPR.trade MCP** | Risk Agent, Listing Agent | Live CSPR/USD rate for LTV and rental pricing |
| **CSPR.click Agent Skill** | All wallet interactions | Owner wallet connection, renter booking approval, investor share purchase |
| **CSPR.cloud REST API** | Backend, all agents | Read/write marketplace listings, asset metadata, rental records |
| **CSPR.cloud Streaming (SSE)** | Live income dashboard | Powers the real-time CSPR counter on Screen 3 â€” fires on every x402 confirmation |
| **CSPR.cloud Node API** | Collector Agent batch | Batch distribution transactions across owner + lender + co-investors |
| **casper-eip-712** | RentalEscrow contract | Gasless typed rental agreement signed by renter off-chain, verified on-chain |
| **Casper Account Key Weights** | Agent identity | Each agent has a Casper account with scoped key permissions (Guardian can't move funds; Collector can't modify records) |
| **ERC-3643 Structure** | FractionalToken | Fractional co-ownership shares pre-aligned with Casper's ERC-3643 rollout for compliance-grade security tokens |
| **Odra llms.txt** | Contract development | AI coding assistant pointed at https://odra.dev/llms.txt for autonomous contract generation |
| **Casper Testnet** | All deployments | `integration-test.cspr.live` for all hackathon contract instances |
| **CEP-78 (Casper NFT)** | CarbonUseCredit | Carbon credits issued as standard Casper NFTs compatible with CSPR.trade |

---

## 15. How to Use Casper Developer Docs

### Day 1: Read These First (in order)

**1. Casper AI Toolkit**  
URL: https://www.casper.network/ai  
Read the full page. Understand the 5 tools: x402, MCP Servers, CSPR.click, CSPR.cloud, Odra. These are your 5 pillars.

**2. Casper Developer Documentation**  
URL: https://docs.casper.network  
Read: "Understanding Accounts," "Understanding Deploys," "Reading and Writing to Global State." These three concepts underpin everything.

**3. Casper Testnet Setup**  
- Install CSPR.click extension: https://docs.cspr.click  
- Faucet: https://testnet.cspr.live/tools/faucet (get 1,000 test CSPR)  
- Explorer: https://testnet.cspr.live (verify your deploys)  
- Chain name for deploys: `integration-test`

---

### Smart Contracts: Odra Framework

**4. Odra Docs**  
URL: https://odra.dev/docs/  
Read in this order:
- "Getting Started" â†’ install Odra toolchain
- "Writing Modules" â†’ understand `#[odra::module]` macro
- "Storage (Mapping, Variable)" â†’ how on-chain state works
- "Events" â†’ how to emit indexed events (for CSPR.cloud streaming)
- "Upgradable Contracts" â†’ critical for Guardian Agent's update_condition pattern

```bash
# Install Odra CLI
cargo install odra-cli

# Initialize project
odra new Asset402-contracts

# Run local tests
odra test

# Build WASM
cargo build --target wasm32-unknown-unknown --release

# Deploy to Testnet
casper-client put-deploy \
  --chain-name integration-test \
  --node-address https://integration-test.cspr.live \
  --payment-amount 50000000000 \
  --session-path ./target/wasm32-unknown-unknown/release/asset_registry.wasm \
  --secret-key ./keys/secret_key.pem
```

**5. Odra llms.txt (AI-Assisted Contract Writing)**  
URL: https://odra.dev/llms.txt  
Point Claude, Cursor, or Copilot here. Your AI assistant can autonomously generate working Casper contracts from this file. Set it as a context document in your IDE.

**6. casper-eip-712**  
URL: https://github.com/casper-ecosystem/casper-eip-712  
Use for the RentalEscrow contract's gasless rental agreement. The typed struct definition and signature verification pattern are both in the README.

---

### x402 Integration

**7. x402 User Guide**  
URL: https://github.com/make-software/casper-x402/blob/master/docs/user-guide.md  
Read "Client Setup" and "Server Setup" sections completely.

**8. x402 Reference Examples**  
URL: https://github.com/make-software/casper-x402/tree/master/examples  
Use `examples/client/` as your agent's x402 HTTP client base.  
Use `examples/server/` as your mock oracle API server base.

**9. x402 Facilitator API**  
URL: https://docs.cspr.cloud/x402-facilitator-api/reference  
Read "Payment Verification" and "Header Formats." Your facilitator endpoint: `https://x402-facilitator.cspr.cloud`

---

### MCP Servers

**10. Casper MCP Server**  
URL: https://docs.cspr.cloud/agentic-tools/mcp-server  
Available tools: `GetAccountBalance`, `GetAccountHistory`, `SubmitDeploy`, `GetDeployStatus`, `GetTransfersByAccount`

**11. CSPR.trade MCP**  
URL: https://mcp.cspr.trade  
Available tools: `get_token_price`, `get_quote`, `get_liquidity_pools`, `get_trade_history`

---

### CSPR.click & CSPR.cloud

**12. CSPR.click AI Agent Skill**  
URL: https://docs.cspr.click/documentation/ai-agent-skills  
Install in your coding environment. Functions used: `createWallet()`, `signDeploy()`, `signTypedData()` (for eip-712), `sendTransaction()`

**13. CSPR.cloud REST API**  
URL: https://docs.cspr.cloud  
Endpoints used:
- `GET /accounts/{public_key}` â€” owner account data
- `GET /transfers?recipient={public_key}` â€” incoming payments
- `GET /deploys/{deploy_hash}` â€” transaction status

**14. CSPR.cloud Streaming (SSE)**  
URL: https://docs.cspr.cloud/streaming-api  
Subscribe to: `GET /events/main` with filter `filter[event_type]=Transfer&filter[account]={owner_wallet}`  
This powers the live income counter. Every confirmed x402 payment fires an SSE event that increments the UI counter.

---

## 16. Frontend Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR, fast routing, API routes for agent coordination |
| Styling | Tailwind CSS | Rapid dark UI, consistent with Casper visual language |
| Components | shadcn/ui + custom | Accessible base components, fully overridden for dark theme |
| Wallet | CSPR.click SDK | Official Casper wallet; CSPR.cloud proxy bundled |
| Realtime | CSPR.cloud SSE | Powers live earning counter without polling |
| Animation | Framer Motion | Earning pulse, agent log scroll, status transitions, carbon flash |
| AI Vision | Moondream2 API | Lightweight multimodal model for asset photo classification |
| Agents | Node.js + LangChain | Orchestrator router + individual agent toolchains |
| Backend | Bun + Hono | Ultra-fast API layer; agent trigger endpoints |
| Storage | Supabase | Off-chain marketplace listings, user preferences (on-chain is source of truth) |
| Maps | Mapbox | Asset location for global marketplace |
| Deploy | Vercel (frontend) + Railway (agents) | Fast demo deployment |

---

## 17. Development Milestones â€” 4 Weeks

### Week 1 (Days 1â€“7): Foundation

| Day | Task |
|---|---|
| 1 | Read all docs in Section 15. Set up Testnet wallet. Get faucet CSPR. |
| 2 | Write + test `AssetRegistry` contract (Odra). Local unit tests pass. |
| 3 | Write + test `LendingPool` contract. |
| 4 | Write + test `RentalEscrow` contract with casper-eip-712 stub. |
| 5 | Write + test `FractionalToken` and `CarbonUseCredit` contracts. |
| 6 | Deploy all 5 contracts to Testnet. Verify each on `testnet.cspr.live`. |
| 7 | Scaffold Next.js frontend with Tailwind, dark theme, Casper color palette. |

**Milestone**: 5 contracts live on Testnet. Frontend shell running at localhost:3000.

---

### Week 2 (Days 8â€“14): Agents

| Day | Task |
|---|---|
| 8â€“9 | Build Vision Agent: Moondream2 integration + x402 oracle client. |
| 10 | Build Risk Agent: Casper MCP + CSPR.trade MCP. |
| 11 | Build Listing Agent: dynamic pricing + demand surge logic. |
| 12â€“13 | Build Collector Agent: x402 streaming + 3-way (or n-way fractional) split. |
| 14 | Build Guardian Agent + Maintenance Oracle Agent: condition monitoring + x402 service booking. |

**Milestone**: All 6 agents functional. x402 streaming payments flowing on Testnet (end-to-end test).

---

### Week 3 (Days 15â€“21): UI & Integration

| Day | Task |
|---|---|
| 15â€“16 | Onboarding flow (4 screens). Vision Agent integrated. |
| 17 | Live streaming dashboard (Screen 3). CSPR.cloud SSE integration. |
| 18 | Marketplace (renter view). CSPR.click booking flow. |
| 19 | Fractional Investment Marketplace (Screen 4). |
| 20 | Maintenance Oracle prompt (Screen 5). Agent log drawer. |
| 21 | End-to-end flow: photo â†’ mint â†’ loan â†’ rental â†’ x402 stream â†’ repayment. Full test. |

**Milestone**: Complete product flow working on Testnet. All 5 screens functional.

---

### Week 4 (Days 22â€“30): Polish + Submission

| Day | Task |
|---|---|
| 22â€“23 | UI animations: earning pulse, carbon credit flash, agent log scroll. |
| 24 | GitHub repo: clean README, setup instructions, architecture diagram. |
| 25â€“26 | Record demo video (follow Section 18 script exactly). |
| 27 | Public Testnet deploy. Test from a fresh wallet (not localhost). |
| 28â€“29 | Community voting: share on Casper Discord, Telegram, DoraHacks. Engage community. |
| 30 | **Submit on DoraHacks before midnight UTC.** |

---

## 18. Hackathon Demo Script

**Total video length: under 5 minutes.**

---

**[0:00â€“0:25] The Problem**  
*Screen: Global map with asset idle statistics overlaid*

> "There is $17 trillion in idle productive equipment on earth right now.  
> Excavators in Ghana. Fishing vessels in Norway. Camera rigs in Berlin. Generators in Texas.  
> All sitting still. All earning zero.  
> And the owners of these assets can't get a bank loan against them because the bank can't see them.  
> What if the asset itself could solve this?"

---

**[0:25â€“1:05] The Photo-to-Loan Flow (WOW 1)**  
*Screen: Camera viewfinder â†’ AI detection â†’ step 3 checkmarks â†’ loan offer*

> "I photograph my Komatsu excavator.  
> The AI Vision Agent identifies it in 4 seconds â€” make, model, condition score 82, value $84,000.  
> It creates an on-chain identity for my excavator on Casper Network.  
> And now: 54,880 CSPR â€” about $63,000 â€” is offered to me instantly.  
> No bank. No forms. No 30-day wait.  
> I press one button. The funds are in my wallet."

*[Show the funds arriving. Pause 3 seconds.]*

---

**[1:05â€“2:00] The Live Streaming Income (WOW 2 â€” the centerpiece)**  
*Screen: Full-screen live streaming dashboard. Let it run. Say almost nothing.*

> "Now watch this.  
> A construction startup in Frankfurt just booked my excavator for 3 days.  
> This is what that looks like."

*[30 seconds of silence. Let the CSPR counter climb. Let the teal pulse breathe. Let the agent log scroll.]*

> "That's 0.068 CSPR landing in my wallet every 60 seconds.  
> The Collector Agent is splitting it automatically: 64% to me, 30% to repay my loan, 6% protocol fee.  
> That loan repayment bar you see â€” it's moving on its own.  
> My excavator is paying off its own loan.  
> I have not touched my phone."

---

**[2:00â€“2:30] The Maintenance Oracle (WOW 3)**  
*Screen: Maintenance prompt notification*

> "Here's something no physical asset has ever done before.  
> The Maintenance Oracle Agent calculated that my camera kit needs sensor calibration in 3 operating hours.  
> It found the nearest qualified service center in London. Got a quote: $210.  
> It's asking me: 'Book it and pay for it automatically?'  
> I press yes.  
>  
> My camera just scheduled and paid for its own maintenance.  
> Using x402 â€” Casper's machine-to-machine payment protocol.  
> The service record is now on-chain permanently."

---

**[2:30â€“3:10] Fractional Co-Ownership**  
*Screen: Fractional investment marketplace*

> "For high-value assets â€” this marine vessel here, listed at $184,000 â€”  
> we enable fractional co-ownership.  
> 1,000 shares at $184 each. Buy one share. Earn $33 per month in streaming CSPR income.  
> Proportional streaming income â€” not dividends declared quarterly, not manual payouts.  
> Streaming. Every rental session automatically distributes to every shareholder.  
> This is the fractional asset economy, running on Casper."

---

**[3:10â€“3:30] Carbon Credits**  
*Screen: Carbon credit counter on dashboard*

> "And every rental session issues a Carbon Use Credit â€” a Casper NFT.  
> Because every time someone rents instead of buys, they prevent a new machine from being manufactured.  
> We're building a permanent on-chain ledger of the sharing economy's environmental impact.  
> Verifiable. Tradeable on CSPR.trade."

---

**[3:30â€“4:10] Casper Technology Stack**  
*Screen: Architecture diagram*

> "Everything in this product is built from Casper's own ecosystem:  
> â€” Odra Framework for 5 smart contracts, all upgradable  
> â€” x402 micropayments â€” used in two novel ways: agents paying oracles, and streaming income  
> â€” Casper MCP Server and CSPR.trade MCP for all blockchain queries  
> â€” CSPR.click for all wallet operations  
> â€” CSPR.cloud Streaming API for the live income counter  
> â€” casper-eip-712 for gasless rental agreements  
> â€” ERC-3643 aligned tokens for institutional fractional ownership  
>  
> Every single Casper AI Toolkit component is used. Not as a demo â€” as infrastructure."

---

**[4:10â€“4:30] The Vision**  
*Screen: Dashboard, all assets earning*

> "Casper proved that physical assets belong on-chain with Parking Blox.  
> Asset402 is the universal engine for that vision.  
> Every productive asset on earth.  
> One photo. Six agents. Earning autonomously.  
> On Casper."

---

## 19. Business Model

### Revenue Streams

| Revenue Source | Mechanism | Rate |
|---|---|---|
| **Streaming Protocol Fee** | 6% of every x402 rental payment (auto-split by Collector Agent) | Per minute of active rental |
| **Loan Origination Fee** | 1% of loan amount, at disbursement | Per loan |
| **Fractional Listing Fee** | 0.5% of total capital raised | At raise close |
| **Carbon Credit Fee** | 2% of CUC minting volume | Per carbon credit issued |
| **Listing Premium** | Boosted marketplace placement | Fixed CSPR per 7-day boost |
| **Oracle API Revenue** | Third-party apps can query Asset402's on-chain asset condition data via x402 | Per API call |

### Unit Economics (Single Excavator, 30 Days, 18 Rental Days)

```
Rental rate:          0.068 CSPR/min Ã— 60min Ã— 8 hrs = 32.64 CSPR/day
Monthly rental:       32.64 Ã— 18 = 587.5 CSPR
Protocol fee (6%):    35.3 CSPR
Owner earnings (64%): 376.0 CSPR
Loan repayment (30%): 176.3 CSPR â†’ loan clears in ~52 rental days
```

### Market Opportunity

- Global equipment leasing market: **$900B+**
- Informal peer-to-peer equipment rental (undigitized): **~$180B**
- Global SME financing gap: **$8.1 trillion**
- If Asset402 captures 0.1% of informal equipment rental volume: **$180M annual GMV**
- At 6% protocol fee: **$10.8M annual protocol revenue** at 0.1% market capture

---

## 20. Long-Term Roadmap

| Phase | Timeline | Milestone |
|---|---|---|
| **Phase 0 â€” Buildathon** | June 2026 | Prototype: 5 asset types, Testnet, all 6 agents, streaming payments |
| **Phase 1 â€” Mainnet** | Q3 2026 | Casper Mainnet launch; first 500 real assets registered |
| **Phase 2 â€” ERC-3643** | Q4 2026 | Full ERC-3643 compliance as Casper ships it; institutional fractional investors onboarded |
| **Phase 3 â€” Gasless** | Q1 2027 | When Casper ships gasless transactions: remove ALL gas friction for renters |
| **Phase 4 â€” Transaction Privacy** | Q3 2027 | Confidential rental terms for commercial/industrial assets using Casper's privacy layer |
| **Phase 5 â€” Agent Marketplace** | 2027 | Third-party specialized agents (Maritime Guardian, Agricultural Risk Agent) licensed on Asset402 |
| **Phase 6 â€” Carbon Exchange** | 2028 | Asset402 CUC (Carbon Use Credits) listed on voluntary carbon exchanges via Casper bridge |

---

## 21. Appendix â€” Design System & API Reference

### CSS Design Tokens

```css
:root {
  /* Backgrounds */
  --ap-bg-primary:      #0D0E14;
  --ap-bg-surface:      #161820;
  --ap-bg-elevated:     #1E2030;

  /* Brand */
  --ap-red:             #E5172F;   /* Casper Red Â· primary CTA only */
  --ap-teal:            #00D4AA;   /* Live / Earning Â· only pulsing color */
  --ap-teal-glow:       rgba(0, 212, 170, 0.15);
  --ap-carbon-green:    #4ADE80;   /* Carbon credit events */

  /* Text */
  --ap-text-primary:    #F2F4F8;
  --ap-text-secondary:  #8A94A6;
  --ap-text-muted:      #4A5268;

  /* Status */
  --ap-success:         #22C55E;
  --ap-warning:         #F59E0B;
  --ap-danger:          #EF4444;

  /* Typography */
  --ap-font-display:    'DM Sans', 'Inter', sans-serif;
  --ap-font-body:       'Inter', sans-serif;
  --ap-font-mono:       'JetBrains Mono', monospace;

  /* Borders */
  --ap-border:          rgba(255,255,255,0.06);
  --ap-border-focus:    rgba(0, 212, 170, 0.4);
}
```

### Earning Pulse Animation

```css
@keyframes earning-pulse {
  0%   { box-shadow: 0 0 0px 0px var(--ap-teal-glow); opacity: 1; }
  50%  { box-shadow: 0 0 28px 10px var(--ap-teal-glow); opacity: 0.85; }
  100% { box-shadow: 0 0 0px 0px var(--ap-teal-glow); opacity: 1; }
}

@keyframes carbon-flash {
  0%   { color: var(--ap-text-primary); }
  30%  { color: var(--ap-carbon-green); }
  100% { color: var(--ap-text-primary); }
}

.streaming-live { animation: earning-pulse 1.6s ease-in-out infinite; }
.carbon-event   { animation: carbon-flash 1.2s ease-out; }
```

---

### Repository Structure

```
Asset402/
â”œâ”€â”€ README.md                    # Setup + architecture + quick-start
â”œâ”€â”€ contracts/                   # Odra smart contracts (Rust)
â”‚   â”œâ”€â”€ asset_registry/          # Core RWA NFT contract
â”‚   â”œâ”€â”€ lending_pool/            # DeFi lending contract
â”‚   â”œâ”€â”€ fractional_token/        # ERC-3643 aligned co-ownership
â”‚   â”œâ”€â”€ rental_escrow/           # Rental + casper-eip-712
â”‚   â””â”€â”€ carbon_use_credit/       # CUC NFT contract
â”œâ”€â”€ agents/                      # Six AI agents (Node.js)
â”‚   â”œâ”€â”€ orchestrator.js          # State machine + routing
â”‚   â”œâ”€â”€ vision-agent.js          # Moondream2 + x402 oracle
â”‚   â”œâ”€â”€ risk-agent.js            # Casper MCP + CSPR.trade MCP
â”‚   â”œâ”€â”€ listing-agent.js         # Dynamic pricing + demand surge
â”‚   â”œâ”€â”€ collector-agent.js       # x402 streaming + multi-party split
â”‚   â”œâ”€â”€ guardian-agent.js        # Condition monitoring + CUC issuance
â”‚   â”œâ”€â”€ maintenance-oracle.js    # Predict + auto-book + x402 pay
â”‚   â””â”€â”€ x402-client.js           # Shared x402 HTTP client
â”œâ”€â”€ frontend/                    # Next.js 14
â”‚   â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ StreamingDashboard.tsx    # Screen 3 â€” THE WOW SCREEN
â”‚   â”‚   â”œâ”€â”€ AgentActivityFeed.tsx     # Terminal-style agent log
â”‚   â”‚   â”œâ”€â”€ OnboardingFlow.tsx        # 4-step photo â†’ mint
â”‚   â”‚   â”œâ”€â”€ FractionalMarket.tsx      # Investment marketplace
â”‚   â”‚   â”œâ”€â”€ MaintenancePrompt.tsx     # Auto-book approval UI
â”‚   â”‚   â””â”€â”€ AssetCard.tsx             # Dashboard asset cards
â”‚   â””â”€â”€ hooks/
â”‚       â”œâ”€â”€ useWallet.js              # CSPR.click integration
â”‚       â”œâ”€â”€ useStreamingIncome.js     # CSPR.cloud SSE â†’ live counter
â”‚       â””â”€â”€ useRentalAgreement.js     # casper-eip-712 signing
â”œâ”€â”€ backend/                     # Bun + Hono
â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â”œâ”€â”€ assets.js
â”‚   â”‚   â”œâ”€â”€ rentals.js
â”‚   â”‚   â””â”€â”€ agents.js
â”‚   â””â”€â”€ webhooks/
â”‚       â””â”€â”€ x402-stream.js
â””â”€â”€ docs/
    â”œâ”€â”€ architecture.md
    â”œâ”€â”€ agent-specs.md
    â””â”€â”€ demo-setup.md
```

---

### Complete API Reference

| Service | URL | Used For |
|---|---|---|
| Casper Testnet Node | `https://integration-test.cspr.live` | Contract deployment |
| Testnet Explorer | `https://testnet.cspr.live` | Verify transactions |
| Testnet Faucet | `https://testnet.cspr.live/tools/faucet` | Get test CSPR |
| CSPR.cloud REST | `https://event-store-api-clarinet-08.devxdao.com` | Asset/transfer data |
| CSPR.cloud SSE | `.../events/main` | Real-time transfer events |
| x402 Facilitator | `https://x402-facilitator.cspr.cloud` | Payment verification |
| x402 Examples | `https://github.com/make-software/casper-x402` | Reference code |
| x402 User Guide | `.../docs/user-guide.md` | Integration guide |
| CSPR.trade MCP | `https://mcp.cspr.trade` | Price + DEX data |
| Casper MCP Server | See docs.cspr.cloud/agentic-tools | Blockchain queries |
| Odra Docs | `https://odra.dev/docs/` | Contract development |
| Odra llms.txt | `https://odra.dev/llms.txt` | AI contract generation |
| CSPR.click Docs | `https://docs.cspr.click` | Wallet SDK |
| CSPR.click AI Skills | `https://docs.cspr.click/documentation/ai-agent-skills` | Agent wallet ops |
| casper-eip-712 | `https://github.com/casper-ecosystem/casper-eip-712` | Gasless signing |
| Casper Manifest | `https://casper.network/news/manifest` | Strategic alignment |
| Casper AI Page | `https://www.casper.network/ai` | Toolkit overview |
| DoraHacks Submit | `https://dorahacks.io` | Final submission |

---

*Asset402 â€” Built for Casper Agentic Buildathon 2026*  
*"Every idle asset is a sleeping economy. Wake it up."*

