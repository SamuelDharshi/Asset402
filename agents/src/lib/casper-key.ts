// ─────────────────────────────────────────────────────────────────────────────
//  Shared agent signing-key loader.
//
//  The funded testnet key (scripts/casper-wallet-secret_keys/Account 1_secret_key.pem)
//  is a Secp256K1 key ("EC PRIVATE KEY" PEM header), not Ed25519. Loading it via
//  Keys.Ed25519.* silently produces garbage key material instead of failing loudly,
//  which is exactly how every agent ended up signing with a throwaway key. This
//  helper tries Secp256K1 first, then Ed25519, mirroring the proven working
//  pattern in scripts/deploy-v2-testnet.js — and throws (never fabricates a
//  fallback key) if neither parses.
// ─────────────────────────────────────────────────────────────────────────────

import { Keys } from 'casper-js-sdk';

export function loadAgentKey(privateKeyPath: string): Keys.AsymmetricKey {
  if (!privateKeyPath) {
    throw new Error(
      'AGENT_PRIVATE_KEY_PATH is not set — refusing to sign with a throwaway key. ' +
      'Set AGENT_PRIVATE_KEY_PATH in .env to a real Casper secret-key PEM file.'
    );
  }
  try {
    return Keys.Secp256K1.loadKeyPairFromPrivateFile(privateKeyPath);
  } catch (secp256k1Err) {
    try {
      return Keys.Ed25519.loadKeyPairFromPrivateFile(privateKeyPath);
    } catch (ed25519Err) {
      throw new Error(
        `Failed to load agent key from ${privateKeyPath} as either Secp256K1 or Ed25519. ` +
        `Secp256K1 error: ${String(secp256k1Err)}. Ed25519 error: ${String(ed25519Err)}.`
      );
    }
  }
}
