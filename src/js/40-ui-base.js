/* Amallar, maydonlar, oynalar va sahifalar ro'yxatlari (keyingi fayllarda to'ldiriladi) */
const ACT = {}, IN = {}, CH = {}, MOD = {}, VIEWS = {};

/* ============ Ikonkalar ============ */
const ic = (d, cls) => `<svg class="i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const I = {
  mark: ic('<path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5z"/><path d="M8 10.2 12 8l4 2.2v3.6L12 16l-4-2.2z"/><path d="M12 4v4M12 16v4M4 8.5l4 1.7M20 8.5l-4 1.7M4 15.5l4-1.7M20 15.5l-4-1.7"/>'),
  pos: ic('<rect x="3" y="10" width="18" height="10" rx="2"/><path d="M7 10V5h10v5M7 14h2M11 14h2M15 14h2M7 17h10"/>'),
  rec: ic('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
  cash: ic('<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>'),
  dash: ic('<path d="M3 20h18"/><rect x="5" y="11" width="3" height="6"/><rect x="10.5" y="6" width="3" height="11"/><rect x="16" y="9" width="3" height="8"/>'),
  rep: ic('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
  book: ic('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>'),
  box: ic('<path d="M3 7.5 12 3l9 4.5-9 4.5z"/><path d="M3 7.5v9L12 21l9-4.5v-9M12 12v9"/>'),
  users: ic('<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c.8-3.4 3.2-5.3 6.2-5.3s5.4 1.9 6.2 5.3"/><path d="M16 4.8a3.2 3.2 0 0 1 0 6.3M18.2 14.9c1.8.7 2.8 2.3 3.1 5.1"/>'),
  set: ic('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
  log: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>'),
  lock: ic('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  search: ic('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  x: ic('<path d="M6 6l12 12M18 6 6 18"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  back: ic('<path d="M14 6l-6 6 6 6"/>'),
  fwd: ic('<path d="M10 6l6 6-6 6"/>'),
  bk: ic('<path d="M20 6H9l-6 6 6 6h11z"/><path d="m12 9.5 5 5M17 9.5l-5 5"/>'),
  copy: ic('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  down: ic('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4 16v4h16v-4"/>'),
  up: ic('<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 16v4h16v-4"/>'),
  out: ic('<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 14v6h16v-6"/>'),
  inn: ic('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4 14v6h16v-6"/>'),
  exp: ic('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 9h6M12 7v6"/>'),
  close: ic('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8.5 12.5 2.5 2.5 5-6"/>'),
  more: ic('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'),
  store: ic('<path d="M4 9h16l-1.5-5h-13z"/><path d="M5 9v11h14V9M9 20v-6h6v6"/>'),
  phone: ic('<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>'),
  shield: ic('<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>'),
  alert: ic('<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.5"/>'),
  user: ic('<circle cx="12" cy="8" r="4"/><path d="M4 20c1-4 4.3-6 8-6s7 2 8 6"/>'),
  spark: ic('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
  print: ic('<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>'),
  save: ic('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h8V3M8 21v-7h8v7"/>'),
  link: ic('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>')
};

/* ============ Render asoslari ============ */
function captureFocus() {
  const a = document.activeElement;
  if (!a || !a.id || a === document.body) return null;
  let s = null, e = null; try { s = a.selectionStart; e = a.selectionEnd; } catch (x) { }
  return { id: a.id, s, e };
}
function restoreFocus(f) {
  if (!f) return false;
  const el = document.getElementById(f.id);
  if (!el) return false;
  try { el.focus({ preventScroll: true }); } catch (x) { }
  try { if (f.s != null) el.setSelectionRange(f.s, f.e); } catch (x) { }
  return true;
}
function render() {
  const f = captureFocus();
  const app = $('#app');
  const sc = $('#content') ? $('#content').scrollTop : 0;
  app.innerHTML = screen();
  const c = $('#content'); if (c && S._keepScroll) c.scrollTop = sc;
  S._keepScroll = false;
  restoreFocus(f);
  renderModal();
  const kso = !!(S.dev && S.dev.type === 'cashier' && S.user);
  if (kso !== S._kso) { S._kso = kso; nat('keepScreenOn', kso); }
}
let renderT = null, renderForce = false;
function renderSoon(force) {
  if (force) renderForce = true;
  clearTimeout(renderT);
  renderT = setTimeout(() => {
    const f = renderForce; renderForce = false;
    renderStatus();
    const busyTyping = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && S.view !== 'dash';
    if (f || !S.user || !S.view || (!S.modals.length && !busyTyping && ['dash', 'reports', 'audit', 'receipts', 'nasiya', 'products', 'users'].includes(S.view))) { S._keepScroll = true; render(); return; }
    updateBadges();
    if (S.view === 'pos') {
      const b = $('#shiftbadge'); if (b) b.outerHTML = shiftBadge();
      const pl = $('#plist'); if (pl && document.activeElement !== $('#q')) pl.innerHTML = productsHTML();
    }
  }, 180);
}
function updateBadges() {
  const nb = document.querySelectorAll('.navi[data-v="dash"]');
  const na = newAlerts();
  nb.forEach(n => { let b = n.querySelector('.dotn'); if (!na) { if (b) b.remove(); return; } if (!b) { b = document.createElement('i'); b.className = 'dotn'; n.appendChild(b); } b.textContent = na > 99 ? '99+' : na; });
}
function renderStatus() { const el = $('#netpill'); if (el) el.innerHTML = netPill(); const bn = $('#banners'); if (bn) bn.innerHTML = banners(); }
function netPill() {
  const p = pendingCount();
  if (S.storageFull) return `<span class="pill bad" title="Qurilma xotirasi to‘lgan">Xotira to‘lgan</span>`;
  if (!S.mode) return `<span class="pill">Ulanmoqda</span>`;
  if (S.readOnly) return `<span class="pill info">Faqat ko‘rish</span>`;
  if (S.mode === 'local') return S.quota ? `<span class="pill bad">Xotira to‘lgan${p ? ', navbatda ' + p : ''}</span>` : `<span class="pill" title="Umumiy baza ulanmagan: ma’lumotlar faqat shu qurilmada">Faqat shu qurilma</span>`;
  if (S.revoked) return `<span class="pill bad">Baza uzildi${p ? ', navbatda ' + p : ''}</span>`;
  if (S.writeDenied) return `<span class="pill bad">Yozish rad etildi${p ? ', navbatda ' + p : ''}</span>`;
  if (S.quota) return `<span class="pill bad">Baza to‘lgan</span>`;
  if (navigator.onLine === false || S.net === 'offline') return `<span class="pill warn">Oflayn${p ? ', navbatda ' + p : ''}</span>`;
  if (p) return `<span class="pill info">Yuborilmoqda: ${p}</span>`;
  if (S.net === 'connecting') return `<span class="pill">Ulanmoqda</span>`;
  return `<span class="pill ok">Sinxronlangan</span>`;
}
function banners() {
  const out = [];
  if (S.cfg && S.cfg.main.demo) out.push(`<div class="banner info">${I.spark}<span class="grow">Namuna ma’lumotlar bilan ishlayapsiz. Bu cheklar va smenalar haqiqiy emas.</span>${S.user && S.user.role === 'admin' && canAdminCfg() ? `<button class="btn sm" data-a="demoClear">Tozalab, o‘z do‘konimni sozlash</button>` : ''}</div>`);
  const localFull = `Qurilma xotirasi to‘lgan. Telefonda joy bo‘shating (keraksiz rasm, video yoki ilovalarni o‘chiring), keyin zaxira nusxa oling.`;
  if (S.storageFull) out.push(`<div class="banner bad">${I.alert}<span>${S.mode === 'local' ? localFull : 'Qurilma xotirasi to‘lgan. Yangi yozuvlar saqlanmasligi mumkin. Internetni ulang: yozuvlar yuborilgach joy bo‘shaydi.'}</span></div>`);
  if (S.writeDenied) out.push(`<div class="banner bad">${I.alert}<span>Umumiy bazaga yozish rad etildi. Ilova egasidan sizga kamida “Contributor” yoki “Editor” huquqini berishini so‘rang. Yozuvlar shu qurilmada saqlanib turibdi.</span></div>`);
  if (S.revoked) out.push(`<div class="banner bad">${I.alert}<span>Umumiy bazaga kirish to‘xtatildi. Yozuvlar shu qurilmada saqlanib turibdi.</span></div>`);
  if (S.quota && !(S.mode === 'local' && S.storageFull)) out.push(`<div class="banner bad">${I.alert}<span>${S.mode === 'local' ? localFull + ' Yozuvlar navbatda saqlanib turibdi.' : 'Umumiy baza to‘lgan. Sozlamalardagi “Ma’lumotlar” bo‘limida eski yozuvlarni tozalang.'}</span></div>`);
  if (!LS.ok) out.push(`<div class="banner">${I.alert}<span>Brauzer xotirasi yopiq. Qurilma sozlamalari sahifa yopilganda yo‘qoladi.</span></div>`);
  return out.join('');
}
function toast(text, kind) {
  const box = $('#toasts'); if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast' + (kind ? ' ' + kind : ''); t.textContent = text;
  box.appendChild(t);
  setTimeout(() => t.remove(), kind === 'bad' ? 5200 : 3600);
}
const msg = (title, text, extra) => `<div class="center"><div class="blk"><h2>${title}</h2><p class="muted">${text}</p>${extra || ''}</div></div>`;

/* ============ Oynalar (modal) ============ */
const topModal = () => S.modals[S.modals.length - 1];
function pushModal(m) { m.f = m.f || {}; S.modals.push(m); renderModal(); }
function popModal() { S.modals.pop(); renderModal(); }
function dropModal(m) { S.modals = S.modals.filter(x => x !== m); renderModal(); }
function renderModal() {
  const root = $('#modal-root'), m = topModal();
  if (!root) return;
  if (!m) { root.innerHTML = ''; return; }
  const f = captureFocus();
  const r = MOD[m.type](m);
  root.innerHTML = `<div class="overlay" data-a="ovl"><div class="modal ${r.cls || ''}" role="dialog" aria-modal="true" aria-label="${esc(r.title)}">
    <div class="mh"><h3>${esc(r.title)}</h3><button class="ib" data-a="closeModal" title="Yopish" aria-label="Yopish">${I.x}</button></div>
    <div class="mb">${r.body}</div>${r.foot ? `<div class="mf">${r.foot}</div>` : ''}</div></div>`;
  if (!restoreFocus(f) && !m._focused && r.focus) { const el = $(r.focus, root); if (el) try { el.focus(); } catch (e) { } }
  m._focused = true;
}
const errLine = m => `<div class="err" style="margin-top:10px">${esc(m.err || '')}</div>`;
function fErr(m, t) { m.err = t; m.busy = false; renderModal(); }
const numpad = (id, dec) => `<div class="np">${['1', '2', '3', '4', '5', '6', '7', '8', '9', dec ? ',' : '000', '0', '⌫'].map(k => `<button type="button" class="npk" data-a="key" data-for="${id}" data-k="${k}" aria-label="${k === '⌫' ? 'O‘chirish' : k}">${k === '⌫' ? I.bk : k}</button>`).join('')}</div>`;
const moneyVal = v => { const n = num(v); return n ? fmt(n) : ''; };
function keypad(act) {
  return `<div class="keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bk', '0', 'ok'].map(k =>
    `<button type="button" class="key ${k === 'ok' ? 'ok' : ''}" data-a="${act}" data-k="${k}" aria-label="${k === 'bk' ? 'O‘chirish' : k === 'ok' ? 'Tasdiqlash' : k}">${k === 'bk' ? I.bk : k === 'ok' ? '&#10003;' : k}</button>`).join('')}</div>`;
}
const pinDots = (len, err, max) => `<div class="dots ${err ? 'shake' : ''}">${Array.from({ length: Math.max(max || 4, len) }, (_, i) => `<span class="dot ${i < len ? 'f' : ''}"></span>`).join('')}</div>`;
const avatar = u => `<span class="av">${esc(initials(u && u.name))}</span>`;

/* ============ Qobiq: navigatsiya ============ */
const TITLES = { pos: 'Kassa', receipts: 'Cheklar', cash: 'Kassa puli', close: 'Smenani yopish', nasiya: 'Nasiya daftari', dash: 'Nazorat', reports: 'Hisobotlar', products: 'Mahsulotlar', users: 'Xodimlar', settings: 'Sozlamalar', audit: 'Jurnal' };
function navItems() {
  const u = S.user, r = u.role, items = [];
  if (S.readOnly) return [['dash', 'Nazorat', I.dash], ['reports', 'Hisobotlar', I.rep], ['nasiya', 'Nasiya', I.book]];
  const sells = isCashDev() && r !== 'viewer' && canStore(u, S.dev.store);
  if (sells) items.push(['pos', 'Kassa', I.pos], ['receipts', 'Cheklar', I.rec], ['cash', 'Pul', I.cash]);
  if (r !== 'cashier') items.push(['dash', 'Nazorat', I.dash]);
  items.push(['reports', 'Hisobotlar', I.rep]);
  if (CFG().methods.nasiya || debtBook().owing) items.push(['nasiya', 'Nasiya', I.book]);
  if (r === 'admin') items.push(['products', 'Mahsulotlar', I.box], ['users', 'Xodimlar', I.users], ['settings', 'Sozlamalar', I.set]);
  if (isBoss(u)) items.push(['audit', 'Jurnal', I.log]);
  return items;
}
const newAlerts = () => (S.user && isBoss(S.user) || S.readOnly) ? alertsFor(addD(today(), -6), today(), 'all').filter(a => a.ts > S.seen).length : 0;
function shiftBadge() {
  if (!isCashDev()) return '<span id="shiftbadge"></span>';
  const sh = curShift();
  return `<span id="shiftbadge" class="badge ${sh ? 'ok' : ''} hide-m">${sh ? 'Smena: ' + esc(uname(sh.user)) + ', ' + hm(sh.openTs) + ' dan' : 'Smena yopiq'}</span>`;
}
function vShell() {
  const items = navItems();
  if (!(S.view === 'close' && isCashDev()) && !items.find(i => i[0] === S.view)) S.view = items[0][0];
  const na = newAlerts();
  const SHORT = { reports: 'Hisobot', products: 'Mahsulot', users: 'Xodim', settings: 'Sozlama' };
  const navBtn = ([k, n, icn], short) => `<button class="navi ${S.view === k || (k === 'pos' && S.view === 'close') ? 'on' : ''}" data-a="go" data-v="${k}">${icn}<span>${short && SHORT[k] ? SHORT[k] : n}</span>${k === 'dash' && na ? `<i class="dotn">${na > 99 ? '99+' : na}</i>` : ''}</button>`;
  const bottom = items.length > 5 ? items.slice(0, 4) : items;
  const moreItems = items.length > 5 ? items.slice(4) : [];
  const sub = S.readOnly ? 'Faqat ko‘rish' : `${esc(sname(S.dev.store))}, ${esc(S.dev.name)}`;
  return `<div class="shell">
  <nav class="rail" aria-label="Bo‘limlar"><div class="brand">${I.mark}</div>
    ${items.map(i => navBtn(i)).join('')}
    <div class="spacer"></div>
    ${S.readOnly ? '' : `<button class="navi" data-a="lock">${I.lock}<span>Qulflash</span></button>`}
  </nav>
  <div class="main">
    <header class="top">
      <div class="tt"><h1>${TITLES[S.view]}</h1><div class="sub">${sub}</div></div>
      <div class="grow"></div>
      ${shiftBadge()}
      <span id="netpill">${netPill()}</span>
      ${S.readOnly ? '' : `<button class="userchip" data-a="lock" title="Qulflash">${avatar(S.user)}<span class="un">${esc(S.user.name)}<small>${esc(ROLES[S.user.role])}</small></span>${I.lock}</button>`}
    </header>
    <div id="banners">${banners()}</div>
    <div class="content ${S.view === 'pos' ? 'flush' : ''}" id="content">${VIEWS[S.view]()}</div>
  </div>
  <nav class="bnav" aria-label="Bo‘limlar">${bottom.map(i => navBtn(i, true)).join('')}${moreItems.length ? `<button class="navi ${moreItems.some(i => i[0] === S.view) ? 'on' : ''}" data-a="more">${I.more}<span>Yana</span></button>` : ''}</nav>
  ${S.ui.more && moreItems.length ? `<div class="moreback" data-a="moreClose"></div><div class="more">${moreItems.map(i => navBtn(i)).join('')}${S.readOnly ? '' : `<button class="navi" data-a="lock">${I.lock}<span>Qulflash</span></button>`}</div>` : ''}
  </div>`;
}
function vBoot(text) {
  return `<div class="center"><div class="blk" style="align-items:center;text-align:center"><div class="brandrow" style="color:var(--brand)"><span class="mark" style="background:var(--brand-soft)">${I.mark}</span><span class="wm" style="color:var(--ink)">Kassa Nazorati</span></div><div class="spin"></div><p class="muted">${esc(text || 'Yuklanmoqda…')}</p></div></div>`;
}
function vPassive() {
  return `<div class="passive"><div class="blk" style="text-align:center;align-items:center"><h2>Ilova boshqa oynada ochilgan</h2><p class="muted">Bir qurilmada kassa faqat bitta oynada ishlaydi, shunda yozuvlar aralashib ketmaydi.</p><button class="btn pri big" data-a="reclaim">Shu oynada davom etish</button></div></div>`;
}
