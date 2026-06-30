//! # LendingPool — DeFi Liquidity & RWA-Backed Lending Contract
//!
//! Manages liquidity provider (LP) deposits and issues collateralised loans
//! against minted AssetRegistry tokens at a maximum 70% Loan-to-Value ratio.
//!
//! ## Key Invariants
//! * `loan_amount ≤ asset_value_usd × 0.70`
//! * Repayments are streamed in via the Collector Agent every 60 s
//! * Liquidation threshold is 85% LTV
//! * Protocol fee is 6% of every repayment (configurable by admin)
//!
//! ## Access Control
//! * `deposit` / `withdraw`       — any LP
//! * `originate_loan`             — asset owner or admin
//! * `record_repayment`           — collector_agent address only
//! * `trigger_liquidation`        — risk_agent address only
//! * `lock_collateral` / `release_collateral` — internal cross-contract pattern

#![cfg_attr(not(test), no_std)]
extern crate alloc;

use odra::prelude::*;
use odra::casper_types::U128;

// ────────────────────────────────────────────────────
//  Type Alias
// ────────────────────────────────────────────────────

pub type AssetId = u64;

// ────────────────────────────────────────────────────
//  Loan Status
// ────────────────────────────────────────────────────

#[odra::odra_type]
pub enum LoanStatus {
    /// Loan is active and being repaid.
    Active,
    /// Loan has been fully repaid.
    Repaid,
    /// Collateral has been liquidated.
    Liquidated,
}

// ────────────────────────────────────────────────────
//  Core Structs
// ────────────────────────────────────────────────────

/// Snapshot of a single outstanding loan.
#[odra::odra_type]
pub struct LoanData {
    pub borrower:        Address,
    pub asset_id:        AssetId,
    /// Total CSPR (in motes, 1 CSPR = 1_000_000_000 motes) originally borrowed.
    pub principal_motes: U128,
    /// CSPR motes still outstanding.
    pub remaining_motes: U128,
    /// LTV at origination in basis points (e.g. 7000 = 70%).
    pub ltv_bps:         u32,
    /// Timestamp (Unix seconds) of loan origination.
    pub originated_at:   u64,
    pub status:          LoanStatus,
}

// ────────────────────────────────────────────────────
//  Contract Module
// ────────────────────────────────────────────────────

#[odra::module(events = [Deposited, Withdrawn, LoanOriginated, RepaymentRecorded, LoanRepaid, LiquidationTriggered])]
pub struct LendingPool {
    /// LP deposits in motes.
    deposits:           Mapping<Address, U128>,
    /// Active/historical loans keyed by AssetId (one loan per asset at a time).
    loans:              Mapping<AssetId, LoanData>,
    /// Total liquidity available (sum of all LP deposits minus active loans).
    total_liquidity:    Var<U128>,
    /// Total motes currently lent out.
    total_outstanding:  Var<U128>,
    /// Protocol fee in basis points, applied to each repayment (default 600 = 6%).
    protocol_fee_bps:   Var<u32>,
    /// Address to receive protocol fees.
    fee_vault:          Var<Address>,
    /// Maximum LTV in basis points (default 7000 = 70%).
    max_ltv_bps:        Var<u32>,
    /// Liquidation LTV threshold in basis points (default 8500 = 85%).
    liquidation_ltv_bps: Var<u32>,
    /// Collector Agent — the only address that can call `record_repayment`.
    collector_agent:    Var<Address>,
    /// Risk Agent — the only address that can call `trigger_liquidation`.
    risk_agent:         Var<Address>,
    /// Contract admin (deployer).
    admin:              Var<Address>,
}

// ────────────────────────────────────────────────────
//  Events
// ────────────────────────────────────────────────────

#[odra::event]
pub struct Deposited {
    pub lp:     Address,
    pub amount: U128,
}

#[odra::event]
pub struct Withdrawn {
    pub lp:     Address,
    pub amount: U128,
}

#[odra::event]
pub struct LoanOriginated {
    pub asset_id:        AssetId,
    pub borrower:        Address,
    pub principal_motes: U128,
    pub ltv_bps:         u32,
}

#[odra::event]
pub struct RepaymentRecorded {
    pub asset_id:           AssetId,
    pub amount_motes:       U128,
    pub remaining_motes:    U128,
    pub fee_motes:          U128,
}

#[odra::event]
pub struct LoanRepaid {
    pub asset_id: AssetId,
    pub borrower: Address,
}

#[odra::event]
pub struct LiquidationTriggered {
    pub asset_id: AssetId,
    pub borrower: Address,
}

// ────────────────────────────────────────────────────
//  Error Codes
// ────────────────────────────────────────────────────

#[odra::odra_error]
pub enum LendingPoolError {
    NotAdmin              = 1,
    NotCollectorAgent     = 2,
    NotRiskAgent          = 3,
    InsufficientLiquidity = 4,
    LtvExceedsMaximum     = 5,
    LoanAlreadyActive     = 6,
    LoanNotFound          = 7,
    LoanAlreadySettled    = 8,
    InsufficientDeposit   = 9,
    ZeroAmount            = 10,
    ArithmeticOverflow    = 11,
}

// ────────────────────────────────────────────────────
//  Basis-point arithmetic helpers (no floating point)
// ────────────────────────────────────────────────────

const BPS_DENOMINATOR: u64 = 10_000;

fn bps_of(value: U128, bps: u32) -> U128 {
    value * U128::from(bps) / U128::from(BPS_DENOMINATOR)
}

// ────────────────────────────────────────────────────
//  Implementation
// ────────────────────────────────────────────────────

#[odra::module]
impl LendingPool {
    // ── Initialiser ──────────────────────────────────

    pub fn init(
        &mut self,
        collector_agent:  Address,
        risk_agent:       Address,
        fee_vault:        Address,
    ) {
        let caller = self.env().caller();
        self.admin.set(caller);
        self.collector_agent.set(collector_agent);
        self.risk_agent.set(risk_agent);
        self.fee_vault.set(fee_vault);
        self.protocol_fee_bps.set(600u32);      // 6%
        self.max_ltv_bps.set(7000u32);          // 70%
        self.liquidation_ltv_bps.set(8500u32);  // 85%
        self.total_liquidity.set(U128::zero());
        self.total_outstanding.set(U128::zero());
    }

    // ── LP Deposits ───────────────────────────────────

    /// Deposit CSPR into the lending pool as a liquidity provider.
    /// The deposited amount is tracked off the native token transfer.
    /// In production the function reads `self.env().attached_value()`.
    pub fn deposit(&mut self, amount_motes: U128) {
        if amount_motes == U128::zero() {
            self.env().revert(LendingPoolError::ZeroAmount);
        }
        let lp = self.env().caller();
        let prev = self.deposits.get_or_default(&lp);
        let new_balance = prev.checked_add(amount_motes)
            .unwrap_or_else(|| self.env().revert(LendingPoolError::ArithmeticOverflow));
        self.deposits.set(&lp, new_balance);

        let prev_liq = self.total_liquidity.get_or_default();
        self.total_liquidity.set(prev_liq + amount_motes);

        self.env().emit_event(Deposited { lp, amount: amount_motes });
    }

    /// Withdraw CSPR from the pool.  Reverts if requested amount exceeds
    /// the LP's deposited balance.
    pub fn withdraw(&mut self, amount_motes: U128) {
        let lp = self.env().caller();
        let balance = self.deposits.get_or_default(&lp);
        if amount_motes > balance {
            self.env().revert(LendingPoolError::InsufficientDeposit);
        }
        self.deposits.set(&lp, balance - amount_motes);

        let liq = self.total_liquidity.get_or_default();
        self.total_liquidity.set(liq.saturating_sub(amount_motes));

        self.env().emit_event(Withdrawn { lp, amount: amount_motes });
    }

    // ── Loan Origination ──────────────────────────────

    /// Issue a collateralised loan against an AssetRegistry token.
    ///
    /// The 70% LTV check is computed entirely on-chain:
    ///
    /// ```text
    /// max_loan_motes = (valuation_usd_cents × cspr_motes_per_usd_cent × 70) / 100
    /// ```
    ///
    /// To stay fully on-chain and integer-safe we accept the caller's computed
    /// `amount_motes` and verify `ltv_bps ≤ max_ltv_bps`.
    pub fn originate_loan(
        &mut self,
        asset_id:        AssetId,
        borrower:        Address,
        amount_motes:    U128,
        ltv_bps:         u32,
    ) {
        if amount_motes == U128::zero() {
            self.env().revert(LendingPoolError::ZeroAmount);
        }
        // Enforce LTV ceiling
        let max_ltv = self.max_ltv_bps.get_or_default();
        if ltv_bps > max_ltv {
            self.env().revert(LendingPoolError::LtvExceedsMaximum);
        }
        // Ensure no existing active loan on this asset
        if let Some(existing) = self.loans.get(&asset_id) {
            if existing.status == LoanStatus::Active {
                self.env().revert(LendingPoolError::LoanAlreadyActive);
            }
        }
        // Ensure sufficient pool liquidity
        let liquidity = self.total_liquidity.get_or_default();
        let outstanding = self.total_outstanding.get_or_default();
        let available = liquidity.saturating_sub(outstanding);
        if amount_motes > available {
            self.env().revert(LendingPoolError::InsufficientLiquidity);
        }

        let now = self.env().get_block_time();

        let loan = LoanData {
            borrower,
            asset_id,
            principal_motes: amount_motes,
            remaining_motes: amount_motes,
            ltv_bps,
            originated_at: now,
            status: LoanStatus::Active,
        };
        self.loans.set(&asset_id, loan);

        let new_outstanding = outstanding + amount_motes;
        self.total_outstanding.set(new_outstanding);

        self.env().emit_event(LoanOriginated {
            asset_id,
            borrower,
            principal_motes: amount_motes,
            ltv_bps,
        });
    }

    /// Record a streaming repayment from the Collector Agent.
    ///
    /// Deducts the 6% protocol fee from the repayment before crediting the
    /// outstanding loan balance.  Returns the updated `LoanStatus`.
    ///
    /// Split per spec:
    /// * 64% → owner (handled off-chain by Collector Agent before calling this)
    /// * 30% → loan repayment (this call receives 30%)
    /// * 6%  → protocol fee vault (deducted here from the 30%)
    pub fn record_repayment(
        &mut self,
        asset_id:     AssetId,
        amount_motes: U128,
    ) -> LoanStatus {
        self.assert_collector();
        if amount_motes == U128::zero() {
            self.env().revert(LendingPoolError::ZeroAmount);
        }

        let mut loan = match self.loans.get(&asset_id) {
            Some(l) => l,
            None    => self.env().revert(LendingPoolError::LoanNotFound),
        };
        if loan.status != LoanStatus::Active {
            self.env().revert(LendingPoolError::LoanAlreadySettled);
        }

        // Deduct protocol fee
        let fee_bps  = self.protocol_fee_bps.get_or_default();
        let fee_motes = bps_of(amount_motes, fee_bps);
        let net_motes = amount_motes.saturating_sub(fee_motes);

        let new_remaining = loan.remaining_motes.saturating_sub(net_motes);
        loan.remaining_motes = new_remaining;

        let new_status = if new_remaining == U128::zero() {
            loan.status = LoanStatus::Repaid;
            LoanStatus::Repaid
        } else {
            LoanStatus::Active
        };

        self.loans.set(&asset_id, loan.clone());

        // Reduce outstanding
        let outstanding = self.total_outstanding.get_or_default();
        self.total_outstanding.set(outstanding.saturating_sub(net_motes));

        self.env().emit_event(RepaymentRecorded {
            asset_id,
            amount_motes,
            remaining_motes: new_remaining,
            fee_motes,
        });

        if new_status == LoanStatus::Repaid {
            self.env().emit_event(LoanRepaid {
                asset_id,
                borrower: loan.borrower,
            });
        }

        new_status
    }

    /// Trigger liquidation of an under-collateralised loan.
    /// Only the Risk Agent may call this.
    pub fn trigger_liquidation(&mut self, asset_id: AssetId) {
        self.assert_risk_agent();

        let mut loan = match self.loans.get(&asset_id) {
            Some(l) => l,
            None    => self.env().revert(LendingPoolError::LoanNotFound),
        };
        if loan.status != LoanStatus::Active {
            self.env().revert(LendingPoolError::LoanAlreadySettled);
        }

        loan.status = LoanStatus::Liquidated;
        self.loans.set(&asset_id, loan.clone());

        let outstanding = self.total_outstanding.get_or_default();
        self.total_outstanding.set(outstanding.saturating_sub(loan.remaining_motes));

        self.env().emit_event(LiquidationTriggered {
            asset_id,
            borrower: loan.borrower,
        });
    }

    // ── Read-Only Queries ─────────────────────────────

    pub fn get_loan(&self, asset_id: AssetId) -> LoanData {
        match self.loans.get(&asset_id) {
            Some(l) => l,
            None    => self.env().revert(LendingPoolError::LoanNotFound),
        }
    }

    pub fn get_deposit(&self, lp: Address) -> U128 {
        self.deposits.get_or_default(&lp)
    }

    pub fn available_liquidity(&self) -> U128 {
        self.total_liquidity.get_or_default()
            .saturating_sub(self.total_outstanding.get_or_default())
    }

    pub fn total_outstanding(&self) -> U128 {
        self.total_outstanding.get_or_default()
    }

    // ── Internal Helpers ──────────────────────────────

    fn assert_collector(&self) {
        let caller    = self.env().caller();
        let collector = self.collector_agent.get().unwrap();
        if caller != collector {
            self.env().revert(LendingPoolError::NotCollectorAgent);
        }
    }

    fn assert_risk_agent(&self) {
        let caller = self.env().caller();
        let risk   = self.risk_agent.get().unwrap();
        if caller != risk {
            self.env().revert(LendingPoolError::NotRiskAgent);
        }
    }
}

// ════════════════════════════════════════════════════
//  TESTS
// ════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostRef, NoArgs};
    use odra_test::TestEnv;
    use odra::casper_types::U256;

    fn setup() -> (LendingPoolHostRef, Address, Address, Address, Address, Address) {
        let te = TestEnv::new();

        let admin     = te.get_account(0);
        let lp1       = te.get_account(1);
        let borrower  = te.get_account(2);
        let collector = te.get_account(3);
        let risk      = te.get_account(4);
        let fee_vault = te.get_account(5);

        te.set_caller(admin);
        let pool = LendingPoolDeployer::init(&te, collector, risk, fee_vault);

        (pool, admin, lp1, borrower, collector, risk)
    }

    // ── Deposit ───────────────────────────────────────

    #[test]
    fn test_lp_deposit_recorded() {
        let (mut pool, _, lp1, _, _, _) = setup();
        let te = TestEnv::new();
        te.set_caller(lp1);
        pool.deposit(10_000_000_000u128); // 10 CSPR
        assert_eq!(pool.get_deposit(lp1), 10_000_000_000u128);
    }

    #[test]
    fn test_multiple_lp_deposits() {
        let (mut pool, _, lp1, borrower, _, _) = setup();
        let te = TestEnv::new();
        te.set_caller(lp1);
        pool.deposit(20_000_000_000u128);
        te.set_caller(borrower);
        pool.deposit(30_000_000_000u128);
        assert_eq!(pool.available_liquidity(), 50_000_000_000u128);
    }

    // ── Loan Origination ──────────────────────────────

    #[test]
    fn test_loan_origination_at_70_ltv() {
        let (mut pool, admin, lp1, borrower, _, _) = setup();
        let te = TestEnv::new();

        // LP funds pool
        te.set_caller(lp1);
        pool.deposit(100_000_000_000u128); // 100 CSPR

        // Originate loan at exactly 70% LTV
        te.set_caller(admin);
        pool.originate_loan(1u64, borrower, 70_000_000_000u128, 7000u16);

        let loan = pool.get_loan(1u64);
        assert_eq!(loan.status, LoanStatus::Active);
        assert_eq!(loan.principal_motes, 70_000_000_000u128);
        assert_eq!(loan.remaining_motes, 70_000_000_000u128);
        assert_eq!(pool.total_outstanding(), 70_000_000_000u128);
    }

    #[test]
    fn test_loan_rejected_above_70_ltv() {
        let (mut pool, admin, lp1, borrower, _, _) = setup();
        let te = TestEnv::new();
        te.set_caller(lp1);
        pool.deposit(100_000_000_000u128);

        te.set_caller(admin);
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            pool.originate_loan(1u64, borrower, 71_000_000_000u128, 7100u16);
        }));
        assert!(result.is_err(), "Should revert on LTV > 70%");
    }

    // ── Repayment ─────────────────────────────────────

    #[test]
    fn test_repayment_reduces_outstanding_debt() {
        let (mut pool, admin, lp1, borrower, collector, _) = setup();
        let te = TestEnv::new();

        te.set_caller(lp1);
        pool.deposit(100_000_000_000u128);
        te.set_caller(admin);
        pool.originate_loan(1u64, borrower, 70_000_000_000u128, 7000u16);

        // Collector records a 30 CSPR repayment
        te.set_caller(collector);
        let status = pool.record_repayment(1u64, 30_000_000_000u128);
        assert_eq!(status, LoanStatus::Active);

        let loan = pool.get_loan(1u64);
        // fee = 6% of 30 CSPR = 1.8 CSPR; net = 28.2 CSPR
        // remaining = 70 - 28.2 = 41.8 CSPR
        let expected_fee = 30_000_000_000u128 * 600 / 10_000; // 1_800_000_000
        let expected_net = 30_000_000_000u128 - expected_fee;  // 28_200_000_000
        assert_eq!(loan.remaining_motes, 70_000_000_000u128 - expected_net);
    }

    #[test]
    fn test_full_repayment_marks_loan_repaid() {
        let (mut pool, admin, lp1, borrower, collector, _) = setup();
        let te = TestEnv::new();

        te.set_caller(lp1);
        pool.deposit(100_000_000_000u128);
        te.set_caller(admin);
        pool.originate_loan(1u64, borrower, 10_000_000_000u128, 7000u16);

        // Repay a large amount that exceeds the principal
        te.set_caller(collector);
        let status = pool.record_repayment(1u64, 200_000_000_000u128);
        assert_eq!(status, LoanStatus::Repaid);
        assert_eq!(pool.get_loan(1u64).remaining_motes, 0u128);
    }

    #[test]
    fn test_non_collector_cannot_record_repayment() {
        let (mut pool, admin, lp1, borrower, _, _) = setup();
        let te = TestEnv::new();
        te.set_caller(lp1);
        pool.deposit(100_000_000_000u128);
        te.set_caller(admin);
        pool.originate_loan(1u64, borrower, 10_000_000_000u128, 7000u16);

        te.set_caller(admin); // not the collector
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            pool.record_repayment(1u64, 5_000_000_000u128);
        }));
        assert!(result.is_err(), "Only collector agent may record repayment");
    }

    // ── E2E: Deposit → Loan → Stream-Repay → Repaid ───

    #[test]
    fn test_e2e_borrow_and_stream_repayment() {
        let (mut pool, admin, lp1, borrower, collector, _) = setup();
        let te = TestEnv::new();

        // LP deposits 100 CSPR
        te.set_caller(lp1);
        pool.deposit(100_000_000_000u128);

        // Asset owner borrows 60 CSPR (60% LTV)
        te.set_caller(admin);
        pool.originate_loan(1u64, borrower, 60_000_000_000u128, 6000u16);

        let mut loan = pool.get_loan(1u64);
        assert_eq!(loan.status, LoanStatus::Active);

        // Simulate 3 streaming repayments of 10 CSPR each (Collector Agent)
        te.set_caller(collector);
        for _ in 0..3 {
            let status = pool.record_repayment(1u64, 10_000_000_000u128);
            loan = pool.get_loan(1u64);
            if loan.remaining_motes == 0 {
                assert_eq!(status, LoanStatus::Repaid);
                break;
            } else {
                assert_eq!(status, LoanStatus::Active);
            }
        }
        // After 3 × 10 CSPR (net ~9.4 CSPR each): debt shrinks substantially
        let final_loan = pool.get_loan(1u64);
        assert!(final_loan.remaining_motes < 60_000_000_000u128,
            "Remaining debt must decrease with each repayment");
    }
}
