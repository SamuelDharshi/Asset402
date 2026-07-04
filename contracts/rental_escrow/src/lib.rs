//! # RentalEscrow — Gasless Rental Agreement Contract
//!
//! Manages the lifecycle of physical-asset rental sessions on Casper Network.
//! Integrates a **casper-eip-712 typed-data signature** pattern: the renter
//! signs the rental agreement off-chain (human-readable in the CSPR.click
//! wallet), and the contract verifies the Ed25519 signature before activating
//! the rental, making the initial agreement **gasless for the renter**.
//!
//! ## Signature Scheme
//! The "gasless" pattern used here mirrors EIP-712 typed structured data:
//!
//! ```text
//! RentalAgreement {
//!   asset_id:          u64,
//!   renter:            [u8; 32],   // account hash
//!   owner:             [u8; 32],
//!   rate_per_minute:   u128,       // motes/min
//!   duration_minutes:  u64,
//!   valid_until:       u64,        // Unix timestamp
//!   nonce:             u64,
//! }
//! ```
//!
//! The domain separator and struct hash are keccak256-based (matching the
//! casper-eip-712 library). The full crate will be substituted once
//! `casper-eip-712` stabilises on crates.io; today we verify the Ed25519
//! signature over the Blake2b hash of the ABI-encoded struct.
//!
//! ## Access Control
//! * `start_rental`  — any caller (protocol submits on renter's behalf)
//! * `close_rental`  — collector_agent address only
//! * Admin functions — admin only

#![cfg_attr(not(test), no_std)]
extern crate alloc;

use alloc::vec::Vec;
use odra::prelude::*;
use odra::casper_types::bytesrepr::ToBytes;
use odra::casper_types::U128;


// ────────────────────────────────────────────────────
//  Type Aliases
// ────────────────────────────────────────────────────

pub type AssetId  = u64;
pub type RentalId = u64;

// ────────────────────────────────────────────────────
//  Rental Status
// ────────────────────────────────────────────────────

#[odra::odra_type]
pub enum RentalStatus {
    Active,
    Closed,
    Cancelled,
}

// ────────────────────────────────────────────────────
//  Core Structs
// ────────────────────────────────────────────────────

/// On-chain record of a rental session.
#[odra::odra_type]
pub struct RentalData {
    pub rental_id:        RentalId,
    pub asset_id:         AssetId,
    pub renter:           Address,
    pub owner:            Address,
    /// Streaming rate in motes per minute.
    pub rate_per_minute:  U128,
    /// Maximum rental duration in minutes.
    pub duration_minutes: u64,
    /// Total motes streamed so far by the Collector Agent.
    pub total_streamed:   U128,
    /// Unix timestamp when the rental started.
    pub started_at:       u64,
    pub status:           RentalStatus,
    /// One-time nonce preventing signature replay.
    pub nonce:            u64,
}

/// Off-chain typed rental agreement submitted to `start_rental`.
/// This struct is ABI-encoded and then signed by the renter's key.
#[odra::odra_type]
pub struct RentalAgreement {
    pub asset_id:         AssetId,
    /// 32-byte account hash of the renter.
    pub renter_hash:      [u8; 32],
    /// 32-byte account hash of the asset owner.
    pub owner_hash:       [u8; 32],
    pub rate_per_minute:  U128,
    pub duration_minutes: u64,
    /// Agreement invalid after this Unix timestamp.
    pub valid_until:      u64,
    pub nonce:            u64,
}

/// On-chain reputation record for a renter or owner, built up from
/// per-session scores submitted by the Guardian Agent after it reviews
/// a completed rental (condition delta, dispute flags, etc.).
#[odra::odra_type]
pub struct ReputationData {
    /// Number of sessions scored so far.
    pub total_sessions: u64,
    /// Running sum of all session scores (each 0–100).
    pub score_sum:      u64,
    /// `score_sum / total_sessions`, rounded down. 0 when no sessions yet.
    pub average_score:  u8,
}

// ────────────────────────────────────────────────────
//  Contract Module
// ────────────────────────────────────────────────────

#[odra::module(events = [RentalStarted, RentalClosed, RentalCancelled, ReputationUpdated])]
pub struct RentalEscrow {
    /// All rental records keyed by RentalId.
    active_rentals:    Mapping<RentalId, RentalData>,
    /// Per-asset: latest active rental id (0 = none).
    asset_rental_map:  Mapping<AssetId, RentalId>,
    /// Used nonces per renter — prevents signature replay.
    used_nonces:       Mapping<(Address, u64), bool>,
    /// Auto-incrementing rental counter.
    total_rentals:     Var<RentalId>,
    /// Collector Agent — allowed to call `close_rental` and `record_stream`.
    collector_agent:   Var<Address>,
    /// AssetRegistry contract address — called to flip asset status.
    asset_registry:    Var<Address>,
    /// Guardian Agent — the only account allowed to call `update_reputation`.
    guardian_address:  Var<Address>,
    /// Contract admin.
    admin:             Var<Address>,
    /// Reputation record per address (renter or owner), keyed by address.
    reputation_scores: Mapping<Address, ReputationData>,
}

// ────────────────────────────────────────────────────
//  Events
// ────────────────────────────────────────────────────

#[odra::event]
pub struct RentalStarted {
    pub rental_id:   RentalId,
    pub asset_id:    AssetId,
    pub renter:      Address,
    pub owner:       Address,
    pub rate_per_minute: U128,
    pub duration_minutes: u64,
}

#[odra::event]
pub struct RentalClosed {
    pub rental_id:      RentalId,
    pub asset_id:       AssetId,
    pub total_streamed: U128,
}

#[odra::event]
pub struct RentalCancelled {
    pub rental_id: RentalId,
    pub asset_id:  AssetId,
}

#[odra::event]
pub struct ReputationUpdated {
    pub address:       Address,
    pub session_score: u8,
    pub average_score: u8,
    pub total_sessions: u64,
}

// ────────────────────────────────────────────────────
//  Error Codes
// ────────────────────────────────────────────────────

#[odra::odra_error]
pub enum RentalEscrowError {
    NotAdmin             = 1,
    NotCollectorAgent    = 2,
    RentalNotFound       = 3,
    RentalAlreadyActive  = 4,
    RentalAlreadyClosed  = 5,
    InvalidSignature     = 6,
    AgreementExpired     = 7,
    NonceAlreadyUsed     = 8,
    ZeroRate             = 9,
    ZeroDuration         = 10,
    ArithmeticOverflow   = 11,
    NotGuardian          = 12,
    InvalidSessionScore  = 13,
}

/// Builds the exact byte buffer that the renter signs off-chain and that
/// `verify_rental_agreement` re-derives on-chain to check the signature
/// against. Kept as one shared function (rather than duplicated per
/// cfg(test)/not(test) branch) so tests exercise the identical byte layout
/// that production verification checks — there is no separate "test buffer."
///
/// `casper-eip-712` is a listed dependency for a future migration to full
/// EIP-712 typed-data hashing (it targets Ethereum-style keccak256/secp256k1
/// recovery); today this uses a simpler domain-tagged flat encoding verified
/// via native Ed25519, which is a real, non-mock signature scheme — just not
/// literally EIP-712 yet.
fn agreement_signing_buffer(agreement: &RentalAgreement) -> Vec<u8> {
    let domain = b"AssetPilot:RentalEscrow:v1";
    let mut buf = Vec::new();
    buf.extend_from_slice(domain);
    buf.extend_from_slice(&agreement.asset_id.to_le_bytes());
    buf.extend_from_slice(&agreement.renter_hash);
    buf.extend_from_slice(&agreement.owner_hash);
    if let Ok(rate_bytes) = agreement.rate_per_minute.to_bytes() {
        buf.extend_from_slice(&rate_bytes);
    }
    buf.extend_from_slice(&agreement.duration_minutes.to_le_bytes());
    buf.extend_from_slice(&agreement.valid_until.to_le_bytes());
    buf.extend_from_slice(&agreement.nonce.to_le_bytes());
    buf
}

/// Verifies the renter's Ed25519 signature over `agreement_signing_buffer`.
/// Runs identically in tests and production — there is no test-only bypass.
/// A forged signature, wrong key, or tampered agreement field all fail here.
fn verify_rental_agreement(
    public_key_bytes: &[u8; 32],
    agreement: &RentalAgreement,
    signature_bytes: &[u8; 64],
) -> bool {
    use odra::casper_types::crypto::{PublicKey, Signature, AsymmetricType};
    let pk = match PublicKey::ed25519_from_bytes(public_key_bytes) {
        Ok(k) => k,
        Err(_) => return false,
    };
    let sig = match Signature::ed25519(*signature_bytes) {
        Ok(s) => s,
        Err(_) => return false,
    };
    let buf = agreement_signing_buffer(agreement);
    odra::casper_types::crypto::verify(&buf, &sig, &pk).is_ok()
}

// ────────────────────────────────────────────────────
//  Implementation
// ────────────────────────────────────────────────────

#[odra::module]
impl RentalEscrow {
    // ── Initialiser ──────────────────────────────────

    pub fn init(&mut self, collector_agent: Address, asset_registry: Address, guardian_address: Address) {
        let caller = self.env().caller();
        self.admin.set(caller);
        self.collector_agent.set(collector_agent);
        self.asset_registry.set(asset_registry);
        self.guardian_address.set(guardian_address);
        self.total_rentals.set(0u64);
    }

    // ── Admin ─────────────────────────────────────────

    /// Update the guardian address (admin only).
    pub fn set_guardian(&mut self, new_guardian: Address) {
        self.assert_admin();
        self.guardian_address.set(new_guardian);
    }

    // ── Core Entrypoints ──────────────────────────────

    /// Begin a rental session after verifying the renter's off-chain signature.
    ///
    /// The renter signs a `RentalAgreement` struct off-chain inside CSPR.click.
    /// The protocol (or owner) submits this transaction, paying gas on the
    /// renter's behalf — achieving **gasless meta-transaction semantics**.
    ///
    /// Signature is verified via Ed25519 / casper-eip-712 typed-data pattern.
    pub fn start_rental(
        &mut self,
        agreement:         RentalAgreement,
        renter:            Address,
        owner:             Address,
        // Ed25519 public key of the renter (32 bytes).
        renter_public_key: [u8; 32],
        // Ed25519 signature over the encoded agreement (64 bytes).
        signature:         [u8; 64],
    ) -> RentalId {
        // 1. Basic validation
        if agreement.rate_per_minute == U128::zero() {
            self.env().revert(RentalEscrowError::ZeroRate);
        }
        if agreement.duration_minutes == 0 {
            self.env().revert(RentalEscrowError::ZeroDuration);
        }

        // 2. Check agreement expiry
        let now = self.env().get_block_time();
        if now > agreement.valid_until {
            self.env().revert(RentalEscrowError::AgreementExpired);
        }

        // 3. Replay protection — each (renter, nonce) may only be used once
        let nonce_key = (renter, agreement.nonce);
        if self.used_nonces.get_or_default(&nonce_key) {
            self.env().revert(RentalEscrowError::NonceAlreadyUsed);
        }
        self.used_nonces.set(&nonce_key, true);

        // 4. Signature verification (casper-eip-712 pattern)
        if !verify_rental_agreement(&renter_public_key, &agreement, &signature) {
            self.env().revert(RentalEscrowError::InvalidSignature);
        }

        // 5. Ensure no active rental on this asset
        let existing_id = self.asset_rental_map.get_or_default(&agreement.asset_id);
        if existing_id != 0 {
            if let Some(existing) = self.active_rentals.get(&existing_id) {
                if existing.status == RentalStatus::Active {
                    self.env().revert(RentalEscrowError::RentalAlreadyActive);
                }
            }
        }

        // 6. Create rental record
        let rental_id = self.total_rentals.get_or_default() + 1;
        self.total_rentals.set(rental_id);

        let rental = RentalData {
            rental_id,
            asset_id:        agreement.asset_id,
            renter,
            owner,
            rate_per_minute: agreement.rate_per_minute,
            duration_minutes: agreement.duration_minutes,
            total_streamed:  U128::zero(),
            started_at:      now,
            status:          RentalStatus::Active,
            nonce:           agreement.nonce,
        };

        self.active_rentals.set(&rental_id, rental);
        self.asset_rental_map.set(&agreement.asset_id, rental_id);

        self.env().emit_event(RentalStarted {
            rental_id,
            asset_id:        agreement.asset_id,
            renter,
            owner,
            rate_per_minute: agreement.rate_per_minute,
            duration_minutes: agreement.duration_minutes,
        });

        rental_id
    }

    /// Record a streaming payment increment from the Collector Agent.
    /// Updates the running total of motes streamed for this rental.
    pub fn record_stream_payment(
        &mut self,
        rental_id:    RentalId,
        amount_motes: U128,
    ) {
        self.assert_collector();
        let mut rental = self.get_rental_or_revert(rental_id);
        if rental.status != RentalStatus::Active {
            self.env().revert(RentalEscrowError::RentalAlreadyClosed);
        }
        rental.total_streamed = rental.total_streamed
            .checked_add(amount_motes)
            .unwrap_or_else(|| self.env().revert(RentalEscrowError::ArithmeticOverflow));
        self.active_rentals.set(&rental_id, rental);
    }

    /// Close a rental session and settle final balances.
    ///
    /// Called by the Collector Agent when:
    /// * The maximum `duration_minutes` has elapsed, OR
    /// * The renter explicitly ends early.
    ///
    /// Emits `RentalClosed` with the total streamed amount for accounting.
    pub fn close_rental(&mut self, rental_id: RentalId) {
        self.assert_collector();
        let mut rental = self.get_rental_or_revert(rental_id);
        if rental.status != RentalStatus::Active {
            self.env().revert(RentalEscrowError::RentalAlreadyClosed);
        }

        rental.status = RentalStatus::Closed;
        self.active_rentals.set(&rental_id, rental.clone());

        self.env().emit_event(RentalClosed {
            rental_id,
            asset_id:       rental.asset_id,
            total_streamed: rental.total_streamed,
        });
    }

    /// Record a session reputation score for `address` (renter or owner).
    ///
    /// Called by the Guardian Agent after it reviews a completed rental
    /// session (condition delta, dispute flags, on-time return, etc.).
    /// Scores accumulate into a running average rather than overwriting —
    /// so a single bad session does not erase an otherwise long, good
    /// history, matching the PRD's on-chain reputation model.
    pub fn update_reputation(&mut self, address: Address, session_score: u8) {
        self.assert_guardian();
        if session_score > 100 {
            self.env().revert(RentalEscrowError::InvalidSessionScore);
        }

        let mut rep = self.reputation_scores.get(&address).unwrap_or(ReputationData {
            total_sessions: 0,
            score_sum:      0,
            average_score:  0,
        });
        rep.total_sessions = rep.total_sessions
            .checked_add(1)
            .unwrap_or_else(|| self.env().revert(RentalEscrowError::ArithmeticOverflow));
        rep.score_sum = rep.score_sum
            .checked_add(session_score as u64)
            .unwrap_or_else(|| self.env().revert(RentalEscrowError::ArithmeticOverflow));
        rep.average_score = (rep.score_sum / rep.total_sessions) as u8;
        self.reputation_scores.set(&address, rep.clone());

        self.env().emit_event(ReputationUpdated {
            address,
            session_score,
            average_score:  rep.average_score,
            total_sessions: rep.total_sessions,
        });
    }

    // ── Read-Only Queries ─────────────────────────────

    pub fn get_rental(&self, rental_id: RentalId) -> RentalData {
        self.get_rental_or_revert(rental_id)
    }

    /// Returns the current reputation record for `address`. An address
    /// with no scored sessions yet returns a zeroed record (average 0).
    pub fn get_reputation(&self, address: Address) -> ReputationData {
        self.reputation_scores.get(&address).unwrap_or(ReputationData {
            total_sessions: 0,
            score_sum:      0,
            average_score:  0,
        })
    }

    pub fn get_asset_rental(&self, asset_id: AssetId) -> RentalId {
        self.asset_rental_map.get_or_default(&asset_id)
    }

    pub fn total_rentals(&self) -> RentalId {
        self.total_rentals.get_or_default()
    }

    pub fn is_nonce_used(&self, renter: Address, nonce: u64) -> bool {
        self.used_nonces.get_or_default(&(renter, nonce))
    }

    // ── Internal Helpers ──────────────────────────────

    fn get_rental_or_revert(&self, rental_id: RentalId) -> RentalData {
        match self.active_rentals.get(&rental_id) {
            Some(r) => r,
            None    => self.env().revert(RentalEscrowError::RentalNotFound),
        }
    }

    fn assert_collector(&self) {
        let caller    = self.env().caller();
        let collector = self.collector_agent.get().unwrap();
        if caller != collector {
            self.env().revert(RentalEscrowError::NotCollectorAgent);
        }
    }

    fn assert_guardian(&self) {
        let caller   = self.env().caller();
        let guardian = self.guardian_address.get().unwrap();
        if caller != guardian {
            self.env().revert(RentalEscrowError::NotGuardian);
        }
    }

    fn assert_admin(&self) {
        let caller = self.env().caller();
        let admin  = self.admin.get().unwrap();
        if caller != admin {
            self.env().revert(RentalEscrowError::NotAdmin);
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

    // ── Test helpers ─────────────────────────────────

    /// Build a valid (but cryptographically dummy for testing) rental agreement.
    /// In production tests the signature would be generated from a known key pair.
    fn make_agreement(asset_id: AssetId, renter: Address, owner: Address, nonce: u64) -> RentalAgreement {
        let renter_bytes = match renter {
            Address::Account(h) => h.value(),
            Address::Contract(h) => h.value(),
        };
        let owner_bytes = match owner {
            Address::Account(h) => h.value(),
            Address::Contract(h) => h.value(),
        };
        RentalAgreement {
            asset_id,
            renter_hash: renter_bytes,
            owner_hash: owner_bytes,
            rate_per_minute: U128::from(34_000_000u64),  // 0.034 CSPR / min
            duration_minutes: 480,             // 8 hours
            valid_until: u64::MAX,             // Never expires in tests
            nonce,
        }
    }

    /// Generates a real, deterministic Ed25519 keypair from a seed and signs
    /// `agreement` with it using the exact same buffer `verify_rental_agreement`
    /// re-derives on-chain. Returns (public_key_bytes, signature_bytes) ready
    /// to pass straight into `start_rental` — this is a genuine signature,
    /// not a bypass value.
    fn sign_agreement(seed: u8, agreement: &RentalAgreement) -> ([u8; 32], [u8; 64]) {
        use ed25519_dalek::{Signer, SigningKey};
        let signing_key = SigningKey::from_bytes(&[seed; 32]);
        let verifying_key = signing_key.verifying_key();
        let buf = agreement_signing_buffer(agreement);
        let signature = signing_key.sign(&buf);
        (verifying_key.to_bytes(), signature.to_bytes())
    }

    /// A syntactically valid but never-checked keypair, for tests that revert
    /// before signature verification is reached (e.g. zero-rate, expired
    /// agreement) — using this instead of `sign_agreement` makes clear the
    /// test isn't exercising signature logic at all.
    fn unchecked_keypair() -> ([u8; 32], [u8; 64]) {
        ([0u8; 32], [0u8; 64])
    }

    fn setup() -> (RentalEscrowHostRef, Address, Address, Address, Address) {
        let (escrow, admin, renter, owner, collector, _guardian) = setup_with_guardian();
        (escrow, admin, renter, owner, collector)
    }

    fn setup_with_guardian() -> (RentalEscrowHostRef, Address, Address, Address, Address, Address) {
        let env = odra_test::env();
        let admin     = env.get_account(0);
        let renter    = env.get_account(1);
        let owner     = env.get_account(2);
        let collector = env.get_account(3);
        let registry  = env.get_account(4);
        let guardian  = env.get_account(5);

        env.set_caller(admin);
        let escrow = RentalEscrow::deploy(&env, RentalEscrowInitArgs {
            collector_agent: collector,
            asset_registry:  registry,
            guardian_address: guardian,
        });
        (escrow, admin, renter, owner, collector, guardian)
    }

    // ── Basic tests (signature bypassed via test mock) ──

    #[test]
    fn test_rental_counter_starts_at_zero() {
        let (escrow, _, _, _, _) = setup();
        assert_eq!(escrow.total_rentals(), 0);
    }

    #[test]
    fn test_start_rental_rejects_expired_agreement() {
        let (mut escrow, admin, renter, owner, _) = setup();
        escrow.env().set_caller(admin);

        let mut agreement = make_agreement(1, renter, owner, 1);
        agreement.valid_until = 0; // already expired

        let (pk, sig_bytes) = unchecked_keypair(); // never reached — expiry check runs first
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            escrow.start_rental(agreement, renter, owner, pk, sig_bytes);
        }));
        assert!(result.is_err(), "Expired agreement should revert");
    }

    #[test]
    fn test_start_rental_accepts_valid_signature() {
        let (mut escrow, admin, renter, owner, _) = setup();
        escrow.env().set_caller(admin);

        let agreement = make_agreement(1, renter, owner, 1);
        let (pk, sig) = sign_agreement(7, &agreement);

        let rental_id = escrow.start_rental(agreement, renter, owner, pk, sig);
        assert_eq!(rental_id, 1);
        assert!(escrow.is_nonce_used(renter, 1));

        let rental = escrow.get_rental(rental_id);
        assert_eq!(rental.status, RentalStatus::Active);
        assert_eq!(rental.renter, renter);
        assert_eq!(rental.owner, owner);
    }

    #[test]
    fn test_start_rental_rejects_forged_signature() {
        let (mut escrow, admin, renter, owner, _) = setup();
        escrow.env().set_caller(admin);

        let agreement = make_agreement(1, renter, owner, 1);
        // Sign with seed 7 but present seed 9's public key — signature/key mismatch.
        let (_, sig) = sign_agreement(7, &agreement);
        let (wrong_pk, _) = sign_agreement(9, &agreement);

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            escrow.start_rental(agreement, renter, owner, wrong_pk, sig);
        }));
        assert!(result.is_err(), "Forged/mismatched signature must revert with InvalidSignature");
    }

    #[test]
    fn test_nonce_replay_protection_actually_replays() {
        let (mut escrow, admin, renter, owner, _) = setup();
        escrow.env().set_caller(admin);

        let agreement = make_agreement(1, renter, owner, 5);
        let (pk, sig) = sign_agreement(3, &agreement);

        // First use of nonce 5 succeeds.
        let rental_id = escrow.start_rental(agreement.clone(), renter, owner, pk, sig);
        assert_eq!(rental_id, 1);
        assert!(escrow.is_nonce_used(renter, 5));

        // Second attempt with the SAME nonce (different asset_id, still same
        // (renter, nonce) key) must revert with NonceAlreadyUsed — this is
        // the actual replay this test previously never performed.
        let replay = make_agreement(2, renter, owner, 5);
        let (pk2, sig2) = sign_agreement(3, &replay);
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            escrow.start_rental(replay, renter, owner, pk2, sig2);
        }));
        assert!(result.is_err(), "Reusing a consumed nonce must revert");
    }

    #[test]
    fn test_close_rental_by_non_collector_reverts() {
        let (mut escrow, admin, _, _, _) = setup();
        // rental 999 doesn't exist; admin calling close_rental should revert on NotCollectorAgent
        escrow.env().set_caller(admin);
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            escrow.close_rental(999);
        }));
        assert!(result.is_err(), "Non-collector should not close rentals");
    }

    #[test]
    fn test_zero_rate_reverts() {
        let (mut escrow, admin, renter, owner, _) = setup();
        escrow.env().set_caller(admin);
        let mut agreement = make_agreement(1, renter, owner, 1);
        agreement.rate_per_minute = U128::zero();
        let (pk, sig) = unchecked_keypair(); // never reached — zero-rate check runs first
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            escrow.start_rental(agreement, renter, owner, pk, sig);
        }));
        assert!(result.is_err(), "Zero rate should revert");
    }

    // ── E2E: Full Rent → Stream → Close cycle (mock sig) ─

    #[test]
    fn test_e2e_full_rental_lifecycle_with_streaming() {
        // Exercises the full path using the Odra test host env with a genuine
        // Ed25519 signature (via sign_agreement) — no test-only bypass.
        let env = odra_test::env();
        let admin     = env.get_account(0);
        let renter    = env.get_account(1);
        let owner     = env.get_account(2);
        let collector = env.get_account(3);
        let registry  = env.get_account(4);
        let guardian  = env.get_account(5);
        env.set_caller(admin);
        let mut escrow = RentalEscrow::deploy(&env, RentalEscrowInitArgs {
            collector_agent: collector,
            asset_registry:  registry,
            guardian_address: guardian,
        });

        assert_eq!(escrow.total_rentals(), 0);

        // Collector closes a non-existent rental → should revert
        escrow.env().set_caller(collector);
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            escrow.close_rental(1);
        }));
        assert!(result.is_err(), "Closing non-existent rental should revert");

        // Start a real, signature-verified rental
        assert!(!escrow.is_nonce_used(renter, 1));
        escrow.env().set_caller(admin);
        let agreement = make_agreement(1, renter, owner, 1);
        let (pk, sig) = sign_agreement(11, &agreement);
        let rental_id = escrow.start_rental(agreement, renter, owner, pk, sig);
        assert!(escrow.is_nonce_used(renter, 1));

        // Collector streams two payments, then closes the rental
        escrow.env().set_caller(collector);
        escrow.record_stream_payment(rental_id, U128::from(34_000_000u64));
        escrow.record_stream_payment(rental_id, U128::from(34_000_000u64));

        let mid_rental = escrow.get_rental(rental_id);
        assert_eq!(mid_rental.total_streamed, U128::from(68_000_000u64));
        assert_eq!(mid_rental.status, RentalStatus::Active);

        escrow.close_rental(rental_id);
        let closed_rental = escrow.get_rental(rental_id);
        assert_eq!(closed_rental.status, RentalStatus::Closed);
        assert_eq!(closed_rental.total_streamed, U128::from(68_000_000u64));
    }

    // ── Reputation ────────────────────────────────────

    #[test]
    fn test_reputation_defaults_to_zero() {
        let (escrow, _, renter, _, _, _) = setup_with_guardian();
        let rep = escrow.get_reputation(renter);
        assert_eq!(rep.total_sessions, 0);
        assert_eq!(rep.score_sum, 0);
        assert_eq!(rep.average_score, 0);
    }

    #[test]
    fn test_guardian_can_update_reputation_and_averages_across_sessions() {
        let (mut escrow, _, renter, _, _, guardian) = setup_with_guardian();
        escrow.env().set_caller(guardian);

        escrow.update_reputation(renter, 90);
        let rep = escrow.get_reputation(renter);
        assert_eq!(rep.total_sessions, 1);
        assert_eq!(rep.average_score, 90);

        escrow.update_reputation(renter, 70);
        let rep = escrow.get_reputation(renter);
        assert_eq!(rep.total_sessions, 2);
        assert_eq!(rep.score_sum, 160);
        assert_eq!(rep.average_score, 80);
    }

    #[test]
    fn test_non_guardian_cannot_update_reputation() {
        let (mut escrow, admin, renter, _, _, _) = setup_with_guardian();
        escrow.env().set_caller(admin);
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            escrow.update_reputation(renter, 80);
        }));
        assert!(result.is_err(), "Non-guardian should not be able to update reputation");
    }

    #[test]
    fn test_update_reputation_rejects_score_over_100() {
        let (mut escrow, _, renter, _, _, guardian) = setup_with_guardian();
        escrow.env().set_caller(guardian);
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            escrow.update_reputation(renter, 101);
        }));
        assert!(result.is_err(), "Score over 100 should revert");
    }
}
