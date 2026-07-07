const NODE_URLS = [
  'https://node.testnet.casper.network/rpc',
  'https://node.testnet.cspr.cloud',
  'http://52.205.118.58:7777/rpc',
  'http://3.234.35.248:7777/rpc',
  'https://casper-testnet.gateway.tatum.io'
];

async function testNode(url) {
  console.log(`Testing node: ${url}...`);
  try {
    const start = Date.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: Date.now(),
        jsonrpc: '2.0',
        method: 'chain_get_state_root_hash',
        params: {}
      }),
      signal: AbortSignal.timeout(6000)
    });
    const duration = Date.now() - start;
    if (res.ok) {
      const json = await res.json();
      console.log(`✅ Success in ${duration}ms! Result:`, json.result?.state_root_hash || JSON.stringify(json));
      return true;
    } else {
      console.log(`❌ Node returned status ${res.status}`);
    }
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
  }
  return false;
}

async function run() {
  for (const url of NODE_URLS) {
    await testNode(url);
    console.log('--------------------------------------------------');
  }
}

run().catch(console.error);
