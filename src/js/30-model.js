/* ============ Hisob modeli ============ */
let MV = 0;
const invalidate = () => { MV++; };

/* Kunlik yig'indi (do'kon + kun). Hammasi qo'shiluvchan: xulosalar oson birlashadi. */
function newAgg() {
  return { n: 0, net: 0, gross: 0, by: {}, disc: 0, discN: 0, voidN: 0, voidSum: 0, refN: 0, refSum: 0,
    mv: { float_in: 0, collection: 0, expense: 0 }, dp: 0, dpN: 0, nas: 0, rmN: 0, hours: Array(24).fill(0), items: {}, flags: [] };
}
function newShiftAcc(id) {
  return { id, store: null, dev: null, user: null, openTs: 0, openCash: 0, closed: null,
    n: 0, gross: 0, disc: 0, discN: 0, by: {}, mv: { float_in: 0, collection: 0, expense: 0 },
    voidN: 0, voidSum: 0, refN: 0, refSum: 0, rmN: 0, corr: 0, dpN: 0, lastTs: 0 };
}
const byM = (o, m) => o.by[m] || (o.by[m] = { s: 0, r: 0, v: 0, d: 0 });
function addItems(a, items, sign, ratio) {
  for (const it of items || []) {
    const k = it.p || it.name; if (!k) continue;
    const cur = a.items[k] || (a.items[k] = [0, 0, it.name || '']);
    cur[0] = r3(cur[0] + sign * qnum(it.qty));
    cur[1] += sign * Math.round(num(it.price) * qnum(it.qty) * ratio);
    if (it.name) cur[2] = it.name;
  }
}
function trimItems(a, n) {
  const e = Object.entries(a.items).sort((x, y) => y[1][1] - x[1][1]);
  if (e.length > n) a.items = Object.fromEntries(e.slice(0, n));
}
const toMin = s => { const [h, m] = String(s || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
function outsideHours(ts, st) {
  if (!st) return false;
  const d = new Date(ts), m = d.getHours() * 60 + d.getMinutes(), o = toMin(st.open), c = toMin(st.close);
  if (o === c) return false;
  return o < c ? (m < o || m >= c) : (m >= c && m < o);
}
/* events -> { days: Map("store|day" -> agg), shifts: Map(id -> acc) } */
function accumulate(events, withFlags) {
  const days = new Map(), shifts = new Map();
  const C = CFG();
  const dA = e => { const k = e.store + '|' + e.day; let a = days.get(k); if (!a) { a = newAgg(); days.set(k, a); } return a; };
  const sA = id => { if (!id) return null; let s = shifts.get(id); if (!s) { s = newShiftAcc(id); shifts.set(id, s); } return s; };
  for (const e of events) {
    const sh = sA(e.shift), h = new Date(e.ts).getHours();
    if (sh && e.ts > sh.lastTs) sh.lastTs = e.ts;
    switch (e.t) {
      case 'shift_open':
        if (sh) { sh.store = e.store; sh.dev = e.dev; sh.user = e.user; sh.openTs = e.ts; sh.openCash = num(e.cash); }
        break;
      case 'sale': {
        const r = e.r; if (!r) break;
        const a = dA(e), tot = num(r.total), ratio = num(r.sub) ? tot / num(r.sub) : 1;
        a.n++; a.gross += tot; a.net += tot; a.hours[h] += tot;
        if (num(r.disc) > 0) { a.disc += num(r.disc); a.discN++; }
        for (const p of r.pays || []) { byM(a, p.m).s += num(p.a); if (p.m === 'nasiya') a.nas += num(p.a); }
        addItems(a, r.items, 1, ratio);
        if (sh) { sh.n++; sh.gross += tot; if (num(r.disc) > 0) { sh.disc += num(r.disc); sh.discN++; } for (const p of r.pays || []) byM(sh, p.m).s += num(p.a); }
        if (withFlags) {
          if (qnum(r.discPct) > num(C.discLimit)) a.flags.push({ k: 'disc', ts: e.ts, no: r.no, pct: qnum(r.discPct), sum: num(r.disc), by: r.discBy || null, u: e.user, dev: e.dev });
          if (outsideHours(e.ts, ST(e.store))) a.flags.push({ k: 'hours', ts: e.ts, no: r.no, u: e.user, dev: e.dev });
          if (r.debtOver) a.flags.push({ k: 'debt', ts: e.ts, no: r.no, cust: r.cust, sum: nasiyaPart(r.pays), by: r.debtBy || null, u: e.user, dev: e.dev });
        }
        break;
      }
      case 'void': {
        const a = dA(e), amt = num(e.amount);
        a.voidN++; a.voidSum += amt; a.net -= amt; a.hours[h] -= amt;
        for (const p of e.pays || []) { byM(a, p.m).v += num(p.a); if (p.m === 'nasiya') a.nas -= num(p.a); }
        addItems(a, e.items, -1, 1);
        if (sh) { sh.voidN++; sh.voidSum += amt; for (const p of e.pays || []) byM(sh, p.m).v += num(p.a); }
        break;
      }
      case 'refund': {
        const a = dA(e), amt = num(e.total);
        a.refN++; a.refSum += amt; a.net -= amt; a.hours[h] -= amt;
        for (const p of e.pays || []) { byM(a, p.m).r += num(p.a); if (p.m === 'nasiya') a.nas -= num(p.a); }
        for (const it of e.items || []) { const k = it.p || it.name; if (!k) continue; const cur = a.items[k] || (a.items[k] = [0, 0, it.name || '']); cur[0] = r3(cur[0] - qnum(it.qty)); cur[1] -= num(it.amount); }
        if (sh) { sh.refN++; sh.refSum += amt; for (const p of e.pays || []) byM(sh, p.m).r += num(p.a); }
        break;
      }
      case 'cash': {
        const a = dA(e);
        if (e.kind in a.mv) a.mv[e.kind] += num(e.amount);
        if (sh && e.kind in sh.mv) sh.mv[e.kind] += num(e.amount);
        break;
      }
      case 'debt_pay': {
        const a = dA(e), amt = num(e.amount);
        a.dp += amt; a.dpN++; byM(a, e.m || 'cash').d += amt;
        if (sh) { sh.dpN++; byM(sh, e.m || 'cash').d += amt; }
        break;
      }
      case 'item_remove': case 'cart_clear': dA(e).rmN++; if (sh) sh.rmN++; break;
      case 'shift_close':
        if (sh && !sh.closed) sh.closed = { ts: e.ts, counted: num(e.counted), expected: num(e.expected), variance: num(e.variance), reason: e.reason || '', terms: e.terms || {}, sys: e.sys || {}, by: e.user };
        break;
      case 'correction': if (sh) sh.corr += num(e.amount); break;
    }
  }
  return { days, shifts };
}
function mergeAgg(t, a) {
  t.n += a.n; t.net += a.net; t.gross += a.gross; t.disc += a.disc; t.discN += a.discN;
  t.voidN += a.voidN; t.voidSum += a.voidSum; t.refN += a.refN; t.refSum += a.refSum;
  t.dp += num(a.dp); t.dpN += num(a.dpN); t.nas += num(a.nas); t.rmN += num(a.rmN);
  for (const k in a.mv) t.mv[k] = (t.mv[k] || 0) + num(a.mv[k]);
  for (const m in a.by) { const x = byM(t, m), y = a.by[m]; x.s += num(y.s); x.r += num(y.r); x.v += num(y.v); x.d += num(y.d); }
  (a.hours || []).forEach((v, i) => { t.hours[i] += num(v); });
  for (const k in a.items || {}) { const cur = t.items[k] || (t.items[k] = [0, 0, a.items[k][2] || '']); cur[0] = r3(cur[0] + qnum(a.items[k][0])); cur[1] += num(a.items[k][1]); if (a.items[k][2]) cur[2] = a.items[k][2]; }
  if (a.flags && a.flags.length) t.flags = t.flags.concat(a.flags);
  return t;
}
function mergeShift(t, a) {
  if (!t) return JSON.parse(JSON.stringify(a));
  if (a.openTs && (!t.openTs || a.openTs < t.openTs)) { t.openTs = a.openTs; t.openCash = a.openCash; t.user = a.user; }
  t.store = t.store || a.store; t.dev = t.dev || a.dev; t.user = t.user || a.user;
  if (a.closed && !t.closed) t.closed = a.closed;
  for (const k of ['n', 'gross', 'disc', 'discN', 'voidN', 'voidSum', 'refN', 'refSum', 'rmN', 'corr', 'dpN']) t[k] = num(t[k]) + num(a[k]);
  for (const k in a.mv) t.mv[k] = num(t.mv[k]) + num(a.mv[k]);
  for (const m in a.by) { const x = byM(t, m), y = a.by[m]; x.s += num(y.s); x.r += num(y.r); x.v += num(y.v); x.d += num(y.d); }
  t.lastTs = Math.max(num(t.lastTs), num(a.lastTs));
  return t;
}
/* Smena bo'yicha hisob: kutilgan naqd va to'lov turlari */
function shiftTotals(sh) {
  const net = {}; let netAll = 0;
  for (const m of MK) { const b = sh.by[m] || { s: 0, r: 0, v: 0, d: 0 }; net[m] = b.s - b.r - b.v; netAll += net[m]; }
  const c = sh.by.cash || { s: 0, r: 0, v: 0, d: 0 };
  const expected = num(sh.openCash) + c.s - c.r - c.v + c.d + sh.mv.float_in - sh.mv.collection - sh.mv.expense;
  const sys = {}; for (const m of MK) if (m !== 'cash' && m !== 'nasiya') { const b = sh.by[m] || { s: 0, r: 0, v: 0, d: 0 }; sys[m] = b.s - b.r - b.v + b.d; }
  return { net, netAll, expected, sys };
}

/* ---------- Barcha ma'lum yozuvlar ---------- */
let EVC = null, EVCv = -1;
function allEvents() {
  if (EVCv === MV && EVC) return EVC;
  const m = new Map();
  for (const [id, e] of S.rngEv) m.set(id, e);
  for (const [id, e] of S.live) m.set(id, e);
  for (const e of S.own) m.set(e.id, e);
  for (const e of S.q) m.set(e.id, e);
  EVC = [...m.values()].sort((a, b) => (a.ts - b.ts) || (a.dev < b.dev ? -1 : a.dev > b.dev ? 1 : a.seq - b.seq));
  EVCv = MV;
  return EVC;
}

/* ---------- Cheklar va smenalar (batafsil) ---------- */
let MC = null, MCv = -1;
function model() {
  if (MCv === MV && MC) return MC;
  const evs = allEvents();
  const receipts = new Map(), byNo = new Map(), shiftEv = new Map(), lastSeen = new Map();
  for (const e of evs) {
    if (!lastSeen.has(e.dev) || lastSeen.get(e.dev) < e.ts) lastSeen.set(e.dev, e.ts);
    if (e.shift) { if (!shiftEv.has(e.shift)) shiftEv.set(e.shift, []); shiftEv.get(e.shift).push(e); }
    if (e.t === 'sale' && e.r) {
      const r = Object.assign({}, e.r, { store: e.store, dev: e.dev, user: e.user, shift: e.shift, ts: e.ts, day: e.day, status: 'paid', refunded: {}, refundedTotal: 0, refundedBy: {}, refunds: [], voidEv: null });
      r.items = Array.isArray(r.items) ? r.items : []; r.pays = Array.isArray(r.pays) ? r.pays : [];
      receipts.set(r.id, r); byNo.set(e.store + '|' + r.no, r.id);
    } else if (e.t === 'void') {
      const r = receipts.get(e.rid); if (r) { r.status = 'voided'; r.voidEv = e; }
    } else if (e.t === 'refund') {
      const r = receipts.get(e.rid);
      if (r) {
        for (const it of e.items || []) r.refunded[it.i] = r3((r.refunded[it.i] || 0) + qnum(it.qty));
        r.refundedTotal += num(e.total);
        for (const p of e.pays || []) r.refundedBy[p.m] = (r.refundedBy[p.m] || 0) + num(p.a);
        r.refunds.push(e);
      }
    }
  }
  const A = accumulate(evs, false);
  MC = { evs, receipts, byNo, shiftEv, lastSeen, shifts: A.shifts };
  MCv = MV;
  return MC;
}
function curShift() {
  if (!S.dev) return null;
  let r = null;
  for (const sh of model().shifts.values()) if (sh.dev === S.dev.id && sh.openTs && !sh.closed) { if (!r || sh.openTs > r.openTs) r = sh; }
  return r;
}
function nextReceipt() { const rn = num(S.ctr.rec) + 1; return { rn, no: (num(S.dev.code) || 1) + '-' + String(rn).padStart(6, '0') }; }

/* ---------- Davr ma'lumotlari ----------
   Har bir (qurilma, kun) juftligi uchun bitta manba: yaqin kunlar batafsil yozuvlardan,
   eskilari kunlik xulosalardan. Shu tufayli hech narsa ikki marta sanalmaydi. */
const PD = new Map(); let PDv = -1;
function periodData(from, to, sf) {
  if (PDv !== MV) { PD.clear(); PDv = MV; }
  const key = from + '|' + to + '|' + (sf || 'all') + '|' + (S.user ? S.user.id + S.user.role : '-');
  if (PD.has(key)) return PD.get(key);
  const okStore = st => (!S.user || canStore(S.user, st)) && (!sf || sf === 'all' || st === sf);
  const pre = addD(from, -2), myDev = S.dev ? S.dev.id : null;
  const localMax = new Map();
  for (const e of S.own.concat(S.q)) if (e.dev === myDev && e.day < S.liveFrom) localMax.set(e.day, Math.max(localMax.get(e.day) || 0, e.seq));
  const sumFor = new Map(); for (const s of S.sums.values()) sumFor.set(s.dev + '~' + s.day, s);
  const useRaw = (dev, day) => {
    if (day >= S.liveFrom) return true;
    if (dev !== myDev || !localMax.has(day)) return false;
    const s = sumFor.get(dev + '~' + day);
    return !(s && num(s.s1) >= localMax.get(day));
  };
  const evs = allEvents().filter(e => e.day >= pre && e.day <= to && okStore(e.store) && useRaw(e.dev, e.day));
  const A = accumulate(evs, true);
  const days = new Map(); let loading = false;
  for (let d = from; d <= to; d = addD(d, 1)) days.set(d, newAgg());
  for (const [k, a] of A.days) { const d = k.slice(k.indexOf('|') + 1); if (days.has(d)) mergeAgg(days.get(d), a); }
  for (const s of S.sums.values()) if (s.day >= from && s.day <= to && okStore(s.store) && !useRaw(s.dev, s.day)) mergeAgg(days.get(s.day), s.agg || newAgg());
  for (let d = from; d <= to; d = addD(d, 1)) if (d < S.liveFrom ? !sumReady(d) : !rawReady(d)) loading = true;
  const shifts = A.shifts;
  for (const s of S.sums.values()) if (s.day >= pre && s.day <= to && okStore(s.store) && !useRaw(s.dev, s.day)) for (const a of s.shifts || []) shifts.set(a.id, mergeShift(shifts.get(a.id), a));
  const list = [...shifts.values()].filter(sh => sh.openTs && dkey(sh.openTs) >= from && dkey(sh.openTs) <= to && okStore(sh.store)).sort((a, b) => b.openTs - a.openTs);
  const res = { days, shifts: list, loading };
  PD.set(key, res);
  return res;
}
function sumDays(days) { const t = newAgg(); for (const a of days.values()) mergeAgg(t, a); return t; }
function periodEnsure(from, to) { if (S.db && from < S.liveFrom) loadSums(addD(from, -2), to); }

/* ---------- Nasiya (qarzlar) ---------- */
let DB_ = null, DBv = -1;
function debtBook() {
  if (DBv === MV && DB_) return DB_;
  const items = new Map();
  for (const d of S.debt.values()) for (const it of (d.items || [])) if (it && it.id) items.set(it.id + '|' + it.cust, it);
  for (const m in S.dq) for (const it of S.dq[m].items || []) items.set(it.id + '|' + it.cust, it);
  const bal = new Map(), led = new Map(), last = new Map();
  for (const it of items.values()) {
    bal.set(it.cust, (bal.get(it.cust) || 0) + num(it.a));
    if (!led.has(it.cust)) led.set(it.cust, []);
    led.get(it.cust).push(it);
    if (!last.has(it.cust) || last.get(it.cust) < it.ts) last.set(it.cust, it.ts);
  }
  for (const l of led.values()) l.sort((a, b) => b.ts - a.ts);
  let total = 0, owing = 0; for (const v of bal.values()) if (v > 0) { total += v; owing++; }
  DB_ = { bal, led, last, total, owing }; DBv = MV;
  return DB_;
}
const custName = id => { const c = custGet(id); return c ? c.name : 'Mijoz'; };

/* ---------- Zanjir tekshiruvi (yozuvlar o'chirilgan yoki o'zgartirilganmi) ---------- */
let CHN = null, CHNv = -1;
function chains() {
  if (CHNv === MV && CHN) return CHN;
  const byDev = new Map();
  const src = new Map([...S.rngEv, ...S.live]);
  for (const e of src.values()) { if (!byDev.has(e.dev)) byDev.set(e.dev, []); byDev.get(e.dev).push(e); }
  const res = new Map(), now = Date.now();
  let witCh = false;
  for (const [dev, list] of byDev) {
    list.sort((a, b) => a.seq - b.seq);
    const probs = [], bySeq = new Map();
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      bySeq.set(e.seq, e);
      if (!hashOk(e)) probs.push({ k: 'alt', seq: e.seq, ts: e.ts });
      if (i > 0) {
        const p = list[i - 1];
        if (e.seq === p.seq) probs.push({ k: 'dup', seq: e.seq, ts: e.ts });
        else if (e.seq > p.seq + 1) { if (now - e.ts > 15 * 60000) probs.push({ k: 'gap', from: p.seq + 1, to: e.seq - 1, ts: e.ts }); }
        else if (e.ph !== p.h) probs.push({ k: 'link', seq: e.seq, ts: e.ts });
      }
    }
    const w = S.wit[dev];
    if (w && w.day >= (list[0] ? list[0].day : '9999') && w.day >= S.liveFrom) {
      const x = bySeq.get(w.seq);
      if (!x) probs.push({ k: 'del', seq: w.seq, ts: w.ts || now });
      else if (x.h !== w.h) probs.push({ k: 'alt', seq: w.seq, ts: x.ts });
    }
    const top = list[list.length - 1];
    if (!probs.length && top && (!w || top.seq >= w.seq)) { S.wit[dev] = { seq: top.seq, h: top.h, day: top.day, ts: top.ts }; witCh = true; }
    res.set(dev, { n: list.length, from: list[0] ? list[0].seq : 0, to: top ? top.seq : 0, probs });
  }
  if (witCh) saveSoft('wit', S.wit);
  CHN = res; CHNv = MV;
  return CHN;
}

/* ---------- Ogohlantirishlar ---------- */
const ALERT_KIND = { void: 'Bekor qilish', disc: 'Chegirma', hours: 'Ish vaqti', var: 'Kassa farqi', streak: 'Takroriy farq', long: 'Uzoq smena', debt: 'Nasiya limiti', tamper: 'Jurnal butunligi' };
function alertsFor(from, to, sf) {
  const C = CFG(), out = [], now = Date.now();
  const P = periodData(from, to, sf);
  const byCashier = new Map();
  for (const sh of P.shifts) {
    const who = uname(sh.user);
    if (sh.voidN > num(C.voidAlert)) out.push({ id: 'v' + sh.id, ts: sh.lastTs || sh.openTs, lvl: 'warn', kind: 'void', store: sh.store, text: `${who} smenasida ${sh.voidN} ta chek bekor qilindi` });
    const end = sh.closed ? sh.closed.ts : now, lim = num(C.maxShiftH) * 3600000;
    if (lim > 0 && end - sh.openTs > lim) out.push({ id: 'l' + sh.id, ts: sh.closed ? sh.closed.ts : sh.openTs + lim, lvl: 'warn', kind: 'long', store: sh.store,
      text: sh.closed ? `${who} smenasi ${Math.round((end - sh.openTs) / 3600000)} soat davom etgan` : `${who} smenasi ${Math.floor((now - sh.openTs) / 3600000)} soatdan beri ochiq` });
    if (sh.closed) {
      const v = num(sh.closed.variance) + num(sh.corr);
      if (Math.abs(v) > num(C.varLimit)) out.push({ id: 'f' + sh.id, ts: sh.closed.ts, lvl: 'bad', kind: 'var', store: sh.store, text: `${who}: ${v < 0 ? 'kamomad' : 'ortiqcha'} ${som(Math.abs(v))}${sh.closed.reason ? '. Sabab: ' + sh.closed.reason : ''}` });
      if (!byCashier.has(sh.user)) byCashier.set(sh.user, []);
      byCashier.get(sh.user).push(sh);
    }
  }
  for (const [u, list] of byCashier) {
    list.sort((a, b) => a.closed.ts - b.closed.ts);
    let streak = 0;
    for (const sh of list) {
      if (Math.abs(num(sh.closed.variance) + num(sh.corr)) > num(C.varLimit)) { streak++; if (num(C.varStreak) > 1 && streak >= num(C.varStreak)) out.push({ id: 's' + sh.id, ts: sh.closed.ts + 1, lvl: 'bad', kind: 'streak', store: sh.store, text: `${uname(u)}: ketma-ket ${streak} smenada kassa farqi` }); }
      else streak = 0;
    }
  }
  for (const [d, a] of P.days) for (const f of a.flags || []) {
    const st = storeOfDev(f.dev);
    if (f.k === 'disc') out.push({ id: 'd' + f.dev + f.no, ts: f.ts, lvl: 'warn', kind: 'disc', store: st, text: `Chek ${f.no}: ${fq(f.pct)}% chegirma (${som(f.sum)})${f.by ? ', tasdiqladi: ' + uname(f.by) : ''}` });
    if (f.k === 'hours') out.push({ id: 'h' + f.dev + f.no, ts: f.ts, lvl: 'warn', kind: 'hours', store: st, text: `Ish vaqtidan tashqari sotuv ${hm(f.ts)} da, chek ${f.no}` });
    if (f.k === 'debt') out.push({ id: 'n' + f.dev + f.no, ts: f.ts, lvl: 'warn', kind: 'debt', store: st, text: `${custName(f.cust)}: nasiya limitdan oshdi, chek ${f.no} (${som(f.sum)})${f.by ? ', tasdiqladi: ' + uname(f.by) : ''}` });
  }
  if (to >= S.liveFrom && isBoss(S.user)) {
    for (const [dev, c] of chains()) for (const p of c.probs) {
      const st = storeOfDev(dev); if (sf && sf !== 'all' && st !== sf) continue;
      if (st && !canStore(S.user, st)) continue;
      const txt = p.k === 'gap' ? `${dname(dev)}: ${p.from === p.to ? '#' + p.from : '#' + p.from + '–#' + p.to} yozuvlar yo‘q` : p.k === 'del' ? `${dname(dev)}: ilgari ko‘rilgan #${p.seq} yozuv o‘chirilgan` : `${dname(dev)}: #${p.seq} yozuv o‘zgartirilgan`;
      out.push({ id: 't' + dev + p.k + (p.seq || p.from), ts: p.ts, lvl: 'bad', kind: 'tamper', store: st, text: txt });
    }
  }
  const seen = new Set();
  return out.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; }).sort((a, b) => b.ts - a.ts);
}
const storeOfDev = id => { const d = DV(id); return d ? d.store : null; };
