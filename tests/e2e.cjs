/* Kassa Nazorati: to'liq ish kuni sinovi (bir nechta qurilma, umumiy baza, ruxsatlar). */
const { Env, H, ok, eq, summary } = require('./harness.cjs');

const T = () => new Date().toISOString().slice(11, 19);
const log = m => console.log(`\n[${T()}] ${m}`);
const kn = (d, fn, arg) => d.page.evaluate(fn, arg);
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

async function login(d, userId, pin) {
  await H.wait(d, `[data-a="who"][data-id="${userId}"]`);
  await H.click(d, `[data-a="who"][data-id="${userId}"]`);
  await H.type(d, pin);
  if (pin.length < 6) await d.page.keyboard.press('Enter');
  await H.wait(d, '.shell');
}
async function approve(d, userId, pin) {
  await H.wait(d, `[data-a="apWho"][data-id="${userId}"]`);
  await H.click(d, `[data-a="apWho"][data-id="${userId}"]`);
  await H.type(d, pin);
}
async function addTile(d, pid, n = 1) { for (let i = 0; i < n; i++) await H.click(d, `.tile[data-id="${pid}"]`); }
async function closeFresh(d) { await H.wait(d, '#newRec'); await H.click(d, '#newRec'); await d.page.waitForSelector('.overlay', { state: 'detached' }); }
async function go(d, v) { await H.click(d, `.rail [data-a="go"][data-v="${v}"]`); }

async function businessDay(env) {
  log('1. Egasi do‘konni sozlaydi');
  const own = await env.device('egasi', { level: 'owner' });
  await H.wait(own, '[data-a="onbReal"]');
  await H.a(own, 'onbReal');
  await H.fill(own, '#o_shop', 'Test market');
  await H.fill(own, '#o_store', 'Markaz filiali');
  await H.fill(own, '#o_owner', 'Ali Valiyev');
  await H.fill(own, '#o_pin', '123456');
  await H.fill(own, '#o_pin2', '123456');
  await H.a(own, 'onbGo');
  await H.wait(own, '.shell');
  const main = env.db.get('cfg/main');
  ok(main && main.shop.name === 'Test market', 'cfg/main yaratildi');
  const ownerId = env.db.get('cfg/staff').list[0].id;
  ok(env.db.get('sec/pins').pins[ownerId].h.length === 64, 'egasining PIN kodi PBKDF2 bilan saqlandi');
  eq(env.db.get('cfg/p-0').items.length, 28, 'namunaviy mahsulotlar');
  await H.until(() => env.db.list('dev/').length === 1);
  await H.until(() => env.db.list('ev/').length >= 1);
  ok(true, 'egasi qurilmasi va yozuvlari bazada');

  log('2. Egasi xodim qo‘shadi');
  await go(own, 'users');
  await H.click(own, '[data-a="userEdit"]:not([data-id])');
  await H.fill(own, '#uname', 'Kamola');
  await H.fill(own, '#upin', '4321');
  await H.a(own, 'userOk');
  await H.until(() => env.db.get('cfg/staff').list.length === 2);
  await own.page.waitForSelector('.overlay', { state: 'detached' });
  await H.click(own, '[data-a="userEdit"]:not([data-id])');
  await H.fill(own, '#uname', 'Bekzod');
  await own.page.selectOption('#urole', 'manager');
  await H.fill(own, '#upin', '65432');
  await H.a(own, 'userOk');
  await H.until(async () => (await own.page.textContent('.err')).includes('6'));
  ok(true, 'mudirga 5 raqamli PIN rad etildi');
  await H.fill(own, '#upin', '654321');
  await H.a(own, 'userOk');
  await H.until(() => env.db.get('cfg/staff').list.length === 3);
  const staff = env.db.get('cfg/staff').list;
  const kamola = staff.find(u => u.name === 'Kamola').id, bekzod = staff.find(u => u.name === 'Bekzod').id;
  eq(staff.find(u => u.id === bekzod).role, 'manager', 'mudir roli saqlandi');

  log('3. Kassa qurilmasi ulanadi (Editor huquqi, egasi emas)');
  const cas = await env.device('kassa', { level: 'admin' });
  await H.wait(cas, `[data-a="connWho"][data-id="${ownerId}"]`);
  await H.click(cas, `[data-a="connWho"][data-id="${ownerId}"]`);
  await H.type(cas, '123456');
  await H.wait(cas, '[data-a="who"]');
  await H.until(() => env.db.list('dev/').length === 2);
  const casDev = await kn(cas, () => window.__kn.S.dev);
  eq(casDev.code, 1, 'kassa kodi 1');

  log('4. Kassir kiradi va smena ochadi');
  await login(cas, kamola, '4321');
  await H.fill(cas, '#ocash', '200000');
  await H.a(cas, 'openShift');
  await H.wait(cas, '.tile');

  log('5. Sotuvlar');
  await addTile(cas, 'p01', 2); await addTile(cas, 'p03', 1);
  await H.a(cas, 'pay');
  await H.fill(cas, '#given', '30000');
  ok((await H.text(cas, '#change')).includes('8\u00a0000'), 'qaytim 8 000');
  await H.a(cas, 'payOk');
  await closeFresh(cas);

  await addTile(cas, 'p03', 1);
  await H.a(cas, 'pay'); await H.click(cas, '[data-a="payM"][data-k="uzcard"]'); await H.a(cas, 'payOk'); await closeFresh(cas);

  await H.click(cas, '.chip[data-k="all"]');
  await H.click(cas, '.tile[data-id="p18"]');
  await H.fill(cas, '#qv', '1,5'); await H.a(cas, 'qtyOk');
  await addTile(cas, 'p01', 1);
  await H.a(cas, 'disc');
  await H.fill(cas, '#dval', '10');
  await H.click(cas, '[data-a="setF"][data-v="Doimiy xaridor"]');
  await H.a(cas, 'discOk');
  await approve(cas, bekzod, '654321');
  await H.until(async () => (await H.text(cas, '.pay')).includes('12 600'));
  await H.a(cas, 'pay'); await H.a(cas, 'payOk'); await closeFresh(cas);

  await H.click(cas, '.chip[data-k="fav"]');
  await addTile(cas, 'p03', 2);
  await H.a(cas, 'pay'); await H.click(cas, '[data-a="payM"][data-k="nasiya"]');
  await H.a(cas, 'ncOpen');
  await H.fill(cas, '#nc_name', 'Test mijoz'); await H.fill(cas, '#nc_phone', '+998901112233');
  await H.a(cas, 'ncSave');
  await H.wait(cas, '#payOk:not([disabled])');
  await H.a(cas, 'payOk'); await closeFresh(cas);

  await addTile(cas, 'p01', 3);
  await H.a(cas, 'pay'); await H.click(cas, '[data-a="payM"][data-k="mix"]');
  await H.fill(cas, '#mix_cash', '10000');
  await H.click(cas, '[data-a="mixFill"][data-k="humo"]');
  await H.a(cas, 'payOk'); await closeFresh(cas);

  let sales = await kn(cas, () => [...window.__kn.model().receipts.values()].map(r => [r.no, r.total, r.pays.map(p => p.m + ':' + p.a).join('+')]));
  eq(sales.sort(), [['1-000001', 22000, 'cash:22000'], ['1-000002', 12000, 'uzcard:12000'], ['1-000003', 12600, 'cash:12600'], ['1-000004', 24000, 'nasiya:24000'], ['1-000005', 15000, 'cash:10000+humo:5000']], 'besh chek to‘g‘ri yozildi');

  log('6. Bekor qilish va qaytarish');
  await go(cas, 'receipts');
  const rid = await kn(cas, no => [...window.__kn.model().receipts.values()].find(r => r.no === no).id, '1-000002');
  await H.click(cas, `tr[data-a="openRec"][data-id="${rid}"]`);
  await H.a(cas, 'voidRec');
  await H.click(cas, '[data-a="setF"][data-v="Xato urilgan"]');
  await H.a(cas, 'voidOk');
  await approve(cas, bekzod, '654321');
  await cas.page.waitForSelector('.overlay', { state: 'detached' });
  const rid1 = await kn(cas, no => [...window.__kn.model().receipts.values()].find(r => r.no === no).id, '1-000001');
  await H.click(cas, `tr[data-a="openRec"][data-id="${rid1}"]`);
  await H.a(cas, 'refundRec');
  await H.click(cas, '[data-a="rq"][data-i="0"][data-d="1"]');
  await H.click(cas, '[data-a="setF"][data-v="Sifatsiz mahsulot"]');
  await H.a(cas, 'refundOk');
  await approve(cas, bekzod, '654321');
  await cas.page.waitForSelector('.overlay', { state: 'detached' });
  const st = await kn(cas, () => { const M = window.__kn.model(); return [...M.receipts.values()].map(r => [r.no, r.status, r.refundedTotal]); });
  ok(st.find(x => x[0] === '1-000002')[1] === 'voided', 'chek 2 bekor qilindi');
  eq(st.find(x => x[0] === '1-000001')[2], 5000, 'chek 1 dan 5 000 qaytarildi');

  log('7. Kassa puli va nasiya to‘lovi');
  await go(cas, 'cash');
  await H.click(cas, '[data-a="move"][data-k="collection"]');
  await H.fill(cas, '#mamt', '20000'); await H.fill(cas, '#mreason', 'Egaga topshirildi'); await H.fill(cas, '#mperson', 'Ali');
  await H.a(cas, 'moveOk'); await approve(cas, bekzod, '654321');
  await cas.page.waitForSelector('.overlay', { state: 'detached' });
  await H.click(cas, '[data-a="move"][data-k="expense"]');
  await H.fill(cas, '#mamt', '3000'); await H.fill(cas, '#mreason', 'Suv'); await H.fill(cas, '#mperson', 'Yetkazuvchi');
  await H.a(cas, 'moveOk'); await approve(cas, bekzod, '654321');
  await cas.page.waitForSelector('.overlay', { state: 'detached' });
  await H.click(cas, '[data-a="move"][data-k="float_in"]');
  await H.fill(cas, '#mamt', '10000'); await H.fill(cas, '#mreason', 'Maydalik'); await H.fill(cas, '#mperson', 'Bekzod');
  await H.a(cas, 'moveOk');
  await cas.page.waitForSelector('.overlay', { state: 'detached' });
  await go(cas, 'nasiya');
  const custId = await kn(cas, () => window.__kn.S.cq.concat([...window.__kn.S.cust.values()]).find(c => c.name === 'Test mijoz').id);
  await H.click(cas, `tr[data-a="custOpen"][data-id="${custId}"]`);
  await H.a(cas, 'debtPay');
  await H.fill(cas, '#dpamt', '4000');
  await H.a(cas, 'debtPayOk');
  await H.until(async () => (await H.text(cas, '.modal')).includes('20\u00a0000'));
  ok(true, 'mijoz oynasida yangi qarz: 20 000');
  await H.click(cas, '.mf [data-a="closeModal"]');
  await cas.page.waitForSelector('.overlay', { state: 'detached' });
  const exp = await kn(cas, () => window.__kn.shiftTotals(window.__kn.curShift()).expected);
  eq(exp, 230600, 'kutilgan naqd: 200000 + 44600 - 5000 + 4000 + 10000 - 23000');

  log('8. Smenani yopish (farq bilan)');
  await go(cas, 'pos');
  await H.click(cas, '[data-a="go"][data-v="close"]');
  await H.click(cas, '[data-a="cmode"][data-k="sum"]');
  await H.fill(cas, '#ctotal', '220600');
  await H.fill(cas, '#term_humo', '5000');
  await H.a(cas, 'closeShift');
  await H.wait(cas, '#creason');
  await H.fill(cas, '#creason', 'Sinov: 10 ming yetishmadi');
  await H.a(cas, 'closeShift');
  await H.wait(cas, '.zr');
  const z = await H.text(cas, '.zr');
  ok(z.includes('230 600') && z.includes('220 600') && z.includes('Kamomad 10 000'), 'Z hisobotda kutilgan, sanalgan va farq bor');
  await H.until(async () => { const ev = env.db.list('ev/' + casDev.id); return ev.length && env.db.get(ev[ev.length - 1]).events.some(e => e.t === 'shift_close'); });
  ok(true, 'smena yopilgani bazaga yetib bordi');
  await H.until(() => env.db.get('sum/' + casDev.id + '~' + today()), 20000);
  const sum = env.db.get('sum/' + casDev.id + '~' + today());
  eq([sum.agg.n, sum.agg.net, sum.r0, sum.r1], [5, 68600, 1, 5], 'kunlik xulosa (sum) to‘g‘ri');
  await H.click(cas, '.mf [data-a="closeModal"]');

  log('9. Egasi paneli');
  await H.until(() => kn(own, () => window.__kn.periodData(window.__kn.S.ui.day, window.__kn.S.ui.day, 'all').days.get(window.__kn.S.ui.day).n === 5));
  const agg = await kn(own, () => { const d = window.__kn.S.ui.day, a = window.__kn.periodData(d, d, 'all').days.get(d); const nb = m => { const b = a.by[m] || { s: 0, r: 0, v: 0 }; return b.s - b.r - b.v; }; return { n: a.n, net: a.net, cash: nb('cash'), uzcard: nb('uzcard'), humo: nb('humo'), nasiya: nb('nasiya'), disc: a.disc, dp: a.dp, col: a.mv.collection }; });
  eq(agg, { n: 5, net: 68600, cash: 39600, uzcard: 0, humo: 5000, nasiya: 24000, disc: 1400, dp: 4000, col: 20000 }, 'egasi panelidagi kunlik hisob');
  const al = await kn(own, () => window.__kn.alertsFor(window.__kn.S.ui.day, window.__kn.S.ui.day, 'all').map(a => a.kind).sort());
  ok(al.includes('var') && al.includes('disc'), 'ogohlantirishlar: kassa farqi va katta chegirma', al);
  const debt = await kn(own, () => window.__kn.debtBook().total);
  eq(debt, 20000, 'nasiya qarzi: 24000 - 4000');
  const ch = await kn(own, id => { const c = window.__kn.chains().get(id); return c && c.probs.length; }, casDev.id);
  eq(ch, 0, 'kassa zanjiri butun');
  await go(own, 'dash'); await own.page.waitForSelector('.heromain');
  ok((await H.text(own, '.heromain .big')).includes('68 600'), 'Nazorat sahifasida 68 600 ko‘rinadi');

  log('10. Yozuvni o‘zgartirish aniqlanadi');
  const evPath = env.db.list('ev/' + casDev.id).pop();
  const doc = env.db.get(evPath);
  const tampered = JSON.parse(JSON.stringify(doc));
  const sIdx = tampered.events.findIndex(e => e.t === 'sale');
  tampered.events[sIdx].r.total = 1000;
  env.db.put(evPath, tampered);
  await H.until(() => kn(own, id => { const c = window.__kn.chains().get(id); return c && c.probs.some(p => p.k === 'alt'); }, casDev.id));
  const tal = await kn(own, () => window.__kn.alertsFor(window.__kn.S.ui.day, window.__kn.S.ui.day, 'all').filter(a => a.kind === 'tamper').length);
  ok(tal >= 1, 'o‘zgartirilgan yozuv ogohlantirishda');
  env.db.put(evPath, doc);
  await H.until(() => kn(own, id => { const c = window.__kn.chains().get(id); return c && !c.probs.length; }, casDev.id));
  const lastSeq = doc.events[doc.events.length - 1].seq;
  const cut = JSON.parse(JSON.stringify(doc)); cut.events.pop(); cut.n--; env.db.put(evPath, cut);
  await H.until(() => kn(own, ([id, s]) => { const c = window.__kn.chains().get(id); return c && c.probs.some(p => p.k === 'del' && p.seq === s); }, [casDev.id, lastSeq]));
  ok(true, 'o‘chirilgan oxirgi yozuv aniqlandi (guvoh orqali)');
  env.db.put(evPath, doc);

  log('11. Internet yo‘q: sotuv, sahifani qayta yuklash, keyin sinxronlash');
  await go(cas, 'pos');
  await H.fill(cas, '#ocash', '100000'); await H.a(cas, 'openShift'); await H.wait(cas, '.tile');
  env.db.setOffline(cas.id, true);
  await addTile(cas, 'p01', 1); await H.a(cas, 'pay'); await H.a(cas, 'payOk'); await closeFresh(cas);
  const pend = await kn(cas, () => window.__kn.pendingCount());
  ok(pend >= 1, 'oflayn: yozuvlar navbatda', pend);
  await env.reload(cas);
  await login(cas, kamola, '4321');
  ok(await kn(cas, () => !!window.__kn.curShift()), 'qayta yuklangandan keyin smena joyida');
  await addTile(cas, 'p03', 1); await H.a(cas, 'pay'); await H.a(cas, 'payOk'); await closeFresh(cas);
  const nos = await kn(cas, () => [...window.__kn.model().receipts.values()].map(r => r.no).sort());
  eq(nos.slice(-2), ['1-000006', '1-000007'], 'chek raqamlari davom etdi');
  env.db.setOffline(cas.id, false);
  await kn(cas, () => { window.__kn.S.net = 'online'; });
  await H.until(() => kn(cas, () => window.__kn.pendingCount() === 0), 20000);
  const server = env.db.list('ev/' + casDev.id).flatMap(p => env.db.get(p).events).filter(e => e.t === 'sale').map(e => e.r.no).sort();
  eq(server, ['1-000001', '1-000002', '1-000003', '1-000004', '1-000005', '1-000006', '1-000007'], 'bazada 7 ta chek, takrorsiz');

  log('12. Ruxsatlar: kassa akkaunti narxni o‘zgartira olmaydi');
  await H.click(cas, '.userchip');
  await login(cas, ownerId, '123456');
  await go(cas, 'products');
  ok((await cas.page.$('[data-a="prodEdit"]')) === null, 'kassa qurilmasida mahsulot tahrirlash tugmasi yo‘q');
  ok((await H.text(cas, '.infobox')).includes('ilova egasining'), 'sababi tushuntirilgan');
  const w0 = env.db.clients.get(cas.id).writes;
  const r = await kn(cas, async () => { try { await window.__kn.S.db.doc('cfg/main').set({ hacked: true }); return 'yozildi'; } catch (e) { return e.code; } });
  eq(r, 'invalid_argument', 'bazaning o‘zi ham rad etdi');
  ok(env.db.get('cfg/main').shop.name === 'Test market', 'sozlamalar buzilmadi');

  log('13. Faqat ko‘ruvchi (Viewer)');
  const view = await env.device('kuzatuvchi', { level: 'view' });
  await H.wait(view, '.heromain');
  ok((await H.text(view, '#netpill')).includes('Faqat ko'), 'faqat ko‘rish rejimi');
  await H.until(() => kn(view, () => window.__kn.periodData(window.__kn.S.ui.day, window.__kn.S.ui.day, 'all').days.get(window.__kn.S.ui.day).n >= 7));
  eq(env.db.clients.get(view.id).writes, 0, 'kuzatuvchi hech narsa yozmadi');
  const pinsVis = await kn(view, () => Object.keys(window.__kn.S.pins).length);
  eq(pinsVis, 0, 'kuzatuvchi PIN xeshlarini ko‘rmaydi');
  return { own, cas, ownerId, kamola, bekzod, casDev, w0 };
}

async function main() {
  const env = new Env();
  await env.start();
  try { await businessDay(env); }
  catch (e) { ok(false, 'kutilmagan xato: ' + (e && e.stack || e)); }
  finally {
    if (env.errors.length) { console.log('\nSahifa xatolari:'); console.log(env.errors.slice(0, 30).join('\n')); }
    await env.stop();
  }
  const s = summary();
  console.log(`\nNatija: ${s.passed} ta o‘tdi, ${s.failed} ta xato`);
  process.exit(s.failed || env.errors.length ? 1 : 0);
}
main();
