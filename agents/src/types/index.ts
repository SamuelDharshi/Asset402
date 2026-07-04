// ─────────────────────────────────────────────────────────────────────────────
//  Asset402 — Shared Types
//  Used across all 5 agents and the x402 engine
// ─────────────────────────────────────────────────────────────────────────────

export type AssetId  = number;
export type RentalId = number;

// ── Asset Types ───────────────────────────────────────────────────────────────

export type AssetStatus = 'Idle' | 'Listed' | 'Rented' | 'Locked';

export interface AssetMetadata {
  assetId:       AssetId;
  owner:         string; // Casper account-hash hex
  assetType:     string;
  make:          string;
  modelEst:      string;
  yearRange:     string;
  valuationUsd:  number;
  conditionScore: number; // 0–100
  ipfsPhotoHash: string;
  status:        AssetStatus;
  confidence:    number;  // 0.0–1.0 from Vision Agent
  region?:       string;
  ownerAddress?: string;
}

// ── Vision Agent ──────────────────────────────────────────────────────────────

export interface VisionAnalysisResult {
  assetType:     string;
  make:          string;
  modelEst:      string;
  yearRange:     string;
  valueUsdLow:   number;
  valueUsdHigh:  number;
  conditionScore: number;
  confidence:    number;
  ipfsHash:      string;
}

// ── Risk Agent ────────────────────────────────────────────────────────────────

export interface RiskAssessment {
  assetId:        AssetId;
  valuationUsd:   number;
  csprPriceUsd:   number;
  maxLoanCspr:    number;
  maxLoanMotes:   bigint;
  ltvBps:         number;
  riskScore:      number; // 0–100, lower = safer
  liquidationLtvBps: number;
  recommendation: 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';
  /** True if account history and/or CSPR price came from a fallback default
   *  because the corresponding MCP call failed — callers should surface this
   *  rather than treat the assessment as identical to one backed by live data. */
  usedFallbackData: boolean;
}

// ── Loan ──────────────────────────────────────────────────────────────────────

export interface LoanData {
  assetId:          AssetId;
  borrower:         string;
  principalMotes:   bigint;
  remainingMotes:   bigint;
  ltvBps:           number;
  status:           'Active' | 'Repaid' | 'Liquidated';
  originatedAt:     number; // Unix timestamp
}

// ── Rental ────────────────────────────────────────────────────────────────────

export interface RentalAgreement {
  assetId:         AssetId;
  renterHash:      string; // 32-byte hex
  ownerHash:       string; // 32-byte hex
  ratePerMinute:   bigint; // motes/min
  durationMinutes: number;
  validUntil:      number; // Unix timestamp
  nonce:           number;
}

export interface RentalData {
  rentalId:        RentalId;
  assetId:         AssetId;
  renter:          string;
  owner:           string;
  ratePerMinute:   bigint;
  durationMinutes: number;
  totalStreamed:   bigint;
  startedAt:       number;
  status:          'Active' | 'Closed' | 'Cancelled';
}

// ── x402 Payment ─────────────────────────────────────────────────────────────

export interface X402PaymentHeader {
  network:    string;
  recipient:  string;
  amount:     string; // motes as string
  signature:  string; // hex
  publicKey:  string; // hex
  timestamp:  number;
}

export interface StreamPayload {
  rentalId:     RentalId;
  assetId:      AssetId;
  amountMotes:  bigint;
  paymentProof: X402PaymentHeader;
  timestamp:    number;
}

// ── Agent Message Bus ─────────────────────────────────────────────────────────

export type AgentEventType =
  | 'PHOTO_UPLOADED'
  | 'VISION_COMPLETE'
  | 'RISK_ASSESSED'
  | 'ASSET_MINTED'
  | 'LOAN_ORIGINATED'
  | 'RENTAL_STARTED'
  | 'STREAM_PAYMENT'
  | 'RENTAL_CLOSED'
  | 'LOAN_REPAID'
  | 'CONDITION_CHECKED'
  | 'LISTING_PUBLISHED'
  | 'PAYMENT_DISTRIBUTED'
  | 'CUC_ISSUED'
  | 'SURGE_DETECTED'
  | 'MAINTENANCE_ALERT'
  | 'MAINTENANCE_BOOKED';

export interface AgentMessage<T = unknown> {
  eventType:  AgentEventType;
  source:     string;
  timestamp:  number;
  payload:    T;
  traceId:    string;
}

// ── MCP Tool Responses ────────────────────────────────────────────────────────

export interface AccountHistoryResponse {
  publicKey:     string;
  deployCount:   number;
  transferCount: number;
  accountAge:    number; // days
  firstActivity: string; // ISO date
  balance:       string; // motes
}

export interface CsprPriceResponse {
  symbol:    string;
  priceUsd:  number;
  change24h: number; // percentage
  updatedAt: string;
}

// ── Split Math ────────────────────────────────────────────────────────────────

export interface PaymentSplit {
  totalMotes:        bigint;
  ownerMotes:        bigint;   // 64%
  loanRepayMotes:    bigint;   // 30%
  protocolFeeMotes:  bigint;   // 6%
  protocolMotes?:    bigint;   // 6% (alternative property name used in split logic)
  assetId?:          number;
  ownerAddress?:     string;
}
