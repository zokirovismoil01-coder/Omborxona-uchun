/* ============ Qurilma xotirasi (localStorage) ============ */
const LSP = 'kn2.';
const LS = {
  ok: (() => { try { localStorage.setItem(LSP + 't', '1'); localStorage.removeItem(LSP + 't'); return true; } catch (e) { return false; } })(),
  get(k, d) { try { const v = localStorage.getItem(LSP + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(LSP + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(LSP + k); } catch (e) { } },
  keys() { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(LSP)) out.push(k.slice(LSP.length)); } } catch (e) { } return out; }
};
/* Muhim yozuv: xotira to'lsa, avval keraksiz keshlar tozalanadi, keyin qayta urinadi */
function saveCritical(k, v) {
  if (!LS.ok) return true;
  if (LS.set(k, v)) return true;
  evictCaches(1);
  if (LS.set(k, v)) return true;
  evictCaches(2);
  if (LS.set(k, v)) return true;
  S.storageFull = true;
  return false;
}
function saveSoft(k, v) { if (!LS.ok) return; if (!LS.set(k, v)) { evictCaches(1); LS.set(k, v); } }

/* ============ Mahalliy baza (umumiy baza ishlamaganda) ============
   Umumiy baza (db) bilan bir xil interfeys: doc/collection/where/orderBy/limit/onSnapshot/acquire. */
class LocalDB {
  constructor(prefix) {
    this.p = prefix; this.m = new Map(); this.subs = new Set(); this.leases = new Map();
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) { try { this.m.set(k.slice(prefix.length), JSON.parse(localStorage.getItem(k))); } catch (e) { } }
      }
    } catch (e) { }
  }
  doc(path) { return new LocalDocRef(this, String(path)); }
  collection(path) { return new LocalQuery(this, String(path), [], null, 0); }
  _put(path, data) {
    const json = JSON.stringify(data);
    if (json.length > 250000) throw { code: 'invalid_argument', message: 'document too large' };
    try { localStorage.setItem(this.p + path, json); }
    catch (e) { if (LS.ok) throw { code: 'quota_exceeded', message: 'local storage full' }; }
    this.m.set(path, JSON.parse(json));
    this._notify();
  }
  _del(path) { try { localStorage.removeItem(this.p + path); } catch (e) { } this.m.delete(path); this._notify(); }
  _notify() { clearTimeout(this._t); this._t = setTimeout(() => { for (const s of [...this.subs]) s.fire(); }, 0); }
  _docsIn(coll) {
    const pre = coll + '/', out = [];
    for (const [k, v] of this.m) { if (k.startsWith(pre) && !k.slice(pre.length).includes('/')) out.push({ id: k.slice(pre.length), data: v }); }
    return out;
  }
}
const ldSnap = (id, data) => { const d = data == null ? undefined : Object.freeze(clone(data)); return { id, exists: data != null, data: () => d, metadata: { fromCache: false, hasPendingWrites: false } }; };
class LocalDocRef {
  constructor(db, path) { this.db = db; this.path = path; this.id = path.split('/').pop(); }
  async get() { return ldSnap(this.id, this.db.m.get(this.path)); }
  async set(data) { this.db._put(this.path, data); }
  async update(data) { const cur = this.db.m.get(this.path); if (!cur) throw { code: 'invalid_argument', message: 'no document' }; this.db._put(this.path, Object.assign(clone(cur), data)); }
  async delete() { this.db._del(this.path); }
  async acquire(o) {
    const now = Date.now(), l = this.db.leases.get(this.path), ttl = Math.min(600000, Math.max(1000, num(o && o.ttlMs) || 30000));
    if (l && l.exp > now && l.holder !== o.holder) return { acquired: false, expiresAt: new Date(l.exp).toISOString() };
    this.db.leases.set(this.path, { holder: o.holder, exp: now + ttl });
    return { acquired: true, version: 1, holder: o.holder, expiresAt: new Date(now + ttl).toISOString() };
  }
  onSnapshot(next) {
    const db = this.db, path = this.path; let last;
    const sub = { fire: () => { const v = db.m.get(path), j = JSON.stringify(v ?? null); if (j === last) return; last = j; try { next(ldSnap(this.id, v)); } catch (e) { console.error(e); } } };
    db.subs.add(sub); setTimeout(() => sub.fire(), 0);
    return () => db.subs.delete(sub);
  }
  collection(p) { return new LocalQuery(this.db, this.path + '/' + p, [], null, 0); }
}
function ldMatch(d, [f, op, v]) {
  const x = d[f];
  switch (op) {
    case '==': return x === v; case '!=': return x !== v;
    case '<': return x < v; case '<=': return x <= v; case '>': return x > v; case '>=': return x >= v;
    case 'in': return Array.isArray(v) && v.includes(x); case 'not-in': return Array.isArray(v) && !v.includes(x);
    case 'array-contains': return Array.isArray(x) && x.includes(v);
    default: return false;
  }
}
class LocalQuery {
  constructor(db, path, wh, ord, lim) { this.db = db; this.path = path; this.wh = wh; this.ord = ord; this.lim = lim; }
  where(f, op, v) { return new LocalQuery(this.db, this.path, [...this.wh, [f, op, v]], this.ord, this.lim); }
  orderBy(f, dir) { return new LocalQuery(this.db, this.path, this.wh, [f, dir === 'desc' ? -1 : 1], this.lim); }
  limit(n) { return new LocalQuery(this.db, this.path, this.wh, this.ord, n); }
  doc(id) { return new LocalDocRef(this.db, this.path + '/' + (id || uid(20))); }
  async add(data) { const r = this.doc(); await r.set(data); return r; }
  _run() {
    let list = this.db._docsIn(this.path).filter(x => this.wh.every(w => ldMatch(x.data, w)));
    if (this.ord) { const [f, s] = this.ord; list.sort((a, b) => { const av = a.data[f], bv = b.data[f]; if (av === bv) return a.id < b.id ? -1 : 1; if (av === undefined) return 1; if (bv === undefined) return -1; return (av < bv ? -1 : 1) * s; }); }
    else list.sort((a, b) => a.id < b.id ? -1 : 1);
    if (this.lim) list = list.slice(0, this.lim);
    return list;
  }
  _snap(list, changes) {
    const docs = list.map(x => ldSnap(x.id, x.data));
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => changes, metadata: { fromCache: false, hasPendingWrites: false } };
  }
  async get() { const l = this._run(); return this._snap(l, l.map((x, i) => ({ type: 'added', doc: ldSnap(x.id, x.data), oldIndex: -1, newIndex: i }))); }
  onSnapshot(next) {
    let prev = null;
    const sub = { fire: () => {
      const list = this._run(), cur = new Map(list.map((x, i) => [x.id, { j: JSON.stringify(x.data), x, i }]));
      const ch = [];
      if (prev) {
        for (const [id, c] of cur) { const p = prev.get(id); if (!p) ch.push({ type: 'added', doc: ldSnap(id, c.x.data), oldIndex: -1, newIndex: c.i }); else if (p.j !== c.j) ch.push({ type: 'modified', doc: ldSnap(id, c.x.data), oldIndex: p.i, newIndex: c.i }); }
        for (const [id, p] of prev) if (!cur.has(id)) ch.push({ type: 'removed', doc: ldSnap(id, p.x.data), oldIndex: p.i, newIndex: -1 });
        if (!ch.length) return;
      } else list.forEach((x, i) => ch.push({ type: 'added', doc: ldSnap(x.id, x.data), oldIndex: -1, newIndex: i }));
      prev = cur;
      try { next(this._snap(list, ch)); } catch (e) { console.error(e); }
    } };
    this.db.subs.add(sub); setTimeout(() => sub.fire(), 0);
    return () => this.db.subs.delete(sub);
  }
}
