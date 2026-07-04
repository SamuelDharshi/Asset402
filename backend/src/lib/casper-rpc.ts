// ─────────────────────────────────────────────────────────────────────────────
//  Shared direct-RPC helper for real Casper testnet transactions.
//
//  Talks straight to the public testnet RPC node, mirroring the exact
//  pattern proven in scripts/deploy-v2-testnet.js and duplicated (not
//  shared via a workspace package, since agents/ and backend/ are separate
//  npm packages with no monorepo tooling between them — a documented,
//  pragmatic choice) from agents/src/lib/casper-rpc.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { CasperClient, DeployUtil, Keys, RuntimeArgs, CLValue } from 'casper-js-sdk';

let rpcId = 1;

export async function rpcCall<T = unknown>(nodeUrl: string, method: string, params: unknown): Promise<T> {
  const resp = await fetch(nodeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: rpcId++, jsonrpc: '2.0', method, params }),
  });
  const json = (await resp.json()) as { result?: T; error?: { code: number; message: string } };
  if (json.error) {
    throw new Error(`RPC ${method} error: ${JSON.stringify(json.error)}`);
  }
  return json.result as T;
}

export interface DeployEffect {
  key:  string;
  kind: Record<string, unknown>;
}

export interface DeployConfirmation {
  deployHash:  string;
  blockHeight: number;
  effects:     DeployEffect[];
}

export async function waitForDeploy(
  nodeUrl: string,
  deployHash: string,
  timeoutMs = 300_000,
): Promise<DeployConfirmation> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await rpcCall<any>(nodeUrl, 'info_get_deploy', { deploy_hash: deployHash });
      const execInfo = result.execution_info;
      if (execInfo && execInfo.execution_result) {
        const er = execInfo.execution_result.Version2 ?? execInfo.execution_result;
        if (er.error_message !== null && er.error_message !== undefined) {
          throw new Error(`Deploy ${deployHash} failed on-chain: ${er.error_message}`);
        }
        return { deployHash, blockHeight: execInfo.block_height, effects: er.effects ?? [] };
      }
    } catch (err) {
      const msg = String(err);
      if (!msg.includes('No such deploy') && !msg.includes('not found')) {
        throw err;
      }
    }
    await new Promise((res) => setTimeout(res, 4000));
  }
  throw new Error(`Timeout waiting for deploy ${deployHash} to confirm`);
}

function loadAgentKey(privateKeyPath: string): Keys.AsymmetricKey {
  if (!privateKeyPath) {
    throw new Error('AGENT_PRIVATE_KEY_PATH is not set — cannot sign a real on-chain deploy.');
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

/**
 * Builds, signs, and submits a stored-contract entry-point call deploy
 * directly to the testnet RPC node using the backend's own agent key
 * (AGENT_PRIVATE_KEY_PATH). `contractHashHex` may include or omit the
 * "hash-" prefix.
 */
export async function submitContractCall(params: {
  nodeUrl:             string;
  networkName:         string;
  agentPrivateKeyPath: string;
  contractHashHex:     string;
  entryPoint:          string;
  args:                Record<string, CLValue>;
  paymentMotes?:       string;
}): Promise<string> {
  const { nodeUrl, networkName, agentPrivateKeyPath, contractHashHex, entryPoint, args, paymentMotes = '5000000000' } = params;
  const sender = loadAgentKey(agentPrivateKeyPath);
  const cleanHash = contractHashHex.replace(/^hash-/, '');
  const contractHashBytes = Uint8Array.from(Buffer.from(cleanHash, 'hex'));

  const runtimeArgs = RuntimeArgs.fromMap(args);
  const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(contractHashBytes, entryPoint, runtimeArgs);
  const deployParams = new DeployUtil.DeployParams(sender.publicKey, networkName, 1, 1_800_000);
  const payment = DeployUtil.standardPayment(paymentMotes);
  const deploy  = DeployUtil.makeDeploy(deployParams, session, payment);
  const signed  = DeployUtil.signDeploy(deploy, sender);

  const client = new CasperClient(nodeUrl);
  return client.putDeploy(signed);
}
