/* ============ Namunaviy mahsulotlar ============ */
const SAMPLE_CATS = ['Non va sut', 'Bakaleya', 'Ichimliklar', 'Meva-sabzavot', 'Shirinliklar', 'Maishiy'];
function sampleProducts() {
  const P = [
    ['Patir non', 'Non va sut', 5000, 'dona', 1], ['Buxanka non', 'Non va sut', 4000, 'dona', 1],
    ['Sut 2,5% 1 l', 'Non va sut', 12000, 'dona', 1], ['Qatiq 0,5 l', 'Non va sut', 7000, 'dona', 0],
    ['Tvorog 400 g', 'Non va sut', 18000, 'dona', 0], ['Qaymoq 200 g', 'Non va sut', 11000, 'dona', 0],
    ['Tuxum, 10 dona', 'Non va sut', 17000, 'dona', 1],
    ['Shakar 1 kg', 'Bakaleya', 13000, 'dona', 0], ['Guruch lazer 1 kg', 'Bakaleya', 22000, 'dona', 0],
    ['Un oliy nav 2 kg', 'Bakaleya', 15000, 'dona', 0], ['Makaron 400 g', 'Bakaleya', 8000, 'dona', 0],
    ['Paxta yog‘i 1 l', 'Bakaleya', 21000, 'dona', 1], ['Ko‘k choy 100 g', 'Bakaleya', 12000, 'dona', 0],
    ['Tuz 1 kg', 'Bakaleya', 3000, 'dona', 0],
    ['Suv 1,5 l', 'Ichimliklar', 4000, 'dona', 1], ['Gazli ichimlik 1 l', 'Ichimliklar', 9000, 'dona', 0],
    ['Sharbat 1 l', 'Ichimliklar', 14000, 'dona', 0],
    ['Kartoshka', 'Meva-sabzavot', 6000, 'kg', 1], ['Piyoz', 'Meva-sabzavot', 5000, 'kg', 0],
    ['Pomidor', 'Meva-sabzavot', 14000, 'kg', 0], ['Olma', 'Meva-sabzavot', 16000, 'kg', 0],
    ['Shokolad 90 g', 'Shirinliklar', 13000, 'dona', 0], ['Pechenye 300 g', 'Shirinliklar', 15000, 'dona', 0],
    ['Konfet assorti', 'Shirinliklar', 55000, 'kg', 0],
    ['Sovun 100 g', 'Maishiy', 6000, 'dona', 0], ['Kir yuvish kukuni 1 kg', 'Maishiy', 26000, 'dona', 0],
    ['Tish pastasi', 'Maishiy', 14000, 'dona', 0], ['Salfetka', 'Maishiy', 5000, 'dona', 0]
  ];
  return P.map((p, i) => ({ id: 'p' + pad(i + 1), name: p[0], cat: p[1], price: p[2], unit: p[3], fav: !!p[4], active: true,
    barcode: p[3] === 'kg' ? '' : ean13('4780' + String(1000000 + i * 137).padStart(8, '0')) }));
}

/* ============ Chap panel (soat, do'kon) ============ */
function lockArt(title) {
  const now = Date.now();
  const shop = S.cfg ? S.cfg.main.shop.name : 'Kassa Nazorati';
  return `<div class="lock-art"><div class="brandrow"><span class="mark">${I.mark}</span><span class="wm">Kassa Nazorati<small>${esc(title || shop)}</small></span></div>
  <div class="la-mid"><div class="clock" id="clock">${hm(now)}</div><div class="la-date">${DAYS[new Date(now).getDay()]}, ${longDay(dkey(now))}</div></div>
  <div class="la-foot">${S.dev ? `<b>${esc(sname(S.dev.store))}</b><span>${esc(S.dev.name)}${S.dev.type === 'monitor' ? ', kuzatuv qurilmasi' : ''}</span>` : `<span>Qurilma hali ulanmagan</span>`}</div></div>`;
}

/* ============ Birinchi sozlash ============ */
function vNotSetup() {
  return `<div class="lock">${lockArt()}<div class="lock-pad"><div class="onb"><h2>Ilova hali sozlanmagan</h2>
    <p class="muted">Kassa Nazorati’ni birinchi marta ilova egasi ochib, do‘konni sozlashi kerak. Shundan keyin bu qurilmani ulash mumkin bo‘ladi.</p>
    <p class="note">Agar egasi siz bo‘lsangiz, ilovani o‘z akkauntingizdan oching.</p></div></div></div>`;
}
function vOnboard() {
  const o = S.ui.onb || (S.ui.onb = { step: 'choose', f: { shop: '', store: '', address: '', open: '08:00', close: '22:00', owner: '', pin: '', pin2: '', type: 'monitor', sample: true }, err: '' });
  let body;
  if (o.step === 'working') body = `<div class="onb" style="align-items:center;text-align:center"><div class="spin"></div><h2>${esc(o.title || 'Tayyorlanmoqda')}</h2><p class="muted" id="onbprog">${esc(o.progress || '')}</p></div>`;
  else if (o.step === 'choose') body = `<div class="onb"><h2>Xush kelibsiz</h2>
    <p class="muted">Kassa Nazorati kassadagi har bir so‘mni hisobga oladi: smenalar, cheklar, qaytarishlar, nasiya va kassa farqlari egasiga darhol ko‘rinadi.</p>
    <div class="choice">
      <button class="card-choice" data-a="onbReal"><span class="ci">${I.store}</span><span><b>O‘z do‘konimni sozlash</b><span>Do‘kon nomi, ish vaqti va o‘zingizning PIN kodingiz. 2 daqiqa.</span></span></button>
      <button class="card-choice" data-a="onbDemo"><span class="ci">${I.spark}</span><span><b>Namuna bilan tanishish</b><span>Ikki do‘kon, besh xodim va bir haftalik savdo bilan tayyor ko‘rinish. Keyin bir tugma bilan tozalanadi.</span></span></button>
    </div>
    ${S.mode === 'local' ? `<div class="infobox">Umumiy baza ulanmagan, shuning uchun ma’lumotlar faqat shu qurilmada saqlanadi.</div>` : ''}</div>`;
  else if (o.step === 'demo') body = `<div class="onb"><h2>Namuna: bu qurilma</h2>
    <p class="muted">Bu qurilma nima uchun ishlatiladi? Namunada ham xuddi haqiqiydagidek ishlaydi.</p>
    <div class="seg" role="group"><button class="${o.f.type === 'monitor' ? 'on' : ''}" data-a="onbType" data-k="monitor">Egasi telefoni (nazorat)</button><button class="${o.f.type === 'cashier' ? 'on' : ''}" data-a="onbType" data-k="cashier">Kassa</button></div>
    <div class="err">${esc(o.err)}</div>
    <div class="toolbar"><button class="btn" data-a="onbBack">Orqaga</button><div class="grow"></div><button class="btn pri big" data-a="onbDemoGo">Namunani ochish</button></div></div>`;
  else body = `<div class="onb"><h2>Do‘konni sozlash</h2>
    <div class="frm">
      <label class="f">Biznes nomi<input id="o_shop" data-in="onb" data-f="shop" value="${esc(o.f.shop)}" maxlength="60" placeholder="Masalan: Baraka market" autocomplete="off"></label>
      <div class="frm2"><label class="f">Birinchi do‘kon<input id="o_store" data-in="onb" data-f="store" value="${esc(o.f.store)}" maxlength="60" placeholder="Masalan: Chilonzor filiali"></label>
      <label class="f">Manzil<input id="o_addr" data-in="onb" data-f="address" value="${esc(o.f.address)}" maxlength="80" placeholder="Ixtiyoriy"></label></div>
      <div class="frm2"><label class="f">Ochiladi<input id="o_open" type="time" data-in="onb" data-f="open" value="${esc(o.f.open)}"></label>
      <label class="f">Yopiladi<input id="o_close" type="time" data-in="onb" data-f="close" value="${esc(o.f.close)}"></label></div>
      <label class="f">Sizning ismingiz<input id="o_owner" data-in="onb" data-f="owner" value="${esc(o.f.owner)}" maxlength="40" placeholder="Egasi, administrator"></label>
      <div class="frm2"><label class="f">PIN kod, 6 raqam<input id="o_pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" data-in="onb" data-f="pin" value="${esc(o.f.pin)}"></label>
      <label class="f">PIN kodni takrorlang<input id="o_pin2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" data-in="onb" data-f="pin2" value="${esc(o.f.pin2)}"></label></div>
      <div><div style="font-weight:600;font-size:13.5px;color:var(--ink-2);margin-bottom:6px">Bu qurilma</div>
      <div class="seg" role="group"><button class="${o.f.type === 'monitor' ? 'on' : ''}" data-a="onbType" data-k="monitor">Egasi telefoni (nazorat)</button><button class="${o.f.type === 'cashier' ? 'on' : ''}" data-a="onbType" data-k="cashier">Kassa</button></div></div>
      <label class="check"><input type="checkbox" id="o_sample" data-ch="onbSample" ${o.f.sample ? 'checked' : ''}>28 ta namunaviy mahsulot qo‘shilsin (keyin tahrirlanadi yoki o‘chiriladi)</label>
    </div>
    <div class="err">${esc(o.err)}</div>
    <div class="toolbar"><button class="btn" data-a="onbBack">Orqaga</button><div class="grow"></div><button class="btn pri big" data-a="onbGo">Sozlashni yakunlash</button></div></div>`;
  return `<div class="lock">${lockArt('Yangi o‘rnatish')}<div class="lock-pad" style="justify-content:flex-start;overflow:auto">${body}</div></div>`;
}
function onbProgress(t) { if (S.ui.onb) S.ui.onb.progress = t; const el = $('#onbprog'); if (el) el.textContent = t; }

async function doSetup() {
  const o = S.ui.onb, f = o.f;
  const shop = f.shop.trim(), store = (f.store.trim() || shop), owner = f.owner.trim();
  if (!shop) return onbErr('Biznes nomini kiriting');
  if (!owner) return onbErr('Ismingizni kiriting');
  if (!/^\d{6}$/.test(f.pin)) return onbErr('PIN aynan 6 ta raqamdan iborat bo‘lishi kerak');
  if (f.pin !== f.pin2) return onbErr('PIN kodlar bir xil emas');
  if (toMin(f.open) === toMin(f.close)) return onbErr('Ochilish va yopilish vaqti bir xil bo‘lmasin');
  o.step = 'working'; o.title = 'Do‘kon sozlanmoqda'; o.err = ''; render();
  try {
    const st = { id: 'st' + uid(6), name: store, address: f.address.trim(), open: f.open || '08:00', close: f.close || '22:00' };
    const own = { id: 'u' + uid(8), name: owner, role: 'admin', stores: [], active: true };
    onbProgress('PIN kod shifrlanmoqda');
    const pins = { [own.id]: await makePin(f.pin) };
    const items = f.sample ? sampleProducts() : [];
    const main = { inst: uid(10), shop: { name: shop }, stores: [st], cats: f.sample ? SAMPLE_CATS.slice() : [], settings: defaultSettings(), blocked: [], demo: false, createdAt: Date.now(), v: Date.now() };
    onbProgress('Sozlamalar saqlanmoqda');
    await writeCfg('cfg/main', main);
    await writeCfg('cfg/staff', { list: [own], v: Date.now() });
    await writeCfg('sec/pins', { pins, v: Date.now() });
    await writeCfg('cfg/p-0', { items, v: Date.now() });
    applyCfg(main, { list: [own] }, new Map([['p-0', { items }]])); S.pins = pins; S.pinsReady = true; S.cfgReady = true;
    onbProgress('Qurilma ulanmoqda');
    await registerDevice({ type: f.type, store: st.id, name: f.type === 'cashier' ? 'Kassa 1' : 'Egasi telefoni', by: own.id });
    S.user = clone(own);
    emit('admin', { text: `Do‘kon sozlandi: ${shop}` });
    emit('login');
    S.ui.onb = null; S.view = null; render();
    toast('Tayyor. Endi xodimlar va mahsulotlarni qo‘shishingiz mumkin.');
  } catch (e) {
    o.step = 'form'; o.err = 'Saqlab bo‘lmadi: ' + ((e && (e.message || e.code)) || 'noma’lum xato') + '. Internetni tekshirib, qayta urinib ko‘ring.'; render();
  }
}
function onbErr(t) { S.ui.onb.err = t; render(); return false; }

/* ============ Namuna ma'lumotlar ============ */
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
async function poolRun(tasks, n, onStep) {
  let i = 0, done = 0;
  const worker = async () => { while (i < tasks.length) { const t = tasks[i++]; await t(); done++; if (onStep) onStep(done, tasks.length); } };
  await Promise.all(Array.from({ length: Math.min(n, tasks.length) }, worker));
}
function demoHistory(stores, products, devs, custs, rnd) {
  /* har bir qurilma uchun alohida zanjir */
  const out = new Map();
  const now = Date.now(), t0 = today();
  const cashierOf = { 'st-chilonzor': 'u-sardor', 'st-yunusobod': 'u-madina' };
  const bossOf = { 'st-chilonzor': 'u-dilnoza', 'st-yunusobod': 'u-ega' };
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  for (const dv of devs) {
    const evs = []; let seq = 0, ph = GENESIS, rec = 0;
    const st = dv.store, cashier = cashierOf[st], boss = bossOf[st];
    const add = (t, ts, user, data) => {
      const e = Object.assign({ id: uid(16), t, ts, day: dkey(ts), dev: dv.id, store: st, user, seq: ++seq, ph }, data);
      e.c = e.day + '~0'; e.h = evHash(e); ph = e.h; evs.push(e); return e;
    };
    for (let back = 6; back >= 0; back--) {
      const day = addD(t0, -back), base = k2ts(day) - 12 * 3600000;
      let ts = base + (8 * 60 + Math.floor(rnd() * 8)) * 60000;
      if (ts > now) continue;
      add('login', ts, cashier, {});
      const shift = uid(12), open = rnd() < 0.5 ? 200000 : 300000;
      add('shift_open', ts + 20000, cashier, { shift, cash: open });
      const endTs = back === 0 ? now - 4 * 60000 : base + (21 * 60 + 35) * 60000;
      const sales = []; let cashIn = open;
      let voided = false, refunded = back % 2 === 1, collected = false;
      ts += 6 * 60000;
      while (ts < endTs) {
        ts += (3 + Math.floor(rnd() * 11)) * 60000 + Math.floor(rnd() * 50000);
        if (ts >= endTs) break;
        const hour = new Date(ts).getHours();
        if (!collected && hour >= 14) {
          const amt = Math.max(0, Math.floor((cashIn - 400000) / 100000) * 100000);
          if (amt > 0) { add('cash', ts, cashier, { shift, kind: 'collection', amount: amt, reason: 'Kun o‘rtasida egaga topshirildi', person: 'Aziz Karimov', by: boss }); cashIn -= amt; }
          if (rnd() < 0.45) { add('cash', ts + 60000, cashier, { shift, kind: 'expense', amount: 25000, reason: 'Ichimlik suvi uchun', person: 'Suv yetkazuvchi', by: boss }); cashIn -= 25000; }
          collected = true; ts += 120000;
        }
        const n = 1 + Math.floor(rnd() * rnd() * 5);
        const items = [];
        for (let k = 0; k < n; k++) {
          const p = rnd() < 0.55 ? pick(products.filter(x => x.fav)) : pick(products);
          if (items.find(x => x.p === p.id)) continue;
          const qty = p.unit === 'kg' ? r3(0.3 + Math.floor(rnd() * 25) / 10) : 1 + Math.floor(rnd() * rnd() * 3);
          items.push({ p: p.id, name: p.name, qty, price: p.price, unit: p.unit });
        }
        if (rnd() < 0.05 && items.length) add('item_remove', ts - 30000, cashier, { shift, p: items[0].p, name: items[0].name, price: items[0].price, qty: 1 });
        const sub = items.reduce((s, it) => s + Math.round(it.price * it.qty), 0);
        let disc = 0, discPct = 0, discReason = '', discBy = null;
        if (rnd() < 0.04 && sub > 30000) { discPct = rnd() < 0.5 ? 5 : 10; disc = Math.round(sub * discPct / 100); discReason = discPct > 5 ? 'Aksiya' : 'Doimiy xaridor'; discBy = discPct > 5 ? boss : null; }
        const total = sub - disc;
        const x = rnd(); let pays, given = 0, change = 0, cust = null;
        if (x < 0.55) { pays = [{ m: 'cash', a: total }]; given = Math.ceil(total / 5000) * 5000 + (rnd() < 0.3 ? 5000 : 0); change = given - total; cashIn += total; }
        else if (x < 0.73) pays = [{ m: 'uzcard', a: total }];
        else if (x < 0.84) pays = [{ m: 'humo', a: total }];
        else if (x < 0.91) pays = [{ m: 'click', a: total }];
        else if (x < 0.96) pays = [{ m: 'payme', a: total }];
        else { cust = pick(custs).id; pays = [{ m: 'nasiya', a: total }]; }
        rec++;
        const r = { id: uid(12), rn: rec, no: dv.code + '-' + String(rec).padStart(6, '0'), items, sub, disc, discPct, discReason, discBy, total, pays, given, change };
        if (cust) r.cust = cust;
        const e = add('sale', ts, cashier, { shift, r });
        sales.push(e);
        if (!voided && hour >= 11 && rnd() < 0.08 && pays[0].m !== 'nasiya') {
          ts += 90000;
          add('void', ts, cashier, { shift, rid: r.id, no: r.no, amount: total, pays, items: items.map(i => ({ p: i.p, name: i.name, qty: i.qty, price: i.price })), reason: 'Xato urilgan', by: boss, cust: r.cust || null });
          if (pays[0].m === 'cash') cashIn -= total;
          voided = true;
        }
        if (refunded && hour >= 16 && sales.length > 5 && rnd() < 0.1) {
          const orig = sales[Math.floor(rnd() * (sales.length - 3))].r;
          if (orig.pays[0].m !== 'nasiya' && orig.items.length) {
            const it = orig.items[0], q = it.unit === 'dona' ? 1 : it.qty;
            const ratio = orig.sub ? orig.total / orig.sub : 1, amt = Math.min(Math.round(it.price * q * ratio), orig.total);
            ts += 60000;
            add('refund', ts, cashier, { shift, rid: orig.id, no: orig.no, items: [{ i: 0, qty: q, amount: amt, p: it.p, name: it.name }], total: amt, pays: [{ m: orig.pays[0].m, a: amt }], reason: 'Sifatsiz mahsulot', by: boss });
            if (orig.pays[0].m === 'cash') cashIn -= amt;
            refunded = false;
          }
        }
        if (rnd() < 0.015) { const c = pick(custs); ts += 30000; add('debt_pay', ts, cashier, { shift, cust: c.id, amount: 50000, m: 'cash' }); cashIn += 50000; }
      }
      if (back > 0) {
        const cts = endTs + 5 * 60000;
        const shEvs = evs.filter(e => e.shift === shift);
        const A = accumulate(shEvs, false), sh = A.shifts.get(shift), T = shiftTotals(sh);
        const variance = back === 2 ? -18000 : back === 4 ? -2000 : back === 5 ? 1000 : 0;
        const terms = {}; for (const m of ['uzcard', 'humo', 'click', 'payme']) terms[m] = T.sys[m] || 0;
        add('shift_close', cts, cashier, { shift, counted: T.expected + variance, expected: T.expected, variance, reason: variance === -18000 ? 'Maydalik yetishmadi, qayta sanaldi' : '', terms, sys: T.sys });
      }
    }
    out.set(dv.id, { evs, rec });
  }
  return out;
}
async function doDemo() {
  const o = S.ui.onb; o.step = 'working'; o.title = 'Namuna tayyorlanmoqda'; render();
  try {
    const S1 = 'st-chilonzor', S2 = 'st-yunusobod';
    const stores = [
      { id: S1, name: 'Chilonzor do‘koni', address: 'Chilonzor tumani, 9-kvartal', open: '08:00', close: '22:00' },
      { id: S2, name: 'Yunusobod do‘koni', address: 'Yunusobod tumani, 4-mavze', open: '08:00', close: '22:00' }];
    const staff = [
      { id: 'u-ega', name: 'Aziz Karimov', role: 'admin', stores: [], active: true },
      { id: 'u-dilnoza', name: 'Dilnoza', role: 'manager', stores: [S1], active: true },
      { id: 'u-sardor', name: 'Sardor', role: 'cashier', stores: [S1], active: true },
      { id: 'u-madina', name: 'Madina', role: 'cashier', stores: [S2], active: true },
      { id: 'u-hisobchi', name: 'Hisobchi', role: 'viewer', stores: [], active: true }];
    onbProgress('PIN kodlar shifrlanmoqda');
    const pins = {}; for (const [id, p] of Object.entries(DEMO_PINS)) pins[id] = await makePin(p);
    const items = sampleProducts();
    const main = { inst: uid(10), shop: { name: 'Baraka market' }, stores, cats: SAMPLE_CATS.slice(), settings: defaultSettings(), blocked: [], demo: true, createdAt: Date.now(), v: Date.now() };
    applyCfg(main, { list: staff }, new Map([['p-0', { items }]]));
    const custs = [
      { id: 'c-botir', name: 'Botir aka', phone: '+998 90 123 45 67', note: 'Qo‘shni uy, 12-xonadon' },
      { id: 'c-gulnora', name: 'Gulnora opa', phone: '+998 93 555 12 34', note: '' },
      { id: 'c-rustam', name: 'Rustam (choyxona)', phone: '+998 97 700 80 90', note: 'Har oy 5-sanada to‘laydi' },
      { id: 'c-shahnoza', name: 'Shahnoza', phone: '+998 99 432 10 10', note: '' }];
    const devs = [
      { id: 'demo-k1', name: 'Kassa 1', type: 'cashier', store: S1, code: 1, inst: main.inst, at: Date.now() - 8 * 86400000, by: 'u-ega' },
      { id: 'demo-k2', name: 'Kassa 1', type: 'cashier', store: S2, code: 1, inst: main.inst, at: Date.now() - 8 * 86400000, by: 'u-ega' }];
    for (const d of devs) S.devs.set(d.id, d);
    onbProgress('Bir haftalik savdo yaratilmoqda');
    await sleep(30);
    const hist = demoHistory(stores, items, devs, custs, mulberry(20260926));
    const tasks = [];
    tasks.push(() => writeCfg('cfg/main', main), () => writeCfg('cfg/staff', { list: staff, v: Date.now() }), () => writeCfg('sec/pins', { pins, v: Date.now() }), () => writeCfg('cfg/p-0', { items, v: Date.now() }));
    for (const d of devs) tasks.push(() => dbSet('dev/' + d.id, devDoc(d)));
    for (const c of custs) tasks.push(() => dbSet('cust/' + c.id, Object.assign({ at: Date.now() - 20 * 86400000, by: 'u-ega' }, c)));
    for (const [devId, h] of hist) {
      const byDay = new Map(); for (const e of h.evs) { if (!byDay.has(e.day)) byDay.set(e.day, []); byDay.get(e.day).push(e); }
      const debts = new Map();
      for (const [day, evs] of byDay) {
        const store = evs[0].store;
        tasks.push(() => dbSet('ev/' + devId + '~' + day + '~0', { dev: devId, store, day, k: 0, n: evs.length, s0: evs[0].seq, s1: evs[evs.length - 1].seq, events: evs }));
        const A = accumulate(evs, true), agg = A.days.get(store + '|' + day) || newAgg(); trimItems(agg, 40);
        const rs = evs.filter(e => e.t === 'sale').map(e => e.r.rn);
        tasks.push(() => dbSet('sum/' + devId + '~' + day, { dev: devId, store, day, s0: evs[0].seq, s1: evs[evs.length - 1].seq, r0: rs.length ? Math.min(...rs) : 0, r1: rs.length ? Math.max(...rs) : 0, agg, shifts: [...A.shifts.values()], at: Date.now() }));
        for (const e of evs) for (const it of debtItemsOf(e)) { const m = mkey(e.day); if (!debts.has(m)) debts.set(m, []); debts.get(m).push(it); }
      }
      for (const [m, list] of debts) tasks.push(() => dbSet('debt/' + devId + '~' + m, { dev: devId, store: devs.find(d => d.id === devId).store, month: m, items: list }));
    }
    /* avvalgi oylardan qolgan qarzlar (daftar bo'sh ko'rinmasligi uchun) */
    const pm = mkey(addD(today(), -35));
    tasks.push(() => dbSet('debt/demo-k1~' + pm, { dev: 'demo-k1', store: S1, month: pm, items: [
      { id: 'dm1', cust: 'c-rustam', a: 340000, k: 'sale', no: '1-000011', ts: k2ts(addD(today(), -35)), u: 'u-sardor', st: S1, dev: 'demo-k1' },
      { id: 'dm2', cust: 'c-botir', a: 125000, k: 'sale', no: '1-000019', ts: k2ts(addD(today(), -33)), u: 'u-sardor', st: S1, dev: 'demo-k1' },
      { id: 'dm3', cust: 'c-rustam', a: -150000, k: 'pay', m: 'cash', ts: k2ts(addD(today(), -30)), u: 'u-sardor', st: S1, dev: 'demo-k1' }] }));
    await poolRun(tasks, 4, (d, n) => onbProgress(`Saqlanmoqda: ${d} / ${n}`));
    S.pins = pins; S.pinsReady = true; S.cfgReady = true;
    onbProgress('Qurilma ulanmoqda');
    await registerDevice({ type: o.f.type, store: S1, name: o.f.type === 'cashier' ? 'Kassa 2' : 'Egasi telefoni', by: 'u-ega' });
    S.user = clone(staff[0]);
    emit('login');
    S.ui.onb = null; S.view = null; S.seen = 0; render();
    toast('Namuna tayyor. Siz egasi sifatida kirdingiz.');
  } catch (e) {
    o.step = 'demo'; o.err = 'Namunani saqlab bo‘lmadi: ' + ((e && (e.message || e.code)) || 'xato'); render();
  }
}
const DEMO_PINS = { 'u-ega': '111111', 'u-dilnoza': '222222', 'u-sardor': '3333', 'u-madina': '4444', 'u-hisobchi': '5555' };
function demoHint() {
  if (!S.cfg || !S.cfg.main.demo) return '';
  const rows = Object.entries(DEMO_PINS).map(([id, pin]) => { const u = U(id); return u && u.active ? `<tr><td>${esc(u.name)}, ${esc(ROLES[u.role].toLowerCase())}${u.stores.length ? ' (' + esc(u.stores.map(sname).join(', ')) + ')' : ''}</td><td>${pin}</td></tr>` : ''; }).join('');
  return rows ? `<details class="demo"><summary>Namunadagi xodimlar va PIN kodlar</summary><table>${rows}</table></details>` : '';
}
async function clearAll() {
  /* barcha umumiy hujjatlar o'chiriladi (faqat namuna rejimida yoki egasi xohlasa) */
  const cols = ['ev', 'sum', 'debt', 'cust', 'dev', 'lock', 'cfg', 'sec'];
  for (const c of cols) {
    const snap = await withTimeout(S.db.collection(c).get(), 30000);
    const ids = snap.docs.map(d => d.id);
    await poolRun(ids.map(id => () => dbDel(c + '/' + id)), 4, (d, n) => onbProgress(`O‘chirilmoqda: ${c} ${d}/${n}`));
  }
}

/* ============ Qurilmani ulash ============ */
function connCandidates(c) {
  return STAFF().filter(u => u.active && (u.role === 'admin' || (u.role === 'manager' && canStore(u, c.store)) || (c.type === 'monitor' && u.role === 'viewer')));
}
function vConnect() {
  const c = S.ui.conn || (S.ui.conn = { type: 'cashier', store: null, name: '', who: null, pin: '', err: '', busy: false });
  const stores = STORES();
  if (!c.store || !ST(c.store)) c.store = stores[0] ? stores[0].id : null;
  const defName = c.type === 'cashier' ? 'Kassa ' + ([...S.devs.values()].filter(d => d.store === c.store && d.type === 'cashier').reduce((m, d) => Math.max(m, num(d.code)), 0) + 1) : 'Telefon';
  const who = c.who ? U(c.who) : null;
  let pad;
  if (!who) {
    const cands = connCandidates(c);
    pad = `<div class="onb"><h2>Qurilmani ulash</h2>
      <p class="muted">Bu qurilma qaysi do‘konda va nima uchun ishlatilishini tanlang. Bir marta sozlanadi.</p>
      <div class="seg" role="group"><button class="${c.type === 'cashier' ? 'on' : ''}" data-a="connType" data-k="cashier">Kassa</button><button class="${c.type === 'monitor' ? 'on' : ''}" data-a="connType" data-k="monitor">Kuzatuv (telefon)</button></div>
      <label class="f">Do‘kon<select id="c_store" data-ch="connStore">${stores.map(x => `<option value="${esc(x.id)}" ${x.id === c.store ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
      <label class="f">Qurilma nomi<input id="c_name" data-in="connName" value="${esc(c.name || defName)}" maxlength="40"></label>
      <div style="font-weight:600;font-size:13.5px;color:var(--ink-2)">Kim ruxsat beradi?</div>
      <div class="who">${cands.map(u => `<button class="whob" data-a="connWho" data-id="${esc(u.id)}">${avatar(u)}<b>${esc(u.name)}</b><small>${esc(ROLES[u.role])}</small></button>`).join('') || '<p class="muted">Ruxsat bera oladigan xodim yo‘q.</p>'}</div>
      ${demoHint()}</div>`;
  } else {
    pad = `<div class="onb" style="align-items:center;text-align:center">${avatar(who)}<h2>${esc(who.name)}, PIN kodingiz</h2>
      <p class="muted">${esc(c.type === 'cashier' ? 'Kassa' : 'Kuzatuv qurilmasi')}: ${esc(sname(c.store))}</p>
      <div id="pindots">${pinDots(c.pin.length, !!c.err, 6)}</div>
      <div class="err" id="pinerr">${esc(c.busy ? 'Tekshirilmoqda…' : c.err)}</div>
      ${keypad('connPin')}
      <button class="lnk" data-a="connBack">Boshqa xodim</button></div>`;
  }
  return `<div class="lock">${lockArt()}<div class="lock-pad" style="overflow:auto">${pad}</div></div>`;
}
async function connFinish() {
  const c = S.ui.conn, u = U(c.who);
  if (!u) return;
  if (c.pin.length < 4) { c.err = 'PIN kamida 4 raqam'; return updConnPin(); }
  c.busy = true; c.err = ''; updConnPin();
  const ok = await checkPin(c.pin, S.pins[u.id]);
  c.pin = '';
  if (!ok) { c.busy = false; c.err = S.pins[u.id] ? 'PIN noto‘g‘ri' : 'Bu xodimning PIN kodi hali yuklanmagan'; return updConnPin(); }
  try {
    const name = (c.name || '').trim() || (c.type === 'cashier' ? 'Kassa' : 'Telefon');
    await registerDevice({ type: c.type, store: c.store, name, by: u.id });
    S.ui.conn = null; S.user = null; render();
    toast('Qurilma ulandi. Endi PIN bilan kiring.');
  } catch (e) { c.busy = false; c.err = 'Ulab bo‘lmadi: ' + ((e && (e.message || e.code)) || 'xato') + '. Qayta urinib ko‘ring.'; render(); }
}
function updConnPin() {
  const c = S.ui.conn; if (!c) return;
  const d = $('#pindots'); if (d) d.innerHTML = pinDots(c.pin.length, !!c.err, 6);
  const e = $('#pinerr'); if (e) e.textContent = c.busy ? 'Tekshirilmoqda…' : c.err;
}
function vBlocked() {
  return `<div class="lock">${lockArt()}<div class="lock-pad"><div class="onb"><h2>Bu qurilma bloklangan</h2>
    <p class="muted">Ilova egasi bu qurilmani o‘chirib qo‘ygan. U orqali savdo qilish va kirish mumkin emas.</p>
    ${S.q.length ? `<div class="warnbox"><b>Yuborilmagan ${S.q.length} ta yozuv bor.</b> Qayta ulansa, ular shu qurilmadan o‘chadi.</div>` : ''}
    <button class="btn" data-a="resetDevGo">Yangi qurilma sifatida ulash</button></div></div></div>`;
}

/* ============ Kirish (PIN) ============ */
function loginCandidates() {
  const monitor = S.dev && S.dev.type === 'monitor';
  return STAFF().filter(u => u.active && (monitor ? u.role !== 'cashier' : (u.role !== 'viewer' && canStore(u, S.dev.store))));
}
function lockoutLeft() { const l = LS.get('lockout', null); return l && l.until > Date.now() ? Math.ceil((l.until - Date.now()) / 1000) : 0; }
function vLogin() {
  const u = S.ui, who = u.who ? U(u.who) : null, wait = lockoutLeft();
  let pad;
  if (!S.pinsReady && S.mode === 'remote' && !Object.keys(S.pins).length) pad = `<div class="onb" style="align-items:center"><div class="spin"></div><p class="muted">Xodimlar yuklanmoqda…</p></div>`;
  else if (!who) {
    const list = loginCandidates();
    pad = `<h2>Kim ishlaydi?</h2><div class="who">${list.map(x => `<button class="whob" data-a="who" data-id="${esc(x.id)}">${avatar(x)}<b>${esc(x.name)}</b><small>${esc(ROLES[x.role])}</small></button>`).join('') || '<p class="muted">Bu qurilmada ishlay oladigan xodim yo‘q. Ilova egasi xodim qo‘shishi kerak.</p>'}</div>${demoHint()}`;
  } else {
    pad = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px">${avatar(who)}<h2>${esc(who.name)}</h2><span class="muted">${esc(ROLES[who.role])}</span></div>
      <div id="pindots">${pinDots(u.pin.length, !!u.pinErr, isBoss(who) ? 6 : 4)}</div>
      <div class="err" id="pinerr">${esc(wait ? `Ko‘p noto‘g‘ri urinish. ${wait} soniyadan keyin qayta urinib ko‘ring.` : u.checking ? 'Tekshirilmoqda…' : u.pinErr)}</div>
      ${keypad('pin')}
      <button class="lnk" data-a="whoBack">Boshqa xodim</button>`;
  }
  return `<div class="lock">${lockArt()}<div class="lock-pad" style="overflow:auto">${pad}</div></div>`;
}
function updPinUI() {
  const who = S.ui.who ? U(S.ui.who) : null;
  const d = $('#pindots'); if (d) d.innerHTML = pinDots(S.ui.pin.length, !!S.ui.pinErr, who && isBoss(who) ? 6 : 4);
  const e = $('#pinerr'); if (e) { const w = lockoutLeft(); e.textContent = w ? `Ko‘p noto‘g‘ri urinish. ${w} soniyadan keyin qayta urinib ko‘ring.` : S.ui.checking ? 'Tekshirilmoqda…' : S.ui.pinErr; }
}
function pinKey(k) {
  const u = S.ui; if (!u.who || u.checking || lockoutLeft()) return;
  u.pinErr = '';
  if (k === 'bk') u.pin = u.pin.slice(0, -1);
  else if (k === 'ok') return tryLogin();
  else if (u.pin.length < 6) { u.pin += k; const who = U(u.who); if (who && u.pin.length === 6) return tryLogin(); }
  updPinUI();
}
async function tryLogin() {
  const u = S.ui, who = U(u.who);
  if (!who) return;
  if (u.pin.length < 4) { u.pinErr = 'PIN kamida 4 raqamdan iborat'; return updPinUI(); }
  u.checking = true; updPinUI();
  const pin = u.pin;
  const ok = await checkPin(pin, S.pins[who.id]);
  u.checking = false; u.pin = '';
  if (!ok) {
    const l = LS.get('lockout', { fails: 0, until: 0 }); l.fails = num(l.fails) + 1;
    if (l.fails >= 5) { l.fails = 0; l.until = Date.now() + 30000; setTimeout(() => { if (!S.user) updPinUI(); }, 30500); }
    LS.set('lockout', l);
    u.pinErr = S.pins[who.id] ? 'PIN noto‘g‘ri' : 'Bu xodimga PIN o‘rnatilmagan';
    return updPinUI();
  }
  LS.del('lockout');
  S.user = clone(who); S.view = null; S.last = Date.now(); u.who = null;
  emit('login');
  render();
  if (S.view === 'dash') { markSeen(); }
}
function markSeen() { S.prevSeen = S.seen; S.seen = Date.now(); LS.set('seen', S.seen); }
function doLock() { S.user = null; S.modals = []; S.ui.pin = ''; S.ui.pinErr = ''; S.ui.who = null; S.ui.cartOpen = false; S.ui.more = false; render(); }

/* ============ Tasdiqlash (mudir yoki administrator PIN'i) ============ */
function approvers() { return STAFF().filter(u => u.active && (u.role === 'admin' || (u.role === 'manager' && canStore(u, S.dev.store))) && (!S.user || u.id !== S.user.id)); }
function requireApproval(text, cb) {
  if (isBoss(S.user) && canStore(S.user, S.dev.store)) return cb(S.user.id);
  pushModal({ type: 'approve', text, cb, who: null, pin: '', err: '' });
}
