/* Sinov uchun window.claude: db, user va downloads imkoniyatlarining soxta nusxasi.
   Barcha ma'lumot Node tomonidagi umumiy bazada (mockdb.cjs) saqlanadi. */
(() => {
  const subs = new Map(); let nextId = 1;
  function docSnap(d) { const data = d.exists ? Object.freeze(d.data) : undefined; return { id: d.id, exists: !!d.exists, data: () => data, metadata: { fromCache: false, hasPendingWrites: false } }; }
  function buildSnap(kind, p) {
    if (kind === 'doc') return docSnap(p.doc);
    const docs = p.docs.map(docSnap), byId = new Map(docs.map(d => [d.id, d]));
    const changes = p.changes.map(c => ({ type: c.type, doc: c.type === 'removed' ? docSnap({ id: c.id, exists: true, data: c.data }) : byId.get(c.id), oldIndex: c.oldIndex, newIndex: c.newIndex }));
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => changes, metadata: { fromCache: false, hasPendingWrites: false } };
  }
  window.__dbPush = (id, payload) => {
    const s = subs.get(id); if (!s) return;
    if (payload.error) { subs.delete(id); if (s.err) s.err(payload.error); return; }
    try { s.next(buildSnap(s.kind, payload)); } catch (e) { console.error(e); }
  };
  const call = async op => { const r = JSON.parse(await window.__db(JSON.stringify(op))); if (r.error) throw r.error; return r.result; };
  const rid = () => Math.random().toString(36).slice(2, 12);
  function docRef(path) {
    return Object.freeze({ id: path.split('/').pop(), path,
      get: async () => docSnap(await call({ op: 'get', path })),
      set: data => call({ op: 'set', path, data }).then(() => undefined),
      update: data => call({ op: 'update', path, data }).then(() => undefined),
      delete: () => call({ op: 'delete', path }).then(() => undefined),
      acquire: o => call({ op: 'acquire', path, holder: o.holder, ttlMs: o.ttlMs }),
      onSnapshot: (next, err) => { const id = nextId++; subs.set(id, { kind: 'doc', next, err }); window.__dbSub(JSON.stringify({ id, kind: 'doc', path })); return () => { subs.delete(id); window.__dbUnsub(id); }; },
      collection: p => query(path + '/' + p, [], null, 0) });
  }
  function query(path, wh, ord, lim) {
    return Object.freeze({ path,
      where: (f, op, v) => query(path, [...wh, [f, op, v]], ord, lim),
      orderBy: (f, dir) => query(path, wh, [f, dir || 'asc'], lim),
      limit: n => query(path, wh, ord, n),
      doc: id => docRef(path + '/' + (id || rid())),
      add: async data => { const r = docRef(path + '/' + rid()); await r.set(data); return r; },
      get: async () => buildSnap('query', await call({ op: 'query', path, wh, ord, lim })),
      onSnapshot: (next, err) => { const id = nextId++; subs.set(id, { kind: 'query', next, err }); window.__dbSub(JSON.stringify({ id, kind: 'query', path, wh, ord, lim })); return () => { subs.delete(id); window.__dbUnsub(id); }; } });
  }
  const db = Object.freeze({ doc: docRef, collection: p => query(p, [], null, 0) });
  const rank = { view: 0, interact: 1, admin: 2, owner: 3 }[window.__MOCK_LEVEL__];
  const user = Object.freeze({
    isOwner: async () => rank >= 3, canEdit: async () => rank >= 2,
    can: async n => (n === 'data.write' ? rank >= 1 : false),
    me: async () => ({ id: null, name: '', avatarUrl: '', color: '#888', email: null, isOwner: rank >= 3, canEdit: rank >= 2 }),
    id: async () => null
  });
  window.__downloads = [];
  const downloads = Object.freeze({ save: async r => { window.__downloads.push({ filename: r.filename, data: String(r.data) }); return { status: 'saved' }; } });
  window.claude = { use: async name => (name === 'db' ? db : name === 'user' ? user : name === 'downloads' ? downloads : null) };
})();
