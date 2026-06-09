/* Scheduler scenarios against a running server (PORT/4000), fresh DB.
 * Covers: card reveal, deadline refund (under goal), deadline lock (met goal), auto-draw. */
const base = `http://localhost:${process.env.PORT || 4000}/api`;
const get = (p) => fetch(base + p).then((r) => r.json());
const post = (p, b) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) }).then((r) => r.json());

(async () => {
  let ok = true;
  const check = (n, c, extra) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + n + (extra ? '  ' + extra : '')); if (!c) ok = false; };

  // ---------- REFUND path: PSAX is under goal (88%) ----------
  const wBefore = (await get('/me/wallet')).usdcBalance;       // demo user
  const psaxTicket = (await get('/me/tickets')).tickets.find((t) => t.fundTicker === 'PSAX');
  const refundExpected = psaxTicket ? psaxTicket.paidUsdc : 0;
  await post('/admin/funds/PSAX/expire', { meetGoal: false });
  const tick1 = await post('/admin/tick');
  const psax = await get('/funds/PSAX');
  const wAfter = (await get('/me/wallet')).usdcBalance;
  check('PSAX (under goal) → refunded', psax.status === 'refunded', `status=${psax.status}`);
  check('demo wallet credited by refund', Math.round((wAfter - wBefore) * 100) / 100 === refundExpected, `+${Math.round((wAfter - wBefore) * 100) / 100} (expected ${refundExpected})`);
  check('refund recorded in tick result', tick1.refunded.includes('PSAX'));
  const refundTxn = (await get('/me/transactions')).transactions.find((x) => x.icon === 'refund' && /PSAX|未達|落選/.test(x.detail) || (x.icon === 'refund'));
  check('refund transaction added', !!(await get('/me/transactions')).transactions.find((x) => x.icon === 'refund' && x.up === true));

  // ---------- LOCK path: force AURUM to meet goal ----------
  await post('/admin/funds/AURUM/expire', { meetGoal: true });
  const tick2 = await post('/admin/tick');
  const aurum = await get('/funds/AURUM');
  check('AURUM (met goal) → locked', aurum.status === 'locked', `status=${aurum.status}`);
  check('lock recorded in tick result', tick2.locked.includes('AURUM'));

  // ---------- AUTO-DRAW: make draw due, then tick ----------
  await post('/admin/funds/AURUM/force-draw-due');
  const tick3 = await post('/admin/tick');
  const aurum2 = await get('/funds/AURUM');
  const lot = await get('/funds/AURUM/lottery');
  check('AURUM locked+due → distributed', aurum2.status === 'distributed', `status=${aurum2.status}`);
  check('auto-draw stamped a VRF proof', !!(lot.proof && lot.proof.vrfProof));
  check('draw recorded in tick result', tick3.drawn.includes('AURUM'));

  // ---------- REVEAL: PSAX mystery card idx 0 ----------
  const before = (await get('/funds/PSAX/cards')).cards[0];
  await post('/admin/funds/PSAX/reveal/0');
  await post('/admin/tick');
  const after = (await get('/funds/PSAX/cards')).cards[0];
  check('mystery card hidden before reveal', before && before.isMystery === true && !before.name);
  check('card revealed after schedule', after && after.isMystery === false && !!after.name, `name=${after && after.name}`);

  console.log(ok ? '\n=== ALL SCHEDULER CHECKS PASSED ===' : '\n=== SCHEDULER CHECKS FAILED ===');
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
