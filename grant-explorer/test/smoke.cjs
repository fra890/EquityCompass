// jsdom smoke test. Usage: node smoke.cjs <Vesting Summary.xlsx> <expected.json from handcheck.py>
// Needs jsdom (npm i jsdom). No client data is stored in this repo; pass the export path.
const fs = require('fs'), path = require('path'), assert = require('assert');
const { JSDOM, VirtualConsole } = require('jsdom');
const [xlsx, expPath] = process.argv.slice(2);
const exp = JSON.parse(fs.readFileSync(expPath, 'utf8'));
const html = fs.readFileSync(path.join(__dirname, '..', 'grant-explorer.html'), 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(e.message)); vc.on('error', e => errors.push(String(e)));
let printed = 0;
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) { w.DecompressionStream = DecompressionStream; w.TextDecoder = TextDecoder; w.print = () => { printed++; }; } });
const w = dom.window, d = w.document, $ = s => d.querySelector(s);
const near = (a, b, tol = 0.51, msg = '') => assert(Math.abs(a - b) <= tol, `${msg}: page ${a} vs hand ${b}`);
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const set = (el, v, ev = 'change') => { el.value = v; el.dispatchEvent(new w.Event(ev, { bubbles: true })); };
(async () => {
  // no client data embedded
  for (const s of ['SPCX', 'Kickass', '207669', '340084', 'Regrant']) assert(!html.includes(s), 'client data embedded: ' + s);
  assert(!/https?:\/\/(?!www\.w3\.org)/.test(html.replace(/data:image[^"]+/g, '')), 'external URL found');
  assert($('#app').hidden && !$('#drop').hidden, 'starts on drop zone');
  const buf = fs.readFileSync(xlsx);
  await w.GE.loadBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), 'Vesting_Summary.xlsx');
  // pin the as-of date so the checks are deterministic
  set($('#asOf'), '2026-11-17');
  const G = w.GE, S = G.state;
  assert(!$('#app').hidden, 'app visible');
  assert.strictEqual(G.data.events.length, 318); assert.strictEqual(S.price, exp.price);
  // reconcile
  const sum = k => G.data.grants.reduce((s, g) => s + g[k], 0);
  assert(G.data.grants.every(g => g.ok && g.granted === g.vested + g.unv + g.canc), 'every grant reconciles');
  assert.strictEqual(sum('granted'), exp.totals.granted); assert.strictEqual(sum('vested'), exp.totals.vested);
  assert.strictEqual(sum('unv'), exp.totals.unv); assert.strictEqual(sum('canc'), exp.totals.canc);
  assert.strictEqual(G.data.grants.reduce((s, g) => s + g.parts.length, 0), exp.grants);
  const splits = G.data.events.filter(e => e.split); assert(splits.length && splits.every(e => e.kind === 'NQ'), 'Split → NQ');
  assert(G.data.grants.some(g => g.parts.length === 2 && g.kinds.join() === 'ISO,NQ'), 'split grouped with parent');
  assert(G.data.events.filter(e => e.award === 'RSU').every(e => e.expiry === null), 'RSU 2099 expiry ignored');
  // hand-check 1: unvested RSU value
  near(G.totals().unvRsuVal, exp.unvested_rsu_value, 0.01, 'unvested RSU value');
  assert($('#tab-cards').textContent.includes('$' + Math.round(exp.unvested_rsu_value).toLocaleString('en-US')), 'unvested RSU value on screen');
  // hand-check 3: 2027 RSU income
  const y27 = G.sim.years.find(r => r.y === 2027);
  near(y27.rsuInc, exp.rsu_income_2027, 0.01, '2027 RSU income'); assert.strictEqual(y27.rsuSh, exp.rsu_shares_2027);
  near(y27.T2.reg, exp.regular_tax_2027, 0.01, '2027 regular tax');
  // hand-check 2: zero-AMT shares 2027 at $250K W-2 MFJ
  assert.strictEqual(S.salary, 250000); assert.strictEqual(S.filing, 'mfj'); assert.strictEqual(y27.avail, exp.iso_available_2027);
  assert.strictEqual(G.maxZeroAmt(2027), exp.zero_amt_shares_2027, 'zero-AMT shares 2027');
  // masking: no full grant number anywhere on screen
  const nums = [...new Set(G.data.events.map(e => e.parent))];
  // tabs
  for (const t of ['cards', 'timeline', 'income', 'lab', 'sell', 'summary']) {
    click($(`nav [data-v="${t}"]`));
    const el = $('#tab-' + t); assert(el.classList.contains('on') && el.innerHTML.length > 500, 'tab renders: ' + t);
    assert(!/NaN|undefined|Infinity/.test(el.textContent), 'bad value in tab ' + t);
    for (const n of nums) assert(!el.textContent.includes(n), `unmasked grant number in ${t}`);
  }
  // lab: zero button fills the input and AMT stays 0; over-asking is capped
  click($('nav [data-v="lab"]')); click($('#tab-lab [data-act="zero"][data-y="2027"]'));
  assert.strictEqual(+$('#tab-lab input[data-y="2027"]').value, exp.zero_amt_shares_2027);
  assert(G.sim.years.find(r => r.y === 2027).T2.amtAdd < 0.5);
  set($('#tab-lab input[data-y="2027"]'), '999999');
  let r = G.sim.years.find(r => r.y === 2027); assert.strictEqual(r.exShares, r.avail); assert(r.T2.amtAdd > 0, 'AMT appears');
  assert.strictEqual(+$('#tab-lab input[data-y="2027"]').value, r.avail, 'input capped');
  assert($('#tab-lab').textContent.includes('California AMT is not modeled'));
  // controls recompute
  const before = G.totals().unvVal;
  set($('#priceR'), '200', 'input'); assert.strictEqual(G.state.price, 200); assert(G.totals().unvVal > before);
  click($('[data-act="px"][data-v="ipo"]')); assert.strictEqual(G.state.price, 135);
  click($('[data-act="px"][data-v="cur"]')); assert.strictEqual(G.state.price, exp.price);
  set($('#filing'), 'single'); assert.strictEqual(G.state.filing, 'single');
  set($('#st'), 'none'); assert.strictEqual(G.sim.years[0].T2.state, 0);
  set($('#st'), 'CA'); set($('#filing'), 'mfj'); set($('#drift'), '10', 'input');
  near(G.sim.years[1].P, exp.price * 1.1, 1e-6, 'drift'); set($('#drift'), '0', 'input');
  set($('#salary'), '400000', 'input'); assert.strictEqual(G.state.salary, 400000); set($('#salary'), '250000', 'input');
  // sell plan
  click($('nav [data-v="sell"]')); click($('#tab-sell [data-act="fill"][data-v="25"]'));
  r = G.sim.years[0]; assert(r.sale.gross > 0 && r.net < r.sale.gross && r.saleTax > 0, 'sales produce gross/tax/net');
  assert(G.sim.years.at(-1).conc < G.sim.years[0].conc + 1e-9, 'glide path');
  click($('#tab-sell [data-act="seg"][data-v="quarter"]')); assert($('#tab-sell input[data-bind="sellQ"]'));
  click($('#tab-sell [data-act="seg"][data-v="disq"]')); assert.strictEqual(G.state.dispo, 'disq');
  // timeline click
  click($('nav [data-v="timeline"]')); click($('#tab-timeline g.bar')); assert($('#tab-timeline table'), 'bar click shows events');
  click($('#tab-timeline [data-act="seg"][data-v="month"]')); click($('#tab-timeline [data-act="seg"][data-v="dollars"]'));
  assert($('#tab-timeline svg rect'));
  // print + csv
  click($('#btnPrint')); assert.strictEqual(printed, 1); assert($('#tab-summary #sheet') && $('#tab-summary').classList.contains('on'));
  assert($('#sheet').textContent.includes('Frank Alvarez, Financial Consultant | Tidemark Financial Partners'));
  assert(/@media print/.test(html) && /size:letter/.test(html));
  assert(G.csvVest().split('\r\n').length === 319 && G.csvSell().split('\r\n').length > 4);
  assert(d.querySelector('footer').textContent.includes('For illustration purposes only.'));
  assert(d.querySelector('#logoTop').src.startsWith('data:image/png;base64'));
  await new Promise(r => setTimeout(r, 50));
  assert.deepStrictEqual(errors, [], 'page errors: ' + errors.join(' | '));
  console.log('ALL SMOKE CHECKS PASSED');
  console.log({ unvestedRsuValue: G.totals().unvRsuVal, rsuIncome2027: y27.rsuInc, zeroAmt2027: exp.zero_amt_shares_2027 });
})().catch(e => { console.error('FAIL', e.message, errors); process.exit(1); });
