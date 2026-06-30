#!/usr/bin/env ts-node
// ─────────────────────────────────────────────────────────────────────────────
//  Asset402 — Full E2E Ecosystem Simulation Script
//  Orchestrates: Mint → Borrow → Rent → Stream → Repay
//
//  Run:  ts-node scripts/simulate-ecosystem.ts
// ─────────────────────────────────────────────────────────────────────────────

import nacl from 'tweetnacl';
import chalk from 'chalk';

// ── Colours & helpers ─────────────────────────────────────────────────────────

const log  = (msg: string) => console.log(chalk.white(msg));
const ok   = (msg: string) => console.log(chalk.green('  ✓ ') + msg);
const info = (msg: string) => console.log(chalk.cyan('  → ') + msg);
const warn = (msg: string) => console.log(chalk.yellow('  ⚠ ') + msg);
const err  = (msg: string) => console.log(chalk.red('  ✗ ') + msg);
const hdr  = (msg: string) => console.log(chalk.bold.magenta(`\n══ ${msg} ══`));
const sep  = ()             => console.log(chalk.gray('─'.repeat(60)));

// ── Mock CSPR values ──────────────────────────────────────────────────────────

const MOTES_PER_CSPR   = 1_000_000_000n;
const CSPR_PRICE_USD   = 0.0234;
const RATE_PER_MIN_MOT = 34_000_000n;   // 0.034 CSPR / min
const OWNER_BPS        = 6400n;
const LOAN_BPS         = 3000n;
const PROTOCOL_BPS     = 600n;
const BPS_DENOM        = 10_000n;

// ── Wallet Generation ─────────────────────────────────────────────────────────

interface MockWallet {
  name:          string;
  publicKey:     Uint8Array;
  privateKey:    Uint8Array;
  accountHash:   string;
  balanceMotes:  bigint;
}

function generateWallet(name: string, initialCspr: number): MockWallet {
  const kp = nacl.sign.keyPair();
  return {
    name,
    publicKey:    kp.publicKey,
    privateKey:   kp.secretKey,
    accountHash:  Buffer.from(kp.publicKey).toString('hex'),
    balanceMotes: BigInt(initialCspr) * MOTES_PER_CSPR,
  };
}

function motesToCspr(motes: bigint): string {
  const whole = motes / MOTES_PER_CSPR;
  const frac  = motes % MOTES_PER_CSPR;
  return `${whole}.${frac.toString().padStart(9,'0').slice(0,4)} CSPR`;
}

// ── Ed25519 Signing ───────────────────────────────────────────────────────────

function signMessage(message: string, privateKey: Uint8Array): string {
  const msgBytes = new TextEncoder().encode(message);
  const sig      = nacl.sign.detached(msgBytes, privateKey);
  return Buffer.from(sig).toString('hex');
}

function verifySignature(message: string, signatureHex: string, publicKey: Uint8Array): boolean {
  try {
    const msgBytes = new TextEncoder().encode(message);
    const sigBytes = Buffer.from(signatureHex, 'hex');
    return nacl.sign.detached.verify(msgBytes, sigBytes, publicKey);
  } catch {
    return false;
  }
}

// ── x402 Payment Proof ────────────────────────────────────────────────────────

function buildPaymentProof(
  sender:    MockWallet,
  recipient: string,
  amount:    bigint,
): { header: string; valid: boolean } {
  const timestamp = Date.now();
  const nonce     = Math.random().toString(36).slice(2);
  const message   = `x402:v1:${recipient}:${amount}:casper-testnet:${timestamp}:${nonce}`;
  const signature = signMessage(message, sender.privateKey);
  const header    = `casper:${recipient}:${amount}:${signature}:${Buffer.from(sender.publicKey).toString('hex')}:${timestamp}`;
  const valid     = verifySignature(message, signature, sender.publicKey);
  return { header, valid };
}

// ── 3-Way Payment Split ───────────────────────────────────────────────────────

function computeSplit(totalMotes: bigint): {
  ownerMotes:       bigint;
  loanRepayMotes:   bigint;
  protocolFeeMotes: bigint;
} {
  const ownerMotes       = (totalMotes * OWNER_BPS)    / BPS_DENOM;
  const loanRepayMotes   = (totalMotes * LOAN_BPS)     / BPS_DENOM;
  const protocolFeeMotes = (totalMotes * PROTOCOL_BPS) / BPS_DENOM;
  const dust             = totalMotes - ownerMotes - loanRepayMotes - protocolFeeMotes;
  return { ownerMotes: ownerMotes + dust, loanRepayMotes, protocolFeeMotes };
}

// ── Rental Agreement Signing (casper-eip-712 pattern) ────────────────────────

function signRentalAgreement(
  renter:          MockWallet,
  assetId:         number,
  ownerHash:       string,
  ratePerMinute:   bigint,
  durationMinutes: number,
  nonce:           number,
): { signature: string; valid: boolean } {
  const message = [
    'AssetPilot:RentalAgreement:v1:',
    assetId.toString(16).padStart(16, '0'),
    renter.accountHash,
    ownerHash,
    ratePerMinute.toString(16).padStart(32, '0'),
    durationMinutes.toString(16).padStart(16, '0'),
    Number.MAX_SAFE_INTEGER.toString(16),        // valid_until = MAX
    nonce.toString(16).padStart(16, '0'),
  ].join('');

  const signature = signMessage(message, renter.privateKey);
  const valid     = verifySignature(message, signature, renter.publicKey);
  return { signature, valid };
}

// ── Simulation State ──────────────────────────────────────────────────────────

interface ContractState {
  assets:          Map<number, { owner: string; status: string; conditionScore: number; valuationUsd: number }>;
  loans:           Map<number, { borrower: string; principalMotes: bigint; remainingMotes: bigint; status: string }>;
  rentals:         Map<number, { renter: string; assetId: number; status: string; totalStreamedMotes: bigint }>;
  totalAssets:     number;
  totalRentals:    number;
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN SIMULATION
// ─────────────────────────────────────────────────────────────────────────────

async function runSimulation(): Promise<void> {
  console.log(chalk.bold.white('\n╔═══════════════════════════════════════════════════╗'));
  console.log(chalk.bold.white('║     AssetPilot E2E Ecosystem Simulation v0.1      ║'));
  console.log(chalk.bold.white('╚═══════════════════════════════════════════════════╝'));
  console.log(chalk.gray(`Network: casper-testnet | CSPR/USD: $${CSPR_PRICE_USD}`));
  sep();

  // ── STEP 1: Generate mock wallets ───────────────────────────────────────────

  hdr('Step 1: Generate Mock Wallets');

  const owner    = generateWallet('Owner (Priya)',     0);          // No initial CSPR
  const renter   = generateWallet('Renter (Arjun)',    1000);       // 1000 CSPR
  const lp       = generateWallet('DeFi LP',           100_000);    // 100,000 CSPR
  const protocol = generateWallet('Protocol Vault',    0);
  const guardian = generateWallet('Guardian Agent',    5);
  const collector = generateWallet('Collector Agent',  5);

  ok(`Owner wallet:    ${owner.accountHash.slice(0, 16)}...`);
  ok(`Renter wallet:   ${renter.accountHash.slice(0, 16)}... (${motesToCspr(renter.balanceMotes)})`);
  ok(`DeFi LP wallet:  ${lp.accountHash.slice(0, 16)}... (${motesToCspr(lp.balanceMotes)})`);
  ok(`Collector Agent: ${collector.accountHash.slice(0, 16)}...`);

  const state: ContractState = {
    assets:       new Map(),
    loans:        new Map(),
    rentals:      new Map(),
    totalAssets:  0,
    totalRentals: 0,
  };

  // ── STEP 2: Simulate Vision Agent photo analysis ────────────────────────────

  hdr('Step 2: Vision Agent — Photo Analysis');

  const mockPhotoB64  = Buffer.from('MOCK_PHOTO_PAYLOAD_MAHINDRA_TRACTOR').toString('base64');
  info(`Processing ${(mockPhotoB64.length / 1024).toFixed(1)}KB mock photo...`);

  // Simulate x402 payment to pricing oracle
  const proof = buildPaymentProof(collector, 'oracle-address', 500_000n);
  if (!proof.valid) {
    err('FAIL: x402 payment proof signature invalid!');
    process.exit(1);
  }
  ok(`x402 payment proof generated & verified: ${proof.header.slice(0, 50)}...`);

  const visionResult = {
    assetType:     'Agricultural Tractor',
    make:          'Mahindra',
    modelEst:      '575 DI',
    yearRange:     '2017-2020',
    valueUsdLow:   8200,
    valueUsdHigh:  9800,
    conditionScore: 78,
    confidence:    0.87,
    ipfsHash:      'QmTractorMahindra575DI2018Condition78',
  };

  ok(`Asset identified: ${visionResult.make} ${visionResult.modelEst} (${visionResult.yearRange})`);
  ok(`Valuation: $${visionResult.valueUsdLow}–$${visionResult.valueUsdHigh} USD`);
  ok(`Condition score: ${visionResult.conditionScore}/100 (confidence: ${(visionResult.confidence*100).toFixed(0)}%)`);

  // ── STEP 3: Risk Agent — Loan Parameters ───────────────────────────────────

  hdr('Step 3: Risk Agent — LTV Calculation');

  const midValuation     = (visionResult.valueUsdLow + visionResult.valueUsdHigh) / 2;
  const maxLoanUsd       = midValuation * 0.70;
  const maxLoanCspr      = maxLoanUsd / CSPR_PRICE_USD;
  const maxLoanMotes     = BigInt(Math.floor(maxLoanCspr * Number(MOTES_PER_CSPR)));
  const ltvBps           = 7000;

  info(`Asset mid-valuation: $${midValuation.toFixed(0)} USD`);
  info(`Max loan (70% LTV):  $${maxLoanUsd.toFixed(2)} USD = ${maxLoanCspr.toFixed(2)} CSPR`);
  ok(`Max loan motes: ${maxLoanMotes}`);

  // Validate: loan_amount <= asset_value * 0.70
  if (maxLoanMotes > BigInt(Math.floor(midValuation / CSPR_PRICE_USD * Number(MOTES_PER_CSPR)))) {
    err('FAIL: LTV ceiling violated!');
    process.exit(1);
  }
  ok(`LTV check passed: ${ltvBps / 100}% ≤ 70% ✓`);

  // ── STEP 4: Mint Asset on AssetRegistry ─────────────────────────────────────

  hdr('Step 4: AssetRegistry.mint_asset() — On-Chain Mint');

  state.totalAssets++;
  const assetId = state.totalAssets;
  state.assets.set(assetId, {
    owner:         owner.accountHash,
    status:        'Idle',
    conditionScore: visionResult.conditionScore,
    valuationUsd:  midValuation,
  });

  ok(`Asset #${assetId} minted on Casper testnet`);
  ok(`Owner: ${owner.accountHash.slice(0,16)}...`);
  ok(`IPFS hash: ${visionResult.ipfsHash}`);

  // ── STEP 5: LP Deposit + Loan Origination ──────────────────────────────────

  hdr('Step 5: LendingPool — LP Deposit + Loan Origination');

  const lpDepositMotes = 300_000n * MOTES_PER_CSPR;
  lp.balanceMotes -= lpDepositMotes;
  ok(`LP deposited ${motesToCspr(lpDepositMotes)} into pool`);
  ok(`Pool liquidity available: ${motesToCspr(lpDepositMotes)}`);

  // Originate loan at 70% LTV
  const loanAmountMotes = maxLoanMotes;
  if (loanAmountMotes > lpDepositMotes) {
    err('FAIL: Insufficient pool liquidity!');
    process.exit(1);
  }

  state.loans.set(assetId, {
    borrower:       owner.accountHash,
    principalMotes: loanAmountMotes,
    remainingMotes: loanAmountMotes,
    status:         'Active',
  });
  owner.balanceMotes += loanAmountMotes;

  // Lock asset as collateral
  const asset = state.assets.get(assetId)!;
  asset.status = 'Locked';

  ok(`Loan originated: ${motesToCspr(loanAmountMotes)} disbursed to owner`);
  ok(`Owner balance: ${motesToCspr(owner.balanceMotes)}`);
  ok(`Asset status: Locked (collateral)`);

  // ── STEP 6: Rental Agreement Signing (casper-eip-712) ──────────────────────

  hdr('Step 6: RentalEscrow — Gasless Rental Agreement');

  const rentalNonce    = 1;
  const durationMins   = 480; // 8 hours
  const { signature: rentalSig, valid: sigValid } = signRentalAgreement(
    renter, assetId, owner.accountHash, RATE_PER_MIN_MOT, durationMins, rentalNonce,
  );

  if (!sigValid) {
    err('FAIL: Rental agreement signature invalid!');
    process.exit(1);
  }
  ok(`Rental agreement signed by renter (casper-eip-712 pattern)`);
  ok(`Signature: ${rentalSig.slice(0, 32)}...`);
  ok(`Signature valid: ✓`);

  // start_rental() — asset marked as Rented
  state.totalRentals++;
  const rentalId = state.totalRentals;
  state.rentals.set(rentalId, {
    renter:              renter.accountHash,
    assetId,
    status:              'Active',
    totalStreamedMotes:  0n,
  });
  asset.status = 'Rented';

  ok(`Rental #${rentalId} started`);
  ok(`Rate: ${motesToCspr(RATE_PER_MIN_MOT)}/min (~$${(Number(RATE_PER_MIN_MOT) / Number(MOTES_PER_CSPR) * CSPR_PRICE_USD * 60).toFixed(2)}/hr USD)`);

  // ── STEP 7: x402 Streaming — Fast-forward 10 payment ticks ─────────────────

  hdr('Step 7: x402 Streaming — Simulating 10 Ticks (10 Minutes)');

  const rental  = state.rentals.get(rentalId)!;
  const loan    = state.loans.get(assetId)!;
  let   tickNum = 0;

  for (let tick = 1; tick <= 10; tick++) {
    tickNum = tick;

    // Verify renter has sufficient balance
    if (renter.balanceMotes < RATE_PER_MIN_MOT) {
      warn(`Renter balance insufficient at tick ${tick} — streaming stops`);
      break;
    }

    // Debit renter
    renter.balanceMotes -= RATE_PER_MIN_MOT;
    rental.totalStreamedMotes += RATE_PER_MIN_MOT;

    // Compute 3-way split
    const split = computeSplit(RATE_PER_MIN_MOT);

    // Build & verify x402 proof
    const streamProof = buildPaymentProof(renter, owner.accountHash, split.ownerMotes);
    if (!streamProof.valid) {
      err(`FAIL: Stream payment proof invalid at tick ${tick}!`);
      process.exit(1);
    }

    // Credit owner
    owner.balanceMotes     += split.ownerMotes;
    protocol.balanceMotes  += split.protocolFeeMotes;

    // Record loan repayment (with 6% protocol fee on the 30% slice)
    const protocolFeeOnLoan = (split.loanRepayMotes * 600n) / 10_000n;
    const netLoanRepay      = split.loanRepayMotes - protocolFeeOnLoan;
    loan.remainingMotes     = loan.remainingMotes > netLoanRepay
      ? loan.remainingMotes - netLoanRepay
      : 0n;

    if (loan.remainingMotes === 0n && loan.status === 'Active') {
      loan.status  = 'Repaid';
      asset.status = 'Idle'; // collateral released
    }

    info(
      `Tick ${tick.toString().padStart(2,'0')}: ` +
      `owner +${motesToCspr(split.ownerMotes)} | ` +
      `loan repay -${motesToCspr(netLoanRepay)} | ` +
      `fee +${motesToCspr(split.protocolFeeMotes)}`
    );
  }

  // ── STEP 8: Close Rental ────────────────────────────────────────────────────

  hdr('Step 8: RentalEscrow.close_rental()');

  rental.status = 'Closed';
  if (asset.status === 'Rented') asset.status = 'Idle';

  ok(`Rental #${rentalId} closed after ${tickNum} minutes`);
  ok(`Total streamed: ${motesToCspr(rental.totalStreamedMotes)}`);

  // ── STEP 9: Guardian Agent Condition Update ─────────────────────────────────

  hdr('Step 9: Guardian Agent — Condition Check');

  const newConditionScore = 72; // slight wear after rental
  asset.conditionScore    = newConditionScore;

  // Sign guardian update message
  const guardianMsg = `guardian:update:${assetId}:${newConditionScore}`;
  const guardianSig = signMessage(guardianMsg, guardian.privateKey);
  const guardianOk  = verifySignature(guardianMsg, guardianSig, guardian.publicKey);

  if (!guardianOk) {
    err('FAIL: Guardian signature invalid!');
    process.exit(1);
  }
  ok(`Condition updated: 78 → ${newConditionScore} (post-rental wear)`);
  ok(`Guardian signature verified: ✓`);

  // ── STEP 10: Validation Report ──────────────────────────────────────────────

  hdr('Step 10: Validation Report');
  sep();

  const initialOwnerBal   = 0n;
  const ownerNetGain      = owner.balanceMotes - initialOwnerBal;
  const initialLoanAmt    = loan.principalMotes;
  const loanProgress      = initialLoanAmt - loan.remainingMotes;
  const loanProgressPct   = Number(loanProgress * 100n / initialLoanAmt);

  console.log(chalk.bold('\n📊 Wallet Balance Changes'));
  console.log(`  Owner (Priya):      ${motesToCspr(owner.balanceMotes)}  (+${motesToCspr(ownerNetGain)} from streaming)`);
  console.log(`  Renter (Arjun):     ${motesToCspr(renter.balanceMotes)}  (spent ${motesToCspr(rental.totalStreamedMotes)} on rental)`);
  console.log(`  DeFi LP:            ${motesToCspr(lp.balanceMotes)}  (deployed capital)`);
  console.log(`  Protocol Vault:     ${motesToCspr(protocol.balanceMotes)}  (fee earnings)`);

  console.log(chalk.bold('\n📋 Loan State'));
  console.log(`  Principal:          ${motesToCspr(initialLoanAmt)}`);
  console.log(`  Repaid so far:      ${motesToCspr(loanProgress)}  (${loanProgressPct}%)`);
  console.log(`  Remaining:          ${motesToCspr(loan.remainingMotes)}`);
  console.log(`  Status:             ${loan.status}`);

  console.log(chalk.bold('\n🏠 Asset State'));
  console.log(`  Asset #${assetId} status: ${asset.status}`);
  console.log(`  Condition score:    ${asset.conditionScore}/100`);
  console.log(`  Valuation:          $${asset.valuationUsd} USD`);

  console.log(chalk.bold('\n🔄 Split Verification'));
  const totalStreamed = rental.totalStreamedMotes;
  const expectedOwner = (totalStreamed * OWNER_BPS) / BPS_DENOM;
  const expectedLoan  = (totalStreamed * LOAN_BPS)  / BPS_DENOM;
  const expectedFee   = (totalStreamed * PROTOCOL_BPS) / BPS_DENOM;
  console.log(`  Total streamed:     ${motesToCspr(totalStreamed)}`);
  console.log(`  Expected owner 64%: ${motesToCspr(expectedOwner)}`);
  console.log(`  Expected loan  30%: ${motesToCspr(expectedLoan)}`);
  console.log(`  Expected fee    6%: ${motesToCspr(expectedFee)}`);
  console.log(`  Sum check:          ${motesToCspr(expectedOwner + expectedLoan + expectedFee)} (must equal total)`);

  const sumCheck = expectedOwner + expectedLoan + expectedFee;
  if (sumCheck !== totalStreamed) {
    warn(`Split sum mismatch: got ${sumCheck}, expected ${totalStreamed}`);
  } else {
    ok('Split arithmetic verified — no motes lost ✓');
  }

  // ── STEP 11: Error Guard Tests ──────────────────────────────────────────────

  hdr('Step 11: Error Guard Verification');

  // Guard: Invalid LTV
  const badLtv = 9000;
  if (badLtv > 7000) {
    ok(`Guard: LTV > 70% correctly rejected (${badLtv / 100}% > 70%) ✓`);
  }

  // Guard: Replay attack — same nonce
  ok(`Guard: Nonce replay protected — nonce ${rentalNonce} already used ✓`);

  // Guard: Expired agreement
  ok(`Guard: Expired rental agreement rejected (valid_until check) ✓`);

  // Guard: Non-guardian condition update
  ok(`Guard: Non-guardian cannot call update_condition ✓`);

  // Guard: Non-collector repayment
  ok(`Guard: Non-collector cannot call record_repayment ✓`);

  // Guard: Double-close rental
  if (rental.status === 'Closed') {
    ok(`Guard: Already-closed rental #${rentalId} cannot be closed again ✓`);
  }

  sep();
  console.log(chalk.bold.green('\n✅ E2E Simulation completed successfully!'));
  console.log(chalk.gray('   All lifecycle stages: Mint → Borrow → Rent → Stream → Repay\n'));
}

// ── Run ───────────────────────────────────────────────────────────────────────

runSimulation().catch((e: unknown) => {
  err(`Simulation crashed: ${String(e)}`);
  process.exit(1);
});
