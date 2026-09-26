/* ============ Doimiylar ============ */
const ROLES = { admin: 'Administrator', manager: 'Do‘kon mudiri', cashier: 'Kassir', viewer: 'Kuzatuvchi' };
const METHODS = [
  { k: 'cash', n: 'Naqd' }, { k: 'uzcard', n: 'Uzcard' }, { k: 'humo', n: 'Humo' },
  { k: 'click', n: 'Click' }, { k: 'payme', n: 'Payme' }, { k: 'nasiya', n: 'Nasiya' }
];
const MK = METHODS.map(m => m.k);
const mname = k => (METHODS.find(m => m.k === k) || { n: k }).n;
const MOVE = { collection: 'Inkassatsiya', expense: 'Xarajat', float_in: 'Maydalik kiritish' };
const DENOMS = [200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100];
const CAT_COLORS = ['#C98A1B', '#0F7F73', '#3E86C8', '#5E9E3A', '#B8508A', '#7B5BA6', '#8A6A4A', '#D0673A', '#2E9E9A', '#6A7FD1'];
const GENESIS = '0000000000000000';
const CHUNK_MAX = 190000;
const LIVE_DAYS = 3;
const OWN_KEEP_DAYS = 3;
const PSHARD_MAX = 1100;
const UNITS = ['dona', 'kg', 'l', 'm', 'quti'];

function defaultSettings() {
  return {
    discLimit: 5, varLimit: 5000, voidAlert: 3, varStreak: 2, maxShiftH: 14, lockMin: 5,
    methods: { uzcard: true, humo: true, click: true, payme: true, nasiya: true },
    debtLimit: 2000000, refundDays: 14, keepDays: 180,
    footer: 'Xaridingiz uchun rahmat!'
  };
}
function normMain(m) {
  m = Object.assign({ shop: { name: 'Do‘kon' }, stores: [], cats: [], blocked: [], demo: false }, m || {});
  m.settings = Object.assign(defaultSettings(), m.settings || {});
  m.settings.methods = Object.assign(defaultSettings().methods, m.settings.methods || {});
  if (!Array.isArray(m.stores)) m.stores = [];
  if (!Array.isArray(m.cats)) m.cats = [];
  if (!Array.isArray(m.blocked)) m.blocked = [];
  return m;
}

/* ============ Holat ============ */
const S = {
  mode: null, db: null, userNs: null, dl: null, isOwner: false, canWrite: null, readOnly: false,
  net: 'connecting', writeDenied: false, quota: false, storageFull: false, revoked: false, lastErr: '',
  cfg: null, cfgReady: false, pshards: new Map(), pins: {}, pinsReady: false,
  devs: new Map(), devsReady: false,
  live: new Map(), docEv: new Map(), liveFrom: addD(today(), -(LIVE_DAYS - 1)), liveReady: false, liveDay: today(),
  rng: new Map(), rngEv: new Map(), rngDocEv: new Map(),
  sums: new Map(), sumDays: new Map(),
  cust: new Map(), custReady: false, debt: new Map(),
  dev: LS.get('dev', null), ctr: LS.get('ctr', null), q: LS.get('q', []), own: LS.get('own', []), dq: LS.get('dq', {}), cq: LS.get('cq', []),
  sumDirty: new Set(LS.get('sd', [])),
  devPending: !!LS.get('devp', false),
  cart: LS.get('cart', null) || { items: [], disc: null },
  seen: num(LS.get('seen', 0)), prevSeen: 0,
  wit: LS.get('wit', {}),
  tabId: uid(10), passive: false,
  user: null, view: null, modals: [], last: Date.now(), busy: '',
  ui: {
    q: '', cat: 'fav', rtab: 'shift', rq: '', rep: 'shifts', from: null, to: null, day: today(), store: 'all',
    pin: '', pinErr: '', who: null, checking: false, cartOpen: false, close: null, cfg: null, pq: '', pcat: 'all',
    jd: today(), jt: 'all', ju: 'all', jdev: 'all', af: 'all', cq: '', more: false, ocash: '',
    onb: null, conn: null, expC: null
  }
};
if (!Array.isArray(S.q)) S.q = [];
if (!Array.isArray(S.own)) S.own = [];
if (!S.dq || typeof S.dq !== 'object') S.dq = {};
if (!Array.isArray(S.cq)) S.cq = [];

const CFG = () => (S.cfg ? S.cfg.main.settings : defaultSettings());
const STORES = () => (S.cfg ? S.cfg.main.stores : []);
const STAFF = () => (S.cfg ? S.cfg.staff : []);
const PRODUCTS = () => (S.cfg ? S.cfg.products : []);
const U = id => STAFF().find(u => u.id === id);
const uname = id => (U(id) || {}).name || (id ? 'Noma’lum' : '—');
const ST = id => STORES().find(s => s.id === id);
const sname = id => (ST(id) || {}).name || '—';
const DV = id => S.devs.get(id) || (S.dev && S.dev.id === id ? S.dev : null);
const dname = id => (DV(id) || {}).name || 'Qurilma';
const PR = id => PRODUCTS().find(p => p.id === id);
const canStore = (u, st) => !!u && (u.role === 'admin' || !u.stores || !u.stores.length || u.stores.includes(st));
const isCashDev = () => !!S.dev && S.dev.type === 'cashier';
const isBoss = u => !!u && (u.role === 'admin' || u.role === 'manager');
const myStores = () => STORES().filter(s => canStore(S.user, s.id));
const activeMethods = () => METHODS.filter(m => m.k === 'cash' || CFG().methods[m.k]);
const catColor = c => { const cats = S.cfg ? S.cfg.main.cats : []; return CAT_COLORS[Math.max(0, cats.indexOf(c)) % CAT_COLORS.length]; };
const nasiyaPart = pays => (pays || []).filter(p => p.m === 'nasiya').reduce((s, p) => s + num(p.a), 0);
/* isOwner noma'lum (null) bo'lsa urinib ko'riladi: bazaning qoidalari baribir tekshiradi */
const canAdminCfg = () => S.mode === 'local' || S.isOwner !== false;
const devBlocked = () => !!(S.cfg && S.dev && S.cfg.main.blocked.includes(S.dev.id));

/* ============ Yozuvlar zanjiri ============ */
const evHash = e => { const o = Object.assign({}, e); delete o.h; return sha256hex((e.ph || GENESIS) + '\n' + canon(o)).slice(0, 32); };
const hashMemo = new WeakMap();
const hashOk = e => { let v = hashMemo.get(e); if (v === undefined) { v = evHash(e) === e.h; hashMemo.set(e, v); } return v; };

function reconcileCtr() {
  const c = Object.assign({ seq: 0, h: GENESIS, ts: 0, rec: 0, ck: null }, S.ctr || {});
  if (S.dev) {
    let top = null;
    for (const e of S.own.concat(S.q)) {
      if (e.dev !== S.dev.id) continue;
      if (!top || e.seq > top.seq) top = e;
      if (e.t === 'sale' && e.r && num(e.r.rn) > c.rec) c.rec = num(e.r.rn);
    }
    if (top && top.seq >= c.seq) {
      c.seq = top.seq; c.h = top.h; c.ts = Math.max(c.ts, top.ts);
      if (top.c) {
        const [d, k] = top.c.split('~');
        const b = S.own.concat(S.q).filter(e => e.c === top.c).reduce((s, e) => s + byteLen(JSON.stringify(e)) + 20, 0);
        if (!c.ck || c.ck.day !== d || c.ck.k < +k) c.ck = { day: d, k: +k, b };
      }
    }
  }
  S.ctr = c;
}

/* Yangi yozuv: zanjirga qo'shiladi, avval qurilmaga saqlanadi, keyin bazaga yuboriladi */
function emit(t, data, ctrPatch) {
  if (!S.dev || S.passive) return null;
  const ts = Math.max(Date.now(), num(S.ctr.ts) + 1);
  const e = Object.assign({ id: uid(16), t, ts, day: dkey(ts), dev: S.dev.id, store: S.dev.store, user: S.user ? S.user.id : null, seq: num(S.ctr.seq) + 1, ph: S.ctr.h || GENESIS }, data || {});
  const size = byteLen(JSON.stringify(e)) + 90;
  let ck = S.ctr.ck && S.ctr.ck.day === e.day ? S.ctr.ck : { day: e.day, k: 0, b: 0 };
  if (ck.b + size > CHUNK_MAX) ck = { day: e.day, k: ck.k + 1, b: 0 };
  ck = { day: ck.day, k: ck.k, b: ck.b + size };
  e.c = ck.day + '~' + ck.k;
  e.h = evHash(e);
  const nq = S.q.concat([e]);
  if (!saveCritical('q', nq)) {
    toast('Qurilma xotirasi to‘lgan, yozuv saqlanmadi. Internetni ulang va yozuvlar yuborilishini kuting.', 'bad');
    renderStatus();
    return null;
  }
  S.q = nq;
  S.ctr = Object.assign({}, S.ctr, { seq: e.seq, h: e.h, ts, ck }, ctrPatch || {});
  saveCritical('ctr', S.ctr);
  debtFromEvent(e);
  S.sumDirty.add(e.day); saveSoft('sd', [...S.sumDirty]);
  invalidate();
  schedulePush();
  return e;
}

/* Nasiya daftari: qarzga ta'sir qiladigan yozuvlar oylik hujjatga ham tushadi */
function debtItemsOf(e) {
  const base = { id: e.id, ts: e.ts, u: e.user, st: e.store, dev: e.dev };
  if (e.t === 'sale' && e.r && e.r.cust) { const a = nasiyaPart(e.r.pays); if (a) return [Object.assign({ cust: e.r.cust, a, k: 'sale', no: e.r.no }, base)]; }
  if ((e.t === 'void' || e.t === 'refund') && e.cust) { const a = nasiyaPart(e.pays); if (a) return [Object.assign({ cust: e.cust, a: -a, k: e.t, no: e.no }, base)]; }
  if (e.t === 'debt_pay') return [Object.assign({ cust: e.cust, a: -num(e.amount), k: 'pay', m: e.m }, base)];
  if (e.t === 'debt_adj') return [Object.assign({ cust: e.cust, a: num(e.amount), k: 'adj', note: e.reason }, base)];
  return [];
}
function debtFromEvent(e) {
  const items = debtItemsOf(e);
  if (!items.length) return;
  const m = mkey(e.day), d = S.dq[m] || { items: [], dirty: true };
  d.items = d.items.concat(items); d.dirty = true; S.dq[m] = d;
  saveCritical('dq', S.dq);
}

/* ============ Bazaga yuborish ============ */
let pushing = false, pushTimer = null, backoff = 0, lastSumFlush = 0;
function schedulePush(delay) { clearTimeout(pushTimer); pushTimer = setTimeout(pushNow, delay == null ? 500 : delay); }
const dbErrCode = err => (err && err.code) || 'unavailable';
function handleDbErr(err, where) {
  const c = dbErrCode(err);
  S.lastErr = (where || '') + ': ' + c + (err && err.message ? ' (' + err.message + ')' : '');
  if (c === 'invalid_argument' || c === 'transform_error') { S.writeDenied = true; S.net = 'denied'; }
  else if (c === 'quota_exceeded') { S.quota = true; S.net = 'offline'; }
  else if (c === 'revoked' || c === 'not_granted' || c === 'capability_disabled' || c === 'capability_removed') { S.revoked = true; S.net = 'revoked'; }
  else S.net = 'offline';
  return c;
}
async function dbSet(path, body) { return withTimeout(S.db.doc(path).set(body), 25000); }
async function dbDel(path) { return withTimeout(S.db.doc(path).delete(), 25000); }

function pendingCount() {
  let n = S.q.length + S.cq.length;
  for (const m in S.dq) if (S.dq[m].dirty) n++;
  if (S.devPending) n++;
  return n;
}
async function pushNow() {
  if (pushing || !S.db || S.passive || S.writeDenied || S.revoked || S.readOnly) return;
  if (navigator.onLine === false && S.mode === 'remote') { S.net = 'offline'; renderStatus(); return; }
  const sumsDue = S.sumDirty.size && (Date.now() - lastSumFlush > 90000 || S.flushSumsNow);
  if (!pendingCount() && !sumsDue) return;
  pushing = true; renderStatus();
  try {
    if (S.devPending && S.dev) { await dbSet('dev/' + S.dev.id, devDoc(S.dev)); S.devPending = false; LS.del('devp'); }
    while (S.cq.length) {
      const c = S.cq[0];
      await dbSet('cust/' + c.id, c);
      S.cq = S.cq.filter(x => x !== c); saveCritical('cq', S.cq);
    }
    while (S.q.length) {
      const c = S.q[0].c;
      const all = S.own.concat(S.q).filter(e => e.c === c && e.dev === S.dev.id).sort((a, b) => a.seq - b.seq);
      const [day, k] = c.split('~');
      await dbSet('ev/' + S.dev.id + '~' + c, { dev: S.dev.id, store: S.dev.store, day, k: +k, n: all.length, s0: all[0].seq, s1: all[all.length - 1].seq, events: all });
      const ids = new Set(all.map(e => e.id));
      const moved = S.q.filter(e => ids.has(e.id));
      S.q = S.q.filter(e => !ids.has(e.id));
      S.own = S.own.concat(moved);
      saveCritical('q', S.q);
      saveSoft('own', S.own);
    }
    for (const m of Object.keys(S.dq).sort()) {
      const d = S.dq[m]; if (!d.dirty) continue;
      await dbSet('debt/' + S.dev.id + '~' + m, { dev: S.dev.id, store: S.dev.store, month: m, items: d.items });
      if (S.dq[m] === d) { d.dirty = false; saveCritical('dq', S.dq); }
    }
    if (S.sumDirty.size && (Date.now() - lastSumFlush > 90000 || S.flushSumsNow)) {
      for (const day of [...S.sumDirty].sort()) {
        const body = buildSum(day);
        if (body) await dbSet('sum/' + S.dev.id + '~' + day, body);
        S.sumDirty.delete(day); saveSoft('sd', [...S.sumDirty]);
      }
      lastSumFlush = Date.now(); S.flushSumsNow = false;
    }
    S.net = S.mode === 'local' ? 'local' : 'online'; backoff = 0; S.quota = false;
    pruneLocal();
  } catch (err) {
    const c = handleDbErr(err, 'push');
    if (c !== 'invalid_argument' && c !== 'revoked' && c !== 'not_granted' && c !== 'quota_exceeded') { backoff = Math.min(60000, (backoff || 2500) * 2); schedulePush(backoff); }
    else if (c === 'quota_exceeded') schedulePush(60000);
  }
  pushing = false; renderStatus();
  if (S.q.length && !S.writeDenied && !S.revoked && S.net === 'online') schedulePush(300);
}
const devDoc = d => ({ id: d.id, name: d.name, type: d.type, store: d.store, code: num(d.code), inst: d.inst || null, at: d.at || Date.now(), by: d.by || null });

/* Qurilmada faqat kerakli yozuvlar qoladi: joriy bo'lak, ochiq smena va oxirgi kunlar */
function pruneLocal() {
  const keepFrom = addD(today(), -(OWN_KEEP_DAYS - 1));
  const curC = S.ctr && S.ctr.ck ? S.ctr.ck.day + '~' + S.ctr.ck.k : null;
  const qDays = new Set(S.q.map(e => e.day));
  /* ochiq smena kunlari to'liq saqlanadi (kun bo'yicha: kun yo to'liq bor, yo umuman yo'q) */
  const shDays = new Map(), open = new Set();
  for (const e of S.own.concat(S.q)) {
    if (!e.shift) continue;
    if (!shDays.has(e.shift)) shDays.set(e.shift, new Set());
    shDays.get(e.shift).add(e.day);
    if (e.t === 'shift_open') open.add(e.shift); else if (e.t === 'shift_close') open.delete(e.shift);
  }
  const openDays = new Set(); for (const s of open) for (const d of shDays.get(s) || []) openDays.add(d);
  const keep = S.own.filter(e => e.day >= keepFrom || e.c === curC || qDays.has(e.day) || S.sumDirty.has(e.day) || openDays.has(e.day));
  if (keep.length !== S.own.length) { S.own = keep; saveSoft('own', S.own); invalidate(); }
  const mKeep = mkey(addD(today(), -95));
  let ch = false;
  for (const m of Object.keys(S.dq)) if (!S.dq[m].dirty && m < mKeep) { delete S.dq[m]; ch = true; }
  if (ch) saveCritical('dq', S.dq);
}
/* Xotira to'lganda: keraksiz nusxalar olib tashlanadi */
function evictCaches(level) {
  LS.del('cfgc_old');
  if (level >= 1) {
    const curC = S.ctr && S.ctr.ck ? S.ctr.ck.day + '~' + S.ctr.ck.k : null;
    const t = today(), qDays = new Set(S.q.map(e => e.day));
    S.own = S.own.filter(e => e.day === t || e.c === curC || qDays.has(e.day));
    try { localStorage.setItem(LSP + 'own', JSON.stringify(S.own)); } catch (e) { LS.del('own'); }
  }
  if (level >= 2) { LS.del('wit'); LS.del('cfgc'); }
}

/* Kunlik xulosa (hisobotlar uchun kichik hujjat) */
function buildSum(day) {
  if (!S.dev) return null;
  const evs = S.own.concat(S.q).filter(e => e.day === day && e.dev === S.dev.id).sort((a, b) => a.seq - b.seq);
  if (!evs.length) return null;
  const A = accumulate(evs, true);
  let r0 = 0, r1 = 0;
  for (const e of evs) if (e.t === 'sale' && e.r) { const n = num(e.r.rn); if (!r0 || n < r0) r0 = n; if (n > r1) r1 = n; }
  const agg = A.days.get(S.dev.store + '|' + day) || newAgg();
  trimItems(agg, 40);
  return { dev: S.dev.id, store: S.dev.store, day, s0: evs[0].seq, s1: evs[evs.length - 1].seq, r0, r1, agg, shifts: [...A.shifts.values()], at: Date.now() };
}

/* ============ Bazadan o'qish (obunalar) ============ */
const subs = {};
function unsubAll() { for (const k in subs) { try { subs[k](); } catch (e) { } delete subs[k]; } }
function subErr(name) {
  return err => {
    const c = dbErrCode(err);
    S.lastErr = 'sub ' + name + ': ' + c;
    if (c === 'revoked' || c === 'not_granted' || c === 'capability_disabled' || c === 'capability_removed') { S.revoked = true; S.net = 'revoked'; renderStatus(); render(); return; }
    delete subs[name];
    setTimeout(() => { if (S.db && !S.revoked && !subs[name]) subscribeOne(name); }, c === 'resource_exhausted' ? 30000 : 6000);
  };
}
function subscribeOne(name) {
  const db = S.db; if (!db) return;
  try {
    if (name === 'cfg') subs.cfg = db.collection('cfg').onSnapshot(onCfgSnap, subErr('cfg'));
    if (name === 'pins') subs.pins = db.doc('sec/pins').onSnapshot(onPinsSnap, subErr('pins'));
    if (name === 'dev') subs.dev = db.collection('dev').onSnapshot(onDevSnap, subErr('dev'));
    if (name === 'ev') subs.ev = db.collection('ev').where('day', '>=', S.liveFrom).onSnapshot(onEvSnap, subErr('ev'));
    if (name === 'cust') subs.cust = db.collection('cust').onSnapshot(onCustSnap, subErr('cust'));
    if (name === 'debt') subs.debt = db.collection('debt').onSnapshot(onDebtSnap, subErr('debt'));
  } catch (e) { S.lastErr = 'subscribe ' + name + ': ' + (e && e.message); }
}
function subscribeAll() { unsubAll(); ['cfg', 'pins', 'dev', 'ev', 'cust', 'debt'].forEach(subscribeOne); }

function onCfgSnap(snap) {
  let main = null, staff = null; const pd = new Map();
  for (const d of snap.docs) { const x = d.data(); if (d.id === 'main') main = x; else if (d.id === 'staff') staff = x; else if (d.id.startsWith('p-')) pd.set(d.id, x); }
  applyCfg(main, staff, pd);
  if (main) saveSoft('cfgc', { main, staff, pd: [...pd.entries()] });
  else LS.del('cfgc');
  S.cfgReady = true;
  if (S.net === 'connecting') S.net = S.mode === 'local' ? 'local' : 'online';
  afterCfg();
  invalidate(); renderSoon(true);
}
function applyCfg(main, staff, pd) {
  if (!main) { S.cfg = null; S.pshards = new Map(); return; }
  const shards = new Map([...pd.entries()].sort((a, b) => num(a[0].slice(2)) - num(b[0].slice(2))));
  const products = [];
  for (const [, x] of shards) for (const p of (x.items || [])) if (p && p.id) products.push(p);
  const list = (staff && Array.isArray(staff.list) ? staff.list : []).filter(u => u && u.id);
  S.cfg = { main: normMain(main), staff: list, products };
  S.pshards = shards;
  if (S.user && !S.readOnly) { const u = U(S.user.id); if (!u || !u.active) { S.user = null; S.modals = []; } else S.user = clone(u); }
}
function onPinsSnap(snap) { S.pins = (snap.exists && snap.data().pins) || {}; S.pinsReady = true; saveSoft('pinsc', S.pins); renderSoon(); }
function onDevSnap(snap) {
  const m = new Map(); for (const d of snap.docs) if (!d.id.startsWith('_')) m.set(d.id, d.data());
  S.devs = m; S.devsReady = true;
  if (S.dev && S.cfg && S.dev.inst === S.cfg.main.inst && !m.has(S.dev.id) && !S.devPending && S.canWrite !== false) { S.devPending = true; LS.set('devp', true); schedulePush(); }
  invalidate(); renderSoon();
}
function onEvSnap(snap) {
  for (const ch of snap.docChanges()) {
    const id = ch.doc.id, prev = S.docEv.get(id) || [];
    if (ch.type === 'removed') { for (const x of prev) S.live.delete(x); S.docEv.delete(id); continue; }
    const data = ch.doc.data() || {}, ids = [];
    for (const e of (Array.isArray(data.events) ? data.events : [])) if (e && typeof e === 'object' && e.id && e.t) { S.live.set(e.id, e); ids.push(e.id); }
    const now = new Set(ids);
    for (const x of prev) if (!now.has(x)) S.live.delete(x);
    S.docEv.set(id, ids);
  }
  S.liveReady = true;
  invalidate(); renderSoon();
}
function onCustSnap(snap) { const m = new Map(); for (const d of snap.docs) m.set(d.id, d.data()); S.cust = m; S.custReady = true; invalidate(); renderSoon(); }
/* Mijozlar: bazadagilar + hali yuborilmaganlari */
function custGet(id) { return S.cust.get(id) || S.cq.find(c => c.id === id) || null; }
function allCustomers() { const m = new Map(S.cust); for (const c of S.cq) if (!m.has(c.id)) m.set(c.id, c); return [...m.values()]; }
function addCustomer(o) {
  const c = { id: 'c' + uid(10), name: o.name, phone: o.phone || '', note: o.note || '', at: Date.now(), by: S.user ? S.user.id : null, st: S.dev ? S.dev.store : null };
  const nq = S.cq.concat([c]);
  if (!saveCritical('cq', nq)) return null;
  S.cq = nq;
  emit('cust_add', { cust: c.id, name: c.name });
  invalidate(); schedulePush();
  return c;
}
function onDebtSnap(snap) { const m = new Map(); for (const d of snap.docs) m.set(d.id, d.data()); S.debt = m; invalidate(); renderSoon(); }

/* Kun almashsa, jonli oyna suriladi */
function checkDayChange() {
  const t = today();
  if (t === S.liveDay) return;
  S.liveDay = t; S.liveFrom = addD(t, -(LIVE_DAYS - 1));
  S.flushSumsNow = true; schedulePush(200);
  if (S.db && subs.ev) { try { subs.ev(); } catch (e) { } delete subs.ev; subscribeOne('ev'); }
  for (const [id, e] of S.live) if (e.day < S.liveFrom) S.live.delete(id);
  invalidate(); renderSoon();
}

/* ============ Oraliq ma'lumotlarini yuklash ============ */
/* Eski kunlar ma'lumoti 10 daqiqadan keyin qayta so'raladi: kechikib kelgan xulosalar ham ko'rinadi */
const RANGE_TTL = 10 * 60000;
const stale = s => !s || (s.st === 'err' && Date.now() - s.at > 20000) || (s.st === 'ok' && Date.now() - s.at > RANGE_TTL);
async function loadSums(from, to, force) {
  if (!S.db) return;
  const end = to < S.liveFrom ? to : addD(S.liveFrom, -1);
  const need = [];
  for (let d = from; d <= end; d = addD(d, 1)) { const s = S.sumDays.get(d); if (force ? !(s && s.st === 'loading') : stale(s)) need.push(d); }
  if (!need.length) return;
  need.forEach(d => S.sumDays.set(d, { st: 'loading', at: Date.now() }));
  try {
    const snap = await withTimeout(S.db.collection('sum').where('day', '>=', need[0]).where('day', '<=', need[need.length - 1]).get(), 30000);
    for (const d of snap.docs) S.sums.set(d.id, d.data());
    need.forEach(d => S.sumDays.set(d, { st: 'ok', at: Date.now() }));
  } catch (e) { need.forEach(d => S.sumDays.set(d, { st: 'err', at: Date.now() })); handleDbErr(e, 'sum'); }
  invalidate(); renderSoon();
}
async function loadRaw(from, to, force) {
  if (!S.db) return;
  const end = to < S.liveFrom ? to : addD(S.liveFrom, -1);
  const need = [];
  for (let d = from; d <= end; d = addD(d, 1)) { const s = S.rng.get(d); if (force ? !(s && s.st === 'loading') : stale(s)) need.push(d); }
  if (!need.length) return;
  need.forEach(d => S.rng.set(d, { st: 'loading', at: Date.now() }));
  try {
    const snap = await withTimeout(S.db.collection('ev').where('day', '>=', need[0]).where('day', '<=', need[need.length - 1]).get(), 30000);
    const seen = new Set();
    for (const d of snap.docs) {
      const data = d.data() || {}, ids = [];
      for (const e of (data.events || [])) if (e && e.id && e.t) { S.rngEv.set(e.id, e); ids.push(e.id); }
      const prev = S.rngDocEv.get(d.id) || []; const now = new Set(ids);
      for (const x of prev) if (!now.has(x)) S.rngEv.delete(x);
      S.rngDocEv.set(d.id, ids); seen.add(d.id);
    }
    /* o'chirilgan hujjatlar (masalan, tozalangan yoki buzilgan) keshdan ham olinadi */
    for (const [id, ids] of S.rngDocEv) { const day = (id.split('~')[1] || ''); if (day >= need[0] && day <= need[need.length - 1] && !seen.has(id)) { for (const x of ids) S.rngEv.delete(x); S.rngDocEv.delete(id); } }
    need.forEach(d => S.rng.set(d, { st: 'ok', at: Date.now() }));
  } catch (e) { need.forEach(d => S.rng.set(d, { st: 'err', at: Date.now() })); handleDbErr(e, 'raw'); }
  invalidate(); renderSoon();
}
const rawReady = day => day >= S.liveFrom ? S.liveReady : (S.rng.get(day) || {}).st === 'ok';
const sumReady = day => day >= S.liveFrom ? true : (S.sumDays.get(day) || {}).st === 'ok';

/* ============ Konfiguratsiyani yozish (faqat ilova egasi) ============ */
const wq = new Map();
function serialWrite(path, fn) {
  const prev = wq.get(path) || Promise.resolve();
  const p = prev.catch(() => { }).then(fn);
  wq.set(path, p);
  return p;
}
async function writeCfg(path, body) {
  if (!S.db) throw { code: 'unavailable', message: 'no db' };
  return serialWrite(path, () => dbSet(path, body));
}
async function saveMain(mutator) {
  const main = clone(S.cfg.main); mutator(main); main.v = Date.now();
  await writeCfg('cfg/main', main);
  S.cfg.main = normMain(main); invalidate();
}
async function saveStaff(list, pins) {
  await writeCfg('cfg/staff', { list, v: Date.now() });
  if (pins) await writeCfg('sec/pins', { pins, v: Date.now() });
  S.cfg.staff = list; if (pins) S.pins = pins; invalidate();
}
async function saveProducts(changed) {
  /* changed: mahsulotlar ro'yxati; har biri tegishli bo'lakka yoziladi */
  const shards = new Map([...S.pshards.entries()].map(([k, v]) => [k, (v.items || []).slice()]));
  const where = new Map(); for (const [k, items] of shards) for (const p of items) where.set(p.id, k);
  const touched = new Set();
  for (const p of changed) {
    let k = where.get(p.id);
    if (k) { const arr = shards.get(k); const i = arr.findIndex(x => x.id === p.id); arr[i] = p; }
    else {
      k = [...shards.keys()].find(x => shards.get(x).length < PSHARD_MAX);
      if (!k) { k = 'p-' + shards.size; shards.set(k, []); }
      shards.get(k).push(p); where.set(p.id, k);
    }
    touched.add(k);
  }
  for (const k of [...touched].sort()) await writeCfg('cfg/' + k, { items: shards.get(k), v: Date.now() });
  for (const k of touched) S.pshards.set(k, { items: shards.get(k) });
  const products = []; for (const [, x] of [...S.pshards.entries()].sort((a, b) => num(a[0].slice(2)) - num(b[0].slice(2)))) for (const p of (x.items || [])) products.push(p);
  S.cfg.products = products; invalidate();
}

/* ============ Qurilmani ro'yxatdan o'tkazish ============ */
async function assignCode(store) {
  const local = () => [...S.devs.values()].filter(d => d.store === store && d.type === 'cashier').reduce((m, d) => Math.max(m, num(d.code)), 0) + 1;
  if (!S.db || S.mode === 'local') return local();
  const ref = S.db.doc('lock/code-' + store);
  for (let i = 0; i < 8; i++) {
    let r = null;
    try { r = await withTimeout(ref.acquire({ holder: S.tabId, ttlMs: 15000 }), 15000); } catch (e) { r = null; }
    if (r && r.acquired) {
      const snap = await withTimeout(S.db.collection('dev').where('store', '==', store).get(), 20000);
      return snap.docs.map(d => d.data()).filter(d => d.type === 'cashier').reduce((m, d) => Math.max(m, num(d.code)), 0) + 1;
    }
    await sleep(900 + Math.random() * 900);
  }
  throw { code: 'unavailable', message: 'busy' };
}
async function registerDevice(o) {
  const code = o.type === 'cashier' ? await assignCode(o.store) : 0;
  const dev = { id: uid(12), name: o.name, type: o.type, store: o.store, code, inst: S.cfg.main.inst, at: Date.now(), by: o.by || null };
  if (S.db && S.canWrite !== false) await dbSet('dev/' + dev.id, devDoc(dev));
  resetLocalDevice();
  S.dev = dev; LS.set('dev', dev);
  S.ctr = { seq: 0, h: GENESIS, ts: 0, rec: 0, ck: null }; saveCritical('ctr', S.ctr);
  S.devs.set(dev.id, devDoc(dev));
  const was = S.user; S.user = o.by ? (U(o.by) || null) : null;
  emit('device', { name: dev.name, type: dev.type, code: dev.code, by: o.by || null });
  S.user = was;
  return dev;
}
function resetLocalDevice() {
  for (const k of ['dev', 'ctr', 'q', 'own', 'dq', 'cq', 'sd', 'cart', 'devp', 'wit', 'seen', 'lockout']) LS.del(k);
  S.dev = null; S.ctr = { seq: 0, h: GENESIS, ts: 0, rec: 0, ck: null }; S.q = []; S.own = []; S.dq = {}; S.cq = []; S.sumDirty = new Set();
  S.cart = { items: [], disc: null }; S.devPending = false; S.user = null; S.wit = {};
  invalidate();
}
/* O'rnatish almashtirilgan bo'lsa (masalan, namuna tozalangan), qurilma qayta ulanadi */
function afterCfg() {
  if (S.dev && S.cfg && S.dev.inst && S.cfg.main.inst && S.dev.inst !== S.cfg.main.inst) {
    resetLocalDevice(); S.modals = [];
    toast('Do‘kon sozlamalari yangidan yaratilgan. Qurilmani qayta ulang.');
  }
  if (S.dev && S.cfgReady && !S.cfg && S.mode) { resetLocalDevice(); S.modals = []; }
}

/* ============ Texnik xizmat: eski batafsil yozuvlarni tozalash (ilova egasi qurilmasida) ============ */
async function maintenance(force) {
  if (!S.db || !canAdminCfg() || S.readOnly || S.passive || !S.cfg) return;
  const last = num(LS.get('maint', 0));
  if (!force && Date.now() - last < 20 * 3600000) return;
  let keep = Math.max(30, num(CFG().keepDays) || 180);
  if (S.mode === 'local') keep = Math.min(keep, 35);
  const cutoff = addD(today(), -keep);
  try {
    if (S.mode === 'remote') {
      const l = await withTimeout(S.db.doc('lock/maint').acquire({ holder: S.tabId, ttlMs: 180000 }), 15000);
      if (!l || !l.acquired) return;
    }
    /* 1) Yetishmayotgan kunlik xulosalarni tiklash (yaqin kunlar) */
    await repairSums(addD(today(), -12), addD(S.liveFrom, -1));
    /* 2) Muddati o'tgan batafsil yozuvlar: avval xulosa tekshiriladi, keyin o'chiriladi */
    const snap = await withTimeout(S.db.collection('ev').where('day', '<', cutoff).get(), 60000);
    const groups = new Map();
    for (const d of snap.docs) { const x = d.data(); const g = x.dev + '~' + x.day; if (!groups.has(g)) groups.set(g, []); groups.get(g).push({ id: d.id, x }); }
    for (const [g, docs] of groups) {
      await ensureSumFromDocs(g, docs);
      for (const d of docs) await dbDel('ev/' + d.id);
    }
    LS.set('maint', Date.now()); S.maintInfo = { at: Date.now(), removed: snap.docs.length };
  } catch (e) { handleDbErr(e, 'maint'); }
}
async function ensureSumFromDocs(g, docs) {
  const evs = []; for (const d of docs) for (const e of (d.x.events || [])) evs.push(e);
  if (!evs.length) return;
  evs.sort((a, b) => a.seq - b.seq);
  const s = await withTimeout(S.db.doc('sum/' + g).get(), 20000);
  if (s.exists && num(s.data().s1) >= evs[evs.length - 1].seq) return;
  const A = accumulate(evs, true), f = evs[0];
  let r0 = 0, r1 = 0; for (const e of evs) if (e.t === 'sale' && e.r) { const n = num(e.r.rn); if (!r0 || n < r0) r0 = n; if (n > r1) r1 = n; }
  const agg = A.days.get(f.store + '|' + f.day) || newAgg(); trimItems(agg, 40);
  await dbSet('sum/' + g, { dev: f.dev, store: f.store, day: f.day, s0: evs[0].seq, s1: evs[evs.length - 1].seq, r0, r1, agg, shifts: [...A.shifts.values()], at: Date.now(), fixed: true });
}
async function repairSums(from, to) {
  if (from > to) return;
  const ev = await withTimeout(S.db.collection('ev').where('day', '>=', from).where('day', '<=', to).get(), 60000);
  const groups = new Map();
  for (const d of ev.docs) { const x = d.data(); const g = x.dev + '~' + x.day; if (!groups.has(g)) groups.set(g, []); groups.get(g).push({ id: d.id, x }); }
  for (const [g, docs] of groups) await ensureSumFromDocs(g, docs);
}
