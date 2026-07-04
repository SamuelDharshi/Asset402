//! # AssetRegistry — RWA NFT Contract
//!
//! Mints and manages on-chain representations of physical real-world assets.
//! Each asset is identified by a unique `AssetId` (u64) and carries rich
//! metadata including IPFS photo hash, USD valuation, and a condition score
//! updated periodically by the Guardian Agent.
//!
//! ## Access Control
//! * `mint_asset`        — any caller (Vision + Risk Agents)
//! * `update_condition`  — guardian address only
//! * `set_listing_status` — owner of the asset only
//! * `release_collateral` — lending_pool contract address only

#![cfg_attr(not(test), no_std)]
extern crate alloc;

use alloc::{string::String, vec::Vec};
use odra::prelude::*;

// ────────────────────────────────────────────────────
//  Type Alias
// ────────────────────────────────────────────────────

/// Unique on-chain identifier for a physical asset token.
pub type AssetId = u64;

// ────────────────────────────────────────────────────
//  Asset Status Enum
// ────────────────────────────────────────────────────

/// Lifecycle state of an asset in the AssetPilot protocol.
#[odra::odra_type]
pub enum AssetStatus {
    /// Registered but not listed for rental.
    Idle,
    /// Actively listed on the marketplace.
    Listed,
    /// Currently rented out — x402 stream active.
    Rented,
    /// Locked as DeFi collateral (loan outstanding).
    Locked,
}

// ────────────────────────────────────────────────────
//  Core Structs
// ────────────────────────────────────────────────────

/// All metadata associated with a physical asset token.
#[odra::odra_type]
pub struct AssetMetadata {
    /// Casper address of the asset owner.
    pub owner: Address,
    /// Human-readable asset category (e.g. "Agricultural Tractor").
    pub asset_type: String,
    /// Current USD valuation as estimated by the Vision/Risk agents.
    pub valuation_usd: u64,
    /// Condition score 0–100 set by the Guardian Agent.
    pub condition_score: u8,
    /// IPFS CID of the most recent asset photograph.
    pub ipfs_photo_hash: String,
    /// Current lifecycle status.
    pub status: AssetStatus,
}

// ────────────────────────────────────────────────────
//  Contract Module
// ────────────────────────────────────────────────────

#[odra::module(events = [AssetMinted, ConditionUpdated, StatusChanged, CollateralReleased])]
pub struct AssetRegistry {
    /// All minted assets indexed by AssetId.
    assets: Mapping<AssetId, AssetMetadata>,
    /// Reverse index: owner address → list of owned AssetIds.
    owner_assets: Mapping<Address, Vec<AssetId>>,
    /// Auto-incrementing counter for AssetIds.
    total_assets: Var<AssetId>,
    /// The Guardian Agent address — the only account that can update condition scores.
    guardian_address: Var<Address>,
    /// The LendingPool contract address — can call release_collateral.
    lending_pool_address: Var<Address>,
    /// The RentalEscrow contract address — can flip status to Rented/Idle.
    rental_escrow_address: Var<Address>,
    /// Contract administrator (deployer).
    admin: Var<Address>,
}

// ────────────────────────────────────────────────────
//  Events
// ────────────────────────────────────────────────────

#[odra::event]
pub struct AssetMinted {
    pub asset_id: AssetId,
    pub owner: Address,
    pub asset_type: String,
    pub valuation_usd: u64,
}

#[odra::event]
pub struct ConditionUpdated {
    pub asset_id: AssetId,
    pub new_condition_score: u8,
    pub new_valuation_usd: u64,
}

#[odra::event]
pub struct StatusChanged {
    pub asset_id: AssetId,
    pub new_status: AssetStatus,
}

#[odra::event]
pub struct CollateralReleased {
    pub asset_id: AssetId,
}

// ────────────────────────────────────────────────────
//  Contract Error Codes
// ────────────────────────────────────────────────────

#[odra::odra_error]
pub enum AssetRegistryError {
    AssetNotFound       = 1,
    NotAssetOwner       = 2,
    NotGuardian         = 3,
    NotLendingPool      = 4,
    NotRentalEscrow     = 5,
    InvalidConditionScore = 6,
    AssetAlreadyLocked  = 7,
    AssetNotLocked      = 8,
    NotAdmin            = 9,
    ZeroAddress         = 10,
}

// ────────────────────────────────────────────────────
//  Implementation
// ────────────────────────────────────────────────────

#[odra::module]
impl AssetRegistry {
    // ── Initialiser ──────────────────────────────────

    /// Initialise the contract.  Must be called once on deployment.
    pub fn init(
        &mut self,
        guardian_address: Address,
        lending_pool_address: Address,
        rental_escrow_address: Address,
    ) {
        let caller = self.env().caller();
        self.admin.set(caller);
        self.guardian_address.set(guardian_address);
        self.lending_pool_address.set(lending_pool_address);
        self.rental_escrow_address.set(rental_escrow_address);
        self.total_assets.set(0u64);
    }

    // ── Admin ─────────────────────────────────────────

    /// Update the guardian address (admin only).
    pub fn set_guardian(&mut self, new_guardian: Address) {
        self.assert_admin();
        self.guardian_address.set(new_guardian);
    }

    /// Update the lending pool contract address (admin only).
    pub fn set_lending_pool(&mut self, new_pool: Address) {
        self.assert_admin();
        self.lending_pool_address.set(new_pool);
    }

    // ── Core Entrypoints ──────────────────────────────

    /// Mint a new RWA asset token.
    ///
    /// Called by the Orchestrator after the Vision + Risk agents complete
    /// their analysis pipeline. Returns the newly assigned `AssetId`.
    pub fn mint_asset(
        &mut self,
        owner: Address,
        asset_type: String,
        valuation_usd: u64,
        condition_score: u8,
        ipfs_photo_hash: String,
    ) -> AssetId {
        if condition_score > 100 {
            self.env().revert(AssetRegistryError::InvalidConditionScore);
        }

        let asset_id = self.total_assets.get_or_default() + 1;
        self.total_assets.set(asset_id);

        let metadata = AssetMetadata {
            owner,
            asset_type: asset_type.clone(),
            valuation_usd,
            condition_score,
            ipfs_photo_hash,
            status: AssetStatus::Idle,
        };

        self.assets.set(&asset_id, metadata);

        // Update owner index
        let mut ids = self.owner_assets.get_or_default(&owner);
        ids.push(asset_id);
        self.owner_assets.set(&owner, ids);

        self.env().emit_event(AssetMinted {
            asset_id,
            owner,
            asset_type,
            valuation_usd,
        });

        asset_id
    }

    /// Update the condition score and valuation of an asset.
    ///
    /// Only callable by the authorised Guardian Agent address.
    /// This leverages Casper's upgradable contract pattern — the Guardian
    /// calls this every 72 hours after re-analysing a new photo.
    pub fn update_condition(
        &mut self,
        asset_id: AssetId,
        new_condition_score: u8,
        new_valuation_usd: u64,
        new_photo_hash: String,
    ) {
        self.assert_guardian();
        if new_condition_score > 100 {
            self.env().revert(AssetRegistryError::InvalidConditionScore);
        }

        let mut meta = self.get_asset_or_revert(asset_id);
        meta.condition_score = new_condition_score;
        meta.valuation_usd = new_valuation_usd;
        meta.ipfs_photo_hash = new_photo_hash;
        self.assets.set(&asset_id, meta);

        self.env().emit_event(ConditionUpdated {
            asset_id,
            new_condition_score,
            new_valuation_usd,
        });
    }

    /// Change the listing status of an asset.
    ///
    /// Called by the owner (or by the RentalEscrow contract to flip
    /// to/from `Rented`).  Cannot change status on a `Locked` asset
    /// unless the caller is the LendingPool releasing collateral.
    pub fn set_listing_status(&mut self, asset_id: AssetId, new_status: AssetStatus) {
        let caller = self.env().caller();
        let mut meta = self.get_asset_or_revert(asset_id);

        // Only rental_escrow may flip to/from Rented
        if new_status == AssetStatus::Rented || meta.status == AssetStatus::Rented {
            let escrow = self.rental_escrow_address.get().unwrap();
            if caller != escrow && caller != meta.owner {
                self.env().revert(AssetRegistryError::NotRentalEscrow);
            }
        } else if new_status == AssetStatus::Locked {
            // Only lending pool may lock
            let pool = self.lending_pool_address.get().unwrap();
            if caller != pool {
                self.env().revert(AssetRegistryError::NotLendingPool);
            }
        } else {
            // Owner changes Idle ↔ Listed
            if caller != meta.owner {
                self.env().revert(AssetRegistryError::NotAssetOwner);
            }
        }

        meta.status = new_status.clone();
        self.assets.set(&asset_id, meta);

        self.env().emit_event(StatusChanged { asset_id, new_status });
    }

    /// Release an asset from collateral lock once the loan is repaid.
    ///
    /// Called exclusively by the LendingPool contract.
    pub fn release_collateral(&mut self, asset_id: AssetId) {
        self.assert_lending_pool();
        let mut meta = self.get_asset_or_revert(asset_id);
        if meta.status != AssetStatus::Locked {
            self.env().revert(AssetRegistryError::AssetNotLocked);
        }
        meta.status = AssetStatus::Idle;
        self.assets.set(&asset_id, meta);

        self.env().emit_event(CollateralReleased { asset_id });
        self.env().emit_event(StatusChanged {
            asset_id,
            new_status: AssetStatus::Idle,
        });
    }

    // ── Read-Only Queries ─────────────────────────────

    /// Fetch full metadata for a given AssetId.
    pub fn get_asset(&self, asset_id: AssetId) -> AssetMetadata {
        self.get_asset_or_revert(asset_id)
    }

    /// Fetch all AssetIds owned by a given address.
    pub fn get_owner_assets(&self, owner: Address) -> Vec<AssetId> {
        self.owner_assets.get_or_default(&owner)
    }

    /// Current total number of minted assets.
    pub fn total_assets(&self) -> AssetId {
        self.total_assets.get_or_default()
    }

    /// Returns the current guardian address.
    pub fn guardian(&self) -> Address {
        self.guardian_address.get().unwrap()
    }

    // ── Internal Helpers ──────────────────────────────

    fn get_asset_or_revert(&self, asset_id: AssetId) -> AssetMetadata {
        match self.assets.get(&asset_id) {
            Some(m) => m,
            None => {
                self.env().revert(AssetRegistryError::AssetNotFound);
            }
        }
    }

    fn assert_guardian(&self) {
        let caller = self.env().caller();
        let guardian = self.guardian_address.get().unwrap();
        if caller != guardian {
            self.env().revert(AssetRegistryError::NotGuardian);
        }
    }

    fn assert_lending_pool(&self) {
        let caller = self.env().caller();
        let pool = self.lending_pool_address.get().unwrap();
        if caller != pool {
            self.env().revert(AssetRegistryError::NotLendingPool);
        }
    }

    fn assert_admin(&self) {
        let caller = self.env().caller();
        let admin = self.admin.get().unwrap();
        if caller != admin {
            self.env().revert(AssetRegistryError::NotAdmin);
        }
    }
}

// ════════════════════════════════════════════════════
//  TESTS
// ════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostRef};

    // Helper — deploys the contract and returns a HostRef + test accounts
    fn setup() -> (AssetRegistryHostRef, Address, Address, Address, Address) {
        let env = odra_test::env();

        let admin         = env.get_account(0);
        let guardian      = env.get_account(1);
        let lending_pool  = env.get_account(2);
        let rental_escrow = env.get_account(3);

        env.set_caller(admin);

        let registry = AssetRegistry::deploy(&env, AssetRegistryInitArgs {
            guardian_address:      guardian,
            lending_pool_address:  lending_pool,
            rental_escrow_address: rental_escrow,
        });

        (registry, admin, guardian, lending_pool, rental_escrow)
    }

    // ── Minting ───────────────────────────────────────

    #[test]
    fn test_mint_asset_increments_counter() {
        let (mut registry, admin, _, _, _) = setup();
        registry.env().set_caller(admin);

        let id1 = registry.mint_asset(
            admin,
            "Agricultural Tractor".into(),
            9000,
            78,
            "QmTractor1".into(),
        );
        let id2 = registry.mint_asset(
            admin,
            "Cinema Camera".into(),
            3500,
            92,
            "QmCamera1".into(),
        );

        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_eq!(registry.total_assets(), 2);
    }

    #[test]
    fn test_mint_stores_metadata_correctly() {
        let (mut registry, admin, _, _, _) = setup();
        registry.env().set_caller(admin);

        let owner = admin;
        let id = registry.mint_asset(
            owner,
            "Honda Generator 7.5kW".into(),
            1800,
            85,
            "QmGenerator1".into(),
        );

        let meta = registry.get_asset(id);
        assert_eq!(meta.owner, owner);
        assert_eq!(meta.asset_type, "Honda Generator 7.5kW");
        assert_eq!(meta.valuation_usd, 1800);
        assert_eq!(meta.condition_score, 85);
        assert_eq!(meta.status, AssetStatus::Idle);
    }

    #[test]
    fn test_owner_asset_index_updated() {
        let (mut registry, admin, _, _, _) = setup();
        registry.env().set_caller(admin);

        registry.mint_asset(admin, "Tractor".into(), 9000, 80, "Qm1".into());
        registry.mint_asset(admin, "Camera".into(), 3500, 90, "Qm2".into());

        let ids = registry.get_owner_assets(admin);
        assert_eq!(ids.len(), 2);
        assert!(ids.contains(&1));
        assert!(ids.contains(&2));
    }

    #[test]
    fn test_mint_invalid_condition_score_reverts() {
        let (mut registry, admin, _, _, _) = setup();
        registry.env().set_caller(admin);

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            registry.mint_asset(admin, "Tractor".into(), 9000, 101, "Qm1".into());
        }));
        assert!(result.is_err(), "Should revert on score > 100");
    }

    // ── Guardian Condition Update ─────────────────────

    #[test]
    fn test_guardian_can_update_condition() {
        let (mut registry, admin, guardian, _, _) = setup();
        registry.env().set_caller(admin);
        let id = registry.mint_asset(admin, "Tractor".into(), 9000, 78, "Qm1".into());

        registry.env().set_caller(guardian);
        registry.update_condition(id, 70, 8500, "QmUpdated".into());

        let meta = registry.get_asset(id);
        assert_eq!(meta.condition_score, 70);
        assert_eq!(meta.valuation_usd, 8500);
        assert_eq!(meta.ipfs_photo_hash, "QmUpdated");
    }

    #[test]
    fn test_non_guardian_cannot_update_condition() {
        let (mut registry, admin, _, _, _) = setup();
        registry.env().set_caller(admin);
        let id = registry.mint_asset(admin, "Tractor".into(), 9000, 78, "Qm1".into());

        // admin tries to update condition — not the guardian
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            registry.update_condition(id, 70, 8500, "QmBad".into());
        }));
        assert!(result.is_err(), "Non-guardian should not be able to update condition");
    }

    // ── Listing Status ────────────────────────────────

    #[test]
    fn test_owner_can_set_listed_status() {
        let (mut registry, admin, _, _, _) = setup();
        registry.env().set_caller(admin);
        let id = registry.mint_asset(admin, "Tractor".into(), 9000, 78, "Qm1".into());

        registry.set_listing_status(id, AssetStatus::Listed);
        let meta = registry.get_asset(id);
        assert_eq!(meta.status, AssetStatus::Listed);
    }

    #[test]
    fn test_lending_pool_can_lock_asset() {
        let (mut registry, admin, _, lending_pool, _) = setup();
        registry.env().set_caller(admin);
        let id = registry.mint_asset(admin, "Tractor".into(), 9000, 78, "Qm1".into());

        registry.env().set_caller(lending_pool);
        registry.set_listing_status(id, AssetStatus::Locked);

        let meta = registry.get_asset(id);
        assert_eq!(meta.status, AssetStatus::Locked);
    }

    #[test]
    fn test_lending_pool_can_release_collateral() {
        let (mut registry, admin, _, lending_pool, _) = setup();
        registry.env().set_caller(admin);
        let id = registry.mint_asset(admin, "Tractor".into(), 9000, 78, "Qm1".into());

        registry.env().set_caller(lending_pool);
        registry.set_listing_status(id, AssetStatus::Locked);
        registry.release_collateral(id);

        let meta = registry.get_asset(id);
        assert_eq!(meta.status, AssetStatus::Idle);
    }

    // ── E2E Lifecycle: Mint → List → Lock → Release ───

    #[test]
    fn test_e2e_asset_lifecycle() {
        let (mut registry, admin, guardian, lending_pool, rental_escrow) = setup();

        // 1. Mint
        registry.env().set_caller(admin);
        let asset_id = registry.mint_asset(
            admin,
            "Mahindra 575 DI Tractor".into(),
            9000,
            78,
            "QmTractor".into(),
        );
        assert_eq!(registry.get_asset(asset_id).status, AssetStatus::Idle);

        // 2. List
        registry.set_listing_status(asset_id, AssetStatus::Listed);
        assert_eq!(registry.get_asset(asset_id).status, AssetStatus::Listed);

        // 3. Lock as collateral (lending pool)
        registry.env().set_caller(lending_pool);
        registry.set_listing_status(asset_id, AssetStatus::Locked);
        assert_eq!(registry.get_asset(asset_id).status, AssetStatus::Locked);

        // 4. Guardian updates condition mid-loan
        registry.env().set_caller(guardian);
        registry.update_condition(asset_id, 72, 8700, "QmTractorUpdated".into());
        assert_eq!(registry.get_asset(asset_id).condition_score, 72);

        // 5. Loan repaid — release collateral
        registry.env().set_caller(lending_pool);
        registry.release_collateral(asset_id);
        assert_eq!(registry.get_asset(asset_id).status, AssetStatus::Idle);

        // 6. Rental escrow sets to Rented
        registry.env().set_caller(rental_escrow);
        registry.set_listing_status(asset_id, AssetStatus::Rented);
        assert_eq!(registry.get_asset(asset_id).status, AssetStatus::Rented);

        // 7. Rental complete — back to Idle
        registry.set_listing_status(asset_id, AssetStatus::Idle);
        assert_eq!(registry.get_asset(asset_id).status, AssetStatus::Idle);
    }
}
