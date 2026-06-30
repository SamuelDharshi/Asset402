/**
 * AssetPilot Casper Testnet Deploy & Verify Script
 * Uses raw JSON-RPC calls to support Casper 2.0
 */
"use strict";

const { Keys, DeployUtil, CLValueBuilder, RuntimeArgs, CasperClient } = require("casper-js-sdk");
const fs = require("fs");
const path = require("path");

// ── Configuration ──────────────────────────────────────────────────────────────
const NODE_URL      = "https://node.testnet.casper.network/rpc";
const NETWORK_NAME  = "casper-test";
const KEY_PATH      = process.env.CASPER_PRIVATE_KEY_PATH
                      || path.join(__dirname, "casper-wallet-secret_keys", "Account 1_secret_key.pem");

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
      // Casper 2.x returns execution_info at the top level of deploy result
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
async function deployWasm(wasmPath, args, paymentMotes = "300000000000") {
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

// ── Call a stored-contract entrypoint ─────────────────────────────────────────
async function callEntrypoint(contractHash, entryPoint, args, paymentMotes = "20000000000") {
  // contractHash format: "hash-XXXX" or "contract-XXXX"
  // casper-js-sdk wants the raw hex
  const rawHash = contractHash.replace(/^(hash|contract)-/, "");
  const rArgs = RuntimeArgs.fromMap(args);
  const deploy = DeployUtil.makeDeploy(
    new DeployUtil.DeployParams(ownerKey.publicKey, NETWORK_NAME, 1, 1_800_000),
    DeployUtil.ExecutableDeployItem.newStoredContractByHash(
      Uint8Array.from(Buffer.from(rawHash, "hex")),
      entryPoint,
      rArgs
    ),
    DeployUtil.standardPayment(paymentMotes)
  );
  const signed = DeployUtil.signDeploy(deploy, ownerKey);
  const client = new CasperClient(NODE_URL);
  const hash = await client.putDeploy(signed);
  console.log(`  Submitted entrypoint call: ${hash}`);
  return hash;
}

// ── Extract contract hash from deploy effects ──────────────────────────────────
function extractContractHash(effects) {
  for (const e of effects) {
    if (e.key && e.key.startsWith("hash-") && e.kind && e.kind.Write && e.kind.Write.Contract) {
      return e.key;
    }
  }
  // fallback: first hash- key
  for (const e of effects) {
    if (e.key && e.key.startsWith("hash-")) {
      return e.key;
    }
  }
  return null;
}

// ── Main ───────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log("\n=== AssetPilot Casper Testnet Deploy & Verify ===");
    console.log(`Node:    ${NODE_URL}`);
    console.log(`Network: ${NETWORK_NAME}`);
    console.log(`Account: ${ownerKey.publicKey.toHex()}\n`);

    const ownerAccountHash = ownerKey.publicKey.toAccountHash();
    const ownerKey_ = CLValueBuilder.key(ownerKey.publicKey);

    // ── 1. Deploy AssetRegistry ───────────────────────────────────────────────
    console.log("== [1/3] Deploying AssetRegistry ==");
    const registryWasm = path.resolve(__dirname, "../contracts/asset_registry/wasm/AssetRegistry.wasm");
    if (!fs.existsSync(registryWasm)) {
      console.error(`WASM not found: ${registryWasm}`);
      process.exit(1);
    }

    const deployArgs = {
      odra_cfg_constructor:            CLValueBuilder.string("init"),
      odra_cfg_package_hash_key_name:  CLValueBuilder.string("assetregistry"),
      odra_cfg_allow_key_override:     CLValueBuilder.bool(true),
      odra_cfg_is_upgradable:          CLValueBuilder.bool(false),
      odra_cfg_is_upgrade:             CLValueBuilder.bool(false),
      guardian_address:                ownerKey_,
      lending_pool_address:            ownerKey_,
      rental_escrow_address:           ownerKey_,
    };

    const registryDeployHash = await deployWasm(registryWasm, deployArgs);
    const registryResult = await waitForDeploy(registryDeployHash);
    const registryContractHash = extractContractHash(registryResult.effects);
    console.log(`  Contract hash: ${registryContractHash}`);
    console.log(`  ✓ AssetRegistry deployed!`);
    console.log(`  Deploy TX: https://testnet.cspr.live/deploy/${registryDeployHash}\n`);

    // ── 2. Mint an asset ──────────────────────────────────────────────────────
    console.log("== [2/3] Minting a test asset ==");
    const mintArgs = {
      owner:          ownerKey_,
      asset_type:     CLValueBuilder.string("real_estate"),
      valuation_usd:  CLValueBuilder.u64(500000),
      condition_score: CLValueBuilder.u8(85),
      ipfs_photo_hash: CLValueBuilder.string("QmTestHash123456789"),
    };

    const mintDeployHash = await callEntrypoint(registryContractHash, "mint_asset", mintArgs);
    const mintResult = await waitForDeploy(mintDeployHash);
    console.log(`  ✓ Asset minted!`);
    console.log(`  Mint TX: https://testnet.cspr.live/deploy/${mintDeployHash}\n`);

    // ── 3. Verify state ───────────────────────────────────────────────────────
    console.log("== [3/3] On-chain Proof Summary ==");
    console.log("━".repeat(60));
    console.log(`  AssetRegistry Deploy Hash: ${registryDeployHash}`);
    console.log(`  AssetRegistry Contract:    ${registryContractHash}`);
    console.log(`  Mint Deploy Hash:          ${mintDeployHash}`);
    console.log(`  Block (registry):          ${registryResult.execInfo.block_height}`);
    console.log(`  Block (mint):              ${mintResult.execInfo.block_height}`);
    console.log("━".repeat(60));
    console.log(`\n🔗 Explorer links:`);
    console.log(`  https://testnet.cspr.live/deploy/${registryDeployHash}`);
    console.log(`  https://testnet.cspr.live/deploy/${mintDeployHash}`);
    console.log("\n✅ All on-chain proofs verified.");

    // Write results to file
    const results = {
      network: NETWORK_NAME,
      deployer: ownerKey.publicKey.toHex(),
      contracts: {
        AssetRegistry: {
          deployHash: registryDeployHash,
          contractHash: registryContractHash,
          blockHeight: registryResult.execInfo.block_height,
          explorerUrl: `https://testnet.cspr.live/deploy/${registryDeployHash}`,
        },
      },
      transactions: {
        mintAsset: {
          deployHash: mintDeployHash,
          blockHeight: mintResult.execInfo.block_height,
          explorerUrl: `https://testnet.cspr.live/deploy/${mintDeployHash}`,
        },
      },
    };
    fs.writeFileSync(path.join(__dirname, "deployment-results.json"), JSON.stringify(results, null, 2));
    console.log(`\n📄 Results saved to: scripts/deployment-results.json`);

  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  }
})();
