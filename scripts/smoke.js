/* Smoke test against a running server (PORT/4000). Covers all endpoints,
 * a REAL ed25519 sign-in, a forged-signature rejection, and per-user state. */
const { signIn } = require('./sign');
const nacl = require('tweetnacl');
const bs58 = require('bs58').default || require('bs58');
const base = `http://localhost:${process.env.PORT || 4000}/api`;

const out = [];
const rec = (p, s) => { out.push([p, s]); return s; };
const get = async (p, token) => rec(p, (await fetch(base + p, { headers: token ? { authorization: 'Bearer ' + token } : {} })).status);
const post = async (p, b, token) => {
  const h = { 'content-type': 'application/json' }; if (token) h.authorization = 'Bearer ' + token;
  const r = await fetch(base + p, { method: 'POST', headers: h, body: JSON.stringify(b) });
  return rec(p, r.status);
};
const json = async (p, token) => (await fetch(base + p, { headers: token ? { authorization: 'Bearer ' + token } : {} })).json();

async function main() {
  let fail = [];

  // public reads
  await get('/health'); await get('/funds'); await get('/funds/PSAX'); await get('/funds/PSAX/cards');
  await get('/funds/PSAX/schedule'); await get('/tokens'); await get('/tokens/CHZ'); await get('/tokens/CHZ/candles');
  await get('/tokens/CHZ/holders'); await get('/ranking'); await get('/governance');
  // demo-user (no token) reads
  await get('/me/portfolio'); await get('/me/wallet'); await get('/me/holdings');
  await get('/me/tickets'); await get('/me/results'); await get('/me/transactions');

  // REAL auth
  const si = await signIn(); rec('/auth/* (real ed25519 sign-in)', si.status);
  if (!si.body.token) fail.push('sign-in returned no token');
  const token = si.body.token;

  // forged signature must be rejected (expect 401)
  const wallet = bs58.encode(nacl.sign.keyPair().publicKey);
  const { nonce } = await json('/auth/nonce'.replace('/auth/nonce', '/auth/nonce')) || {};
  const n2 = await (await fetch(base + '/auth/nonce', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wallet }) })).json();
  const forged = bs58.encode(nacl.sign.detached(new TextEncoder().encode('WRONG MESSAGE'), nacl.sign.keyPair().secretKey));
  const forgedStatus = (await fetch(base + '/auth/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ wallet, signature: forged, nonce: n2.nonce }) })).status;
  rec('/auth/verify (forged → reject)', forgedStatus);
  if (forgedStatus !== 401) fail.push('forged signature was NOT rejected (got ' + forgedStatus + ')');

  // authenticated new user has faucet wallet (500) and empty holdings
  const pf = await json('/me/portfolio', token);
  if (!(pf.wallet && pf.wallet.usdcBalance === 500)) fail.push('new user faucet wallet != 500 (got ' + JSON.stringify(pf.wallet) + ')');
  if (!(pf.holdings && pf.holdings.length === 0)) fail.push('new user should have 0 holdings');

  // authenticated mutations
  await post('/funds/AURUM/apply', { tier: 'gold', qty: 2 }, token); // 2*50=100, faucet 500 -> 400
  await post('/funds/AURUM/draw', {});
  await post('/tokens/CHZ/trade', { side: 'buy', amount: 100 }, token);
  await post('/governance/vote', { optionId: 'opt-pikachu' }, token);

  const pf2 = await json('/me/portfolio', token);
  if (!(pf2.wallet.usdcBalance < 400.0001)) fail.push('apply did not deduct USDC (got ' + pf2.wallet.usdcBalance + ')');
  if (!(pf2.ticketCount === 1)) fail.push('ticketCount != 1 after apply');

  // print
  for (const [p, s] of out) console.log(String(s).padStart(3), p);
  const httpFail = out.filter(([, s]) => s >= 400 && s !== 401);
  if (httpFail.length) fail.push('unexpected HTTP errors: ' + JSON.stringify(httpFail));

  if (fail.length) { console.error('\nFAILURES:\n - ' + fail.join('\n - ')); process.exit(1); }
  console.log('\nALL OK —', out.length, 'checks; real auth + per-user state verified');
}
main().catch((e) => { console.error(e); process.exit(1); });
