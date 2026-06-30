import { Keys } from 'casper-js-sdk';
import * as fs from 'fs';
import * as path from 'path';

function generateKeys() {
  console.log('Generating new Casper Ed25519 key pair...');
  
  // Generate a new key pair
  const keyPair = Keys.Ed25519.new();
  
  // Get PEM formatted strings
  const privateKeyPem = keyPair.exportPrivateKeyInPem();
  const publicKeyPem  = keyPair.exportPublicKeyInPem();
  const publicKeyHex  = keyPair.publicKey.toHex();
  const accountHash   = keyPair.publicKey.toAccountHashStr();

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
  console.log(`ACCOUNT_HASH=${accountHash}`);
}

generateKeys();
