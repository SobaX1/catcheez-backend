/* Real Sign-In with Solana roundtrip against a running server.
 * Generates an ed25519 keypair, requests a nonce, signs it, verifies → JWT.
 * Usage: node scripts/sign.js   (server must be running on PORT/4000) */
const nacl = require('tweetnacl');
const bs58 = require('bs58').default || require('bs58');
const base = `http://localhost:${process.env.PORT || 4000}/api`;

async function signIn() {
  const kp = nacl.sign.keyPair();
  const wallet = bs58.encode(kp.publicKey);

  const { message, nonce } = await fetch(base + '/auth/nonce', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wallet }),
  }).then((r) => r.json());

  const sig = nacl.sign.detached(new TextEncoder().encode(message), kp.secretKey);
  const signature = bs58.encode(sig);

  const res = await fetch(base + '/auth/verify', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wallet, signature, nonce }),
  });
  const body = await res.json();
  return { wallet, status: res.status, body };
}

module.exports = { signIn };

if (require.main === module) {
  signIn().then((r) => {
    console.log('wallet:', r.wallet.slice(0, 12) + '…');
    console.log('verify status:', r.status);
    console.log('token:', r.body.token ? r.body.token.slice(0, 32) + '…' : '(none)');
    console.log('user:', JSON.stringify(r.body.user));
    process.exit(r.body.token ? 0 : 1);
  }).catch((e) => { console.error(e); process.exit(1); });
}
