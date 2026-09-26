/* ============ Ekranni tanlash ============ */
function screen() {
  if (S.passive) return vPassive();
  if (S.readOnly) { if (!S.cfgReady) return vBoot('Ma’lumotlar yuklanmoqda…'); if (!S.cfg) return vNotSetup(); return vShell(); }
  if (!S.cfgReady) return vBoot(S.mode ? 'Ma’lumotlar yuklanmoqda…' : 'Ulanmoqda…');
  if (!S.cfg) return S.mode ? (canAdminCfg() ? vOnboard() : vNotSetup()) : vBoot('Ulanmoqda…');
  if (!S.dev) return vConnect();
  if (devBlocked()) return vBlocked();
  if (!S.user) return vLogin();
  return vShell();
}

/* ============ Hodisalar ============ */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el) return;
  const a = el.dataset.a; if (!ACT[a] || el.disabled) return;
  if (S.passive && a !== 'reclaim') return;
  if (el.tagName === 'A') e.preventDefault();
  try { const r = ACT[a](el.dataset, el, e); if (r && r.catch) r.catch(err => { console.error(err); toast('Xato: ' + ((err && (err.message || err.code)) || 'noma’lum'), 'bad'); }); }
  catch (err) { console.error(err); toast('Xato: ' + ((err && err.message) || 'noma’lum'), 'bad'); }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.classList && el.classList.contains('money')) { const d = el.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 12); el.value = d ? fmt(+d) : ''; }
  const k = el.dataset && el.dataset.in; if (k && IN[k]) IN[k](el.value, el);
});
document.addEventListener('change', e => { const el = e.target, k = el.dataset && el.dataset.ch; if (k && CH[k]) CH[k](el.value, el); });
let scanBuf = '', scanT = 0;
document.addEventListener('keydown', e => {
  S.last = Date.now();
  const m = topModal(), t = e.target, tag = t.tagName, inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  if (e.key === 'Escape') { if (S.ui.more) { S.ui.more = false; render(); return; } if (m && !m.busy) { e.preventDefault(); popModal(); } return; }
  if (S.passive) return;
  const digit = /^\d$/.test(e.key);
  if (!S.readOnly && !S.dev) {
    if (S.ui.conn && S.ui.conn.who && !inField) { if (digit) ACT.connPin({ k: e.key }); else if (e.key === 'Backspace') ACT.connPin({ k: 'bk' }); else if (e.key === 'Enter') { e.preventDefault(); ACT.connPin({ k: 'ok' }); } }
    return;
  }
  if (!S.readOnly && !S.user) { if (!inField && S.ui.who) { if (digit) pinKey(e.key); else if (e.key === 'Backspace') pinKey('bk'); else if (e.key === 'Enter') { e.preventDefault(); pinKey('ok'); } } return; }
  if (m && m.type === 'approve') { if (m.who) { if (digit) apinKey(e.key); else if (e.key === 'Backspace') apinKey('bk'); else if (e.key === 'Enter') { e.preventDefault(); apinKey('ok'); } } return; }
  if (m) { if (e.key === 'Enter' && tag === 'INPUT' && t.type !== 'checkbox') { const r = MOD[m.type](m); if (r.enter && ACT[r.enter]) { e.preventDefault(); ACT[r.enter]({}); } } return; }
  if (t.id === 'ocash' && e.key === 'Enter') { e.preventDefault(); ACT.openShift(); return; }
  if (S.view === 'pos') {
    if (t.id === 'q') { if (e.key === 'Enter') { e.preventDefault(); scanOrPick(t.value); } return; }
    if (inField) return;
    if (e.key === 'Enter') { if (scanBuf.length >= 4) { e.preventDefault(); scanOrPick(scanBuf); } scanBuf = ''; return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { const now = Date.now(); if (now - scanT > 100) scanBuf = ''; scanBuf += e.key; scanT = now; }
  }
});
['pointerdown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { S.last = Date.now(); }, { passive: true }));
window.addEventListener('online', () => { if (S.mode === 'remote' && !S.revoked && !S.writeDenied) S.net = 'online'; schedulePush(200); renderStatus(); });
window.addEventListener('offline', () => { if (S.mode === 'remote') S.net = 'offline'; renderStatus(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { S.flushSumsNow = true; schedulePush(0); } });

/* Bitta qurilmada bitta faol oyna: yozuvlar aralashmasligi uchun */
function claimTab(force) {
  S.passive = false;
  LS.set('tab', { id: S.tabId, ts: Date.now() });
  if (force) { S.modals = []; render(); schedulePush(100); }
}
window.addEventListener('storage', e => {
  if (e.key !== LSP + 'tab' || !e.newValue) return;
  try { const v = JSON.parse(e.newValue); if (v && v.id !== S.tabId && !S.passive) { S.passive = true; S.modals = []; render(); } } catch (x) { }
});

let tick = 0;
setInterval(() => {
  tick++;
  const c = $('#clock'); if (c) c.textContent = hm(Date.now());
  const tm = topModal();
  if (S.user && !S.readOnly && num(CFG().lockMin) > 0 && Date.now() - S.last > num(CFG().lockMin) * 60000 && !(tm && tm.busy)) doLock();
  checkDayChange();
  if (tick % 4 === 0) schedulePush(0);
  if (tick % 12 === 0 && S.user && S.view === 'dash' && !S.modals.length) { S._keepScroll = true; render(); }
  if (!S.user && S.ui.who && lockoutLeft()) updPinUI();
}, 5000);

/* ============ Ishga tushirish ============ */
async function boot() {
  reconcileCtr();
  claimTab(false);
  const cc = LS.get('cfgc', null);
  if (cc && cc.main) { try { applyCfg(cc.main, cc.staff, new Map(cc.pd || [])); S.cfgReady = true; } catch (e) { S.cfg = null; } }
  S.pins = LS.get('pinsc', {}) || {};
  render();
  let db = null, userNs = null, dl = null;
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      [db, userNs, dl] = await Promise.all([window.claude.use('db'), window.claude.use('user'), window.claude.use('downloads')].map(p => Promise.resolve(p).catch(() => null)));
    }
  } catch (e) { db = null; }
  S.dl = dl || null;
  if (db) {
    S.db = db; S.mode = 'remote'; S.userNs = userNs;
    try { S.isOwner = userNs ? !!(await userNs.isOwner()) : null; } catch (e) { S.isOwner = null; }
    try { S.canWrite = userNs ? await userNs.can('data.write') : null; } catch (e) { S.canWrite = null; }
    if (S.canWrite === false) { S.readOnly = true; S.user = { id: '_ro', name: 'Kuzatuvchi', role: 'viewer', stores: [] }; }
    S.net = navigator.onLine === false ? 'offline' : 'connecting';
  } else {
    S.db = new LocalDB(LSP + 'db:'); S.mode = 'local'; S.isOwner = true; S.canWrite = true; S.net = 'local';
  }
  subscribeAll();
  schedulePush(800);
  setTimeout(() => maintenance(false), 45000);
  render();
}
/* Avtomatik sinovlar uchun (faqat sinov muhitida yoqiladi) */
if (window.__KN_TEST__) window.__kn = { S, model, periodData, debtBook, chains, alertsFor, shiftTotals, curShift, pendingCount, maintenance, loadRaw, loadSums, allEvents, render, invalidate, accumulate, evHash, buildSum };
boot();
