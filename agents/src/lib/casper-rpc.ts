// ─────────────────────────────────────────────────────────────────────────────
//  Shared direct-RPC helper for real Casper testnet transactions.
//
//  Deliberately bypasses the (unverified-availability) external Casper MCP
//  server for anything that moves money or needs a reliable confirmation —
//  talks straight to the public testnet RPC node instead, mirroring the
//  exact pattern already proven working in scripts/deploy-v2-testnet.js.
//  Used by x402/client.ts, x402/facilitator.ts, and collector-agent.ts so
//  there is one implementation of "submit a deploy" / "wait for it to land",
//  not three slightly different copies.
// ─────────────────────────────────────────────────────────────────────────────

import { CasperClient, CLPublicKey, DeployUtil, Keys, RuntimeArgs, CLValue } from 'casper-js-sdk';

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

/**
 * Polls `info_get_deploy` until execution completes or `timeoutMs` elapses.
 * Throws on on-chain execution failure or timeout — never returns a fake
 * "confirmed" result.
 */
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

/**
 * Parses a hex string as a real Casper public key. Throws (never falls back
 * to a random/throwaway key) if the string isn't a valid tagged public key —
 * e.g. a bare 32-byte account hash is NOT a valid transfer target here,
 * since native CSPR transfers require the actual public key, not its hash.
 */
export function parsePublicKeyOrThrow(hex: string, context: string): CLPublicKey {
  try {
    return CLPublicKey.fromHex(hex);
  } catch (err) {
    throw new Error(
      `[casper-rpc] "${hex}" is not a valid Casper public key (context: ${context}). ` +
      `Native transfers require the real public key, not an account hash or contract hash. ` +
      `Original error: ${String(err)}`
    );
  }
}

/**
 * Builds, signs, and submits a native CSPR transfer deploy directly to the
 * testnet RPC node. Returns the deploy hash immediately — call
 * waitForDeploy() separately if you need on-chain confirmation.
 */
export async function submitTransfer(params: {
  nodeUrl:             string;
  networkName:         string;
  sender:              Keys.AsymmetricKey;
  targetPublicKeyHex:  string;
  amountMotes:         bigint;
  paymentMotes?:       string;
  transferId?:         number;
  context?:            string;
}): Promise<string> {
  const { nodeUrl, networkName, sender, targetPublicKeyHex, amountMotes, paymentMotes = '100000000', transferId, context } = params;
  const targetPk = parsePublicKeyOrThrow(targetPublicKeyHex, context ?? 'submitTransfer');

  const deployParams = new DeployUtil.DeployParams(sender.publicKey, networkName, 1, 1_800_000);
  const session = DeployUtil.ExecutableDeployItem.newTransfer(
    amountMotes.toString(), targetPk, null, transferId ?? Date.now()
  );
  const payment = DeployUtil.standardPayment(paymentMotes);
  const deploy  = DeployUtil.makeDeploy(deployParams, session, payment);
  const signed  = DeployUtil.signDeploy(deploy, sender);

  const client = new CasperClient(nodeUrl);
  return client.putDeploy(signed);
}

/**
 * Builds, signs, and submits a stored-contract entry-point call deploy
 * (e.g. LendingPool.record_repayment) directly to the testnet RPC node.
 * `contractHashHex` is the contract hash WITHOUT the "hash-" prefix.
 */
export async function submitContractCall(params: {
  nodeUrl:         string;
  networkName:     string;
  sender:          Keys.AsymmetricKey;
  contractHashHex: string;
  entryPoint:      string;
  args:            Record<string, CLValue>;
  paymentMotes?:   string;
}): Promise<string> {
  const { nodeUrl, networkName, sender, contractHashHex, entryPoint, args, paymentMotes = '3000000000' } = params;
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

/** Fetches the current global state root hash — required before query_global_state calls. */
export async function getStateRootHash(nodeUrl: string): Promise<string> {
  const result = await rpcCall<{ state_root_hash: string }>(nodeUrl, 'chain_get_state_root_hash', {});
  return result.state_root_hash;
}

/** Reads a contract's stored state (or any global-state key) at the current state root. */
export async function queryGlobalState(nodeUrl: string, key: string, path: string[] = []): Promise<unknown> {
  const stateRootHash = await getStateRootHash(nodeUrl);
  const result = await rpcCall<{ stored_value: unknown }>(nodeUrl, 'query_global_state', {
    state_identifier: { StateRootHash: stateRootHash },
    key,
    path,
  });
  return result.stored_value;
}
