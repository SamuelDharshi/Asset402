const fs = require('fs');
const path = require('path');
const { PrivateKey, KeyAlgorithm } = require('casper-js-sdk');

function generateKeys() {
  console.log('Generating new Casper Ed25519 key pair...');
  
  // Generate a new key pair
  const privateKey = PrivateKey.generate(KeyAlgorithm.ED25519);
  
  // Get PEM formatted strings
  const privateKeyPem = privateKey.toPem();
  const publicKey = privateKey.publicKey;
  const publicKeyPem  = publicKey.toPem();
  const publicKeyHex  = publicKey.toHex();

  // Save to files
  const secretPath = path.join(__dirname, 'secret_key.pem');
  const publicPath = path.join(__dirname, 'public_key.pem');
  
  fs.writeFileSync(secretPath, privateKeyPem);
  fs.writeFileSync(publicPath, publicKeyPem);

  console.log('---');
  console.log('Keys generated successfully!');
  console.log(`Secret Key saved to: ${secretPath}`);
  console.log(`Public Key saved to: ${publicPath}`);
  console.log('---');
  console.log(`PUBLIC_KEY_HEX=${publicKeyHex}`);
}

generateKeys();
