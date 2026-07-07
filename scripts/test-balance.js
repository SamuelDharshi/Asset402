const { CLPublicKey } = require('casper-js-sdk');

const NODE_URL = 'https://node.testnet.casper.network/rpc';
const pubKeyHex = '020394CCdB983b7B2a88486448E5d170F737A80264d32CaB99A3e2a3e01f33D6CEa1';

async function rpcCall(method, params) {
  const res = await fetch(NODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: Date.now(), jsonrpc: '2.0', method, params }),
  });
  const json = await res.json();
  return json;
}

async function run() {
  console.log('Fetching state root hash...');
  const stateRootResult = await rpcCall('chain_get_state_root_hash', {});
  console.log('State root hash result:', JSON.stringify(stateRootResult, null, 2));

  const stateRootHash = stateRootResult?.result?.state_root_hash;
  if (!stateRootHash) {
    console.log('No state root hash found.');
    return;
  }

  console.log('Generating account hash...');
  const pk = CLPublicKey.fromHex(pubKeyHex);
  const accountHash = `account-hash-${Buffer.from(pk.toAccountHash()).toString('hex')}`;
  console.log('Account hash:', accountHash);

  console.log('Querying global state for account...');
  const accountInfo = await rpcCall('query_global_state', {
    state_identifier: { StateRootHash: stateRootHash },
    key: accountHash,
    path: [],
  });
  console.log('Account info result:', JSON.stringify(accountInfo, null, 2));

  const purse = accountInfo?.result?.stored_value?.Account?.main_purse;
  if (purse) {
    console.log('Found main purse:', purse);
    const balanceResult = await rpcCall('state_get_balance', {
      state_root_hash: stateRootHash,
      purse_uref: purse,
    });
    console.log('Balance result:', JSON.stringify(balanceResult, null, 2));
  } else {
    console.log('Account main purse not found (account might not exist on-chain yet).');
  }
}

run().catch(console.error);
