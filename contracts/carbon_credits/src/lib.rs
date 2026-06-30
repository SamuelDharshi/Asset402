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

// ────────────────────────────────────────────────────
//  Error Codes
// ────────────────────────────────────────────────────

#[odra::odra_error]
pub enum CarbonCreditError {
    NotAdmin            = 1,
    InsufficientBalance = 2,
}

// ────────────────────────────────────────────────────
//  Contract Module
// ────────────────────────────────────────────────────

/// CarbonCredit contract — issues and tracks Carbon Use Credits.
#[odra::module(events = [CucIssued, CucTransferred])]
pub struct CarbonCredit {
    /// milliCUC balance per address.
    balances:     Mapping<Address, u64>,
    /// Total milliCUC ever issued across all rentals.
    total_issued: Var<u64>,
    /// Admin address — only admin may call issue_cuc.
    admin:        Var<Address>,
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

    // ── View Entrypoints ─────────────────────────────────────────────────────

    /// Returns the milliCUC balance of the given account.
    pub fn balance_of(&self, account: Address) -> u64 {
        self.balances.get(&account).unwrap_or(0u64)
    }

    /// Returns total milliCUC ever issued.
    pub fn total_issued(&self) -> u64 {
        self.total_issued.get().unwrap_or(0u64)
    }
}
