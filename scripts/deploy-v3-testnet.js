/**
 * Asset402 v3 Smart Contract Deploy Script
 * Deploys LendingPool and RentalEscrow to Casper Testnet.
 *
 * Usage:
 *   node deploy-v3-testnet.js                 deploy LendingPool + RentalEscrow (fresh, never deployed)
 *   node deploy-v3-testnet.js --redeploy-v2    also redeploy CarbonCredit + FractionalRegistry
 *                                              (their bytecode changed in Phase 1 — claim_income, etc.)
 *                                              writes deployment-results-v2b.json, does NOT touch
 *                                              deployment-results-v2.json
 */
"use strict";

const { Keys, DeployUtil, CLValueBuilder, CLByteArray, RuntimeArgs, CasperClient } = require("casper-js-sdk");
const fs = require("fs");
const path = require("path");

// ── Configuration ──────────────────────────────────────────────────────────────
const NODE_URL      = "https://node.testnet.casper.network/rpc";
const NETWORK_NAME  = "casper-test";
const KEY_PATH      = process.env.CASPER_PRIVATE_KEY_PATH
                      || path.join(__dirname, "casper-wallet-secret_keys", "Account 1_secret_key.pem");

const RECONCILED = JSON.parse(
  fs.readFileSync(path.join(__dirname, "deployment-results-reconciled.json"), "utf8")
);
const ASSET_REGISTRY_CONTRACT_HASH = RECONCILED.canonical_asset_registry_contract_hash; // "hash-...."

const REDEPLOY_V2 = process.argv.includes("--redeploy-v2");

// ── Load Key ───────────────────────────────────────────────────────────────────
let ownerKey;
try {
  ownerKey = Keys.Secp256K1.loadKeyPairFromPrivateFile(KEY_PATH);
  console.log("✓ Loaded Secp256K1 key:", ownerKey.publicKey.toHex().slice(0, 20) + "...");
} catch (e1) {
  try {
    ownerKey = Keys.Ed25519.loadKeyPairFromPrivateFile(KEY_PATH);
    console.log("✓ Loaded Ed25519 key:", ownerKey.publicKey.toHex().slice(0, 20) + "...");
  } catch (e2) {
    console.error("Failed to load key:", e1.message, e2.message);
    process.exit(1);
  }
}

// Agents currently share the deployer's funded wallet (see agents/.env
// AGENT_PRIVATE_KEY_PATH / AGENT_PUBLIC_KEY_HEX == this same key) — no
// separate dedicated agent keys exist yet, so the agent roles below are
// filled with the deployer's own address.
const AGENT_ADDRESS_KEY = CLValueBuilder.key(ownerKey.publicKey);

function contractHashToKey(hashStr) {
  const hex = hashStr.replace(/^hash-/, "");
  return CLValueBuilder.key(new CLByteArray(new Uint8Array(Buffer.from(hex, "hex"))));
}

// ── Raw RPC helper ─────────────────────────────────────────────────────────────
let rpcId = 1;
async function rpc(method, params) {
  const resp = await fetch(NODE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: rpcId++, jsonrpc: "2.0", method, params }),
  });
  const json = await resp.json();
  if (json.error) throw new Error(`RPC ${method} error: ${JSON.stringify(json.error)}`);
  return json.result;
}

// ── Poll until execution info appears ─────────────────────────────────────────
async function waitForDeploy(deployHash, timeoutMs = 300_000) {
  console.log(`  Polling ${deployHash.slice(0,16)}…`);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await rpc("info_get_deploy", { deploy_hash: deployHash });
      const execInfo = result.execution_info;
      if (execInfo && execInfo.execution_result) {
        const er = execInfo.execution_result.Version2 || execInfo.execution_result;
        if (er.error_message !== null && er.error_message !== undefined) {
          throw new Error(`Deploy FAILED: ${er.error_message}`);
        }
        console.log(`  ✓ Confirmed in block ${execInfo.block_height}`);
        return { deployHash, execInfo, effects: er.effects || [] };
      }
    } catch (e) {
      if (!e.message.includes("No such deploy") && !e.message.includes("not found")) {
        throw e;
      }
    }
    await new Promise(r => setTimeout(r, 4000));
  }
  throw new Error(`Timeout waiting for deploy ${deployHash}`);
}

// ── Submit a WASM module-bytes deploy ─────────────────────────────────────────
async function deployWasm(wasmPath, args, paymentMotes = "350000000000") {
  const wasm = new Uint8Array(fs.readFileSync(wasmPath));
  const rArgs = RuntimeArgs.fromMap(args);
  const deploy = DeployUtil.makeDeploy(
    new DeployUtil.DeployParams(ownerKey.publicKey, NETWORK_NAME, 1, 1_800_000),
    DeployUtil.ExecutableDeployItem.newModuleBytes(wasm, rArgs),
    DeployUtil.standardPayment(paymentMotes)
  );
  const signed = DeployUtil.signDeploy(deploy, ownerKey);
  const client = new CasperClient(NODE_URL);
  const hash = await client.putDeploy(signed);
  console.log(`  Submitted deploy: ${hash}`);
  return hash;
}

// ── Extract contract hash from deploy effects ──────────────────────────────────
function extractContractHash(effects) {
  for (const e of effects) {
    if (e.key && e.key.startsWith("hash-") && e.kind && e.kind.Write && e.kind.Write.Contract) {
      return e.key;
    }
  }
  for (const e of effects) {
    if (e.key && e.key.startsWith("hash-")) {
      return e.key;
    }
  }
  return null;
}

async function deployOne(label, wasmRelPath, packageKeyName, extraArgs) {
  console.log(`== Deploying ${label} ==`);
  const wasmPath = path.resolve(__dirname, wasmRelPath);
  if (!fs.existsSync(wasmPath)) {
    throw new Error(`WASM not found: ${wasmPath}`);
  }
  const args = {
    odra_cfg_constructor:            CLValueBuilder.string("init"),
    odra_cfg_package_hash_key_name:  CLValueBuilder.string(packageKeyName),
    odra_cfg_allow_key_override:     CLValueBuilder.bool(true),
    odra_cfg_is_upgradable:          CLValueBuilder.bool(false),
    odra_cfg_is_upgrade:             CLValueBuilder.bool(false),
    ...extraArgs,
  };
  const deployHash = await deployWasm(wasmPath, args);
  const result = await waitForDeploy(deployHash);
  const contractHash = extractContractHash(result.effects);
  console.log(`  Contract hash: ${contractHash}`);
  console.log(`  ✓ ${label} deployed!`);
  console.log(`  Deploy TX: https://testnet.cspr.live/deploy/${deployHash}\n`);
  return {
    deployHash,
    contractHash,
    explorerUrl: `https://testnet.cspr.live/deploy/${deployHash}`,
  };
}

// ── Main Execution ─────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log("\n=== Asset402 v3 Casper Contract Deployment ===");
    console.log(`Node:    ${NODE_URL}`);
    console.log(`Network: ${NETWORK_NAME}`);
    console.log(`Account: ${ownerKey.publicKey.toHex()}`);
    console.log(`AssetRegistry (canonical): ${ASSET_REGISTRY_CONTRACT_HASH}\n`);

    const results = { network: NETWORK_NAME, deployer: ownerKey.publicKey.toHex(), contracts: {} };

    // ── 1. LendingPool ───────────────────────────────────────────────────────
    results.contracts.LendingPool = await deployOne(
      "LendingPool",
      "../contracts/wasm/LendingPool.wasm",
      "lendingpool",
      {
        collector_agent: AGENT_ADDRESS_KEY,
        risk_agent:      AGENT_ADDRESS_KEY,
        fee_vault:       AGENT_ADDRESS_KEY,
      }
    );

    // ── 2. RentalEscrow ──────────────────────────────────────────────────────
    results.contracts.RentalEscrow = await deployOne(
      "RentalEscrow",
      "../contracts/wasm/RentalEscrow.wasm",
      "rentalescrow",
      {
        collector_agent: AGENT_ADDRESS_KEY,
        asset_registry:  contractHashToKey(ASSET_REGISTRY_CONTRACT_HASH),
        guardian_address: AGENT_ADDRESS_KEY,
      }
    );

    // ── 3. Optional: redeploy fixed CarbonCredit / FractionalRegistry ───────
    if (REDEPLOY_V2) {
      results.contracts.CarbonCredit = await deployOne(
        "CarbonCredit (Phase 1 fixed)",
        "../contracts/wasm/CarbonCredit.wasm",
        "carboncredit",
        {}
      );
      results.contracts.FractionalRegistry = await deployOne(
        "FractionalRegistry (Phase 1 fixed, adds claim_income)",
        "../contracts/wasm/FractionalRegistry.wasm",
        "fractionalregistry",
        {}
      );
    }

    console.log("== Deployment Summary ==");
    console.log("━".repeat(60));
    for (const [name, info] of Object.entries(results.contracts)) {
      console.log(`  ${name}: ${info.contractHash}`);
    }
    console.log("━".repeat(60));
    console.log("\n✅ Deployed and verified on Casper Testnet!");

    const outFile = REDEPLOY_V2 ? "deployment-results-v2b.json" : "deployment-results-v3.json";
    fs.writeFileSync(path.join(__dirname, outFile), JSON.stringify(results, null, 2));
    console.log(`📄 Results saved to: scripts/${outFile}`);

  } catch (err) {
    console.error("\n❌ Error during deployment:", err.message);
    process.exit(1);
  }
})();
