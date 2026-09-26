/* Qo'shimcha sinovlar: namuna, mahalliy rejim, eski kunlar (xulosa + tozalash), telefon ekrani,
   ikki oyna, qurilmani bloklash, PIN bloklanishi, narx o'zgarishi, import. */
const { Env, H, ok, eq, summary } = require('./harness.cjs');

const log = m => console.log(`\n[${new Date().toISOString().slice(11, 19)}] ${m}`);
const kn = (d, fn, arg) => d.page.evaluate(fn, arg);
async function login(d, userId, pin) {
  await H.wait(d, `[data-a="who"][data-id="${userId}"]`);
  await H.click(d, `[data-a="who"][data-id="${userId}"]`);
  await H.type(d, pin);
  if (pin.length < 6) await d.page.keyboard.press('Enter');
  await H.wait(d, '.shell');
}
async function setupOwner(env, type = 'monitor') {
  const own = await env.device('egasi', { level: 'owner' });
  await H.wait(own, '[data-a="onbReal"]'); await H.a(own, 'onbReal');
  await H.fill(own, '#o_shop', 'Sinov do‘koni'); await H.fill(own, '#o_owner', 'Ali'); await H.fill(own, '#o_pin', '123456'); await H.fill(own, '#o_pin2', '123456');
  if (type === 'cashier') await H.click(own, '[data-a="onbType"][data-k="cashier"]');
  await H.a(own, 'onbGo'); await H.wait(own, '.shell');
  return { own, ownerId: env.db.get('cfg/staff').list[0].id, store: env.db.get('cfg/main').stores[0].id };
}
async function go(d, v) { await H.click(d, `.rail [data-a="go"][data-v="${v}"]`); }

async function demo(env) {
  log('A. Namuna rejimi');
  const own = await env.device('namuna', { level: 'owner' });
  await H.wait(own, '[data-a="onbDemo"]'); await H.a(own, 'onbDemo');
  await H.a(own, 'onbDemoGo');
  await H.wait(own, '.shell', { timeout: 60000 });
  ok(env.db.list('ev/demo-k1').length >= 5, 'namunada bir haftalik yozuvlar', env.db.list('ev/demo-k1').length);
  const t = await kn(own, () => window.__kn.S.ui.day);
  const w = await kn(own, t => { const K = window.__kn; const from = t.slice(0, 8) + '01' <= t ? null : null; const d = new Date(); const f = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 6, 12); const k = f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + String(f.getDate()).padStart(2, '0'); K.loadSums(k, t); return k; }, t);
  await H.until(() => kn(own, ([f, t]) => { const P = window.__kn.periodData(f, t, 'all'); return !P.loading && [...P.days.values()].reduce((s, a) => s + a.n, 0) > 100; }, [w, t]), 20000);
  const tot = await kn(own, ([f, t]) => { const P = window.__kn.periodData(f, t, 'all'); return { n: [...P.days.values()].reduce((s, a) => s + a.n, 0), shifts: P.shifts.length, closed: P.shifts.filter(s => s.closed).length }; }, [w, t]);
  ok(tot.n > 100 && tot.shifts >= 10, 'namunada 7 kunlik savdo va smenalar', tot);
  const al = await kn(own, ([f, t]) => window.__kn.alertsFor(f, t, 'all').map(a => a.kind), [w, t]);
  ok(al.includes('var'), 'namunada kassa farqi ogohlantirishi bor', al);
  const debt = await kn(own, () => window.__kn.debtBook());
  ok(debt.total > 0 && debt.owing >= 2, 'namunada nasiya daftari to‘lgan', { total: debt.total, owing: debt.owing });
  const chainProbs = await kn(own, () => [...window.__kn.chains().values()].reduce((s, c) => s + c.probs.length, 0));
  eq(chainProbs, 0, 'namuna zanjirlari butun');
  await go(own, 'reports');
  await H.click(own, '[data-a="rep"][data-k="days"]');
  await H.a(own, 'csv');
  await H.until(() => kn(own, () => window.__downloads.length === 1));
  const f = await kn(own, () => window.__downloads[0]);
  ok(/^kunlar_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/.test(f.filename) && f.data.startsWith('﻿Sana;Cheklar;Sof tushum'), 'CSV fayl (Excel uchun) tayyorlandi', f.filename);
  log('   namunani tozalash');
  await H.wait(own, '[data-a="demoClear"]');
  await H.a(own, 'demoClear');
  await H.a(own, 'confirmOk');
  await H.wait(own, '[data-a="onbReal"]', { timeout: 60000 });
  eq(env.db.list('').filter(k => !k.startsWith('lock/')).length, 0, 'namuna to‘liq o‘chirildi');
}

async function localMode(env) {
  log('B. Umumiy bazasiz (faqat shu qurilma)');
  const d = await env.device('mahalliy', { mock: false });
  await H.wait(d, '[data-a="onbReal"]', { timeout: 20000 });
  ok((await H.text(d, '.infobox')).includes('faqat shu qurilmada'), 'mahalliy rejim haqida ogohlantirish');
  await H.a(d, 'onbReal');
  await H.fill(d, '#o_shop', 'Uy do‘koni'); await H.fill(d, '#o_owner', 'Olim'); await H.fill(d, '#o_pin', '111222'); await H.fill(d, '#o_pin2', '111222');
  await H.click(d, '[data-a="onbType"][data-k="cashier"]');
  await H.a(d, 'onbGo'); await H.wait(d, '.shell');
  await H.fill(d, '#ocash', '50000'); await H.a(d, 'openShift'); await H.wait(d, '.tile');
  await H.click(d, '.tile[data-id="p01"]'); await H.a(d, 'pay'); await H.a(d, 'payOk'); await H.wait(d, '#newRec'); await H.click(d, '#newRec');
  await H.until(() => kn(d, () => window.__kn.pendingCount() === 0));
  await d.page.reload();
  const ownerId = await kn(d, () => window.__kn.S.cfg.staff[0].id);
  await login(d, ownerId, '111222');
  const n = await kn(d, () => [...window.__kn.model().receipts.values()].length);
  eq(n, 1, 'qayta yuklangandan keyin chek joyida');
  const keys = await kn(d, () => Object.keys(localStorage).filter(k => k.startsWith('kn2.db:')).map(k => k.split('/')[0]).sort());
  ok(keys.includes('kn2.db:ev') && keys.includes('kn2.db:cfg') && keys.includes('kn2.db:sum'), 'mahalliy bazada yozuvlar, sozlamalar va xulosa', [...new Set(keys)]);
}

async function history(env) {
  log('C. Eski kunlar: xulosalar, qayta sanamaslik va tozalash');
  const { own, store } = await setupOwner(env);
  const gen = await kn(own, ([store, back1, back2]) => {
    const K = window.__kn, pad = n => String(n).padStart(2, '0');
    const dk = b => { const d = new Date(); const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - b, 12); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); };
    const out = {}; let seq = 0, ph = '0000000000000000';
    for (const back of [back2, back1]) {
      const day = dk(back), base = new Date(day + 'T12:00:00').getTime() - 3 * 3600000, evs = [];
      const add = (t, dt, data) => { const e = Object.assign({ id: 'x' + seq + day, t, ts: base + dt * 60000, day, dev: 'fake-k', store, user: null, seq: ++seq, ph }, data); e.c = day + '~0'; e.h = K.evHash(e); ph = e.h; evs.push(e); };
      const sh = 'sh' + back;
      add('shift_open', 0, { shift: sh, cash: 100000 });
      [[10000, 'cash'], [20000, 'uzcard'], [5000, 'cash']].forEach(([a, m], i) => add('sale', 10 + i, { shift: sh, r: { id: 'r' + back + i, rn: i + 1 + (back === back1 ? 3 : 0), no: '9-00000' + (i + 1), items: [{ p: 'p01', name: 'Patir non', qty: a / 5000, price: 5000, unit: 'dona' }], sub: a, disc: 0, discPct: 0, total: a, pays: [{ m, a }], given: 0, change: 0 } }));
      add('shift_close', 60, { shift: sh, counted: 115000, expected: 115000, variance: 0, reason: '', terms: {}, sys: {} });
      const A = K.accumulate(evs, true), agg = A.days.get(store + '|' + day);
      out[back] = { day, evs, sum: { dev: 'fake-k', store, day, s0: evs[0].seq, s1: evs[evs.length - 1].seq, r0: 1, r1: 3, agg, shifts: [...A.shifts.values()], at: Date.now() } };
    }
    return out;
  }, [store, 10, 200]);
  env.db.put('dev/fake-k', { id: 'fake-k', name: 'Eski kassa', type: 'cashier', store, code: 9, inst: env.db.get('cfg/main').inst, at: Date.now() });
  for (const back of [10, 200]) { const g = gen[back]; env.db.put(`ev/fake-k~${g.day}~0`, { dev: 'fake-k', store, day: g.day, k: 0, n: g.evs.length, s0: g.evs[0].seq, s1: g.evs[g.evs.length - 1].seq, events: g.evs }); }
  env.db.put(`sum/fake-k~${gen[10].day}`, gen[10].sum);
  const D = gen[10].day, D2 = gen[200].day;
  await kn(own, D => window.__kn.loadSums(D, D, true), D);
  await H.until(() => kn(own, D => !window.__kn.periodData(D, D, 'all').loading, D));
  const a1 = await kn(own, D => { const a = window.__kn.periodData(D, D, 'all').days.get(D); return [a.n, a.net]; }, D);
  eq(a1, [3, 35000], 'eski kun xulosadan o‘qildi');
  await kn(own, D => window.__kn.loadRaw(D, D), D);
  await H.until(() => kn(own, D => (window.__kn.S.rng.get(D) || {}).st === 'ok', D));
  const a2 = await kn(own, D => { const a = window.__kn.periodData(D, D, 'all').days.get(D); return [a.n, a.net]; }, D);
  eq(a2, [3, 35000], 'batafsil yozuvlar yuklansa ham ikki marta sanalmadi');
  const shifts = await kn(own, D => window.__kn.periodData(D, D, 'all').shifts.map(s => [s.n, window.__kn.shiftTotals(s).expected, !!s.closed]), D);
  eq(shifts, [[3, 115000, true]], 'eski smena xulosadan tiklandi');
  await kn(own, () => window.__kn.maintenance(true));
  ok(!env.db.get(`ev/fake-k~${D2}~0`), '200 kunlik batafsil yozuv o‘chirildi');
  ok(!!env.db.get(`ev/fake-k~${D}~0`), '10 kunlik batafsil yozuv qoldi');
  const s2 = env.db.get(`sum/fake-k~${D2}`);
  ok(s2 && s2.agg.net === 35000 && s2.fixed, 'o‘chirishdan oldin xulosa yaratildi', s2 && s2.agg.net);
  await kn(own, D2 => window.__kn.loadSums(D2, D2, true), D2);
  await H.until(() => kn(own, D2 => !window.__kn.periodData(D2, D2, 'all').loading, D2));
  const a3 = await kn(own, D2 => window.__kn.periodData(D2, D2, 'all').days.get(D2).net, D2);
  eq(a3, 35000, 'o‘chirilgan kun hisobotda qoldi');
  return { own };
}

async function phoneAndControls(env) {
  log('D. Telefon ekrani, ikki oyna, bloklash, PIN, narx, import');
  const { own, ownerId, store } = await setupOwner(env);
  await go(own, 'users');
  await H.click(own, '[data-a="userEdit"]:not([data-id])');
  await H.fill(own, '#uname', 'Nodira'); await H.fill(own, '#upin', '2468'); await H.a(own, 'userOk');
  await H.until(() => env.db.get('cfg/staff').list.length === 2);
  const nodira = env.db.get('cfg/staff').list.find(u => u.name === 'Nodira').id;
  const ph = await env.device('telefon-kassa', { level: 'interact', viewport: { width: 390, height: 844 } });
  await H.wait(ph, `[data-a="connWho"][data-id="${ownerId}"]`);
  await H.click(ph, `[data-a="connWho"][data-id="${ownerId}"]`); await H.type(ph, '123456');
  await H.wait(ph, '[data-a="who"]');
  log('   noto‘g‘ri PIN 5 marta');
  await H.click(ph, `[data-a="who"][data-id="${nodira}"]`);
  for (let i = 0; i < 5; i++) { await H.type(ph, '1111'); await ph.page.keyboard.press('Enter'); await H.until(async () => !(await H.text(ph, '#pinerr')).includes('Tekshirilmoqda')); }
  ok((await H.text(ph, '#pinerr')).includes('soniyadan keyin'), 'besh xatodan keyin kirish vaqtincha yopildi');
  await kn(ph, () => localStorage.removeItem('kn2.lockout'));
  await H.type(ph, '2468'); await ph.page.keyboard.press('Enter');
  await H.wait(ph, '.shell');
  await H.fill(ph, '#ocash', '10000'); await H.a(ph, 'openShift'); await H.wait(ph, '.tile');
  ok(await ph.page.isVisible('.cartbar'), 'telefonda pastki chek paneli');
  ok(!(await ph.page.isVisible('.rail')) && await ph.page.isVisible('.bnav'), 'telefonda pastki menyu');
  const overflow = await kn(ph, () => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  eq(overflow, 0, 'telefonda gorizontal siljish yo‘q');
  await H.click(ph, '.tile[data-id="p01"]');
  ok((await H.text(ph, '.cartbar')).includes('1 ta pozitsiya'), 'mahsulot chekka tushdi');
  log('   narx o‘zgarishi kassaga yetib boradi');
  await go(own, 'products');
  await H.click(own, 'tr[data-a="prodEdit"][data-id="p01"]');
  await H.fill(own, '#pprice', '5500'); await H.a(own, 'prodOk');
  await H.until(() => env.db.get('cfg/p-0').items.find(p => p.id === 'p01').price === 5500);
  await H.until(async () => (await H.text(ph, '.tile[data-id="p01"]')).includes('5 500'));
  ok(true, 'kassadagi tugmada yangi narx');
  await H.click(ph, '.tile[data-id="p01"]');
  const items = await kn(ph, () => window.__kn.S.cart.items.map(i => [i.price, i.qty]));
  eq(items, [[5000, 1], [5500, 1]], 'chekdagi eski pozitsiya eski narxda, yangisi yangi narxda');
  await H.click(ph, '.cartbar');
  await H.wait(ph, '.cart.open');
  await H.click(ph, '.cart.open [data-a="pay"]');
  await H.a(ph, 'payOk'); await H.wait(ph, '#newRec');
  await ph.page.screenshot({ path: process.env.SHOT_DIR ? process.env.SHOT_DIR + '/telefon-chek.png' : '/tmp/telefon-chek.png' });
  await H.click(ph, '#newRec');
  log('   ikkinchi oyna');
  const p2 = await ph.ctx.newPage();
  await p2.goto(env.server.url);
  await H.until(() => ph.page.isVisible('.passive'));
  ok(true, 'birinchi oyna passiv holatga o‘tdi');
  await H.click(ph, '[data-a="reclaim"]');
  await H.until(() => p2.isVisible('.passive'));
  ok(true, 'qaytarib olinganda ikkinchi oyna passiv');
  await p2.close();
  log('   qurilmani bloklash');
  const phDev = await kn(ph, () => window.__kn.S.dev.id);
  await go(own, 'settings');
  await H.click(own, `[data-a="devBlock"][data-id="${phDev}"]`);
  await H.until(() => env.db.get('cfg/main').blocked.includes(phDev));
  await H.until(() => ph.page.isVisible('[data-a="resetDevGo"]'));
  ok(true, 'bloklangan qurilma ishlay olmaydi');
  log('   Excel’dan import');
  await go(own, 'products');
  await H.a(own, 'prodImport');
  await H.fill(own, '#imptext', 'Nomi\tNarx\tShtrix-kod\tBo‘lim\tO‘lchov\nMineral suv 0,5 l\t3 000\t4780099900011\tIchimliklar\tdona\nBanan\t22000\t\tMeva-sabzavot\tkg\nPatir non\t6000\t\t\tdona\nXato qator\t\t\t\t');
  await H.until(async () => (await H.text(own, '.modal')).includes('2 ta yangi'));
  ok((await H.text(own, '.modal')).includes('1 ta yangilanadi') && (await H.text(own, '.modal')).includes('1 ta xato'), 'import rejasi: 2 yangi, 1 yangilanadi, 1 xato');
  await H.a(own, 'impGo');
  await H.until(() => env.db.get('cfg/p-0').items.length === 30);
  const pat = env.db.get('cfg/p-0').items.find(p => p.id === 'p01');
  eq([pat.price, env.db.get('cfg/p-0').items.find(p => p.name === 'Banan').unit], [6000, 'kg'], 'import qilingan narx va o‘lchov');
}

async function main() {
  const only = process.argv[2];
  const runs = { demo, localMode, history, phoneAndControls };
  for (const [name, fn] of Object.entries(runs)) {
    if (only && only !== name) continue;
    const env = new Env(); await env.start();
    try { await fn(env); }
    catch (e) { ok(false, name + ': kutilmagan xato: ' + (e && e.stack || e)); }
    finally { if (env.errors.length) { ok(false, name + ': sahifa xatolari', env.errors.slice(0, 10)); } await env.stop(); }
  }
  const s = summary();
  console.log(`\nNatija: ${s.passed} ta o‘tdi, ${s.failed} ta xato`);
  process.exit(s.failed ? 1 : 0);
}
main();
