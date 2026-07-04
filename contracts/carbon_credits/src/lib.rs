//! # CarbonCredit — Carbon Use Credits for Shared Asset Rentals
//!
//! Issues Carbon Use Credits (CUC) to asset owners and renters after each
//! completed rental session. CUC represents embodied carbon avoided by
//! sharing an asset instead of manufacturing additional units.
//!
//! ## Formula
//! `CUC = (mfgr_carbon_kg / asset_lifetime_hours) × rental_hours × 0.3`
//!
//! ## Access Control
//! * `issue_cuc`    — admin only (called by Guardian/Collector agent)
//! * `transfer`     — any caller (transfers from caller's balance)
//! * `balance_of`   — view
//! * `total_issued` — view

#![cfg_attr(not(test), no_std)]
extern crate alloc;

use odra::prelude::*;

// ────────────────────────────────────────────────────
//  Core Structs
// ────────────────────────────────────────────────────

/// Returned by `redeem_for_discount` — a receipt the caller (or the backend
/// on its behalf) can present when booking maintenance or paying a rental
/// fee to apply the corresponding percentage discount off-chain.
#[odra::odra_type]
pub struct DiscountVoucher {
    pub voucher_id:         u64,
    pub holder:             Address,
    pub milli_cuc_redeemed: u64,
    /// Discount in basis points (100 = 1%), capped at `MAX_DISCOUNT_BPS`.
    pub discount_bps:       u32,
    pub issued_at:          u64,
}

/// milliCUC → discount conversion rate: 1 CUC (1000 milliCUC) = 100 bps (1%).
const MILLI_CUC_PER_BPS: u64 = 10;
/// Discount is capped at 50% off a single fee, regardless of CUC redeemed.
const MAX_DISCOUNT_BPS: u32 = 5000;

// ────────────────────────────────────────────────────
//  Events
// ────────────────────────────────────────────────────

/// Emitted when new CUC tokens are issued after a rental session.
#[odra::event]
pub struct CucIssued {
    pub owner:             Address,
    pub renter:            Address,
    /// Asset type numeric code (1=Tractor, 2=Excavator, etc.)
    pub asset_type_code:   u8,
    /// Rental duration in tenths-of-hours (e.g. 25 = 2.5 hours)
    pub rental_hours_tenths: u64,
    /// milliCUC credited to owner (1 CUC = 1000 milliCUC)
    pub cuc_owner:         u64,
    /// milliCUC credited to renter
    pub cuc_renter:        u64,
}

/// Emitted when a user transfers CUC to another address.
#[odra::event]
pub struct CucTransferred {
    pub from:   Address,
    pub to:     Address,
    pub amount: u64,
}

/// Emitted when a user redeems CUC for a rental-fee discount voucher.
#[odra::event]
pub struct CucRedeemed {
    pub voucher_id:         u64,
    pub holder:             Address,
    pub milli_cuc_redeemed: u64,
    pub discount_bps:       u32,
}

// ────────────────────────────────────────────────────
//  Error Codes
// ────────────────────────────────────────────────────

#[odra::odra_error]
pub enum CarbonCreditError {
    NotAdmin            = 1,
    InsufficientBalance = 2,
    ZeroAmount          = 3,
}

// ────────────────────────────────────────────────────
//  Contract Module
// ────────────────────────────────────────────────────

/// CarbonCredit contract — issues and tracks Carbon Use Credits.
#[odra::module(events = [CucIssued, CucTransferred, CucRedeemed])]
pub struct CarbonCredit {
    /// milliCUC balance per address.
    balances:      Mapping<Address, u64>,
    /// Total milliCUC ever issued across all rentals.
    total_issued:  Var<u64>,
    /// Admin address — only admin may call issue_cuc.
    admin:         Var<Address>,
    /// Auto-incrementing voucher counter.
    next_voucher_id: Var<u64>,
    /// Issued discount vouchers, keyed by voucher_id — kept for audit/lookup
    /// by whatever route later applies the discount (rental fee, maintenance
    /// deposit, etc.).
    vouchers:      Mapping<u64, DiscountVoucher>,
}

#[odra::module]
impl CarbonCredit {
    // ── Constructor ──────────────────────────────────────────────────────────

    /// Initialise the contract. Sets caller as admin.
    pub fn init(&mut self) {
        let caller = self.env().caller();
        self.admin.set(caller);
    }

    // ── Admin Entrypoints ────────────────────────────────────────────────────

    /// Issue Carbon Use Credits after a completed rental session.
    ///
    /// * `owner`               — asset owner address
    /// * `renter`              — renter address
    /// * `asset_type_code`     — numeric asset category code
    /// * `rental_hours_tenths` — rental duration in tenths of hours
    ///
    /// Formula: milliCUC = rental_hours_tenths × 32 (≈ 3.2 CUC per 10 hours)
    /// Split 50/50 between owner and renter.
    pub fn issue_cuc(
        &mut self,
        owner:               Address,
        renter:              Address,
        asset_type_code:     u8,
        rental_hours_tenths: u64,
    ) {
        let caller = self.env().caller();
        let admin  = self.admin.get().unwrap_or(caller);
        if caller != admin {
            self.env().revert(CarbonCreditError::NotAdmin);
        }

        // milliCUC = rental_hours_tenths × 32 ÷ 2 (split between two parties)
        let total_milli_cuc: u64 = rental_hours_tenths.saturating_mul(32);
        let half               = total_milli_cuc / 2;
        let owner_cuc          = half;
        let renter_cuc         = total_milli_cuc - half; // renter gets the remainder

        // Credit owner
        let prev_owner = self.balances.get(&owner).unwrap_or(0u64);
        self.balances.set(&owner, prev_owner.saturating_add(owner_cuc));

        // Credit renter
        let prev_renter = self.balances.get(&renter).unwrap_or(0u64);
        self.balances.set(&renter, prev_renter.saturating_add(renter_cuc));

        // Update total
        let prev_total = self.total_issued.get().unwrap_or(0u64);
        self.total_issued.set(prev_total.saturating_add(total_milli_cuc));

        self.env().emit_event(CucIssued {
            owner,
            renter,
            asset_type_code,
            rental_hours_tenths,
            cuc_owner:  owner_cuc,
            cuc_renter: renter_cuc,
        });
    }

    // ── User Entrypoints ─────────────────────────────────────────────────────

    /// Transfer milliCUC from caller to another address.
    pub fn transfer(&mut self, to: Address, amount: u64) {
        let from     = self.env().caller();
        let from_bal = self.balances.get(&from).unwrap_or(0u64);
        if from_bal < amount {
            self.env().revert(CarbonCreditError::InsufficientBalance);
        }
        self.balances.set(&from, from_bal - amount);

        let to_bal = self.balances.get(&to).unwrap_or(0u64);
        self.balances.set(&to, to_bal.saturating_add(amount));

        self.env().emit_event(CucTransferred { from, to, amount });
    }

    /// Burn `amount` milliCUC from the caller's balance in exchange for a
    /// rental-fee discount voucher (D&P Section 5, CarbonUseCredit contract).
    ///
    /// The CUC is burned immediately (never double-spendable); the discount
    /// itself is applied off-chain by whichever route later charges the fee
    /// (rental booking, maintenance deposit), which looks up the voucher by
    /// id to confirm it hasn't already been consumed there.
    pub fn redeem_for_discount(&mut self, amount: u64) -> DiscountVoucher {
        if amount == 0 {
            self.env().revert(CarbonCreditError::ZeroAmount);
        }
        let holder     = self.env().caller();
        let holder_bal = self.balances.get(&holder).unwrap_or(0u64);
        if holder_bal < amount {
            self.env().revert(CarbonCreditError::InsufficientBalance);
        }
        self.balances.set(&holder, holder_bal - amount);

        let discount_bps = core::cmp::min(
            (amount / MILLI_CUC_PER_BPS) as u32,
            MAX_DISCOUNT_BPS,
        );

        let voucher_id = self.next_voucher_id.get_or_default() + 1;
        self.next_voucher_id.set(voucher_id);

        let voucher = DiscountVoucher {
            voucher_id,
            holder,
            milli_cuc_redeemed: amount,
            discount_bps,
            issued_at: self.env().get_block_time(),
        };
        self.vouchers.set(&voucher_id, voucher.clone());

        self.env().emit_event(CucRedeemed {
            voucher_id,
            holder,
            milli_cuc_redeemed: amount,
            discount_bps,
        });

        voucher
    }

    // ── View Entrypoints ─────────────────────────────────────────────────────

    /// Returns the milliCUC balance of the given account.
    pub fn balance_of(&self, account: Address) -> u64 {
        self.balances.get(&account).unwrap_or(0u64)
    }

    /// Returns total milliCUC ever issued.
    pub fn total_issued(&self) -> u64 {
        self.total_issued.get().unwrap_or(0u64)
    }

    /// Looks up a previously issued discount voucher by id.
    pub fn get_voucher(&self, voucher_id: u64) -> Option<DiscountVoucher> {
        self.vouchers.get(&voucher_id)
    }
}

// ════════════════════════════════════════════════════
//  TESTS
// ════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostRef, NoArgs};

    fn setup() -> (CarbonCreditHostRef, Address, Address, Address) {
        let env = odra_test::env();
        let admin  = env.get_account(0);
        let owner  = env.get_account(1);
        let renter = env.get_account(2);

        env.set_caller(admin);
        let cuc = CarbonCredit::deploy(&env, NoArgs);
        (cuc, admin, owner, renter)
    }

    #[test]
    fn test_admin_can_issue_credits_split_to_owner_and_renter() {
        let (mut cuc, admin, owner, renter) = setup();
        cuc.env().set_caller(admin);

        // 25 tenths-of-hours (2.5h) × 32 = 800 milliCUC total, split 400/400
        cuc.issue_cuc(owner, renter, 2u8, 25u64);

        assert_eq!(cuc.balance_of(owner), 400u64);
        assert_eq!(cuc.balance_of(renter), 400u64);
        assert_eq!(cuc.total_issued(), 800u64);
    }

    #[test]
    fn test_non_admin_cannot_issue_credits() {
        let (mut cuc, _, owner, renter) = setup();
        cuc.env().set_caller(renter); // not the admin
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            cuc.issue_cuc(owner, renter, 2u8, 25u64);
        }));
        assert!(result.is_err(), "Only admin may issue CUC");
    }

    #[test]
    fn test_transfer_moves_balance_and_preserves_total_supply() {
        let (mut cuc, admin, owner, renter) = setup();
        cuc.env().set_caller(admin);
        cuc.issue_cuc(owner, renter, 2u8, 100u64); // 3200 milliCUC total, 1600/1600

        cuc.env().set_caller(owner);
        cuc.transfer(renter, 600u64);

        assert_eq!(cuc.balance_of(owner), 1000u64);
        assert_eq!(cuc.balance_of(renter), 2200u64);
        // Total supply (sum of balances) must be unchanged by a transfer.
        assert_eq!(cuc.balance_of(owner) + cuc.balance_of(renter), 3200u64);
        assert_eq!(cuc.total_issued(), 3200u64);
    }

    #[test]
    fn test_transfer_more_than_balance_reverts_without_underflow() {
        let (mut cuc, admin, owner, renter) = setup();
        cuc.env().set_caller(admin);
        cuc.issue_cuc(owner, renter, 2u8, 10u64); // 320 milliCUC total, 160/160

        cuc.env().set_caller(owner);
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            cuc.transfer(renter, 999_999u64); // far more than owner's 160 balance
        }));
        assert!(result.is_err(), "Transferring more than balance must revert, not underflow");
        // Balance must be unchanged after the reverted attempt.
        assert_eq!(cuc.balance_of(owner), 160u64);
    }

    // ── Redeem for Discount ───────────────────────────

    #[test]
    fn test_redeem_for_discount_burns_balance_and_returns_voucher() {
        let (mut cuc, admin, owner, renter) = setup();
        cuc.env().set_caller(admin);
        cuc.issue_cuc(owner, renter, 2u8, 100u64); // 1600 milliCUC to owner

        cuc.env().set_caller(owner);
        let voucher = cuc.redeem_for_discount(500u64); // 500 / 10 = 50 bps

        assert_eq!(voucher.voucher_id, 1);
        assert_eq!(voucher.holder, owner);
        assert_eq!(voucher.milli_cuc_redeemed, 500u64);
        assert_eq!(voucher.discount_bps, 50);
        assert_eq!(cuc.balance_of(owner), 1100u64); // 1600 - 500

        // total_issued (lifetime mint count) is unaffected by redemption/burn.
        assert_eq!(cuc.total_issued(), 3200u64);

        let stored = cuc.get_voucher(1).expect("voucher should be stored");
        assert_eq!(stored.discount_bps, 50);
    }

    #[test]
    fn test_redeem_for_discount_caps_at_max_bps() {
        let (mut cuc, admin, owner, renter) = setup();
        cuc.env().set_caller(admin);
        cuc.issue_cuc(owner, renter, 2u8, 100_000u64); // huge session → plenty of balance

        cuc.env().set_caller(owner);
        let voucher = cuc.redeem_for_discount(1_000_000u64); // would be 100,000 bps uncapped
        assert_eq!(voucher.discount_bps, 5000); // capped at 50%
    }

    #[test]
    fn test_redeem_for_discount_more_than_balance_reverts() {
        let (mut cuc, admin, owner, renter) = setup();
        cuc.env().set_caller(admin);
        cuc.issue_cuc(owner, renter, 2u8, 10u64); // 160 milliCUC to owner

        cuc.env().set_caller(owner);
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            cuc.redeem_for_discount(999_999u64);
        }));
        assert!(result.is_err(), "Redeeming more than balance must revert");
        assert_eq!(cuc.balance_of(owner), 160u64);
    }

    #[test]
    fn test_redeem_for_discount_zero_amount_reverts() {
        let (mut cuc, _admin, owner, _renter) = setup();
        cuc.env().set_caller(owner);
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            cuc.redeem_for_discount(0u64);
        }));
        assert!(result.is_err(), "Redeeming zero should revert");
    }
}
