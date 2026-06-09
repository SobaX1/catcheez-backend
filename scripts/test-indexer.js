/* Indexer test: feed synthetic on-chain events via /admin/indexer/event and assert DB sync. */
const base = `http://localhost:${process.env.PORT || 4000}/api`;
const get = (p) => fetch(base + p).then((r) => r.json());
const feed = (name, data) => fetch(base + '/admin/indexer/event', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, data }),
}).then((r) => r.json());

const FA = 'Aurum1111111111111111111111111111111111111';
const rnd = Array.from({ length: 32 }, (_, i) => (i * 9 + 5) % 256);
const root = Array.from({ length: 32 }, (_, i) => (i * 3 + 1) % 256);

(async () => {
  let ok = true;
  const check = (n, c, x) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + n + (x ? '  ' + x : '')); if (!c) ok = false; };

  // map fund AURUM ↔ on-chain addr, set goal
  await feed('FundInitialized', { fund: FA, ticker: 'AURUM', goal: 240000 * 1e6, deadline: Math.floor(Date.now() / 1000) + 1209600 });
  let f = await get('/funds/AURUM');
  check('FundInitialized maps addr + goal', f.goalUsdc === 240000, `goal=${f.goalUsdc}`);

  await feed('TicketBought', { fund: FA, owner: 'Buyer1', entries: 10, amount: 100 * 1e6, raised: 120000 * 1e6 });
  f = await get('/funds/AURUM');
  check('TicketBought updates raised+pct', f.raisedUsdc === 120000 && f.pct === 50, `raised=${f.raisedUsdc} pct=${f.pct}`);

  await feed('Settled', { fund: FA, status: { locked: {} }, raised: 240000 * 1e6, goal: 240000 * 1e6 });
  f = await get('/funds/AURUM');
  check('Settled(locked) sets status', f.status === 'locked', `status=${f.status}`);

  await feed('Drawn', { fund: FA, randomness: rnd });
  const lot1 = await get('/funds/AURUM/lottery');
  f = await get('/funds/AURUM');
  check('Drawn stores randomness as proof + distributed', !!(lot1.proof && lot1.proof.vrfProof) && f.status === 'distributed', `status=${f.status}`);

  await feed('WinnersRootPosted', { fund: FA, root });
  const lot2 = await get('/funds/AURUM/lottery');
  check('WinnersRootPosted stores merkleRoot', !!(lot2.proof && lot2.proof.merkleRoot), `root=${lot2.proof && lot2.proof.merkleRoot && lot2.proof.merkleRoot.slice(0, 12)}…`);

  const unmapped = await feed('TicketBought', { fund: 'Zzz999', owner: 'x', entries: 1, amount: 1, raised: 1 });
  check('unmapped fund event is safely skipped', /skipped|not mapped/.test(unmapped.effect), unmapped.effect);

  const claimed = await feed('Claimed', { fund: FA, owner: 'Buyer1', won: true, refunded: 0 });
  check('Claimed processed without error', claimed && /claim/.test(claimed.effect), claimed.effect);

  console.log(ok ? '\n=== ALL INDEXER CHECKS PASSED ===' : '\n=== INDEXER CHECKS FAILED ===');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
