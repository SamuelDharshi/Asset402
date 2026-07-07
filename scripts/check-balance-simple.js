const { CLPublicKey } = require('casper-js-sdk');

const NODE_URL = 'https://node.testnet.casper.network/rpc';
const pubKeyHex = '020394CCdB983b7B2a88486448E5d170F737A80264d32CaB99A3e2a3e01f33D6CEa1';

async function rpcCall(method, params) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(NODE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: Date.now(), jsonrpc: '2.0', method, params }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const json = await res.json();
    if (json.error) throw new Error(`RPC ${method} error: ${JSON.stringify(json.error)}`);
    return json.result;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function run() {
  console.log('Querying balance...');
  try {
    const stateResult = await rpcCall('chain_get_state_root_hash', {});
    const stateRootHash = stateResult.state_root_hash;
    const pk = CLPublicKey.fromHex(pubKeyHex);
    const accountHash = `account-hash-${Buffer.from(pk.toAccountHash()).toString('hex')}`;
    
    console.log('Querying global state for account...');
    const result = await rpcCall('query_global_state', {
      state_identifier: { StateRootHash: stateRootHash },
      key: accountHash,
      path: [],
    });
    
    const purse = result?.stored_value?.Account?.main_purse;
    if (purse) {
      console.log('Purse:', purse);
      const balanceResult = await rpcCall('state_get_balance', {
        state_root_hash: stateRootHash,
        purse_uref: purse,
      });
      console.log('Balance value (motes):', balanceResult.balance_value);
      console.log('Balance value (CSPR):', Number(balanceResult.balance_value) / 1000000000);
    } else {
      console.log('No main purse found.');
    }
  } catch (err) {
    console.error('Error during query:', err.message);
  }
}

run();
