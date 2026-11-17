#!/usr/bin/env node
/* jsdom smoke test + hand-check assertions for borrow-vs-sell.html
   Usage: node smoke.cjs   (needs `jsdom` resolvable; run handcheck.py first) */
const fs = require('fs'), path = require('path'), assert = require('assert');
const { JSDOM, VirtualConsole } = require('jsdom');

const htmlPath = path.join(__dirname, '..', 'borrow-vs-sell.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'expected.json'), 'utf8'));

// --- static checks: self-contained, no network, no storage ---
assert(!/<script[^>]+src=/i.test(html), 'no external scripts');
assert(!/<link[^>]+href=/i.test(html), 'no external stylesheets');
assert(!/(src|href)\s*=\s*["']https?:/i.test(html), 'no remote resources');
assert(!/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest/.test(html), 'no storage or network APIs');
for (const s of ['Frank Alvarez, Financial Consultant | Tidemark Financial Partners', 'Hypothetical illustration. Not tax, legal or investment advice.'])
  assert(html.includes(s), 'footer text: ' + s);

function load() {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e));
  vc.on('error', e => errors.push(e));
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
  dom.window.addEventListener('error', e => errors.push(e.error || e.message));
  return { dom, win: dom.window, doc: dom.window.document, errors };
}
function set(win, id, value) {
  const el = win.document.getElementById(id);
  assert(el, 'control ' + id);
  if (el.type === 'checkbox') el.checked = value; else el.value = String(value);
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
  el.dispatchEvent(new win.Event('change', { bubbles: true }));
}
const near = (a, b, tol, label) => assert(Math.abs(a - b) <= tol, `${label}: page ${a} vs hand-check ${b}`);
const money = x => { const n = Math.round(x); return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US'); };

// --- 1. loads clean ---
let { win, doc, errors } = load();
assert.strictEqual(errors.length, 0, 'no errors on load: ' + errors.join('; '));
assert(win.BVS && win.BVS.last, 'engine ran');
assert.strictEqual(doc.querySelectorAll('#cards .card').length, 4, 'four cards');
assert(doc.querySelectorAll('svg').length >= 4, 'charts rendered');
assert.strictEqual(doc.querySelectorAll('#fit .cell').length, 20, 'decision strip cells');

// --- 2. every control recomputes ---
const snapshot = () => doc.querySelector('main').innerHTML;
const controls = [...doc.querySelectorAll('[data-key]')];
assert(controls.length >= 29, 'controls found: ' + controls.length);
for (const el of controls) {
  const before = snapshot(), id = el.id;
  if (id === 'i_srate') set(win, 'i_state', 'OTHER');
  if (id === 'i_cch' || id === 'i_rheloc') set(win, 'i_ltype', 'heloc');
  if (id === 'i_exist' || id === 'i_item') set(win, 'i_purpose', 'home');
  if (id === 'i_nii') { set(win, 'i_purpose', 'investment'); }
  const b2 = snapshot();
  if (el.tagName === 'SELECT') set(win, id, [...el.options].find(o => o.value !== el.value).value);
  else if (el.type === 'checkbox') set(win, id, !el.checked);
  else if (el.type === 'date') set(win, id, '2026-01-02');
  else if (el.getAttribute('data-fmt') === 'money') set(win, id, id === 'i_exist' ? '600,000' : id === 'i_nii' ? '5,000' : '777,000');
  else if (el.type === 'range') set(win, id, Number(el.value) + Number(el.step || 1) * 2);
  else set(win, id, Number(el.value) + 3);
  assert.notStrictEqual(snapshot(), b2, 'control ' + id + ' changes the output');
  assert.strictEqual(errors.length, 0, 'no errors after ' + id + ': ' + errors.join('; '));
  void before;
}
doc.getElementById('btnCurve').click();
assert.strictEqual(errors.length, 0, 'curve button');

// --- 3. hand-check cases: page must match Python ---
const MAP = { cash: 'i_cash', years: 'i_years', purpose: 'i_purpose', portfolio: 'i_port', basis: 'i_basis', other_gains: 'i_gains', income: 'i_inc', inv_income: 'i_nii' };
const PCT = { lt_share: 'i_lt', ret: 'i_ret', vol: 'i_vol', r_box: 'i_rbox', r_pal: 'i_rpal', r_mort: 'i_rmort', cc_mort: 'i_ccm', maint: 'i_maint', pal_advance: 'i_adv' };
for (const [name, { inputs, expected: e }] of Object.entries(expected)) {
  ({ win, doc, errors } = load());
  set(win, 'i_exit', 'hold');
  set(win, 'i_fs', inputs.filing); set(win, 'i_item', inputs.itemize);
  for (const [k, id] of Object.entries(MAP)) set(win, id, inputs[k]);
  for (const [k, id] of Object.entries(PCT)) set(win, id, +(inputs[k] * 100).toFixed(6));
  const r = win.BVS.last, T = 0.01;
  near(r.sell.S, e.sell.S, T, name + ' stock sold');
  near(r.sell.tax, e.sell.tax, T, name + ' tax today');
  near(r.sell.lostGrowth, e.sell.lostGrowth, T, name + ' lost growth');
  near(r.sell.total, e.sell.total, T, name + ' sell total');
  for (const k of ['box', 'pal', 'mort']) {
    for (const f of ['interest', 'savings', 'total', 'annual']) near(r[k][f], e[k][f], T, `${name} ${k}.${f}`);
    if (e[k].breakeven === null) assert.strictEqual(r[k].breakeven, null, `${name} ${k} break-even none`);
    else near(r[k].breakeven, e[k].breakeven, 1e-7, `${name} ${k} break-even`);
    near(r[k].advantage, e[k].advantage, 0.05, `${name} ${k} advantage vs selling`);
    near(r.nw[k][r.N], e.nwEnd[k], 0.05, `${name} ${k} ending net worth`);
  }
  near(r.nw.sell[r.N], e.nwEnd.sell, 0.05, name + ' sell ending net worth');
  near(r.box.face, e.box.face, T, name + ' box face'); near(r.box.afterRate, e.box.afterRate, 1e-9, name + ' box after-tax rate');
  near(r.box.carryEnd, e.box.carryEnd, T, name + ' box carryforward');
  e.box.rows.forEach((w, i) => ['loss', 'ordDed', 'carry', 'saving'].forEach(f => near(r.box.rows[i][f], w[f], T, `${name} box row ${i + 1} ${f}`)));
  near(r.pal.oop, e.pal.oop, T, name + ' PAL out of pocket');
  for (const f of ['closing', 'oop', 'balEnd', 'payment']) near(r.mort[f], e.mort[f], T, `${name} mort.${f}`);
  for (const k of ['box', 'pal']) {
    near(r.risk[k].ltv, e.risk[k].ltv, 1e-9, `${name} ${k} LTV`); near(r.risk[k].callDrop, e.risk[k].callDrop, 1e-9, `${name} ${k} call trigger`);
    near(r.risk[k].prob, e.risk[k].prob, 1e-5, `${name} ${k} call probability`);
    e.risk[k].stress.forEach((s, i) => { assert.strictEqual(r.risk[k].stress[i].call, s.call, `${name} ${k} stress ${i}`); near(r.risk[k].stress[i].sale, s.sale, T, `${name} ${k} stress sale ${i}`); near(r.risk[k].stress[i].ltv, s.ltv, 1e-9, `${name} ${k} stress ltv ${i}`); });
  }
  for (const k of ['box', 'pal', 'mort']) near(r[k].exitTax, e[k].exitTax, T, `${name} ${k} exit tax`);
  set(win, 'i_exit', 'sell');
  for (const k of ['box', 'pal', 'mort']) {
    const r2 = win.BVS.last;
    if (e[k].breakevenSellOut === null) assert.strictEqual(r2[k].breakeven, null); else near(r2[k].breakeven, e[k].breakevenSellOut, 1e-7, `${name} ${k} break-even (sold to repay)`);
    near(r2[k].advantage, e[k].advantageSellOut, 0.05, `${name} ${k} advantage (sold to repay)`);
  }
  set(win, 'i_exit', 'hold');
  // the numbers on screen are the engine's numbers
  const out = sel => doc.querySelector(`[data-out="${sel}"]`).textContent;
  assert.strictEqual(out('box.total'), money(e.box.total)); assert.strictEqual(out('pal.total'), money(e.pal.total));
  assert.strictEqual(out('sell.total'), money(e.sell.total)); assert.strictEqual(out('mort.total'), money(e.mort.total));
  assert.strictEqual(out('box.annual'), money(e.box.annual)); assert.strictEqual(out('sell.annual'), money(e.sell.annual));
  assert(doc.getElementById('cards').textContent.includes(money(e.sell.tax)), 'tax today shown');
  assert(doc.getElementById('boxTable').textContent.includes(money(e.box.savings)), 'box savings shown');
  assert.strictEqual(errors.length, 0, name + ' no errors');
  console.log('ok  ' + name);
}

// --- 4. print + CSV ---
({ win, doc, errors } = load());
let printed = 0; win.print = () => { printed++; };
doc.getElementById('btnPrint').click();
assert.strictEqual(printed, 1, 'print button calls window.print');
assert(/@page\s*\{\s*size:\s*letter/.test(html) && /@media print/.test(html), 'letter print stylesheet');
assert(doc.querySelectorAll('#printInputs div').length >= 28, 'print view lists the inputs');
const csv = win.BVS.buildCSV();
assert(csv.includes('SUMMARY') && csv.includes('STRESS TEST') && csv.includes('NET WORTH') && csv.split('\r\n').length > 55, 'CSV content');
let clicked = 0; win.HTMLAnchorElement.prototype.click = function () { clicked++; assert(this.download === 'borrow-vs-sell.csv'); };
doc.getElementById('btnCsv').click();
assert.strictEqual(clicked, 1, 'CSV export triggers a download');
assert.strictEqual(errors.length, 0, 'no errors in print/CSV');
// no recommendation language
const text = doc.querySelector('main').textContent.toLowerCase();
for (const w of ['we recommend', 'you should', 'best option', 'guaranteed', 'risk-free', 'will outperform']) assert(!text.includes(w), 'no "' + w + '"');
console.log('ok  smoke: load, ' + controls.length + ' controls, print, CSV');
