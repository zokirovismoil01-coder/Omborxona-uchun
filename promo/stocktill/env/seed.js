// Videoda ko'rinadigan namunaviy ma'lumotlar: sut mahsulotlari ombori.
// 28 kunlik dilerlarga sotuv tarixi, har kuni ertalab zavoddan kirim, haftalik sanoq,
// qaytgan va muddati o'tgan mahsulotlar, qurilmalar va audit jurnali — StockTill'ning
// o'z hujjat formatida (meta/*, products/c*, sales/*, stockmoves/*, audit/*, devices/*).
'use strict';
const crypto = require('crypto');

const TODAY = '2026-10-02';            // juma
const NOW = { h: 17, m: 40 };          // suratga olish vaqti (Toshkent)
const DAYS = 28;
const TZ_MIN = 5 * 60;                 // Toshkent UTC+5

const iso = (day, h, m, s = 0) => { const [y, mo, d] = day.split('-').map(Number); return new Date(Date.UTC(y, mo - 1, d, h, m, s) - TZ_MIN * 60000).toISOString(); };
const addDays = (day, n) => { const [y, mo, d] = day.split('-').map(Number); return new Date(Date.UTC(y, mo - 1, d + n)).toISOString().slice(0, 10); };
const wd = (day) => new Date(day + 'T12:00:00Z').getUTCDay();
const mmdd = (day) => day.slice(5, 7) + day.slice(8, 10);

let seed = 20261002;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (arr, w) => { const s = arr.reduce((a, x) => a + w(x), 0); let r = rnd() * s; for (const x of arr) { r -= w(x); if (r <= 0) return x; } return arr[arr.length - 1]; };
const uid = (t) => Date.parse(t).toString(36) + Math.floor(rnd() * 2176782336).toString(36).padStart(6, '0');
const round3 = (n) => Math.round(n * 1000) / 1000;
const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";

// sku, nomi, kategoriya, narx, tannarx, birlik, minimal qoldiq, kunlik o'rtacha sotuv
const PRODUCTS = [
  ['4780001000011', 'Sut 3,2% 1 l', 'Sut', 11000, 8800, 'ea', 80, 260],
  ['4780001000028', 'Sut 2,5% 0,5 l', 'Sut', 6500, 5100, 'ea', 50, 150],
  ['4780001000035', 'Qatiq 1 l', 'Qatiq', 12000, 9300, 'ea', 60, 210],
  ['4780001000042', 'Qatiq 0,5 l', 'Qatiq', 7000, 5400, 'ea', 40, 120],
  ['4780001000141', 'Qatiq 6 kg paqir', 'Qatiq', 62000, 49000, 'ea', 4, 14],
  ['4780001000158', 'Qatiq 10 kg paqir', 'Qatiq', 99000, 79000, 'ea', 3, 9],
  ['4780001000059', 'Kefir 1 l', 'Sut', 13000, 10000, 'ea', 30, 90],
  ['4780001000066', 'Ayron 0,5 l', 'Ichimlik', 6000, 4500, 'ea', 20, 70],
  ['4780001000073', 'Smetana 20% 400 g', 'Smetana', 16000, 12400, 'ea', 25, 85],
  ['4780001000080', 'Tvorog 9% 500 g', 'Tvorog', 22000, 17000, 'ea', 15, 55],
  ['4780001000097', 'Qaymoq 200 g', 'Qaymoq', 15000, 11500, 'ea', 15, 40],
  ['4780001000103', 'Sariyogʻ 82% 200 g', 'Sariyogʻ', 28000, 22500, 'ea', 15, 45],
  ['4780001000110', 'Suzma', 'Tvorog', 45000, 34000, 'kg', 6, 18],
  ['4780001000127', 'Pishloq Gollandskiy', 'Pishloq', 95000, 76000, 'kg', 5, 9],
  ['4780001000134', 'Yogurt mevali 125 g', 'Yogurt', 5500, 4000, 'ea', 35, 110],
  ['4780001000165', 'Kurt 100 g', 'Kurt', 9000, 6500, 'ea', 10, 30],
].map(([sku, name, cat, price, cost, unit, min, demand]) => ({ sku, name, cat, price, cost, unit, min, demand }));
const bySku = Object.fromEntries(PRODUCTS.map((p) => [p.sku, p]));
const SKU = (name) => PRODUCTS.find((p) => p.name === name).sku;

const DEALERS = [
  { id: 'dl01', name: 'Baraka market', phone: '+998 93 555 12 34', note: 'Yunusobod', w: 0.22 },
  { id: 'dl02', name: 'Oila supermarket', phone: '+998 90 311 40 40', note: 'Chilonzor', w: 0.2 },
  { id: 'dl03', name: 'Akmal savdo', phone: '+998 90 123 45 67', note: 'Sergeli', w: 0.15 },
  { id: 'dl04', name: 'Dilshod aka', phone: '+998 97 700 88 11', note: 'Olmazor', w: 0.12 },
  { id: 'dl05', name: 'Farrux doʻkoni', phone: '+998 99 845 20 02', note: 'Mirobod', w: 0.11 },
  { id: 'dl06', name: 'Nodira opa', phone: '+998 94 610 77 30', note: 'Yashnobod', w: 0.1 },
  { id: 'dl07', name: 'Jasur (Bektemir)', phone: '+998 91 202 33 44', note: 'Bektemir', w: 0.1 },
];
// Diler narxlari: katta mijozlarga ulgurji narx
const DPRICES = {
  dl01: { [SKU('Sut 3,2% 1 l')]: 10500, [SKU('Qatiq 1 l')]: 11500, [SKU('Smetana 20% 400 g')]: 15200, [SKU('Qatiq 6 kg paqir')]: 60000, [SKU('Qatiq 10 kg paqir')]: 96000 },
  dl02: { [SKU('Sut 3,2% 1 l')]: 10500, [SKU('Qatiq 1 l')]: 11500, [SKU('Kefir 1 l')]: 12500, [SKU('Tvorog 9% 500 g')]: 21000 },
  dl03: { [SKU('Sut 3,2% 1 l')]: 10800, [SKU('Qatiq 0,5 l')]: 6800 },
};
const dealerPrice = (dl, sku) => (DPRICES[dl] && DPRICES[dl][sku] != null ? DPRICES[dl][sku] : bySku[sku].price);

const PEOPLE = [{ id: 'pp01', name: 'Aziz Karimov' }, { id: 'pp02', name: 'Sardor Rahimov' }, { id: 'pp03', name: 'Malika Yusupova' }];
const EXTRAS = [{ id: '1', name: 'Korzinka', price: 15000 }, { id: '2', name: '6kg paqir', price: 8000 }, { id: '3', name: '10kg paqir', price: 10000 }, { id: '4', name: '15kg paqir', price: 12000 }];
const DEVICES = {
  me: { id: 'k7m2', name: 'Rahbar telefoni', role: 'admin', app: 'android' },
  pc: { id: 'w3pc', name: 'Ombor kompyuteri', role: 'admin', app: 'windows' },
  ph: { id: 'a9x4', name: 'Omborchi telefoni', role: 'store', app: 'android' },
  tb: { id: 'b5t8', name: 'Yuklash planshet', role: 'store', app: 'web' },
  old: { id: 'q1z0', name: 'Eski telefon', role: 'store', app: 'android' },
};

const WD_FACTOR = [0.72, 1.05, 1.0, 1.0, 1.06, 1.16, 1.2]; // yakshanba..shanba

function build() {
  const fs = {};
  const sales = {}; // docId -> {day, dev, r}
  const moves = {};
  const seq = {};    // dev|day -> n
  const push = (col, devId, day, rec) => { const id = `${day}_${devId}_0`; (col[id] = col[id] || { day, dev: devId, r: [] }).r.push(rec); };
  const recId = (dev, day) => { const k = dev.id + '|' + day; seq[k] = (seq[k] || 0) + 1; return `${dev.id.toUpperCase()}-${mmdd(day)}-${String(seq[k]).padStart(4, '0')}`; };

  const start = addDays(TODAY, -DAYS);
  const stock = {};
  const opening = {};
  PRODUCTS.forEach((p) => { opening[p.sku] = p.unit === 'kg' ? Math.round(p.demand * 0.9 * 2) / 2 : Math.round(p.demand * 0.9); stock[p.sku] = opening[p.sku]; });
  const target = (p, day) => { const v = p.demand * 1.28 * (wd(day) === 6 ? 1.1 : 1); return p.unit === 'kg' ? Math.round(v * 2) / 2 : Math.round(v); };

  // Bugun ertalab kirim qilinmagan (qoldig'i kam yoki tugagan) mahsulotlar
  const skipToday = new Set([SKU('Kefir 1 l'), SKU('Qaymoq 200 g'), SKU('Pishloq Gollandskiy'), SKU('Kurt 100 g')]);
  const skipYesterday = new Set([SKU('Kurt 100 g')]);

  for (let day = start; day <= TODAY; day = addDays(day, 1)) {
    const isToday = day === TODAY;
    const w = wd(day);
    // --- ertalabki kirim (zavoddan)
    const recvBy = PEOPLE[rnd() < 0.6 ? 0 : 1];
    let mm = 32;
    for (const p of PRODUCTS) {
      if ((isToday && skipToday.has(p.sku)) || (day === addDays(TODAY, -1) && skipYesterday.has(p.sku))) continue;
      const need = round3(target(p, day) - stock[p.sku]);
      if (need <= 0) continue;
      const q = p.unit === 'kg' ? Math.round(need * 2) / 2 : Math.round(need);
      const t = iso(day, 6, mm++, Math.floor(rnd() * 50));
      push(moves, DEVICES.pc.id, day, { id: uid(t), t, sku: p.sku, d: q, why: 'receive', note: 'Zavoddan · 01 B 345 CA', by: recvBy.name, dev: DEVICES.pc.name });
      stock[p.sku] = round3(stock[p.sku] + q);
    }

    // --- dilerlarga sotuv
    const factor = WD_FACTOR[w] * (0.93 + rnd() * 0.14);
    const nRec = w === 0 ? 6 : 9 + Math.floor(rnd() * 4);
    const endMin = isToday ? (NOW.h * 60 + NOW.m - 22) : 18 * 60 + 40;
    const share = isToday ? 0.74 : 1;
    const times = [];
    for (let i = 0; i < nRec; i++) times.push(7 * 60 + 20 + Math.floor(rnd() * (endMin - 7 * 60 - 20)));
    times.sort((a, b) => a - b);
    const recs = times.map((tm) => ({ dealer: pick(DEALERS, (d) => d.w), tm, lines: {} }));
    for (const p of PRODUCTS) {
      let qty = p.demand * factor * share * (0.9 + rnd() * 0.2);
      qty = Math.min(qty, Math.max(0, stock[p.sku] - (p.unit === 'kg' ? 0.5 : 1) * (isToday ? 3 : 0)));
      qty = p.unit === 'kg' ? Math.floor(qty * 2) / 2 : Math.floor(qty);
      if (qty <= 0) continue;
      const prob = p.demand < 20 ? 0.35 : 0.68;
      let inc = recs.filter(() => rnd() < prob);
      if (!inc.length) inc = [recs[Math.floor(rnd() * recs.length)]];
      const ws = inc.map((r) => r.dealer.w * (0.6 + rnd() * 0.8));
      const sw = ws.reduce((a, b) => a + b, 0);
      let left = qty;
      inc.forEach((r, i) => {
        let q = i === inc.length - 1 ? left : qty * ws[i] / sw;
        q = p.unit === 'kg' ? Math.round(q * 2) / 2 : Math.round(q);
        q = Math.min(q, left);
        if (q > 0) { r.lines[p.sku] = q; left = round3(left - q); }
      });
    }
    let nInDay = 0;
    for (const r of recs) {
      const skus = Object.keys(r.lines);
      if (!skus.length) continue;
      const dev = rnd() < 0.7 ? DEVICES.ph : DEVICES.pc;
      const by = PEOPLE[nInDay++ % 3 === 2 ? 2 : (rnd() < 0.5 ? 0 : 1)];
      const t = iso(day, Math.floor(r.tm / 60), r.tm % 60, Math.floor(rnd() * 59));
      const items = skus.map((s) => ({ s, n: bySku[s].name, q: r.lines[s], p: dealerPrice(r.dealer.id, s), u: bySku[s].unit }));
      const sub = items.reduce((a, i) => a + i.q * i.p, 0);
      const exItems = [];
      if (rnd() < 0.45) exItems.push({ s: '_extra_1', n: 'Korzinka', q: 2 + Math.floor(rnd() * 6), p: 15000, k: 0, u: 'ea' });
      const p6 = r.lines[SKU('Qatiq 6 kg paqir')], p10 = r.lines[SKU('Qatiq 10 kg paqir')];
      if (p6) exItems.push({ s: '_extra_2', n: '6kg paqir', q: p6, p: 8000, k: 0, u: 'ea' });
      if (p10) exItems.push({ s: '_extra_3', n: '10kg paqir', q: p10, p: 10000, k: 0, u: 'ea' });
      const extras = exItems.reduce((a, i) => a + i.q * i.p, 0);
      const note = rnd() < 0.3 ? ['Mashina 01 A 777 AA', 'Ertalabki reys', 'Haydovchi: Bobur', 'Mashina 10 S 214 BA'][Math.floor(rnd() * 4)] : '';
      push(sales, dev.id, day, { id: recId(dev, day), t, dev: dev.name, items: items.concat(exItems), sub, disc: 0, tax: 0, extras, total: sub + extras, dealer: r.dealer.id, dealerName: r.dealer.name, by: by.name, byId: by.id, note });
      for (const s of skus) stock[s] = round3(stock[s] - r.lines[s]);
    }

    // --- dilerdan qaytgan va muddati o'tgan mahsulotlar (har 2-3 kunda va bugun)
    if (isToday || rnd() < 0.4) {
      const dl = isToday ? DEALERS[2] : pick(DEALERS, (d) => d.w);
      const dev = DEVICES.ph, by = PEOPLE[1];
      const tm = isToday ? 15 * 60 + 12 : 16 * 60 + Math.floor(rnd() * 120);
      const t = iso(day, Math.floor(tm / 60), tm % 60, 21);
      const ret = isToday ? [[SKU('Qatiq 0,5 l'), 6], [SKU('Yogurt mevali 125 g'), 12]] : [[pick(PRODUCTS.slice(0, 4), () => 1).sku, 2 + Math.floor(rnd() * 6)]];
      const exp = isToday ? [[SKU('Smetana 20% 400 g'), 3], [SKU('Tvorog 9% 500 g'), 2]] : (rnd() < 0.6 ? [[pick(PRODUCTS.slice(6, 11), () => 1).sku, 1 + Math.floor(rnd() * 3)]] : []);
      const asItems = (L) => L.map(([s, q]) => ({ s, n: bySku[s].name, q: -q, p: dealerPrice(dl.id, s), u: bySku[s].unit }));
      const retItems = asItems(ret).concat(isToday ? [{ s: '_extra_1', n: 'Korzinka', q: -4, p: 15000, k: 0, u: 'ea' }] : []);
      const tot = (L) => L.reduce((a, i) => a + i.q * i.p, 0);
      push(sales, dev.id, day, { id: recId(dev, day), t, dev: dev.name, items: retItems, sub: tot(retItems), disc: 0, tax: 0, extras: 0, total: tot(retItems), dealer: dl.id, dealerName: dl.name, dealerMove: 'return', by: by.name, byId: by.id, note: '' });
      for (const [s, q] of ret) stock[s] = round3(stock[s] + q);
      if (exp.length) {
        const ei = asItems(exp), id = recId(dev, day);
        push(sales, dev.id, day, { id, t, dev: dev.name, items: ei, sub: tot(ei), disc: 0, tax: 0, extras: 0, total: tot(ei), dealer: dl.id, dealerName: dl.name, dealerMove: 'expired', by: by.name, byId: by.id, note: '' });
        for (const [s, q] of exp) push(moves, dev.id, day, { id: uid(t), t, sku: s, d: -q, why: 'waste', note: `Muddati oʻtgan — ${dl.name} tomonidan qaytarildi`, by: by.name, dev: dev.name, src: id });
      }
    }

    // --- yakshanba kechqurun sanoq, ba'zan shikastlangan qadoqni hisobdan chiqarish
    if (w === 0 && !isToday) {
      const by = PEOPLE[2];
      for (const p of PRODUCTS.slice(0, 10)) {
        if (rnd() > 0.35) continue;
        const cur = stock[p.sku], diff = (rnd() < 0.5 ? -1 : 1) * (1 + Math.floor(rnd() * 2));
        const counted = Math.max(0, cur + diff), t = iso(day, 19, 5 + Math.floor(rnd() * 30));
        push(moves, DEVICES.pc.id, day, { id: uid(t), t, sku: p.sku, d: round3(counted - cur), why: 'count', note: `sanaldi ${counted}, tizimda ${cur}`, by: by.name, dev: DEVICES.pc.name });
        stock[p.sku] = counted;
      }
    }
    if (rnd() < 0.25 && !isToday) {
      const p = pick(PRODUCTS.slice(0, 10), () => 1), q = 1 + Math.floor(rnd() * 3), t = iso(day, 12, 10 + Math.floor(rnd() * 40));
      push(moves, DEVICES.pc.id, day, { id: uid(t), t, sku: p.sku, d: -q, why: 'waste', note: 'Shikastlangan qadoq', by: PEOPLE[0].name, dev: DEVICES.pc.name });
      stock[p.sku] = round3(stock[p.sku] - q);
    }
  }

  // --- audit: kecha tahrirlangan chek va ikki marta kiritilgan (o'chirilgan) chek
  const y = addDays(TODAY, -1);
  const yDocs = Object.values(sales).filter((d) => d.day === y);
  const yRecs = yDocs.flatMap((d) => d.r).filter((r) => !r.dealerMove);
  const audit = {};
  const auditPush = (e) => push(audit, DEVICES.pc.id, dayOfIso(e.t), e);
  const edited = yRecs.find((r) => r.items.some((i) => i.s === SKU('Qatiq 1 l') && i.q >= 20));
  if (edited) {
    const it = edited.items.find((i) => i.s === SKU('Qatiq 1 l'));
    const before = { q: it.q, total: edited.total };
    it.q = it.q - 6;
    const d = -6 * it.p; edited.sub += d; edited.total += d;
    const et = iso(y, 19, 12); edited.ed = { t: et, dev: DEVICES.pc.name };
    stock[it.s] += 6;
    auditPush({ id: uid(et), t: et, dev: DEVICES.pc.name, act: 'edit', kind: 'sale', ref: edited.id, refT: edited.t, title: [edited.id, 'Sotuv', edited.dealerName, fmt(edited.total)].join(' · '),
      changes: [{ w: it.n, a: `${before.q} ta × ${fmt(it.p)}`, b: `${it.q} ta × ${fmt(it.p)}` }, { w: 'Jami', a: fmt(before.total), b: fmt(edited.total) }] });
  }
  const dup = yRecs.filter((r) => r !== edited).slice(-2)[0];
  if (dup) {
    const dt = iso(y, 19, 20), note = 'Ikki marta kiritilgan';
    dup.del = { t: dt, dev: DEVICES.pc.name, note };
    for (const i of dup.items) if (bySku[i.s]) stock[i.s] = round3(stock[i.s] + i.q);
    auditPush({ id: uid(dt), t: dt, dev: DEVICES.pc.name, act: 'delete', kind: 'sale', ref: dup.id, refT: dup.t, title: [dup.id, 'Sotuv', dup.dealerName, fmt(dup.total)].join(' · '), note });
  }

  // --- hujjatlarni yig'ish
  fs['meta/settings'] = { store: 'Markaziy ombor', cur: "so'm", tax: 0, taxIncl: false, footer: 'Hamkorligingiz uchun rahmat!', baseAt: '', baseDay: '0000-00-00', extras: EXTRAS };
  fs['meta/dealers'] = { list: DEALERS.map(({ w, ...d }) => ({ ...d, arch: 0 })) };
  fs['meta/people'] = { list: PEOPLE };
  for (const id in DPRICES) fs['dprices/' + id] = { p: DPRICES[id] };
  for (const p of PRODUCTS) {
    const cid = chunkOf(p.sku);
    const doc = fs['products/' + cid] = fs['products/' + cid] || { items: {} };
    doc.items[p.sku] = { s: p.sku, n: p.name, c: p.cat, p: p.price, k: p.cost, q: opening[p.sku], m: p.min, u: p.unit, a: 0 };
  }
  for (const id in sales) fs['sales/' + id] = sales[id];
  for (const id in moves) fs['stockmoves/' + id] = moves[id];
  for (const id in audit) fs['audit/' + id] = audit[id];
  const at = (h, m) => iso(TODAY, h, m);
  fs['devices/' + DEVICES.pc.id] = { ...DEVICES.pc, ver: '1.9.1', first: iso('2026-08-12', 9, 30), last: at(17, 39) };
  fs['devices/' + DEVICES.ph.id] = { ...DEVICES.ph, ver: '1.9.1', first: iso('2026-08-12', 10, 5), last: at(17, 37) };
  fs['devices/' + DEVICES.tb.id] = { ...DEVICES.tb, ver: '1.9.1', first: iso('2026-09-03', 8, 40), last: at(15, 10) };
  fs['devices/' + DEVICES.old.id] = { ...DEVICES.old, ver: '1.8.0', first: iso('2026-08-14', 11, 0), last: iso('2026-09-19', 18, 2), revoked: true, revAt: iso('2026-09-20', 9, 15), revBy: DEVICES.pc.name };

  const pin = (p) => { const salt = crypto.randomBytes(16).toString('hex'); return { salt, hash: crypto.createHash('sha256').update(salt + ':' + p).digest('hex'), len: p.length }; };
  const ls = {
    st_lang: 'uz', st_dev: DEVICES.me.id, st_devname: DEVICES.me.name, st_dev_first: iso('2026-08-12', 9, 0),
    st_role: 'admin', st_pins: { admin: pin('1234'), store: pin('5678') }, st_tab: 'dash',
    st_fbconfig: { apiKey: 'demo-key', projectId: 'markaziy-ombor', appId: 'demo' },
    st_seq: { d: mmdd(TODAY), n: 0 },
  };
  return { fs, ls, stock, PRODUCTS, DEALERS, PEOPLE, TODAY, NOW };
}

function dayOfIso(t) { return new Date(Date.parse(t) + TZ_MIN * 60000).toISOString().slice(0, 10); }
// StockTill bilan bir xil: enc(sku) va mahsulot bo'lagi (c00..c63)
function chunkOf(sku) {
  const pid = String(sku).trim().toLowerCase().replace(/[^a-z0-9_-]/g, (c) => '~' + c.charCodeAt(0).toString(16) + '~').slice(0, 160);
  let h = 5381;
  for (let i = 0; i < pid.length; i++) h = ((h * 33) ^ pid.charCodeAt(i)) >>> 0;
  return 'c' + String(h % 64).padStart(2, '0');
}

module.exports = { build };

if (require.main === module) {
  const { fs, stock, PRODUCTS: P } = build();
  const n = (col) => Object.keys(fs).filter((k) => k.startsWith(col + '/')).length;
  console.log('sales docs', n('sales'), 'moves docs', n('stockmoves'), 'audit', n('audit'));
  const recs = Object.keys(fs).filter((k) => k.startsWith('sales/')).flatMap((k) => fs[k].r);
  console.log('receipts', recs.length, 'today', recs.filter((r) => r.t.startsWith('2026-10-02')).length);
  for (const p of P) console.log(p.name.padEnd(22), String(stock[p.sku]).padStart(7), 'min', p.min);
}
