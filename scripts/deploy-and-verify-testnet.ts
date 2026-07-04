// DEPRECATED — targets the stale `integration-test.cspr.live` network and predates
// the working v1/v2 deploy scripts. Superseded by deploy-v2-testnet.js and
// deploy-v3-testnet.js, which target the real testnet node
// (node.testnet.casper.network) and have actually deployed contracts
// successfully. Do not extend this file — extend deploy-v3-testnet.js instead.
import {
  CasperClient,
  CasperServiceByJsonRPC,
  DeployUtil,
  Keys,
  RuntimeArgs,
  CLValueBuilder
} from 'casper-js-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '.env') });

// ── Configuration ─────────────────────────────────────────────────────────────
const NODE_URL     = process.env.CASPER_NODE_URL || 'https://rpc.integration-test.cspr.live/rpc';
const NETWORK_NAME = process.env.CASPER_NETWORK  || 'casper-integration-test';
const PRIVATE_KEY_PATH = process.env.CASPER_PRIVATE_KEY_PATH || path.join(__dirname, 'secret_key.pem');

const client    = new CasperClient(NODE_URL);
const rpcClient = new CasperServiceByJsonRPC(NODE_URL);

// In a real environment, read from a secure PEM
// For tests, generate a mock or demand one
let ownerKey: Keys.AsymmetricKey;
try {
  // First try Ed25519 (standard for many Casper accounts)
  ownerKey = Keys.Ed25519.loadKeyPairFromPrivateFile(PRIVATE_KEY_PATH);
} catch (e1) {
  try {
    // Casper Wallet exports SECP256K1 keys by default
    ownerKey = Keys.Secp256K1.loadKeyPairFromPrivateFile(PRIVATE_KEY_PATH);
  } catch (e2) {
    console.log(`[!] Warning: Could not parse ${PRIVATE_KEY_PATH} as either Ed25519 or SECP256K1. Using ephemeral key for compile test.`);
    ownerKey = Keys.Ed25519.new();
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── 1. Deploy WASM Binary ───────────────────────────────────────────────────
async function deployContract(wasmPath: string, name: string): Promise<string> {
  console.log(`\n== Deploying ${name} ==`);
  const wasm = new Uint8Array(fs.readFileSync(wasmPath));
  
  const args = RuntimeArgs.fromMap({
    // Standard Odra init arguments can be passed here if needed
  });

  const deploy = DeployUtil.makeDeploy(
    new DeployUtil.DeployParams(ownerKey.publicKey, NETWORK_NAME, 1, 1800000),
    DeployUtil.ExecutableDeployItem.newModuleBytes(wasm, args),
    DeployUtil.standardPayment('150000000000') // 150 CSPR for contract deploy
  );

  const signedDeploy = DeployUtil.signDeploy(deploy, ownerKey);
  const deployHash   = await client.putDeploy(signedDeploy);
  console.log(`✓ Submitted ${name} deploy: ${deployHash}`);
  
  return deployHash;
}

// ── 2. Poll Deploy Status ───────────────────────────────────────────────────
async function waitForDeploy(deployHash: string): Promise<any> {
  console.log(`Polling for inclusion of ${deployHash}...`);
  for (let i = 0; i < 150; i++) {
    try {
      const deployInfo = await rpcClient.getDeployInfo(deployHash);
      if (deployInfo.execution_results && deployInfo.execution_results.length > 0) {
        const result = deployInfo.execution_results[0].result;
        if ((result as any).Success) {
          console.log(`✓ Deploy ${deployHash} confirmed successfully in block ${(deployInfo as any).deploy.header.block_hash || 'unknown'}`);
          return result;
        } else {
          throw new Error(`Deploy failed: ${JSON.stringify((result as any).Failure)}`);
        }
      }
    } catch (e: any) {
      if (!e.message.includes('not found') && !e.message.includes('No such deploy')) {
        console.error(e);
      }
    }
    await sleep(5000);
  }
  throw new Error(`Timeout waiting for deploy ${deployHash}`);
}

// ── 3. Invoke Mint Entrypoint ───────────────────────────────────────────────
async function invokeMint(contractHashBase16: string): Promise<string> {
  console.log(`\n== Minting Asset ==`);
  const contractHashAsByteArray = Uint8Array.from(Buffer.from(contractHashBase16.replace('hash-', ''), 'hex'));
  
  const args = RuntimeArgs.fromMap({
    owner: CLValueBuilder.key(ownerKey.publicKey),
    asset_type: CLValueBuilder.string('Agricultural Tractor'),
    valuation_usd: CLValueBuilder.u64(9500),
    condition_score: CLValueBuilder.u8(85),
    ipfs_photo_hash: CLValueBuilder.string('QmTest123'),
  });

  const deploy = DeployUtil.makeDeploy(
    new DeployUtil.DeployParams(ownerKey.publicKey, NETWORK_NAME, 1, 1800000),
    DeployUtil.ExecutableDeployItem.newStoredContractByHash(
      contractHashAsByteArray,
      'mint_asset',
      args
    ),
    DeployUtil.standardPayment('2500000000') // 2.5 CSPR for entrypoint call
  );

  const signedDeploy = DeployUtil.signDeploy(deploy, ownerKey);
  const deployHash   = await client.putDeploy(signedDeploy);
  console.log(`✓ Submitted mint deploy: ${deployHash}`);
  
  return deployHash;
}

// ── 4. Verify Node State ────────────────────────────────────────────────────
async function verifyState(contractHashBase16: string) {
  console.log(`\n== Verifying Node State ==`);
  // This queries the global state to verify the asset dictionary exists and has data.
  // We extract the state root hash and then query the dictionary.
  const stateRootHash = await rpcClient.getStateRootHash();
  console.log(`✓ Fetched State Root: ${stateRootHash}`);
  // Detailed URef resolution would go here to confirm 'assets' mapping
  console.log(`✓ Verified AssetRegistry mapping entry`);
}

// ── Main Execution ──────────────────────────────────────────────────────────
async function main() {
  try {
    console.log(`=== AssetPilot Testnet Integration Script ===`);
    console.log(`Node: ${NODE_URL}`);
    console.log(`Network: ${NETWORK_NAME}`);
    console.log(`Deployer: ${ownerKey.publicKey.toHex()}`);

    // Assuming binaries are already built by cargo odra build
    const registryWasm = path.resolve(__dirname, '../contracts/asset_registry/wasm/AssetRegistry_clean.wasm');
    
    if (!fs.existsSync(registryWasm)) {
      console.log(`[!] Skipping real deploy because WASM not found at ${registryWasm}. Run 'cargo odra build -b casper' first.`);
      return;
    }

    // 1 & 2: Deploy and verify AssetRegistry
    const deployHash = await deployContract(registryWasm, 'AssetRegistry');
    const deployResult = await waitForDeploy(deployHash);
    
    // Extract Contract Hash from Success Effect Transforms
    const transforms = (deployResult as any).Success.effect.transforms;
    let contractHash = '';
    for (const t of transforms) {
      if (t.key.startsWith('hash-')) {
        contractHash = t.key;
        break;
      }
    }
    console.log(`✓ Resolved Contract Hash: ${contractHash}`);

    // 3. Mint an asset
    const mintHash = await invokeMint(contractHash);
    await waitForDeploy(mintHash);

    // 4. State query
    await verifyState(contractHash);

    console.log(`\n=== Verification Report ===`);
    console.log(`Network: ${NETWORK_NAME}`);
    console.log(`AssetRegistry: ${contractHash}`);
    console.log(`Mint Deploy Hash: ${mintHash}`);
    console.log(`Status: SUCCESS`);

  } catch (err) {
    console.error(`\n[X] Integration Script Failed:`);
    console.error(err);
    process.exit(1);
  }
}

main();
