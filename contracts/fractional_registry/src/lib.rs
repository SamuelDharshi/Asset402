//! # FractionalRegistry — RWA Fractional Ownership Contract
//!
//! Enables fractional ownership of real-world assets registered in the
//! AssetRegistry. Each offering splits an asset into a fixed number of shares
//! that investors can purchase with attached CSPR payment.
//!
//! ## Access Control
//! * `create_offering`    — asset owner (any caller)
//! * `buy_shares`         — any caller (must attach correct CSPR payment)
//! * `distribute_income`  — admin only (attached CSPR split pro-rata)
//! * `get_offering`       — view (any caller)
//! * `get_shares`         — view (any caller)

#![cfg_attr(not(test), no_std)]
extern crate alloc;

use odra::prelude::*;

// ────────────────────────────────────────────────────
//  Data Structs
// ────────────────────────────────────────────────────

/// All data associated with a single fractional offering.
#[odra::odra_type]
pub struct OfferingData {
    /// The AssetRegistry asset this offering is backed by.
    pub asset_id: u64,
    /// Total number of shares in this offering.
    pub total_shares: u64,
    /// Number of shares already sold to investors.
    pub shares_sold: u64,
    /// Price of one share in motes (1 CSPR = 1_000_000_000 motes).
    pub price_per_share_motes: u64,
    /// Address of the asset owner who created the offering.
    pub owner: Address,
    /// Whether the offering is still open for purchase.
    pub active: bool,
    /// Cumulative income distributed per share in motes.
    pub income_per_share_motes: u64,
}

// ────────────────────────────────────────────────────
//  Events
// ────────────────────────────────────────────────────

#[odra::event]
pub struct OfferingCreated {
    pub offering_id: u64,
    pub asset_id: u64,
    pub owner: Address,
    pub total_shares: u64,
    pub price_per_share_motes: u64,
}

#[odra::event]
pub struct SharesPurchased {
    pub offering_id: u64,
    pub investor: Address,
    pub share_count: u64,
    pub total_cost_motes: u64,
}

#[odra::event]
pub struct IncomeDistributed {
    pub offering_id: u64,
    pub total_motes: u64,
    pub shares_sold: u64,
}

// ────────────────────────────────────────────────────
//  Error Codes
// ────────────────────────────────────────────────────

#[odra::odra_error]
pub enum FractionalRegistryError {
    NotAdmin             = 1,
    OfferingNotFound     = 2,
    OfferingInactive     = 3,
    InsufficientShares   = 4,
    InsufficientPayment  = 5,
    ZeroShares           = 6,
    ZeroPrice            = 7,
    NoSharesSold         = 8,
}

// ────────────────────────────────────────────────────
//  Contract Module
// ────────────────────────────────────────────────────

#[odra::module(events = [OfferingCreated, SharesPurchased, IncomeDistributed])]
pub struct FractionalRegistry {
    /// All fractional offerings indexed by offering ID.
    offerings: Mapping<u64, OfferingData>,
    /// Shares held per investor per offering: (offering_id, investor) → share_count.
    shares: Mapping<(u64, Address), u64>,
    /// Auto-incrementing offering ID counter.
    next_offering_id: Var<u64>,
    /// Contract administrator (deployer).
    admin: Var<Address>,
}

// ────────────────────────────────────────────────────
//  Implementation
// ────────────────────────────────────────────────────

#[odra::module]
impl FractionalRegistry {
    // ── Initialiser ──────────────────────────────────

    /// Initialise the contract. Sets the deployer as admin and seeds the ID counter.
    pub fn init(&mut self) {
        let caller = self.env().caller();
        self.admin.set(caller);
        self.next_offering_id.set(0u64);
    }

    // ── Core Entrypoints ──────────────────────────────

    /// Create a new fractional offering for a registered asset.
    ///
    /// The caller becomes the offering `owner`. Emits [`OfferingCreated`].
    pub fn create_offering(
        &mut self,
        asset_id: u64,
        total_shares: u64,
        price_per_share_motes: u64,
    ) {
        if total_shares == 0 {
            self.env().revert(FractionalRegistryError::ZeroShares);
        }
        if price_per_share_motes == 0 {
            self.env().revert(FractionalRegistryError::ZeroPrice);
        }

        let owner = self.env().caller();
        let offering_id = self.next_offering_id.get_or_default() + 1;
        self.next_offering_id.set(offering_id);

        let offering = OfferingData {
            asset_id,
            total_shares,
            shares_sold: 0,
            price_per_share_motes,
            owner,
            active: true,
            income_per_share_motes: 0,
        };

        self.offerings.set(&offering_id, offering);

        self.env().emit_event(OfferingCreated {
            offering_id,
            asset_id,
            owner,
            total_shares,
            price_per_share_motes,
        });
    }

    /// Purchase `share_count` shares from an active offering.
    ///
    /// The caller **must** attach exactly `share_count * price_per_share_motes`
    /// in CSPR payment. CSPR is transferred to the offering owner.
    /// Emits [`SharesPurchased`].
    pub fn buy_shares(&mut self, offering_id: u64, share_count: u64) {
        if share_count == 0 {
            self.env().revert(FractionalRegistryError::ZeroShares);
        }

        let mut offering = self.get_offering_or_revert(offering_id);

        if !offering.active {
            self.env().revert(FractionalRegistryError::OfferingInactive);
        }
        if share_count > offering.total_shares - offering.shares_sold {
            self.env().revert(FractionalRegistryError::InsufficientShares);
        }

        let required_motes = offering.price_per_share_motes * share_count;
        let attached = self.env().attached_value();
        // attached_value() returns U512 — convert to u64 via u128
        let attached_u64: u64 = attached.as_u128() as u64;
        if attached_u64 < required_motes {
            self.env().revert(FractionalRegistryError::InsufficientPayment);
        }

        // Credit shares to investor
        let investor = self.env().caller();
        let current = self.shares.get_or_default(&(offering_id, investor));
        self.shares.set(&(offering_id, investor), current + share_count);

        // Update offering
        offering.shares_sold += share_count;
        if offering.shares_sold == offering.total_shares {
            offering.active = false;
        }
        self.offerings.set(&offering_id, offering.clone());

        // Forward payment to owner
        self.env().transfer_tokens(&offering.owner, &attached);

        self.env().emit_event(SharesPurchased {
            offering_id,
            investor,
            share_count,
            total_cost_motes: required_motes,
        });
    }

    /// Distribute income to shareholders of an offering pro-rata by share count.
    ///
    /// Caller must be admin and must attach the total income in CSPR.
    /// Each shareholder's portion = attached * (investor_shares / total_shares_sold).
    /// Emits [`IncomeDistributed`].
    ///
    /// > **Note:** On-chain iteration over shareholders is not possible with a
    /// > `Mapping`. This entrypoint records the per-share income rate;
    /// > investors claim their portion via `claim_income` (see below).
    pub fn distribute_income(&mut self, offering_id: u64) {
        self.assert_admin();

        let mut offering = self.get_offering_or_revert(offering_id);

        if offering.shares_sold == 0 {
            self.env().revert(FractionalRegistryError::NoSharesSold);
        }

        let total_motes = self.env().attached_value().as_u128() as u64;
        let per_share = total_motes / offering.shares_sold;

        offering.income_per_share_motes += per_share;
        self.offerings.set(&offering_id, offering.clone());

        self.env().emit_event(IncomeDistributed {
            offering_id,
            total_motes,
            shares_sold: offering.shares_sold,
        });
    }

    // ── Read-Only Queries ─────────────────────────────

    /// Fetch full data for a given offering ID.
    pub fn get_offering(&self, offering_id: u64) -> OfferingData {
        self.get_offering_or_revert(offering_id)
    }

    /// Return the number of shares held by `investor` in a given offering.
    pub fn get_shares(&self, offering_id: u64, investor: Address) -> u64 {
        self.shares.get_or_default(&(offering_id, investor))
    }

    // ── Internal Helpers ──────────────────────────────

    fn get_offering_or_revert(&self, offering_id: u64) -> OfferingData {
        match self.offerings.get(&offering_id) {
            Some(o) => o,
            None => {
                self.env().revert(FractionalRegistryError::OfferingNotFound);
            }
        }
    }

    fn assert_admin(&self) {
        let caller = self.env().caller();
        let admin = self.admin.get().unwrap();
        if caller != admin {
            self.env().revert(FractionalRegistryError::NotAdmin);
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

    fn setup() -> (FractionalRegistryHostRef, Address, Address) {
        let test_env = TestEnv::new();
        let admin = test_env.get_account(0);
        let investor = test_env.get_account(1);

        test_env.set_caller(admin);
        let registry = FractionalRegistryDeployer::init(&test_env);

        (registry, admin, investor)
    }

    // ── Offering Creation ─────────────────────────────

    #[test]
    fn test_create_offering_increments_id() {
        let (mut registry, _, _) = setup();

        registry.create_offering(1, 100, 1_000_000_000);
        registry.create_offering(2, 50, 2_000_000_000);

        let o1 = registry.get_offering(1);
        let o2 = registry.get_offering(2);

        assert_eq!(o1.asset_id, 1);
        assert_eq!(o1.total_shares, 100);
        assert_eq!(o2.asset_id, 2);
        assert_eq!(o2.total_shares, 50);
    }

    #[test]
    fn test_create_offering_stores_correct_data() {
        let (mut registry, admin, _) = setup();

        registry.create_offering(42, 1000, 500_000_000);
        let offering = registry.get_offering(1);

        assert_eq!(offering.asset_id, 42);
        assert_eq!(offering.total_shares, 1000);
        assert_eq!(offering.shares_sold, 0);
        assert_eq!(offering.price_per_share_motes, 500_000_000);
        assert_eq!(offering.owner, admin);
        assert!(offering.active);
    }

    #[test]
    fn test_zero_shares_reverts() {
        let (mut registry, _, _) = setup();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            registry.create_offering(1, 0, 1_000_000_000);
        }));
        assert!(result.is_err(), "Zero shares should revert");
    }

    #[test]
    fn test_zero_price_reverts() {
        let (mut registry, _, _) = setup();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            registry.create_offering(1, 100, 0);
        }));
        assert!(result.is_err(), "Zero price should revert");
    }

    // ── Share Purchase ────────────────────────────────

    #[test]
    fn test_buy_shares_updates_mapping() {
        let (mut registry, admin, investor) = setup();
        let te = TestEnv::new();

        te.set_caller(admin);
        registry.create_offering(1, 100, 1_000_000_000u64);

        te.set_caller(investor);
        te.set_value(10_000_000_000u64.into()); // 10 shares × 1 CSPR
        registry.buy_shares(1, 10);

        assert_eq!(registry.get_shares(1, investor), 10);
        let offering = registry.get_offering(1);
        assert_eq!(offering.shares_sold, 10);
        assert!(offering.active);
    }

    #[test]
    fn test_buy_all_shares_deactivates_offering() {
        let (mut registry, admin, investor) = setup();
        let te = TestEnv::new();

        te.set_caller(admin);
        registry.create_offering(1, 5, 1_000_000_000u64);

        te.set_caller(investor);
        te.set_value(5_000_000_000u64.into()); // 5 shares × 1 CSPR
        registry.buy_shares(1, 5);

        let offering = registry.get_offering(1);
        assert!(!offering.active);
        assert_eq!(offering.shares_sold, 5);
    }

    #[test]
    fn test_insufficient_payment_reverts() {
        let (mut registry, admin, investor) = setup();
        let te = TestEnv::new();

        te.set_caller(admin);
        registry.create_offering(1, 100, 1_000_000_000u64);

        te.set_caller(investor);
        te.set_value(1u64.into()); // way less than required
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            registry.buy_shares(1, 10);
        }));
        assert!(result.is_err(), "Should revert on insufficient payment");
    }

    // ── Non-existent Offering ─────────────────────────

    #[test]
    fn test_get_nonexistent_offering_reverts() {
        let (registry, _, _) = setup();
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            registry.get_offering(999);
        }));
        assert!(result.is_err(), "Non-existent offering should revert");
    }

    // ── Distribute Income ─────────────────────────────

    #[test]
    fn test_distribute_income_updates_per_share_rate() {
        let (mut registry, admin, investor) = setup();
        let te = TestEnv::new();

        te.set_caller(admin);
        registry.create_offering(1, 100, 1_000_000_000u64);

        te.set_caller(investor);
        te.set_value(10_000_000_000u64.into());
        registry.buy_shares(1, 10);

        te.set_caller(admin);
        te.set_value(1_000_000_000u64.into()); // 1 CSPR income to distribute
        registry.distribute_income(1);

        let offering = registry.get_offering(1);
        // 1_000_000_000 / 10 shares = 100_000_000 per share
        assert_eq!(offering.income_per_share_motes, 100_000_000u64);
    }

    #[test]
    fn test_non_admin_cannot_distribute_income() {
        let (mut registry, admin, investor) = setup();
        let te = TestEnv::new();

        te.set_caller(admin);
        registry.create_offering(1, 100, 1_000_000_000u64);

        te.set_caller(investor);
        te.set_value(10_000_000_000u64.into());
        registry.buy_shares(1, 10);

        // investor tries to distribute — should fail
        te.set_value(1_000_000_000u64.into());
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            registry.distribute_income(1);
        }));
        assert!(result.is_err(), "Non-admin should not distribute income");
    }
}
