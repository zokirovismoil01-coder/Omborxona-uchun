/* Umumiy bazaning (db capability) sinov nusxasi: hujjatlar, so'rovlar, obunalar,
   ijaralar (acquire) va kirish qoidalari (view < interact < admin < owner). */
const RANK = { view: 0, interact: 1, admin: 2, owner: 3 };

class MockDB {
  constructor(rules) {
    this.rules = rules || [];
    this.docs = new Map();
    this.leases = new Map();
    this.subs = new Map(); // key -> {client, id, spec, prev}
    this.clients = new Map(); // clientId -> {level, push(id,payload), offline, writes}
    this.flushT = null;
  }
  client(id, level, push) { this.clients.set(id, { level, push, offline: false, writes: 0, reads: 0 }); }
  levels(path) {
    let read = 'view', write = 'interact', br = -1, bw = -1;
    const segs = path.split('/');
    for (const r of this.rules) {
      const rs = r.path ? r.path.split('/') : [];
      if (rs.length <= segs.length && rs.every((s, i) => s === segs[i])) {
        if (r.read && rs.length > br) { read = r.read; br = rs.length; }
        if (r.write && rs.length > bw) { write = r.write; bw = rs.length; }
      }
    }
    return { read, write };
  }
  canRead(c, path) { return RANK[c.level] >= RANK[this.levels(path).read]; }
  canWrite(c, path) { return RANK[c.level] >= RANK[this.levels(path).write]; }
  async op(clientId, o) {
    const c = this.clients.get(clientId);
    if (!c) return { error: { code: 'not_granted', message: 'no client' } };
    if (c.offline) { await new Promise(r => setTimeout(r, 30)); return { error: { code: 'unavailable', message: 'offline' } }; }
    const segs = String(o.path).split('/');
    if (o.op === 'get') { c.reads++; if (segs.length % 2) return { error: { code: 'invalid_argument', message: 'doc path parity' } }; const d = this.docs.get(o.path); return { result: { id: segs[segs.length - 1], exists: !!d && this.canRead(c, o.path), data: d && this.canRead(c, o.path) ? JSON.parse(d) : undefined } }; }
    if (o.op === 'set' || o.op === 'update') {
      if (segs.length % 2) return { error: { code: 'invalid_argument', message: 'doc path parity' } };
      if (!this.canWrite(c, o.path)) return { error: { code: 'invalid_argument', message: 'write below minimum level' } };
      if (!o.data || typeof o.data !== 'object' || Array.isArray(o.data)) return { error: { code: 'invalid_argument', message: 'body must be object' } };
      let body = o.data;
      if (o.op === 'update') { const cur = this.docs.get(o.path); if (!cur) return { error: { code: 'invalid_argument', message: 'no doc' } }; body = Object.assign(JSON.parse(cur), o.data); }
      const json = JSON.stringify(body);
      if (Buffer.byteLength(json) > 256 * 1024) return { error: { code: 'invalid_argument', message: 'document over 256 KiB' } };
      if (!this.docs.has(o.path) && this.docs.size >= 5000) return { error: { code: 'quota_exceeded', message: 'artifact database full' } };
      this.docs.set(o.path, json); c.writes++;
      this.schedule();
      return { result: null };
    }
    if (o.op === 'delete') {
      if (!this.canWrite(c, o.path)) return { error: { code: 'invalid_argument', message: 'write below minimum level' } };
      this.docs.delete(o.path); c.writes++; this.schedule(); return { result: null };
    }
    if (o.op === 'acquire') {
      const now = Date.now(), l = this.leases.get(o.path), ttl = Math.min(600000, Math.max(1000, o.ttlMs || 30000));
      if (l && l.exp > now && l.holder !== o.holder) return { result: { acquired: false, expiresAt: new Date(l.exp).toISOString() } };
      this.leases.set(o.path, { holder: o.holder, exp: now + ttl });
      return { result: { acquired: true, version: 1, holder: o.holder, expiresAt: new Date(now + ttl).toISOString() } };
    }
    if (o.op === 'query') { c.reads++; return { result: this.runQuery(c, o, null).payload }; }
    return { error: { code: 'invalid_argument', message: 'unknown op' } };
  }
  match(d, [f, op, v]) {
    const x = d[f];
    switch (op) {
      case '==': return x === v; case '!=': return x !== v; case '<': return x < v; case '<=': return x <= v; case '>': return x > v; case '>=': return x >= v;
      case 'in': return v.includes(x); case 'not-in': return !v.includes(x); case 'array-contains': return Array.isArray(x) && x.includes(v);
    }
    return false;
  }
  runQuery(c, spec, prev) {
    const pre = spec.path + '/', depth = spec.path.split('/').length + 1;
    let list = [];
    for (const [p, json] of this.docs) {
      if (!p.startsWith(pre) || p.split('/').length !== depth || !this.canRead(c, p)) continue;
      const data = JSON.parse(json);
      if ((spec.wh || []).every(w => this.match(data, w))) list.push({ id: p.slice(pre.length), data, json });
    }
    if (spec.ord) { const [f, dir] = spec.ord, s = dir === 'desc' ? -1 : 1; list.sort((a, b) => (a.data[f] === b.data[f] ? (a.id < b.id ? -1 : 1) : a.data[f] === undefined ? 1 : b.data[f] === undefined ? -1 : (a.data[f] < b.data[f] ? -1 : 1) * s)); }
    else list.sort((a, b) => (a.id < b.id ? -1 : 1));
    if (spec.lim) list = list.slice(0, spec.lim);
    const cur = new Map(list.map((x, i) => [x.id, { json: x.json, i, data: x.data }]));
    const changes = [];
    if (prev) {
      for (const [id, v] of cur) { const p = prev.get(id); if (!p) changes.push({ type: 'added', id, oldIndex: -1, newIndex: v.i }); else if (p.json !== v.json) changes.push({ type: 'modified', id, oldIndex: p.i, newIndex: v.i }); }
      for (const [id, p] of prev) if (!cur.has(id)) changes.push({ type: 'removed', id, data: p.data, oldIndex: p.i, newIndex: -1 });
    } else list.forEach((x, i) => changes.push({ type: 'added', id: x.id, oldIndex: -1, newIndex: i }));
    return { cur, payload: { docs: list.map(x => ({ id: x.id, exists: true, data: x.data })), changes } };
  }
  subscribe(clientId, spec) {
    const key = clientId + ':' + spec.id;
    this.subs.set(key, { client: clientId, id: spec.id, spec, prev: null, prevDoc: undefined });
    this.schedule();
  }
  unsubscribe(clientId, id) { this.subs.delete(clientId + ':' + id); }
  schedule() { if (!this.flushT) this.flushT = setTimeout(() => { this.flushT = null; this.flush(); }, 15); }
  flush() {
    for (const s of this.subs.values()) {
      const c = this.clients.get(s.client);
      if (!c || c.offline) continue;
      if (s.spec.kind === 'doc') {
        const d = this.docs.get(s.spec.path), vis = d && this.canRead(c, s.spec.path) ? d : null;
        if (s.prevDoc !== undefined && s.prevDoc === vis) continue;
        s.prevDoc = vis;
        c.push(s.id, { doc: { id: s.spec.path.split('/').pop(), exists: !!vis, data: vis ? JSON.parse(vis) : undefined } });
      } else {
        const r = this.runQuery(c, s.spec, s.prev);
        if (s.prev && !r.payload.changes.length) continue;
        s.prev = r.cur;
        c.push(s.id, r.payload);
      }
    }
  }
  setOffline(clientId, v) { const c = this.clients.get(clientId); if (c) { c.offline = v; if (!v) this.schedule(); } }
  /* sinov yordamchilari */
  list(prefix) { return [...this.docs.keys()].filter(k => k.startsWith(prefix)).sort(); }
  get(path) { const d = this.docs.get(path); return d ? JSON.parse(d) : null; }
  put(path, data) { this.docs.set(path, JSON.stringify(data)); this.schedule(); }
  del(path) { this.docs.delete(path); this.schedule(); }
}
module.exports = { MockDB };
