// Videoga suratga olish uchun Firebase'ning soxta (oflayn) nusxasi.
// StockTill bulut rejimida ochilishi uchun kerak bo'lgan Firestore compat API'ning kichik qismi:
// hujjatlar brauzer xotirasida (localStorage 'fakefs') saqlanadi, tarmoqqa hech narsa yuborilmaydi.
(function () {
  'use strict';
  var KEY = 'fakefs';
  var store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
  var subs = new Set();
  var pendingNotify = 0;
  var clone = function (o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); };
  var persist = function () { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };
  var notify = function () {
    if (pendingNotify) return;
    pendingNotify = setTimeout(function () { pendingNotify = 0; subs.forEach(function (f) { f(); }); }, 0);
  };
  var merge = function (a, b) {
    Object.keys(b).forEach(function (k) {
      var v = b[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) merge(a[k], v);
      else a[k] = clone(v);
    });
    return a;
  };
  var META = { fromCache: false, hasPendingWrites: false };
  function docSnap(path) {
    var body = store[path];
    var id = path.split('/').pop();
    return { id: id, exists: body !== undefined, data: function () { return clone(body); }, metadata: META, ref: docRef(path) };
  }
  function test(body, f) {
    var x = body ? body[f[0]] : undefined, v = f[2];
    switch (f[1]) {
      case '==': return x === v;
      case '!=': return x !== v;
      case '>=': return x >= v;
      case '<=': return x <= v;
      case '>': return x > v;
      case '<': return x < v;
      default: return true;
    }
  }
  function querySnap(col, filters) {
    var docs = Object.keys(store)
      .filter(function (p) { return p.indexOf(col + '/') === 0 && p.slice(col.length + 1).indexOf('/') < 0; })
      .sort()
      .filter(function (p) { return filters.every(function (f) { return test(store[p], f); }); })
      .map(docSnap);
    return { docs: docs, size: docs.length, empty: !docs.length, metadata: META, docChanges: function () { return []; }, forEach: function (fn) { docs.forEach(fn); } };
  }
  function listen(run) {
    var live = true;
    var go = function () { if (live) run(); };
    subs.add(go);
    setTimeout(go, 0);
    return function () { live = false; subs.delete(go); };
  }
  function docRef(path) {
    return {
      id: path.split('/').pop(),
      path: path,
      get: function () { return Promise.resolve(docSnap(path)); },
      set: function (body, opts) {
        if (opts && opts.merge && store[path] && typeof store[path] === 'object') merge(store[path], body);
        else store[path] = clone(body);
        persist(); notify();
        return Promise.resolve();
      },
      update: function (body) {
        if (store[path] === undefined) return Promise.reject({ code: 'not-found', message: 'No document to update' });
        merge(store[path], body); persist(); notify();
        return Promise.resolve();
      },
      delete: function () { delete store[path]; persist(); notify(); return Promise.resolve(); },
      onSnapshot: function (next) { return listen(function () { next(docSnap(path)); }); },
      collection: function (sub) { return colRef(path + '/' + sub, []); }
    };
  }
  function colRef(col, filters) {
    return {
      path: col,
      doc: function (id) { return docRef(col + '/' + (id || Math.random().toString(36).slice(2, 12))); },
      add: function (body) { var r = docRef(col + '/' + Math.random().toString(36).slice(2, 12)); return r.set(body).then(function () { return r; }); },
      get: function () { return Promise.resolve(querySnap(col, filters)); },
      onSnapshot: function (next) { return listen(function () { next(querySnap(col, filters)); }); },
      where: function (f, op, v) { return colRef(col, filters.concat([[f, op, v]])); },
      orderBy: function () { return colRef(col, filters); },
      limit: function () { return colRef(col, filters); }
    };
  }
  var fs = {
    enablePersistence: function () { return Promise.resolve(); },
    doc: docRef,
    collection: function (col) { return colRef(col, []); },
    terminate: function () { return Promise.resolve(); },
    clearPersistence: function () { return Promise.resolve(); }
  };
  var apps = [];
  window.firebase = {
    apps: apps,
    initializeApp: function (cfg) { var app = { options: cfg }; apps.push(app); return app; },
    app: function () { return apps[0]; },
    firestore: function () { return fs; }
  };
  // Seed yuklangandan keyin tashqaridan qayta o'qish uchun
  window.__fakefsReload = function () { try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; } notify(); };
})();
