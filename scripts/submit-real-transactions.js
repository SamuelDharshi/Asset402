/**
 * Asset402 — Real On-Chain Transaction Runner
 *
 * Submits REAL signed deploys to Casper Testnet for:
 *  1. mint_asset   → AssetRegistry contract (creates asset token #1 on-chain)
 *  2. issue_cuc    → CarbonCredit contract  (issues real CUC for demo rental)
 *
 * Prerequisites:
 *  - Wallet must have > 15 CSPR (5 CSPR payment per tx, 2 txs)
 *  - Faucet: https://testnet.faucet.casperlabs.io/
 *  - Address: 020394ccdb983b7b2a88486448e5d170f737a80264d32cab99a3e2a3e01f33d6cea1
 *
 * Run:  node scripts/submit-real-transactions.js
 */

'use strict';

const { CasperClient, CLValueBuilder, CLPublicKey, DeployUtil, Keys, RuntimeArgs } = require('casper-js-sdk');
const fs = require('fs');
const path = require('path');

// ── Configuration ──────────────────────────────────────────────────────────────
const NODE_URL     = 'https://node.testnet.casper.network/rpc';
const NETWORK      = 'casper-test';
const KEY_PATH     = path.join(__dirname, 'casper-wallet-secret_keys', 'Account 1_secret_key.pem');
const PAYMENT      = '5000000000'; // 5 CSPR per deploy

const ASSET_REGISTRY_HASH = '1120c2a6308ee3e60bcbc17771ec018f5ef9ba7d0322c55747d341ad752d50ec';
const CARBON_CREDIT_HASH  = '77de8632404b808a26bdc8752411842704605af0db2b09628f93b234d51ef5a3';

// ── Load Key ───────────────────────────────────────────────────────────────────
function loadKey() {
  if (!fs.existsSync(KEY_PATH)) {
    throw new Error(`Key file not found at ${KEY_PATH}`);
  }
  try {
    return Keys.Secp256K1.loadKeyPairFromPrivateFile(KEY_PATH);
  } catch {
    return Keys.Ed25519.loadKeyPairFromPrivateFile(KEY_PATH);
  }
}

// ── RPC Helper ─────────────────────────────────────────────────────────────────
async function rpcCall(method, params) {
  const res = await fetch(NODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Date.now(), jsonrpc: '2.0', method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${method}: ${JSON.stringify(json.error)}`);
  return json.result;
}

// ── Wait For Deploy ────────────────────────────────────────────────────────────
async function waitForDeploy(deployHash, label) {
  console.log(`  ⏳ Waiting for ${label} (${deployHash.slice(0, 12)}...) to confirm on-chain...`);
  const start = Date.now();
  while (Date.now() - start < 300_000) {
    try {
      const result = await rpcCall('info_get_deploy', { deploy_hash: deployHash });
      const execInfo = result.execution_info;
      if (execInfo && execInfo.execution_result) {
        const er = execInfo.execution_result.Version2 ?? execInfo.execution_result;
        if (er.error_message !== null && er.error_message !== undefined) {
          throw new Error(`Deploy failed on-chain: ${er.error_message}`);
        }
        const blockHeight = execInfo.block_height ?? execInfo.block_height_v2 ?? 'unknown';
        console.log(`  ✅ Confirmed! Block height: ${blockHeight}`);
        return { deployHash, blockHeight };
      }
    } catch (err) {
      const msg = String(err);
      if (!msg.includes('No such deploy') && !msg.includes('not found') && !msg.includes('info_get_deploy')) throw err;
    }
    await new Promise(r => setTimeout(r, 4000));
    process.stdout.write('.');
  }
  throw new Error(`Timeout waiting for ${deployHash}`);
}

// ── Submit Contract Call ───────────────────────────────────────────────────────
async function submitContractCall(sender, contractHashHex, entryPoint, args, label) {
  const cleanHash = contractHashHex.replace(/^hash-/, '');
  const contractHashBytes = Uint8Array.from(Buffer.from(cleanHash, 'hex'));
  const runtimeArgs = RuntimeArgs.fromMap(args);
  const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(contractHashBytes, entryPoint, runtimeArgs);
  const deployParams = new DeployUtil.DeployParams(sender.publicKey, NETWORK, 1, 1_800_000);
  const payment = DeployUtil.standardPayment(PAYMENT);
  const deploy  = DeployUtil.makeDeploy(deployParams, session, payment);
  const signed  = DeployUtil.signDeploy(deploy, sender);
  const client  = new CasperClient(NODE_URL);
  const deployHash = await client.putDeploy(signed);
  console.log(`\n  📤 ${label} submitted!`);
  console.log(`  📋 Deploy hash: ${deployHash}`);
  console.log(`  🔗 Explorer:   https://testnet.cspr.live/deploy/${deployHash}`);
  return deployHash;
}

// ── Check Wallet Balance ───────────────────────────────────────────────────────
async function checkBalance(publicKeyHex) {
  try {
    const stateResult = await rpcCall('chain_get_state_root_hash', {});
    const stateRootHash = stateResult.state_root_hash;
    const pk = CLPublicKey.fromHex(publicKeyHex);
    const accountHash = `account-hash-${Buffer.from(pk.toAccountHash()).toString('hex')}`;
    
    const result = await rpcCall('query_global_state', {
      state_identifier: { StateRootHash: stateRootHash },
      key: accountHash,
      path: [],
    });
    
    const purse = result?.stored_value?.Account?.main_purse;
    if (purse) {
      const balanceResult = await rpcCall('state_get_balance', {
        state_root_hash: stateRootHash,
        purse_uref: purse,
      });
      return BigInt(balanceResult?.balance_value ?? '0');
    }
    return 0n;
  } catch (err) {
    console.log(`   ⚠️ Balance check failed: ${err.message}`);
    return 0n;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Asset402 — Real On-Chain Transaction Submitter           ║');
  console.log('║  Network: Casper Testnet (casper-test)                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const sender = loadKey();
  const pubKeyHex = sender.publicKey.toHex();
  console.log(`👤 Deployer:  ${pubKeyHex}`);
  console.log(`🔗 Explorer:  https://testnet.cspr.live/account/${pubKeyHex}\n`);

  // Check balance
  console.log('💰 Checking wallet balance...');
  const balanceMotes = await checkBalance(pubKeyHex);
  const balanceCspr  = Number(balanceMotes) / 1_000_000_000;
  console.log(`   Balance: ${balanceCspr.toFixed(4)} CSPR (${balanceMotes.toString()} motes)`);

  if (balanceMotes < 12_000_000_000n) {
    console.error('\n❌ INSUFFICIENT FUNDS');
    console.error('   Need at least 12 CSPR for 2 contract calls (5 CSPR each + gas).');
    console.error('\n   👉 Fund your wallet at:');
    console.error('      https://testnet.faucet.casperlabs.io/');
    console.error(`\n   👉 Wallet address:`);
    console.error(`      ${pubKeyHex}\n`);
    process.exit(1);
  }

  console.log('   ✅ Sufficient funds — proceeding with on-chain transactions!\n');

  const results = {};

  // ── TX 1: mint_asset on AssetRegistry ─────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TX 1: mint_asset → AssetRegistry');
  console.log('      Minting demo asset: "Komatsu PC88 Mini Excavator"');
  console.log('      Contract: https://testnet.cspr.live/contract/' + ASSET_REGISTRY_HASH);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const ownerKey = CLPublicKey.fromHex(pubKeyHex);

  const mintHash = await submitContractCall(
    sender,
    ASSET_REGISTRY_HASH,
    'mint_asset',
    {
      owner:           CLValueBuilder.key(ownerKey),
      asset_type:      CLValueBuilder.string('Mini Excavator'),
      valuation_usd:   CLValueBuilder.u64(45000),
      condition_score: CLValueBuilder.u8(87),
      ipfs_photo_hash: CLValueBuilder.string('QmAsset402DemoExcavatorKomatsuPC88v1'),
    },
    'mint_asset (AssetRegistry)',
  );

  const mintConfirmation = await waitForDeploy(mintHash, 'mint_asset');
  results.mintAsset = {
    deployHash: mintHash,
    blockHeight: mintConfirmation.blockHeight,
    explorerUrl: `https://testnet.cspr.live/deploy/${mintHash}`,
    entryPoint: 'mint_asset',
    contract: 'AssetRegistry',
    contractHash: `hash-${ASSET_REGISTRY_HASH}`,
  };

  // ── TX 2: issue_cuc on CarbonCredit ───────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TX 2: issue_cuc → CarbonCredit');
  console.log('      Issuing 3.2 CUC for a 10-hour excavator rental');
  console.log('      Contract: https://testnet.cspr.live/contract/' + CARBON_CREDIT_HASH);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Renter = a separate testnet account (the oracle throwaway key)
  const renterKey = CLPublicKey.fromHex('0120c9cbf1c39e164e4978ee72d9639970a2bc84915ef6acd6c057cef549eeb671');

  const cucHash = await submitContractCall(
    sender,
    CARBON_CREDIT_HASH,
    'issue_cuc',
    {
      owner:               CLValueBuilder.key(ownerKey),
      renter:              CLValueBuilder.key(renterKey),
      asset_type_code:     CLValueBuilder.u8(1),    // 1 = Excavator
      rental_hours_tenths: CLValueBuilder.u64(100), // 10.0 hours (×10 encoding)
    },
    'issue_cuc (CarbonCredit)',
  );

  const cucConfirmation = await waitForDeploy(cucHash, 'issue_cuc');
  results.issueCUC = {
    deployHash: cucHash,
    blockHeight: cucConfirmation.blockHeight,
    explorerUrl: `https://testnet.cspr.live/deploy/${cucHash}`,
    entryPoint: 'issue_cuc',
    contract: 'CarbonCredit',
    contractHash: `hash-${CARBON_CREDIT_HASH}`,
    cucIssued: 3200, // 3200 milliCUC = 3.2 CUC (100 tenths × 32)
  };

  // ── Save Results ───────────────────────────────────────────────────────────
  const outputPath = path.join(__dirname, 'real-transactions.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    network:      NETWORK,
    generatedAt:  new Date().toISOString(),
    deployer:     pubKeyHex,
    transactions: results,
  }, null, 2));

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ ALL ON-CHAIN TRANSACTIONS CONFIRMED!                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log('📋 mint_asset:');
  console.log(`   https://testnet.cspr.live/deploy/${results.mintAsset.deployHash}`);
  console.log('\n📋 issue_cuc:');
  console.log(`   https://testnet.cspr.live/deploy/${results.issueCUC.deployHash}`);
  console.log(`\n📁 Results saved to: ${outputPath}\n`);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
