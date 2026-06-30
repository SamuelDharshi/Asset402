/**
 * AssetPilot v2.0 Smart Contract Deploy Script
 * Deploys FractionalRegistry and CarbonCredit contracts to Casper Testnet
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

// ── Main Execution ─────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log("\n=== AssetPilot v2.0 Casper Contract Deployment ===");
    console.log(`Node:    ${NODE_URL}`);
    console.log(`Network: ${NETWORK_NAME}`);
    console.log(`Account: ${ownerKey.publicKey.toHex()}\n`);

    // ── 1. Deploy CarbonCredit ─────────────────────────────────────────────────
    console.log("== [1/2] Deploying CarbonCredit Contract ==");
    const carbonWasm = path.resolve(__dirname, "../contracts/wasm/CarbonCredit.wasm");
    if (!fs.existsSync(carbonWasm)) {
      console.error(`WASM not found: ${carbonWasm}`);
      process.exit(1);
    }

    const carbonArgs = {
      odra_cfg_constructor:            CLValueBuilder.string("init"),
      odra_cfg_package_hash_key_name:  CLValueBuilder.string("carboncredit"),
      odra_cfg_allow_key_override:     CLValueBuilder.bool(true),
      odra_cfg_is_upgradable:          CLValueBuilder.bool(false),
      odra_cfg_is_upgrade:             CLValueBuilder.bool(false),
    };

    const carbonDeployHash = await deployWasm(carbonWasm, carbonArgs);
    const carbonResult = await waitForDeploy(carbonDeployHash);
    const carbonContractHash = extractContractHash(carbonResult.effects);
    console.log(`  Contract hash: ${carbonContractHash}`);
    console.log(`  ✓ CarbonCredit deployed!`);
    console.log(`  Deploy TX: https://testnet.cspr.live/deploy/${carbonDeployHash}\n`);

    // ── 2. Deploy FractionalRegistry ───────────────────────────────────────────
    console.log("== [2/2] Deploying FractionalRegistry Contract ==");
    const fractionalWasm = path.resolve(__dirname, "../contracts/wasm/FractionalRegistry.wasm");
    if (!fs.existsSync(fractionalWasm)) {
      console.error(`WASM not found: ${fractionalWasm}`);
      process.exit(1);
    }

    const fractionalArgs = {
      odra_cfg_constructor:            CLValueBuilder.string("init"),
      odra_cfg_package_hash_key_name:  CLValueBuilder.string("fractionalregistry"),
      odra_cfg_allow_key_override:     CLValueBuilder.bool(true),
      odra_cfg_is_upgradable:          CLValueBuilder.bool(false),
      odra_cfg_is_upgrade:             CLValueBuilder.bool(false),
    };

    const fractionalDeployHash = await deployWasm(fractionalWasm, fractionalArgs);
    const fractionalResult = await waitForDeploy(fractionalDeployHash);
    const fractionalContractHash = extractContractHash(fractionalResult.effects);
    console.log(`  Contract hash: ${fractionalContractHash}`);
    console.log(`  ✓ FractionalRegistry deployed!`);
    console.log(`  Deploy TX: https://testnet.cspr.live/deploy/${fractionalDeployHash}\n`);

    console.log("== Deployment Summary ==");
    console.log("━".repeat(60));
    console.log(`  CarbonCredit Contract:       ${carbonContractHash}`);
    console.log(`  FractionalRegistry Contract: ${fractionalContractHash}`);
    console.log("━".repeat(60));
    console.log("\n✅ All v2.0 contracts deployed and verified on Casper Testnet!");

    // Save v2 results
    const results = {
      network: NETWORK_NAME,
      deployer: ownerKey.publicKey.toHex(),
      contracts: {
        CarbonCredit: {
          deployHash: carbonDeployHash,
          contractHash: carbonContractHash,
          explorerUrl: `https://testnet.cspr.live/deploy/${carbonDeployHash}`,
        },
        FractionalRegistry: {
          deployHash: fractionalDeployHash,
          contractHash: fractionalContractHash,
          explorerUrl: `https://testnet.cspr.live/deploy/${fractionalDeployHash}`,
        }
      }
    };
    fs.writeFileSync(path.join(__dirname, "deployment-results-v2.json"), JSON.stringify(results, null, 2));
    console.log(`📄 Results saved to: scripts/deployment-results-v2.json`);

  } catch (err) {
    console.error("\n❌ Error during deployment:", err.message);
    process.exit(1);
  }
})();
