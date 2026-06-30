# Asset402 â€” Product Requirements Document
### *The Autonomous Idle Asset Monetization Protocol on Casper*

---

> **Version:** 1.0  
> **Status:** Buildathon-Ready  
> **Target:** Casper Agentic Buildathon 2026 â€” Qualification + Final Round  
> **Tagline:** *Your idle assets. Earning. Autonomously.*

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Problem](#2-the-problem)
3. [The Solution](#3-the-solution)
4. [Why This Wins â€” Competitive Differentiation](#4-why-this-wins)
5. [Why Casper and Only Casper](#5-why-casper-and-only-casper)
6. [Target Users](#6-target-users)
7. [Core Features](#7-core-features)
8. [UX Architecture â€” The Heart of This Product](#8-ux-architecture)
9. [Agent Architecture â€” The Five Agents](#9-agent-architecture)
10. [Smart Contract Architecture (Odra)](#10-smart-contract-architecture)
11. [x402 Streaming Payment Integration](#11-x402-streaming-payment-integration)
12. [MCP Server Integration](#12-mcp-server-integration)
13. [CSPR Ecosystem Technology Map](#13-cspr-ecosystem-technology-map)
14. [How to Use Casper Developer Docs](#14-how-to-use-casper-developer-docs)
15. [Frontend Tech Stack](#15-frontend-tech-stack)
16. [Development Milestones (4 Weeks)](#16-development-milestones)
17. [Hackathon Demo Script](#17-hackathon-demo-script)
18. [Business Model](#18-business-model)
19. [Long-Term Roadmap](#19-long-term-roadmap)
20. [Appendix â€” Design Tokens & API References](#20-appendix)

---

## 1. Executive Summary

**Asset402** is an autonomous, multi-agent protocol on Casper Network that transforms idle physical productive assets â€” machinery, generators, vehicles, studio equipment, farming tools â€” into live, yield-bearing DeFi positions. The owner photographs their asset once. Five specialized AI agents take over everything else: registration as a Real-World Asset (RWA) token, dynamic pricing, DeFi-backed collateral lending, real-time x402 micropayment streaming during rental use, and continuous guardian monitoring.

The core innovation is the **streaming micropayment rental model**: as equipment is being used by a renter, CSPR flows from the renter to the owner wallet automatically, per-minute, using Casper's native x402 protocol. No invoice. No 30-day wait. No bank. Just a number climbing on your screen while your asset works.

This is the first protocol to:
- Enable **real-time physical-asset-to-DeFi income streaming** using x402 micropayments
- Use **5 coordinated AI agents** to autonomously run the entire asset lifecycle â€” from onboarding to repayment
- **Generalize Casper's own Parking Blox concept** (physical asset revenue on-chain) to every productive idle asset class
- Deploy **upgradable Odra smart contracts** that allow the AI valuation model to update asset collateral values without redeploying contracts

---

## 2. The Problem

### The Market Gap No One Is Talking About

There are an estimated **2+ billion productive physical assets** globally â€” excavators, CNC machines, generators, tractors, studio cameras, clinic equipment, food trucks â€” sitting idle between **50% and 70% of the time**. The owners of these assets have a problem that is both invisible and enormous:

| Pain Point | Reality |
|---|---|
| Idle time waste | A $120,000 excavator earns $0 sitting in a yard overnight and on weekends |
| No access to liquidity | Banks won't finance against assets they can't verify, inspect, or monitor |
| Manual rental overhead | Finding renters, negotiating rates, collecting payments = full-time job |
| No yield while idle | Unlike financial assets, physical assets don't compound or self-monetize |
| No digital proof of existence | Millions of productive assets exist with zero digital footprint |

### Who Suffers Most?

- **Micro-entrepreneurs in emerging markets** (India, Southeast Asia, West Africa, Brazil) with 1â€“5 pieces of equipment
- **Small contractors** with specialized tools used only intermittently
- **Farmers** with seasonal machinery
- **Creatives** with expensive gear (cameras, audio equipment, 3D printers)

The global equipment leasing market is **$900B+**. Yet the informal, peer-to-peer layer of this market â€” the $50/day generator rental, the $80/hour crane hire, the freelance studio session â€” is entirely analog, cash-based, trust-dependent, and inaccessible to DeFi.

### The DeFi Lender Gap

Simultaneously, DeFi liquidity providers on Casper are earning yield from pure crypto collateral, when they could be earning yield backed by **real-world productive assets** â€” assets that generate cash flow independent of token price movements. There is no protocol today on Casper that lets a DeFi lender say: "Loan this farmer $3,000 against his tractor, and collect repayment from his rental income automatically."

---

## 3. The Solution

### Asset402: One Photo. Five Agents. Autonomous Income.

The user experience has one central moment of brilliance:

**You photograph your asset. Asset402 does the rest.**

Here is what happens after that photograph is taken:

```
ðŸ“¸ Owner takes photo
        â”‚
        â–¼
ðŸ¤– Vision Agent identifies & values the asset (AI computer vision)
        â”‚
        â–¼
ðŸ“‹ Risk Agent scores the asset (type, age, condition, market data)
        â”‚
        â–¼
ðŸª™ RWA Token minted on Casper via Odra smart contract
        â”‚
        â–¼
ðŸ’° DeFi Loan offered instantly (up to 70% LTV against the token)
        â”‚
        â–¼
ðŸ“£ Listing Agent publishes idle hours to rental marketplace
        â”‚
        â–¼
ðŸ”„ Renter books â†’ x402 streams CSPR per-minute to owner wallet
        â”‚
        â–¼
ðŸ‘ï¸ Guardian Agent checks asset condition every 72 hours
        â”‚
        â–¼
âœ… Loan auto-repaid from rental earnings via smart contract
```

Every step is autonomous. The owner does not initiate a single transaction manually after the first photograph.

---

## 4. Why This Wins

### What Makes This Irreplaceable at the Hackathon

Most submissions will be one of four things from the example builds list: a yield router, an oracle agent, a DAO governance bot, or a KYC agent. None of those have a **clear, emotional UX story**. None of them have a **single WOW moment** a judge can point to.

Asset402 has one: **"Watch this tractor earn $0.018 CSPR every 60 seconds while it's being used â€” no human doing anything."**

That is the demo. That is the news headline. That is the "wow."

### The Parking Blox Superpower

Casper's most prominent live mainnet RWA project is **Parking Blox** by AmeriCorp â€” which puts **parking revenue on-chain**, creating a verifiable performance record for tokenizing parking assets. The Casper homepage features it prominently. Judges know it well. They are proud of it.

Asset402 is what happens when you take the Parking Blox concept and:
1. Make it apply to **any** physical asset, not just parking
2. Add **AI agents** so it runs completely autonomously
3. Add **streaming micropayments** (x402) so income is real-time, not batched
4. Add **DeFi collateralization** so owners get liquidity before rental income arrives
5. Add **a guardian agent** that keeps the on-chain asset record updated perpetually

The judges will immediately connect the dots. This is the **next evolution of what they already built and believe in**.

### Anti-Herd Checklist

| Common Hackathon Submission | Asset402 |
|---|---|
| Yield router (listed in examples) | âŒ Not this |
| RWA Oracle agent (listed in examples) | âŒ Not this |
| DAO multi-agent (listed in examples) | âŒ Not this |
| KYC/Compliance agent (listed in examples) | âŒ Not this |
| Another generic DeFi dashboard | âŒ Not this |
| Physical asset streaming economy | âœ… This |

---

## 5. Why Casper and Only Casper

This protocol **cannot be meaningfully built on Ethereum, Solana, or any other chain** with the same elegance. Here is why:

### x402 Micropayments
Casper is the **only WebAssembly-native Layer 1 with live HTTP-based micropayment infrastructure** for AI agents (x402 launched on mainnet June 4, 2026). Streaming per-minute rental payments using x402 is architecturally native to Casper. On Ethereum, the gas cost of per-minute settlement would destroy the economics.

### Predictable Fees
Casper charges **fixed, chainspec-defined costs** per operation. The AI agents managing hundreds of micropayment streaming transactions per day can precisely budget their operational costs. This is impossible on Ethereum (fee auctions) or Solana (variable compute fees). An agent that cannot predict transaction costs cannot run autonomously.

### Upgradable Smart Contracts
When the AI Vision Agent improves its valuation model (e.g., a better crop pricing oracle launches), the RWA token contract must reflect the new value. Casper's **upgradable contract model** lets the Guardian Agent update asset metadata and collateral ratios without burning the RWA token and redeploying. This is native on Casper; on Ethereum it requires proxy patterns and introduces significant security risk.

### Deterministic Finality
When a renter's x402 payment lands, the asset owner must know with certainty that the payment is final â€” not probabilistic. Casper's Zug consensus provides **deterministic finality**. There is no "wait 12 blocks" logic needed in the streaming payment agent. Confirmed means confirmed.

### ERC-3643 Alignment
Casper is actively implementing ERC-3643 (compliant security tokens). Equipment RWA tokens in Asset402 are **pre-aligned with this standard** â€” meaning the same token architecture will gain institutional-grade compliance tooling as the Manifest rolls out. Judges will see this as building for Casper's regulated future, not just the hackathon.

### Account Abstraction
Casper's unified account/contract model lets AI agents hold their own on-chain identities with programmable spending limits. The Listing Agent, Guardian Agent, and Collector Agent each operate as **autonomous economic actors** on Casper â€” without a human wallet countersigning every action.

---

## 6. Target Users

### Primary: Asset Owners (Supply Side)
- Small contractors and construction companies
- Farmers with seasonal machinery
- Photographers, videographers, sound engineers with idle gear
- Clinic and lab equipment owners
- Food truck and hospitality equipment owners

**Profile:** 28â€“55 years old, mobile-first, limited DeFi experience, high trust deficit with banks, owns 1â€“10 productive assets valued $500â€“$150,000.

**Job to be done:** "I have an asset that isn't working 100% of the time. I want it to earn money while I'm not using it, without becoming a full-time rental manager."

### Secondary: Renters (Demand Side)
- Freelancers who need equipment for short-term projects
- Micro-businesses scaling intermittently
- Startups that can't afford ownership

**Job to be done:** "I need a specific piece of equipment for 3 days next week. I don't want to buy it. I want to find, pay, and return it as frictionlessly as possible."

### Tertiary: DeFi Lenders
- CSPR holders seeking real-world yield
- Liquidity providers on CSPR.trade looking for uncorrelated returns

**Job to be done:** "I want yield that doesn't correlate to crypto market movements. I want it backed by real assets that generate real cash flow."

---

## 7. Core Features

### Feature Set A â€” Asset Owner (Supply)

**A1. Visual Asset Onboarding**  
Owner photographs asset using the mobile interface. The Vision Agent (via AI computer vision model) identifies the asset type, estimates make/model/age, and returns a USD market value estimate. Owner confirms or corrects details. No manual form-filling needed.

**A2. RWA Token Minting**  
On confirmation, the Odra-based RWA NFT contract mints a unique token on Casper Testnet representing the asset. The token stores: asset type, owner wallet, current valuation, condition score, and idle schedule. This is the on-chain proof of asset existence.

**A3. Instant DeFi Liquidity**  
After minting, the protocol's Lending Pool smart contract offers the owner a collateralized loan up to 70% LTV. Funds are disbursed in CSPR directly to the owner wallet, immediately, via CSPR.click integration. No bank approval. No paperwork.

**A4. Automated Rental Listing**  
The Listing Agent automatically publishes the asset's idle schedule to the in-app marketplace, with AI-generated pricing based on asset type, local demand signals, and comparable rentals.

**A5. Real-Time x402 Income Dashboard**  
During an active rental, a live dashboard shows the owner's CSPR balance increasing in real-time as x402 micropayments stream from the renter. The owner can see: current streaming rate (CSPR/hour), total earned this session, loan repayment progress, and agent activity log.

**A6. Guardian Check-In Requests**  
Every 72 hours (configurable), the Guardian Agent sends a push notification prompting the owner for a quick photo update of the asset condition. The photo is run through AI analysis and updates the on-chain asset metadata via the upgradable contract. This maintains asset record accuracy over time.

### Feature Set B â€” Renter (Demand)

**B1. Marketplace Discovery**  
Mobile-first search/filter by asset type, location radius, availability date, and price range. Each listing shows the asset's on-chain reputation (rental history, return rate, condition history) alongside photos and description.

**B2. Frictionless Booking**  
Renter connects CSPR wallet via CSPR.click, selects time window, and approves an x402 payment stream. A gasless approval (via casper-eip-712) signs the rental agreement off-chain. The actual CSPR streams only while the rental window is active.

**B3. Stream-to-Use Payment**  
During the rental window, x402 micropayments debit the renter's wallet per-minute and credit the owner. If the renter ends the rental early, streaming stops immediately. No refund request needed. No dispute resolution for partial use.

**B4. On-Chain Rental Receipt**  
At rental completion, a transaction is recorded on Casper (via CSPR.cloud) as the verifiable rental record, contributing to both the asset's and renter's on-chain reputation scores.

### Feature Set C â€” DeFi Lender

**C1. Liquidity Pool Deposits**  
Lenders deposit CSPR into the Asset402 Lending Pool contract. They receive interest-bearing pool tokens representing their share.

**C2. Portfolio Dashboard**  
Shows active loans, asset types, health factors (current LTV vs liquidation threshold), projected APY, and repayment progress.

**C3. Autonomous Repayment Routing**  
The Collector Agent automatically routes a portion of each x402 rental payment stream to loan repayment. Lenders never need to chase borrowers. The contract handles it.

---

## 8. UX Architecture

> **Design Philosophy:** *Blockchain invisible. Asset visible. Income undeniable.*
>
> The UX principle that runs through every screen is borrowed directly from Casper's Manifest: "For users, blockchain should be invisible. One tap. Done." Asset402's interface never shows the user a wallet address, a gas price, or a contract hash unless they specifically drill down into the activity log. What they see is their asset, its status, and their earnings.

### 8.1 Design Language

The UI should be designed to feel at home in Casper's ecosystem. Based on Casper Network's visual identity:

**Color Palette:**
```
Primary Dark:    #0D0E14   (near-black background, Casper dark)
Surface:         #161820   (card backgrounds)
Elevated:        #1E2030   (modal, input backgrounds)
Brand Red:       #E5172F   (Casper red â€” primary CTA only)
Accent Teal:     #00D4AA   (live/streaming states â€” earning animation)
Text Primary:    #F2F4F8   (white text)
Text Secondary:  #8A94A6   (muted labels)
Success:         #22C55E   (confirmed payments, healthy status)
Warning:         #F59E0B   (check-in due, low balance)
Earning Glow:    rgba(0, 212, 170, 0.15)  (pulse animation during streaming)
```

**Typography:**
- Headings: `Inter Display` or `DM Sans` â€” clean, modern, heavy weight for key numbers
- Body: `Inter` â€” consistent with Casper's documentation aesthetic
- Monospace: `JetBrains Mono` â€” for contract addresses, hash previews, transaction IDs

**Motion Language:**
- **Earning Pulse**: When an x402 stream is live, the balance counter increments with a soft teal glow pulse every time a payment lands. This is the single most emotionally impactful animation in the product.
- **Agent Activity Feed**: Scrolling real-time log of what agents are doing, styled like a terminal with teal text on dark background
- **Status Transitions**: Smooth `200ms ease-out` for all state changes

---

### 8.2 Key Screens

#### Screen 1: Landing / Dashboard (Owner)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  â—† Asset402          [Wallet: 01a3...f8e2] âš™  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                  â”‚
â”‚  Good morning, Priya.                            â”‚
â”‚  Your assets earned:                             â”‚
â”‚                                                  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”            â”‚
â”‚  â”‚  â†‘ 14.32 CSPR  â€¢  last 24 hours  â”‚  â—LIVE   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜            â”‚
â”‚                                                  â”‚
â”‚  MY ASSETS (3)                                   â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚  â”‚ ðŸšœ  Mahindra 575 DI Tractor             â”‚    â”‚
â”‚  â”‚     Rented â€” streaming now  â—            â”‚    â”‚
â”‚  â”‚     +0.034 CSPR/min  â€¢  Loan: 67% repaidâ”‚    â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚  â”‚ ðŸ“·  Sony FX3 Cinema Camera              â”‚    â”‚
â”‚  â”‚     Idle â€” Listed on marketplace        â”‚    â”‚
â”‚  â”‚     Next available: Tomorrow 9am         â”‚    â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚  â”‚ âš¡  Honda 7.5kW Generator              â”‚    â”‚
â”‚  â”‚     Guardian check-in due ðŸ””            â”‚    â”‚
â”‚  â”‚     Tap to complete (2 min)              â”‚    â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
â”‚                                                  â”‚
â”‚       [ + Register New Asset ]                   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Design Notes:**
- The live streaming card has a continuous teal pulse behind the CSPR number
- The "LIVE" badge has a breathing animation (scale 1.0â†’1.05, opacity 1.0â†’0.7, loop)
- The loan repayment progress bar fills autonomously as the stream runs
- Single CTAs â€” no jargon, no "mint NFT," no "execute smart contract"

---

#### Screen 2: Asset Onboarding Flow (The WOW Sequence)

This is a 4-step guided flow. It must feel like opening a bank account â€” not deploying a smart contract.

```
STEP 1 OF 4                                       
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Take a photo of your asset

  [    CAMERA VIEWFINDER    ]
  [                         ]
  [    â† Point at asset â†’   ]
  [                         ]

  Tip: Include the whole machine in frame.
  Outdoor lighting works best.

           [ ðŸ“¸ Take Photo ]
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

STEP 2 OF 4 â€” AI is analyzing... (1â€“3 seconds)    
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  âœ“ Asset Detected

  Type:    Agricultural Tractor
  Make:    Mahindra
  Model:   575 DI (est.)
  Age:     2017â€“2020 (est.)
  
  Estimated Market Value:  $8,200 â€“ $9,800 USD

  Condition Score: 78/100 (Good)

  Is this right?  [ Yes, continue ] [ Adjust ]
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

STEP 3 OF 4 â€” Your Asset Token                    
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  We're creating your asset's on-chain identity

  ðŸ”„ Minting RWA Token on Casper... âœ“
  ðŸ”„ Setting up loan eligibility...  âœ“  
  ðŸ”„ Publishing to marketplace...    âœ“

  All done. Your tractor is live.
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

STEP 4 OF 4 â€” Unlock Instant Funds?               
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  Your tractor qualifies for:

  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚   Up to  6,440 CSPR  instant loan   â”‚
  â”‚   (70% LTV Â· repaid from rentals)   â”‚
  â”‚   Est. repaid in: 18 rental days    â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

  [ Get Funds Now ]   [ Skip for now ]
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
```

**Design Notes:**
- Step 3 has a satisfying sequential checkmark animation â€” each task completes before the next starts, but all complete in under 3 seconds total
- Step 4's "Get Funds Now" button is Casper Red â€” the only red CTA in the entire onboarding
- Blockchain terms are completely absent â€” "mint RWA Token" is shown as "create your asset's on-chain identity"

---

#### Screen 3: Live Rental Streaming View (THE WOW SCREEN)

This is the screen that wins the hackathon. It should be shown full-screen in the demo video.

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  â† Back          ðŸšœ Mahindra Tractor      â—LIVE  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚                                          â”‚   â”‚
â”‚  â”‚    STREAMING INCOME                       â”‚   â”‚
â”‚  â”‚                                          â”‚   â”‚
â”‚  â”‚         +14.892 CSPR                     â”‚   â”‚
â”‚  â”‚         â†‘ updating live                  â”‚   â”‚
â”‚  â”‚                                          â”‚   â”‚
â”‚  â”‚    Rate: 0.034 CSPR / minute             â”‚   â”‚
â”‚  â”‚    Session: 7h 18m active                â”‚   â”‚
â”‚  â”‚                                          â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚                    â† teal pulse glow â†’           â”‚
â”‚                                                  â”‚
â”‚  LOAN REPAYMENT                                  â”‚
â”‚  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘â–‘  78%                â”‚
â”‚  6,440 CSPR borrowed Â· 1,417 CSPR remaining     â”‚
â”‚  Est. fully repaid: 14 more rental days          â”‚
â”‚                                                  â”‚
â”‚  AGENT ACTIVITY FEED                            â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚ > x402 stream confirmed      0.034 CSPR  â”‚   â”‚
â”‚  â”‚ > Loan repayment routed      0.010 CSPR  â”‚   â”‚
â”‚  â”‚ > Owner credited             0.024 CSPR  â”‚   â”‚
â”‚  â”‚ > Risk Agent: LTV healthy    67.3%       â”‚   â”‚
â”‚  â”‚ > Next guardian check:       in 71h      â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚                                                  â”‚
â”‚  RENTER: Arjun S.   â˜…â˜…â˜…â˜…â˜… (22 rentals)         â”‚
â”‚  Started: 08:42 AM Â· Ends: Est. 5:00 PM         â”‚
â”‚                                                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Design Notes:**
- The CSPR number increments in real-time using a counter animation (every 60s on the dot, a new amount ticks up with a pulse)
- The Agent Activity Feed scrolls like a live terminal log
- The loan repayment bar visibly updates after each payment
- Everything is pulling from `CSPR.cloud` streaming API in real-time

---

#### Screen 4: Marketplace (Renter View)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Find Equipment                    ðŸ”  [Filter]  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  ðŸ“ Within 25 km Â· Available Tomorrow            â”‚
â”‚                                                  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”‚
â”‚  â”‚ ðŸšœ  Mahindra 575 DI Tractor           â”‚      â”‚
â”‚  â”‚     â˜… 4.9 Â· 34 rentals on-chain       â”‚      â”‚
â”‚  â”‚     Available: Tomorrow 6am â€“ 6pm     â”‚      â”‚
â”‚  â”‚     0.034 CSPR/min (~$1.80/hr)        â”‚      â”‚
â”‚  â”‚                 [ Book Now ]           â”‚      â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â”‚
â”‚                                                  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”‚
â”‚  â”‚ âš¡  Honda Generator 7.5kW             â”‚      â”‚
â”‚  â”‚     â˜… 4.7 Â· 12 rentals on-chain       â”‚      â”‚
â”‚  â”‚     Available: Jun 27â€“29              â”‚      â”‚
â”‚  â”‚     0.019 CSPR/min (~$1.00/hr)        â”‚      â”‚
â”‚  â”‚                 [ Book Now ]           â”‚      â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â”‚
â”‚                                                  â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”‚
â”‚  â”‚ ðŸ“·  Sony FX3 Cinema Camera            â”‚      â”‚
â”‚  â”‚     â˜… 5.0 Â· 8 rentals on-chain        â”‚      â”‚
â”‚  â”‚     Available: Today 2pm â€“ 10pm       â”‚      â”‚
â”‚  â”‚     0.052 CSPR/min (~$2.75/hr)        â”‚      â”‚
â”‚  â”‚                 [ Book Now ]           â”‚      â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Design Notes:**
- On-chain reputation ("34 rentals on-chain") is the key trust signal â€” this is Casper's strength
- Pricing shown in both CSPR and approximate fiat for accessibility
- "Book Now" starts the CSPR.click wallet connection flow with a single tap

---

#### Screen 5: DeFi Lender Portfolio

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  â—† Lend Capital          Pool Overview           â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                  â”‚
â”‚  Your Position                                   â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚  â”‚  Deposited:   45,000 CSPR                â”‚   â”‚
â”‚  â”‚  Earning:     12.4% APY (real assets)    â”‚   â”‚
â”‚  â”‚  Accrued:     +1,247 CSPR since deposit  â”‚   â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚                                                  â”‚
â”‚  ACTIVE LOANS (3)                                â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€  â”‚
â”‚  ðŸšœ Mahindra Tractor Â· Priya K.                 â”‚
â”‚     LTV: 67.3% Â· Health: â—Good                  â”‚
â”‚     Repayment: â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘ 78%                  â”‚
â”‚                                                  â”‚
â”‚  ðŸ“· Sony FX3 Camera Â· Rohan M.                  â”‚
â”‚     LTV: 61.0% Â· Health: â—Good                  â”‚
â”‚     Repayment: â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘ 61%                  â”‚
â”‚                                                  â”‚
â”‚  âš¡ Generator 7.5kW Â· Anita P.                   â”‚
â”‚     LTV: 54.2% Â· Health: â—Good                  â”‚
â”‚     Repayment: â–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘â–‘â–‘ 41%                  â”‚
â”‚                                                  â”‚
â”‚    [ + Add Liquidity ]   [ Withdraw ]            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

### 8.3 UX Principles Governing Every Screen

1. **No "connect wallet" gates on information.** Marketplace listings are visible without connecting. Connection only triggers on "Book Now" or "Get Funds."
2. **One primary action per screen.** Every screen has exactly one prominent CTA. Supporting actions are secondary.
3. **Earn in CSPR, show in fiat.** All earning displays show CSPR/min prominently but include a parenthetical fiat estimate for accessibility.
4. **Agent activity always visible.** A collapsible "Agent Log" is available on every screen â€” for power users who want to understand what's happening on-chain. For regular users, it stays closed.
5. **Onboarding = 4 screens, no wallet required.** The onboarding flow completes the first 3 steps (photo â†’ valuation â†’ RWA mint preview) before ever prompting wallet connection. This reduces friction dramatically.

---

## 9. Agent Architecture

Asset402 is orchestrated by **five specialized AI agents** that coordinate autonomously using the Casper MCP server, CSPR.cloud Streaming API, and x402 payment protocol. Each agent has a defined role, set of tools, and trigger conditions.

### Agent Overview

```
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚   ORCHESTRATOR AGENT   â”‚
                    â”‚  (routes tasks, state) â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                 â”‚
         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
         â”‚                       â”‚                       â”‚
         â–¼                       â–¼                       â–¼
  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
  â”‚ VISION      â”‚       â”‚ RISK        â”‚       â”‚ LISTING     â”‚
  â”‚ AGENT       â”‚       â”‚ AGENT       â”‚       â”‚ AGENT       â”‚
  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                 â”‚
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚                         â”‚
                    â–¼                         â–¼
             â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
             â”‚ GUARDIAN    â”‚         â”‚ COLLECTOR   â”‚
             â”‚ AGENT       â”‚         â”‚ AGENT       â”‚
             â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

### Agent 1: Vision Agent

**Role:** Identify, classify, and value physical assets from photographs

**Trigger:** New asset photo submitted by owner

**Tools Used:**
- Image classification model (TensorFlow.js / Moondream2 for on-device inference)
- External commodity/equipment price APIs (paid per-call via x402)
- CSPR.cloud REST API (to store valuation metadata)

**Process:**
```
1. Receive base64-encoded image
2. Run image classification â†’ asset_type, make, model, estimated_year
3. Call market pricing API via x402 micropayment â†’ current_market_value
4. Calculate condition_score (0â€“100) from image quality signals
5. Return structured JSON to Orchestrator:
   {
     "asset_type": "agricultural_tractor",
     "make": "Mahindra",
     "model_est": "575 DI",
     "year_range": "2017-2020",
     "value_usd_low": 8200,
     "value_usd_high": 9800,
     "condition_score": 78,
     "confidence": 0.87
   }
```

**x402 Use:** The Vision Agent pays for each external market price API call using x402 micropayments. The API provider's endpoint returns 402 Payment Required; the agent signs and retries with cryptographic payment proof. No API keys. No subscriptions. Per-call billing, fully automated.

---

### Agent 2: Risk Agent

**Role:** Score the borrowing risk of each asset for loan underwriting

**Trigger:** After Vision Agent completes; also runs daily on active loans

**Tools Used:**
- Casper MCP Server (query owner's on-chain history)
- CSPR.trade MCP (check CSPR spot price for LTV calculation)
- External credit signal APIs (paid via x402)

**Process:**
```
1. Receive asset valuation from Vision Agent
2. Query owner wallet history via Casper MCP Server
   â†’ Number of previous rentals, repayment history, account age
3. Fetch CSPR/USD price via CSPR.trade MCP
4. Calculate: Max Loan = asset_value_usd Ã— 0.70 / cspr_price
5. Set liquidation threshold at 85% LTV
6. Return risk_score and loan parameters to Orchestrator
```

**Continuous Monitoring:** The Risk Agent runs every 24 hours on all active loans. If CSPR price drops or the Guardian Agent reports asset condition degradation, the Risk Agent recalculates LTV and triggers the Orchestrator to update the on-chain collateral parameters (via upgradable Odra contract call).

---

### Agent 3: Listing Agent

**Role:** Publish available asset hours to the marketplace with dynamic pricing

**Trigger:** After RWA token is minted and loan (if any) is settled

**Tools Used:**
- Owner's calendar/availability input (simple form in app)
- Local demand signals (queried via x402-paid API)
- CSPR.cloud REST API (write marketplace listing to database)

**Process:**
```
1. Receive asset metadata + owner's available hours
2. Query comparable rental rates in the asset category + location
3. Set base_price_per_minute = (market_hourly_rate / 60) in CSPR
4. Apply dynamic discounting: reduce by 10% if idle >48 hours
5. Publish listing to on-chain marketplace metadata
6. Return listing_id to Orchestrator
```

**Dynamic Repricing:** Every 12 hours, the Listing Agent re-evaluates demand. If no bookings in 48 hours, it automatically reduces price by 5% increments down to a floor price, then notifies the owner.

---

### Agent 4: Guardian Agent

**Role:** Maintain the accuracy of the on-chain asset record through periodic condition monitoring

**Trigger:** Every 72 hours (configurable); also triggered after any rental completion

**Tools Used:**
- Push notification system (prompt owner for photo)
- Vision Agent (re-analyze new photo)
- Odra smart contract (update asset metadata via upgradable contract)
- CSPR.cloud API (log condition update transaction)

**Process:**
```
1. Send push notification to asset owner: "Quick check-in needed"
2. Owner takes new photo (30-second task)
3. Guardian Agent passes photo to Vision Agent
4. Compare new condition_score to previous:
   - No change (Â±5): log update, no contract change needed
   - Improvement: call Odra contract.update_condition(new_score)
   - Degradation > 15%: flag to Risk Agent, possible LTV reduction
5. Record condition_check_timestamp on-chain
```

**Why Upgradable Contracts Matter Here:** When the Guardian Agent updates the asset condition score, it calls `contract.update_metadata()` â€” a function only available because Casper contracts are upgradable. If the valuation model improves, the contract logic can be updated without burning the existing RWA token. This is a technically impressive Casper-native feature that demonstrates deep ecosystem knowledge.

---

### Agent 5: Collector Agent

**Role:** Route x402 streaming payment receipts to the correct destinations (loan repayment, owner earnings, protocol fee)

**Trigger:** Fires every 60 seconds during an active rental session

**Tools Used:**
- x402 Facilitator (verify payment proof)
- Casper MCP Server (submit distribution transactions)
- Odra Lending Pool contract (record repayment)

**Process:**
```
1. Receive confirmed x402 payment (0.034 CSPR received)
2. Calculate distribution:
   - Loan repayment:  0.010 CSPR (30% until loan cleared)
   - Owner earnings:  0.022 CSPR (64%)
   - Protocol fee:    0.002 CSPR (6%)
3. Submit 3 micro-transactions to Casper via MCP Server
4. Update loan repayment balance in Lending Pool contract
5. Log to CSPR.cloud streaming event feed
6. If loan fully repaid: call contract.release_collateral()
```

**Why This Is Novel:** No protocol on Casper currently does **automated multi-party payment splitting at the x402 streaming layer**. The Collector Agent is essentially a real-time clearing agent for a three-party transaction (renter â†’ owner, renter â†’ lender, renter â†’ protocol), running every 60 seconds, autonomously, with cryptographic verification. This is machine-to-machine commerce at its most direct.

---

## 10. Smart Contract Architecture

All smart contracts are built using the **Odra Framework** on Casper Testnet.

### Contract 1: AssetRegistry (RWA NFT)

```rust
// Using Odra Framework

#[odra::module]
pub struct AssetRegistry {
    assets: Mapping<AssetId, AssetMetadata>,
    owner_assets: Mapping<Address, Vec<AssetId>>,
    total_assets: Variable<u64>,
}

#[odra::module]
impl AssetRegistry {
    // Called by Vision + Risk Agents after valuation
    pub fn mint_asset(
        &mut self,
        owner: Address,
        asset_type: String,
        valuation_usd: u64,
        condition_score: u8,
        ipfs_photo_hash: String,
    ) -> AssetId { ... }

    // Called by Guardian Agent every 72 hours (upgradable)
    pub fn update_condition(
        &mut self,
        asset_id: AssetId,
        new_condition_score: u8,
        new_valuation_usd: u64,
        photo_hash: String,
    ) { ... }

    // Called by Listing Agent
    pub fn set_listing_status(
        &mut self,
        asset_id: AssetId,
        status: ListingStatus, // Idle | Listed | Rented | Locked
    ) { ... }

    // Called by Collector Agent when loan is repaid
    pub fn release_collateral(&mut self, asset_id: AssetId) { ... }
}
```

**Key Odra Pattern Used:** The `update_condition` function exists because Casper contracts are **upgradable**. When the AI valuation model improves, we can upgrade the contract logic without affecting stored asset data. Other chains cannot do this cleanly.

---

### Contract 2: LendingPool

```rust
#[odra::module]
pub struct LendingPool {
    deposits: Mapping<Address, u128>,   // Lender deposits
    loans: Mapping<AssetId, LoanData>, // Active loans
    total_liquidity: Variable<u128>,
    protocol_fee_bps: Variable<u16>,
}

#[odra::module]
impl LendingPool {
    // Called when owner clicks "Get Funds Now"
    pub fn originate_loan(
        &mut self,
        asset_id: AssetId,
        borrower: Address,
        amount_cspr: u128,
        ltv_bps: u16,
    ) { ... }

    // Called by Collector Agent every 60s during active rental
    pub fn record_repayment(
        &mut self,
        asset_id: AssetId,
        amount_cspr: u128,
    ) -> LoanStatus { ... }

    // Called by Risk Agent if LTV threshold breached
    pub fn trigger_liquidation(&mut self, asset_id: AssetId) { ... }
}
```

---

### Contract 3: RentalEscrow (with casper-eip-712)

```rust
// Gasless rental agreement â€” signed off-chain, verified on-chain
#[odra::module]
pub struct RentalEscrow {
    active_rentals: Mapping<RentalId, RentalData>,
}

#[odra::module]
impl RentalEscrow {
    // Called when renter approves booking
    // Signature verified via casper-eip-712
    pub fn start_rental(
        &mut self,
        asset_id: AssetId,
        renter: Address,
        duration_minutes: u64,
        rate_per_minute: u128,
        signed_rental_agreement: Signature, // eip-712 typed data
    ) -> RentalId { ... }

    // Called by Collector Agent to settle final balance
    pub fn close_rental(&mut self, rental_id: RentalId) { ... }
}
```

**casper-eip-712 Usage:** The rental agreement is a typed, off-chain data structure signed by the renter (human-readable in the wallet UI: "Rent [Mahindra Tractor] for [8 hours] at [0.034 CSPR/min]"). This signature is verified on-chain at rental start. This is **gasless meta-transaction** â€” the renter doesn't pay gas; the protocol does on their behalf.

---

## 11. x402 Streaming Payment Integration

This is the technical heart of Asset402 and the most novel use of any Casper technology in the hackathon.

### How x402 Works in Asset402

The x402 protocol is used in **two distinct ways**:

#### Use Case A: Agent-to-API Micropayments (Vision + Risk Agents)

When the Vision Agent needs to call a market pricing API to value an asset:

```
1. Vision Agent â†’ GET /api/v1/equipment-pricing?type=tractor&year=2018
2. API Server  â† 402 Payment Required
                  X-Payment-Address: 01api...server
                  X-Payment-Amount: 500000 (0.0005 CSPR)
                  X-Payment-Network: casper-testnet
3. Vision Agent signs payment via CSPR.click Agent Skill
4. Vision Agent â†’ GET /api/v1/equipment-pricing?type=tractor&year=2018
                  X-Payment: casper:01api...server:500000:sig_ed...
5. x402 Facilitator verifies â†’ 200 OK + pricing data
```

This means the Vision Agent has **no API keys, no subscriptions, no monthly bills**. It pays per valuation, autonomously, with cryptographic proof. The per-call cost is predictable and deterministic (Casper's fixed-fee model). This is x402 being used **exactly as designed for the agent economy**.

#### Use Case B: Renter-to-Owner Streaming Payments

Every 60 seconds during an active rental, the Collector Agent triggers:

```
// Renter's pre-approved x402 streaming authorization
// (signed once at rental start via casper-eip-712)
{
  "method": "POST",
  "endpoint": "/api/v1/stream/payment",
  "headers": {
    "X-Payment": "casper:[owner_wallet]:34000:[stream_sig]",
    "X-Stream-Session": "[rental_id]",
    "X-Stream-Interval": "60s"
  }
}
```

The x402 Facilitator verifies each micro-payment's cryptographic proof, and the Collector Agent distributes to owner, lender, and protocol. This creates **a real-time income stream tied to physical asset utilization** â€” the first of its kind on any blockchain.

### Integration Code Reference

```javascript
// x402 client setup (using casper-x402 reference implementation)
import { CasperX402Client } from '@casper/x402';

const x402Client = new CasperX402Client({
  network: 'testnet',
  walletKey: agentPrivateKey,   // Agent's autonomous spending key
  maxPaymentPerCall: '1000000', // 0.001 CSPR ceiling
});

// Vision Agent calling a pricing API
const pricingData = await x402Client.fetch(
  'https://equipment-oracle.example.com/v1/price',
  {
    method: 'GET',
    params: { type: 'tractor', year: 2018, region: 'IN' }
  }
);
```

**Reference:** https://github.com/make-software/casper-x402/blob/master/docs/user-guide.md  
**API Docs:** https://docs.cspr.cloud/x402-facilitator-api/reference

---

## 12. MCP Server Integration

Asset402 uses **two MCP servers** to give agents direct blockchain access.

### MCP Server 1: Casper MCP Server

Used by: Risk Agent, Collector Agent, Guardian Agent

```javascript
// Risk Agent: Query owner wallet history
{
  "method": "tools/call",
  "params": {
    "name": "GetAccountHistory",
    "arguments": {
      "public_key": "[owner_wallet]",
      "limit": 50
    }
  }
}
// Returns: transfer count, deploy history, age of account

// Collector Agent: Submit repayment transaction
{
  "method": "tools/call",
  "params": {
    "name": "SubmitDeploy",
    "arguments": {
      "deploy": "[signed_repayment_deploy]"
    }
  }
}
```

**Setup:** https://docs.cspr.cloud/agentic-tools/mcp-server  
**GitHub:** https://github.com/msanlisavas/casper-mcp

---

### MCP Server 2: CSPR.trade MCP

Used by: Risk Agent (for LTV calculation), Listing Agent (for CSPR price in rate-setting)

```javascript
// Risk Agent: Get current CSPR price for LTV calculation
{
  "method": "tools/call",
  "params": {
    "name": "get_token_price",
    "arguments": {
      "token": "CSPR",
      "quote": "USD"
    }
  }
}
// Returns: { "cspr_usd": 0.0234, "24h_change": "+3.2%" }
```

**Endpoint:** https://mcp.cspr.trade  

---

## 13. CSPR Ecosystem Technology Map

Every Casper-built technology used in Asset402, and exactly where it appears:

| Technology | Role in Asset402 | Where in Code |
|---|---|---|
| **Odra Framework** | Smart contracts: AssetRegistry, LendingPool, RentalEscrow | `/contracts/` â€” all 3 contracts written in Odra (Rust) |
| **x402 Facilitator** | Vision/Risk Agent API payments; Renter streaming payments | `/agents/vision-agent.js`, `/agents/collector-agent.js` |
| **Casper MCP Server** | Blockchain queries: account history, deploy submission | `/agents/risk-agent.js`, `/agents/collector-agent.js` |
| **CSPR.trade MCP** | CSPR/USD price feeds for loan calculations | `/agents/risk-agent.js`, `/agents/listing-agent.js` |
| **CSPR.click AI Agent Skill** | Wallet connection for owners and renters; transaction signing | `/frontend/hooks/useWallet.js` |
| **CSPR.cloud REST API** | Read/write marketplace listings, store asset metadata | `/backend/api/assets.js`, `/backend/api/marketplace.js` |
| **CSPR.cloud Streaming API** | Power the live income counter on Screen 3 | `/frontend/hooks/useStreamingBalance.js` |
| **CSPR.cloud Node API** | Submit batch distribution transactions (Collector Agent) | `/agents/collector-agent.js` |
| **casper-eip-712** | Gasless rental agreement signing (typed data) | `/frontend/hooks/useRentalSign.js` |
| **Odra llms.txt** | AI agent reads Odra docs autonomously for contract generation | `https://odra.dev/llms.txt` â€” pointed to in Orchestrator Agent system prompt |
| **Casper Testnet** | All contract deployments during buildathon | Network: `integration-test.cspr.live` |

**AI Toolkit Home:** https://www.casper.network/ai  
**Documentation Hub:** https://docs.casper.network

---

## 14. How to Use Casper Developer Docs

This section is a practical guide to navigating Casper's ecosystem documentation for building Asset402.

### Start Here (Day 1)

1. **Casper Developer Onboarding**  
   URL: https://docs.casper.network  
   Read the "Getting Started" and "Understanding Deploys" sections first. All transactions on Casper are "deploys."

2. **Casper AI Toolkit Overview**  
   URL: https://www.casper.network/ai  
   Read the full page. Understand the five tools (x402, MCP Servers, CSPR.click, CSPR.cloud, Odra). This is the menu for what Asset402 uses.

3. **Set Up Your Testnet Wallet**  
   - Install CSPR.click wallet browser extension: https://docs.cspr.click
   - Get Testnet CSPR from faucet: https://testnet.cspr.live/tools/faucet
   - Connect to integration testnet: `https://integration-test.cspr.live`

---

### Smart Contract Development (Odra)

4. **Odra Framework Docs**  
   URL: https://odra.dev/docs/  
   - Start with: "Writing Your First Contract"
   - Read: "Mappings," "Variables," "Events," and "Module Macros"
   - The `#[odra::module]` macro is your primary tool
   - Run tests locally with `odra test` before deploying

5. **Odra llms.txt (AI-Assisted Development)**  
   URL: https://odra.dev/llms.txt  
   Point your AI coding assistant here. The llms.txt file indexes all Odra documentation in AI-readable format. Your agent (Claude, Cursor, etc.) can autonomously generate working Casper contracts from it.

6. **Deploy Contracts to Testnet**  
   ```bash
   cargo casper build
   casper-client put-deploy \
     --chain-name integration-test \
     --node-address https://integration-test.cspr.live \
     --payment-amount 50000000000 \
     --session-path ./target/wasm32-unknown-unknown/release/asset_registry.wasm
   ```

---

### x402 Integration

7. **x402 Facilitator API Reference**  
   URL: https://docs.cspr.cloud/x402-facilitator-api/reference  
   - Read the "Authentication Flow" section carefully
   - Understand `X-Payment`, `X-Payment-Address`, `X-Payment-Amount` headers
   - Test with the provided Postman collection

8. **x402 Reference Implementation**  
   URL: https://github.com/make-software/casper-x402/tree/master/examples  
   - Use the `client/` example as the base for your agent's HTTP client
   - Use the `server/` example as the base for your mock pricing oracle
   - User guide: https://github.com/make-software/casper-x402/blob/master/docs/user-guide.md

---

### MCP Server Integration

9. **Casper MCP Server Setup**  
   URL: https://docs.cspr.cloud/agentic-tools/mcp-server  
   - Point your Claude or AI agent here
   - Available tools: `GetAccountBalance`, `GetAccountHistory`, `SubmitDeploy`, `GetDeployStatus`

10. **CSPR.trade MCP**  
    URL: https://mcp.cspr.trade  
    - Connect via standard MCP client
    - Key tools: `get_quote`, `get_token_price`, `get_liquidity_pools`

---

### CSPR.click & CSPR.cloud

11. **CSPR.click Wallet Integration**  
    URL: https://docs.cspr.click/documentation/ai-agent-skills  
    - Install the AI Agent Skill in your coding environment
    - Key functions: `createWallet()`, `signDeploy()`, `sendTransaction()`
    - CSPR.cloud API proxy is bundled â€” use it for all read operations

12. **CSPR.cloud API Reference**  
    URL: https://docs.cspr.cloud  
    - REST API for listing reads and writes: `/accounts/{public_key}`, `/transfers`, `/deploys/{hash}`
    - Streaming API (SSE): `/events/main` â€” subscribe to real-time transfer events for the live income counter
    - Skill install for AI: https://cspr.cloud/skill.md

---

### casper-eip-712

13. **Typed Data Signing**  
    URL: https://github.com/casper-ecosystem/casper-eip-712  
    - Use for the rental agreement signing (gasless meta-transaction)
    - Define your `RentalAgreement` typed struct
    - The wallet signs it; the contract verifies it

---

## 15. Frontend Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Fast, SEO-ready, React Server Components |
| Styling | Tailwind CSS | Rapid dark UI development; matches Casper's aesthetic |
| Wallet | CSPR.click SDK | Official Casper wallet SDK, CSPR.cloud proxy bundled |
| State | Zustand | Lightweight global state for streaming balance, agent log |
| Streaming UI | CSPR.cloud SSE | Real-time balance updates without polling |
| Animation | Framer Motion | Earning counter pulse, agent log scroll, status transitions |
| AI Vision | Moondream2 (via API) | Lightweight multimodal vision model for asset identification |
| Agents | Node.js + LangChain | Orchestrator and individual agents |
| Backend | Bun + Hono | Ultra-fast API layer for agent coordination |
| Database | Supabase (Postgres) | Marketplace listings, rental records (mirrored from on-chain) |
| Deployment | Vercel (frontend) + Railway (agents) | Easy demo deployment |

---

## 16. Development Milestones

### Week 1 (June 1â€“7): Foundation

| Day | Task |
|---|---|
| 1 | Set up Casper Testnet wallet, install Odra, read all docs listed in Section 14 |
| 2 | Write and test `AssetRegistry` contract locally with Odra |
| 3 | Write and test `LendingPool` contract |
| 4 | Write and test `RentalEscrow` contract with casper-eip-712 stub |
| 5 | Deploy all 3 contracts to Casper Testnet, verify on `integration-test.cspr.live` |
| 6â€“7 | Scaffold Next.js frontend with Tailwind, dark theme, Casper color palette |

**Week 1 Deliverable:** 3 contracts live on Testnet. Frontend shell running locally.

---

### Week 2 (June 8â€“14): Agents

| Day | Task |
|---|---|
| 8â€“9 | Build Vision Agent: Moondream2 image analysis + x402 pricing API client |
| 10 | Build Risk Agent: Casper MCP + CSPR.trade MCP integration |
| 11 | Build Listing Agent: dynamic pricing logic |
| 12â€“13 | Build Collector Agent: x402 streaming + 3-way payment split |
| 14 | Build Guardian Agent: condition monitoring + Odra contract update calls |

**Week 2 Deliverable:** All 5 agents functional in isolation. x402 payments flowing on Testnet.

---

### Week 3 (June 15â€“21): UI & Integration

| Day | Task |
|---|---|
| 15â€“16 | Build Asset Onboarding Flow (4 screens, vision agent integration) |
| 17 | Build Dashboard (live CSPR.cloud SSE streaming balance counter) |
| 18 | Build Marketplace (renter view, CSPR.click booking flow) |
| 19 | Build Lender Portfolio screen |
| 20â€“21 | End-to-end integration test: onboard asset â†’ mint RWA â†’ get loan â†’ simulate rental â†’ x402 streams |

**Week 3 Deliverable:** Full user flow working end-to-end on Testnet.

---

### Week 4 (June 22â€“30): Polish & Submission

| Day | Task |
|---|---|
| 22â€“23 | UI polish: animations, earning pulse, agent activity feed |
| 24 | GitHub repository cleanup, README with detailed setup instructions |
| 25â€“26 | Record demo video (follow script in Section 17) |
| 27 | Deploy to public Testnet (not just localhost), test from fresh wallet |
| 28â€“29 | Community engagement: share on Casper Discord, Telegram, DoraHacks |
| 30 | **Submit to DoraHacks before midnight** |

---

## 17. Hackathon Demo Script

The demo video must be under 5 minutes. This script is designed to create maximum emotional impact in minimum time.

---

**[0:00â€“0:20] The Hook**  
*Screen: Dashboard, idle*  
> "Imagine you have a $9,000 tractor. It sits idle every night and on weekends. You're paying loan EMIs on it. It's earning zero while it rests.  
> What if it could earn while you sleep â€” automatically?"

---

**[0:20â€“0:50] Asset Onboarding**  
*Screen: Camera viewfinder â†’ AI analysis â†’ RWA mint â†’ Loan offer*  
> "I take one photo. The AI agent identifies it as a Mahindra 575 DI tractor, values it at $8,200â€“$9,800, and creates its on-chain identity on Casper Network.  
> In 15 seconds, it offers me a 6,440 CSPR loan against it. No bank. No paperwork."

---

**[0:50â€“1:30] The Marketplace**  
*Screen: Marketplace listing, renter booking*  
> "Simultaneously, the Listing Agent publishes my available idle hours at 0.034 CSPR per minute.  
> Here's a renter â€” Arjun â€” booking 8 hours for tomorrow. He signs a rental agreement with one tap. No gas fees charged to him.  
> And now watch what happens tomorrow at 8:42am."

---

**[1:30â€“2:30] THE WOW MOMENT â€” Live Streaming**  
*Screen: Full-screen streaming dashboard â€” CSPR counter climbing*  
> "Arjun started using the tractor. Look at this.  
> Every 60 seconds, 0.034 CSPR lands in my wallet. The AI Collector Agent splits it: 64% to me, 30% goes to repay my loan, 6% to the protocol.  
> That loan repayment bar? It's moving on its own. I'm not doing anything.  
> The tractor is paying off its own loan. Autonomously."  
*[Let this run for 30 seconds. Say nothing. Let the counter climb.]*

---

**[2:30â€“3:00] Guardian Agent**  
*Screen: Guardian check-in notification â†’ photo â†’ on-chain update*  
> "Every 72 hours, the Guardian Agent sends me a notification. I take a quick photo â€” 10 seconds â€” and it updates the asset's condition record on Casper.  
> The contract is upgradable, so if the AI model gets better at valuation, the contract updates too. No redeployment."

---

**[3:00â€“3:30] DeFi Lender View**  
*Screen: Lender portfolio*  
> "And for DeFi liquidity providers on Casper, Asset402 offers something new: 12.4% APY backed by real physical assets generating real cash flow.  
> Not backed by token prices. Backed by tractors, cameras, and generators that people actually use."

---

**[3:30â€“4:00] Technology Stack**  
*Screen: Split diagram showing tech*  
> "This is built entirely on Casper's AI Toolkit:  
> x402 for streaming micropayments â€” Casper's newest infrastructure.  
> Two MCP servers for blockchain access.  
> Odra for upgradable RWA contracts.  
> CSPR.cloud for real-time event streaming.  
> casper-eip-712 for gasless rental agreements.  
> Every component is from Casper's ecosystem."

---

**[4:00â€“4:30] Vision**  
> "Casper already proved this works with Parking Blox â€” parking revenue on-chain.  
> Asset402 generalizes that to every productive idle asset on earth.  
> Two billion machines sitting idle tonight. All of them could be earning on Casper.  
> One photo. Five agents. Autonomous income."

---

## 18. Business Model

### Revenue Streams

| Stream | Mechanism | Rate |
|---|---|---|
| Protocol Fee | 6% of every x402 rental payment (split by Collector Agent) | Auto |
| Listing Premium | Boosted placement in marketplace for a one-time CSPR payment | On demand |
| Origination Fee | 1% of loan amount charged at loan origination | At event |
| Guardian API | Third-party DApps can query the on-chain asset condition data via x402 | Per call |

### Unit Economics (Single Tractor, 30 Days)

- Rental rate: 0.034 CSPR/min Ã— 60 Ã— 8 hrs/day = 16.32 CSPR/day  
- Monthly rental income: 16.32 Ã— 22 working days = **358.9 CSPR**
- Protocol fee (6%): **21.5 CSPR**
- Owner earnings (64%): **229.7 CSPR**
- Loan repayment (30%): **107.7 CSPR** â†’ loan cleared in ~60 days of active rental

### Market Size
- Global equipment leasing market: **$900B+**
- Informal peer-to-peer equipment rental: **~$150B** (unaddressed by any DeFi protocol)
- Target in Year 1: 10,000 assets registered, $2M in rental volume processed on-chain

---

## 19. Long-Term Roadmap

| Phase | Timeline | Focus |
|---|---|---|
| **Phase 0 â€” Hackathon** | June 2026 | Proof of concept: 3 asset types, Testnet only |
| **Phase 1 â€” Mainnet Launch** | Q3 2026 | Mainnet deployment, first 100 real asset owners |
| **Phase 2 â€” ERC-3643 Compliance** | Q4 2026 | Add compliant security token layer as Casper ships ERC-3643; institutional DeFi lenders |
| **Phase 3 â€” Smart Accounts** | Q1 2027 | When Casper ships gasless transactions, remove ALL gas friction for renters |
| **Phase 4 â€” Privacy Layer** | Q3 2027 | Confidential rental terms using Casper's transaction privacy (for commercial equipment) |
| **Phase 5 â€” Agent Marketplace** | 2027 | Third-party agents can be licensed as Listing, Guardian, or Risk Agents on the platform |

---

## 20. Appendix â€” Design Tokens & API References

### Design Tokens (CSS Variables)

```css
:root {
  /* Backgrounds */
  --ap-bg-primary:   #0D0E14;
  --ap-bg-surface:   #161820;
  --ap-bg-elevated:  #1E2030;
  
  /* Brand */
  --ap-red:          #E5172F;   /* Casper Red â€” primary CTA only */
  --ap-teal:         #00D4AA;   /* Live / Earning state */
  --ap-teal-glow:    rgba(0, 212, 170, 0.15);
  
  /* Text */
  --ap-text-primary:   #F2F4F8;
  --ap-text-secondary: #8A94A6;
  --ap-text-muted:     #4A5268;
  
  /* Status */
  --ap-success:   #22C55E;
  --ap-warning:   #F59E0B;
  --ap-danger:    #EF4444;
  
  /* Typography */
  --ap-font-display: 'DM Sans', 'Inter', sans-serif;
  --ap-font-body:    'Inter', sans-serif;
  --ap-font-mono:    'JetBrains Mono', monospace;
  
  /* Border */
  --ap-border:       rgba(255, 255, 255, 0.06);
  --ap-border-focus: rgba(0, 212, 170, 0.4);
  
  /* Earning Pulse Animation */
  --ap-pulse-duration: 1.5s;
}
```

### Earning Counter Animation (Keyframes)

```css
@keyframes earning-pulse {
  0%   { box-shadow: 0 0 0 0 var(--ap-teal-glow); }
  50%  { box-shadow: 0 0 24px 8px var(--ap-teal-glow); }
  100% { box-shadow: 0 0 0 0 var(--ap-teal-glow); }
}

.streaming-active {
  animation: earning-pulse var(--ap-pulse-duration) ease-in-out infinite;
}
```

---

### Quick Reference: All API Endpoints

| Service | URL | Used For |
|---|---|---|
| Casper Testnet Node | `https://integration-test.cspr.live` | Deploy contracts |
| Casper Testnet Explorer | `https://testnet.cspr.live` | Verify transactions |
| Casper Faucet | `https://testnet.cspr.live/tools/faucet` | Get test CSPR |
| CSPR.cloud REST API | `https://event-store-api-clarinet-08.devxdao.com` | Asset/transfer queries |
| CSPR.cloud Streaming | `https://event-store-api-clarinet-08.devxdao.com/events/main` | SSE real-time events |
| x402 Facilitator | `https://docs.cspr.cloud/x402-facilitator-api/reference` | Payment verification |
| CSPR.trade MCP | `https://mcp.cspr.trade` | Price feeds, DEX |
| Casper MCP Server | See docs.cspr.cloud | Blockchain queries |
| Odra Docs | `https://odra.dev/docs/` | Contract development |
| Odra llms.txt | `https://odra.dev/llms.txt` | AI-assisted contract writing |
| CSPR.click SDK | `https://docs.cspr.click` | Wallet integration |
| casper-eip-712 | `https://github.com/casper-ecosystem/casper-eip-712` | Gasless signing |
| x402 Examples | `https://github.com/make-software/casper-x402/tree/master/examples` | x402 reference code |
| Casper GitHub | `https://github.com/casper-network` | Protocol repositories |

---

### GitHub Repository Structure

```
Asset402/
â”œâ”€â”€ README.md              # Setup, architecture, deployment guide
â”œâ”€â”€ contracts/             # Odra smart contracts
â”‚   â”œâ”€â”€ asset_registry/    # RWA NFT contract
â”‚   â”œâ”€â”€ lending_pool/      # DeFi lending contract
â”‚   â””â”€â”€ rental_escrow/     # Rental + casper-eip-712
â”œâ”€â”€ agents/                # Five AI agents
â”‚   â”œâ”€â”€ orchestrator.js
â”‚   â”œâ”€â”€ vision-agent.js    # x402 pricing API calls
â”‚   â”œâ”€â”€ risk-agent.js      # Casper MCP + CSPR.trade MCP
â”‚   â”œâ”€â”€ listing-agent.js
â”‚   â”œâ”€â”€ collector-agent.js # x402 streaming + payment split
â”‚   â””â”€â”€ guardian-agent.js  # Condition monitoring
â”œâ”€â”€ frontend/              # Next.js app
â”‚   â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ StreamingBalance.tsx    # The WOW component
â”‚   â”‚   â”œâ”€â”€ AgentActivityFeed.tsx
â”‚   â”‚   â”œâ”€â”€ AssetCard.tsx
â”‚   â”‚   â””â”€â”€ OnboardingFlow.tsx
â”‚   â””â”€â”€ hooks/
â”‚       â”œâ”€â”€ useWallet.js            # CSPR.click
â”‚       â”œâ”€â”€ useStreamingBalance.js  # CSPR.cloud SSE
â”‚       â””â”€â”€ useRentalSign.js        # casper-eip-712
â”œâ”€â”€ backend/               # Bun + Hono API
â”‚   â””â”€â”€ api/
â””â”€â”€ docs/
    â”œâ”€â”€ architecture.md
    â””â”€â”€ demo-setup.md
```

---

*Built for Casper Agentic Buildathon 2026 Â· Qualifying Round Submission*  
*"Your idle assets. Earning. Autonomously."*

