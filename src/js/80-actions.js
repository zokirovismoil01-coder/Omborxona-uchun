/* ============ Amallar (tugmalar) ============ */
Object.assign(ACT, {
  go: d => { S.view = d.v; S.ui.cartOpen = false; S.ui.more = false; if (d.v === 'settings') S.ui.cfg = null; if (d.v === 'close') S.ui.close = null; if (d.v === 'dash') markSeen(); S.modals = []; render(); const c = $('#content'); if (c) c.scrollTop = 0; },
  more: () => { S.ui.more = !S.ui.more; render(); },
  moreClose: () => { S.ui.more = false; render(); },
  lock: () => doLock(),
  reclaim: () => claimTab(true),
  ovl: (d, el, ev) => { if (ev.target === el) { const m = topModal(); if (m && m.busy) return; popModal(); } },
  closeModal: () => { const m = topModal(); if (m && m.busy) return; popModal(); },
  setF: d => { const m = topModal(); if (!m) return; m.f[d.f] = d.v; if (d.f === 'mode') m.f.val = ''; m.err = ''; renderModal(); },
  key: d => {
    const el = document.getElementById(d.for); if (!el) return;
    if (el.classList.contains('money')) { let s = el.value.replace(/\D/g, ''); s = d.k === '⌫' ? s.slice(0, -1) : (s + d.k).slice(0, 12); el.value = s; }
    else { let s = el.value; if (d.k === '⌫') s = s.slice(0, -1); else if (d.k === ',') { if (!/[.,]/.test(s)) s = (s || '0') + ','; } else s += d.k; el.value = s.slice(0, 12); }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  },

  /* birinchi sozlash */
  onbReal: () => { S.ui.onb.step = 'form'; S.ui.onb.err = ''; render(); },
  onbDemo: () => { S.ui.onb.step = 'demo'; S.ui.onb.err = ''; render(); },
  onbBack: () => { S.ui.onb.step = 'choose'; S.ui.onb.err = ''; render(); },
  onbType: d => { S.ui.onb.f.type = d.k; render(); },
  onbGo: () => doSetup(),
  onbDemoGo: () => doDemo(),

  /* qurilmani ulash */
  connType: d => { S.ui.conn.type = d.k; S.ui.conn.name = ''; S.ui.conn.who = null; render(); },
  connWho: d => { S.ui.conn.who = d.id; S.ui.conn.pin = ''; S.ui.conn.err = ''; render(); },
  connBack: () => { S.ui.conn.who = null; S.ui.conn.pin = ''; S.ui.conn.err = ''; render(); },
  connPin: d => {
    const c = S.ui.conn; if (!c || c.busy) return;
    c.err = '';
    if (d.k === 'bk') c.pin = c.pin.slice(0, -1);
    else if (d.k === 'ok') return connFinish();
    else if (c.pin.length < 6) { c.pin += d.k; if (c.pin.length === 6) return connFinish(); }
    updConnPin();
  },
  resetDevGo: () => { resetLocalDevice(); S.ui.conn = null; render(); },

  /* kirish */
  who: d => { S.ui.who = d.id; S.ui.pin = ''; S.ui.pinErr = ''; render(); },
  whoBack: () => { S.ui.who = null; S.ui.pin = ''; S.ui.pinErr = ''; render(); },
  pin: d => pinKey(d.k),
  apWho: d => { const m = topModal(); if (!m) return; m.who = d.id; m.pin = ''; m.err = ''; m._focused = false; renderModal(); },
  apBack: () => { const m = topModal(); if (!m) return; m.who = null; m.pin = ''; m.err = ''; renderModal(); },
  apin: d => apinKey(d.k),

  /* smena va sotuv */
  openShift: () => {
    if (curShift()) return render();
    const e = emit('shift_open', { shift: uid(12), cash: num(S.ui.ocash) });
    if (!e) return;
    S.ui.ocash = ''; toast('Smena ochildi'); render();
  },
  cat: d => { S.ui.cat = d.k; S.ui.q = ''; const qi = $('#q'); if (qi) qi.value = ''; document.querySelectorAll('#cats .chip').forEach(c => c.classList.toggle('on', c.dataset.k === d.k)); const pl = $('#plist'); if (pl) pl.innerHTML = productsHTML(); },
  add: d => { const p = PR(d.id); if (!p || !p.active) return; if (p.unit === 'kg' || p.unit === 'l' || p.unit === 'm') pushModal({ type: 'qty', pid: p.id, f: { q: '' } }); else addToCart(p, 1); },
  qty: d => { const it = S.cart.items[+d.i]; if (!it) return; setQty(+d.i, it.qty + ((it.unit === 'dona' || it.unit === 'quti') ? 1 : 0.1) * (+d.d)); },
  qtyEdit: d => { const it = S.cart.items[+d.i]; if (it) pushModal({ type: 'qty', i: +d.i, f: { q: fq(it.qty) } }); },
  qtyOk: () => {
    const m = topModal(); let q = qnum(m.f.q);
    const it = m.pid ? PR(m.pid) : S.cart.items[m.i]; if (!it) return popModal();
    if (it.unit === 'dona' || it.unit === 'quti') q = Math.round(q);
    if (q > 9999) return fErr(m, 'Miqdor juda katta');
    popModal();
    if (m.pid) { if (q > 0) addToCart(it, q); } else setQty(m.i, q);
  },
  rmItem: d => setQty(+d.i, 0),
  cartClear: () => {
    const sh = curShift(), k = cartCalc();
    if (sh && S.cart.items.length) emit('cart_clear', { shift: sh.id, n: S.cart.items.length, sum: k.sub, names: S.cart.items.map(i => i.name).slice(0, 20) });
    S.cart = { items: [], disc: null }; refreshCart();
  },
  cartOpen: () => { S.ui.cartOpen = true; const c = $('#cart'); if (c) c.classList.add('open'); },
  cartClose: () => { S.ui.cartOpen = false; const c = $('#cart'); if (c) c.classList.remove('open'); },
  disc: () => { const d = S.cart.disc; pushModal({ type: 'disc', f: d ? { mode: d.pct ? 'pct' : 'sum', val: String(d.pct || d.amount), reason: ['Doimiy xaridor', 'Aksiya', 'Nuqsonli mahsulot'].includes(d.reason) ? d.reason : 'Boshqa', note: d.reason } : { mode: 'pct', val: '' } }); },
  discDel: () => { S.cart.disc = null; popModal(); refreshCart(); },
  discOk: () => {
    const m = topModal(), f = m.f, k = cartCalc(), v = num(f.val), reason = reasonOf(m);
    if (!v) return fErr(m, 'Chegirma miqdorini kiriting');
    if (f.mode === 'pct' && v >= 100) return fErr(m, 'Foiz 100 dan kichik bo‘lishi kerak');
    if (f.mode === 'sum' && v >= k.sub) return fErr(m, 'Chegirma chek summasidan kichik bo‘lishi kerak');
    if (!reason) return fErr(m, 'Sababni tanlang yoki yozing');
    const pct = f.mode === 'pct' ? v : v / k.sub * 100, over = pct > num(CFG().discLimit);
    const apply = by => { S.cart.disc = { pct: f.mode === 'pct' ? v : 0, amount: f.mode === 'sum' ? v : 0, reason, by }; dropModal(m); refreshCart(); };
    if (over) requireApproval(`Chegirma ${fq(Math.round(pct * 10) / 10)}%: chegara ${CFG().discLimit}%`, apply);
    else apply(null);
  },
  pay: () => { if (!S.cart.items.length) return; pushModal({ type: 'pay', method: 'cash', f: {} }); },
  payM: d => { const m = topModal(); m.method = d.k; m._focused = false; m.err = ''; renderModal(); },
  quick: d => { const m = topModal(); m.f.given = d.v; const g = $('#given'); if (g) g.value = fmt(+d.v); updPayUI(); },
  mixFill: d => {
    const m = topModal(), t = cartCalc().total;
    const others = activeMethods().filter(x => x.k !== d.k).reduce((a, x) => a + num(m.f['mix_' + x.k]), 0);
    m.f['mix_' + d.k] = String(Math.max(0, t - others)); const el = $('#mix_' + d.k); if (el) el.value = moneyVal(m.f['mix_' + d.k]); updPayUI();
  },
  custPick: d => { const m = topModal(); m.f.cust = d.id; m.err = ''; renderModal(); },
  custClear: () => { const m = topModal(); m.f.cust = null; renderModal(); },
  ncOpen: () => { const m = topModal(); m.f.newCust = true; m.f.ncName = m.f.cq || ''; m._focused = false; renderModal(); const el = $('#nc_name'); if (el) el.focus(); },
  ncCancel: () => { const m = topModal(); m.f.newCust = false; renderModal(); },
  ncSave: () => {
    const m = topModal(), name = String(m.f.ncName || '').trim();
    if (!name) return fErr(m, 'Mijoz ismini kiriting');
    const c = addCustomer({ name, phone: String(m.f.ncPhone || '').trim() });
    if (!c) return fErr(m, 'Qurilma xotirasi to‘lgan');
    m.f.cust = c.id; m.f.newCust = false; m.err = ''; renderModal();
  },
  payOk: () => {
    const m = topModal(); if (!m || m.type !== 'pay') return;
    const t = cartCalc().total; if (!payOk(m, t)) return fErr(m, payNas(m, t) > 0 && !m.f.cust ? 'Nasiya uchun mijozni tanlang' : 'To‘lov summasi mos emas');
    let pays, given = 0, change = 0;
    if (m.method === 'cash') { const g = num(m.f.given) || t; pays = [{ m: 'cash', a: t }]; given = g; change = g - t; }
    else if (m.method === 'mix') pays = activeMethods().map(x => ({ m: x.k, a: num(m.f['mix_' + x.k]) })).filter(p => p.a > 0);
    else pays = [{ m: m.method, a: t }];
    const nas = nasiyaPart(pays), extra = {};
    if (nas > 0) {
      extra.cust = m.f.cust;
      const bal = debtBook().bal.get(m.f.cust) || 0, lim = num(CFG().debtLimit);
      if (lim && bal + nas > lim) return requireApproval(`Nasiya limiti: ${custName(m.f.cust)} qarzi ${som(bal + nas)} bo‘ladi`, by => doSale(pays, given, change, Object.assign(extra, { debtOver: true, debtBy: by })));
    }
    doSale(pays, given, change, extra);
  },

  /* cheklar */
  rtab: d => { S.ui.rtab = d.k; render(); },
  openRec: d => pushModal({ type: 'receipt', id: d.id }),
  copyRec: () => copyText(($('#rtext') || {}).value || ''),
  copyCsv: () => copyText(($('#csvtxt') || {}).value || '', $('#csvtxt')),
  voidRec: d => pushModal({ type: 'void', id: d.id, f: {} }),
  voidOk: () => {
    const m = topModal(), r = model().receipts.get(m.id), sh = curShift(), reason = reasonOf(m);
    if (!reason) return fErr(m, 'Sababni tanlang yoki yozing');
    if (!r || r.status !== 'paid' || !sh || r.shift !== sh.id) return fErr(m, 'Bu chekni bekor qilib bo‘lmaydi');
    requireApproval(`Chek ${r.no}ni bekor qilish, ${som(r.total)}`, by => {
      const e = emit('void', { shift: sh.id, rid: r.id, no: r.no, amount: num(r.total), pays: r.pays, items: r.items.map(i => ({ p: i.p, name: i.name, qty: i.qty, price: i.price })), reason, by, cust: r.cust || null });
      if (!e) return;
      S.modals = S.modals.filter(x => x !== m && !(x.type === 'receipt' && x.id === r.id)); renderModal(); render();
      const cashBack = r.pays.filter(p => p.m === 'cash').reduce((s, p) => s + num(p.a), 0);
      toast(cashBack ? `Chek bekor qilindi. Xaridorga naqd ${som(cashBack)} qaytaring.` : 'Chek bekor qilindi');
    });
  },
  refundRec: d => pushModal({ type: 'refund', id: d.id, f: { q: {} } }),
  rq: d => {
    const m = topModal(), r = model().receipts.get(m.id), i = +d.i, it = r.items[i];
    const left = r3(qnum(it.qty) - (r.refunded[i] || 0)), cur = m.f.q[i] || 0;
    const q = (it.unit === 'dona' || it.unit === 'quti') ? cur + (+d.d) : (+d.d > 0 ? left : 0);
    m.f.q[i] = Math.max(0, Math.min(left, r3(q))); renderModal();
  },
  refundOk: () => {
    const m = topModal(), r = model().receipts.get(m.id), sh = curShift(), reason = reasonOf(m), c = refundCalc(r, m.f.q);
    if (!c.total) return fErr(m, 'Qaytariladigan mahsulotni tanlang');
    if (!reason) return fErr(m, 'Sababni tanlang yoki yozing');
    if (!sh || sh.user !== S.user.id) return fErr(m, 'Qaytarish uchun o‘z smenangiz ochiq bo‘lishi kerak');
    requireApproval(`Chek ${r.no} bo‘yicha qaytarish, ${som(c.total)}`, by => {
      const e = emit('refund', { shift: sh.id, rid: r.id, no: r.no, items: c.items, total: c.total, pays: c.pays, reason, by, cust: r.cust || null });
      if (!e) return;
      S.modals = S.modals.filter(x => x !== m && !(x.type === 'receipt' && x.id === r.id)); renderModal(); render();
      const cash = c.pays.filter(p => p.m === 'cash').reduce((s, p) => s + p.a, 0);
      toast(cash ? `Qaytarildi. Xaridorga naqd ${som(cash)} bering.` : `Qaytarildi: ${som(c.total)}`);
    });
  },
  findRec: () => pushModal({ type: 'find', f: {} }),
  findOk: () => { const m = topModal(); if (m && !m.busy) findReceipt(m); },

  /* pul harakati */
  move: d => pushModal({ type: 'move', kind: d.k, f: {} }),
  moveOk: () => {
    const m = topModal(), f = m.f, sh = curShift(), amount = num(f.amount), reason = String(f.reason || '').trim(), person = String(f.person || '').trim();
    if (!amount) return fErr(m, 'Summani kiriting');
    if (!reason) return fErr(m, 'Sababni yozing');
    if (!person) return fErr(m, m.kind === 'float_in' ? 'Pulni kim berganini yozing' : 'Pulni kim olganini yozing');
    if (!sh || sh.user !== S.user.id) return fErr(m, 'Smena ochiq emas');
    if (m.kind !== 'float_in' && amount > shiftTotals(sh).expected) return fErr(m, 'Kassada hisob bo‘yicha buncha naqd yo‘q');
    const save = by => { const e = emit('cash', { shift: sh.id, kind: m.kind, amount, reason, person, by }); if (!e) return; dropModal(m); render(); toast(MOVE[m.kind] + ' saqlandi: ' + som(amount)); };
    if (m.kind === 'float_in') save(null); else requireApproval(`${MOVE[m.kind]}: kassadan ${som(amount)} olish`, save);
  },

  /* smena yopish */
  cmode: d => { closeState().mode = d.k; render(); },
  den: d => { const c = closeState(); c.den[d.d] = Math.max(0, num(c.den[d.d]) + (+d.s)); S._keepScroll = true; render(); },
  closeShift: () => {
    const sh = curShift(); if (!sh) return;
    if (S.cart.items.length && sh.user === S.user.id) return toast('Avval ochiq chekni yakunlang', 'bad');
    const c = closeState(), T = shiftTotals(sh), counted = countedOf(c), variance = counted - T.expected;
    const over = Math.abs(variance) > num(CFG().varLimit);
    if (over && !c.tried) { c.tried = true; S._keepScroll = true; render(); const r = $('#creason'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'center' }); return; }
    if (over && !String(c.reason).trim()) { toast('Farq sababini yozing', 'bad'); const r = $('#creason'); if (r) r.focus(); return; }
    const terms = {}; activeMethods().filter(x => x.k !== 'cash' && x.k !== 'nasiya').forEach(x => { terms[x.k] = num(c.term[x.k]); });
    const e = emit('shift_close', { shift: sh.id, counted, expected: T.expected, variance, reason: String(c.reason || '').trim(), terms, sys: T.sys });
    if (!e) return;
    S.flushSumsNow = true; schedulePush(100);
    S.ui.close = null; S.view = 'pos'; render();
    pushModal({ type: 'z', id: sh.id });
  },

  /* hisobotlar va nazorat */
  day: d => { const t = today(); let n = addD(S.ui.day, +d.d); if (n > t) n = t; S.ui.day = n; render(); },
  pickDay: d => { S.ui.day = d.d; render(); },
  goAlerts: () => { S.view = 'reports'; S.ui.rep = 'alerts'; applyPreset('7'); render(); },
  rep: d => { S.ui.rep = d.k; render(); },
  af: d => { S.ui.af = d.k; render(); },
  expC: d => { S.ui.expC = S.ui.expC === d.id ? null : d.id; S._keepScroll = true; render(); },
  openZ: d => pushModal({ type: 'z', id: d.id }),
  csv: () => saveFile(reportCSV()),
  corr: d => pushModal({ type: 'corr', id: d.id, f: { sign: '-', amount: '', reason: '' } }),
  corrOk: () => {
    const m = topModal(), sh = (S.zc && S.zc.get(m.id)) || model().shifts.get(m.id), a = num(m.f.amount), reason = String(m.f.reason || '').trim();
    if (!sh) return fErr(m, 'Smena topilmadi');
    if (!a) return fErr(m, 'Summani kiriting'); if (!reason) return fErr(m, 'Sababni yozing');
    const e = emit('correction', { shift: sh.id, amount: m.f.sign === '+' ? a : -a, reason });
    if (!e) return;
    popModal(); toast('Tuzatish yozuvi saqlandi'); render();
  },

  /* nasiya */
  cf: d => { S.ui.cf = d.k; render(); },
  custNew: () => pushModal({ type: 'custNew', f: {} }),
  custOpen: d => pushModal({ type: 'custView', id: d.id }),
  custEdit: d => { const c = custGet(d.id); if (c) pushModal({ type: 'custNew', id: c.id, f: { name: c.name, phone: c.phone || '', note: c.note || '' } }); },
  custSave: async () => {
    const m = topModal(), name = String(m.f.name || '').trim();
    if (!name) return fErr(m, 'Ismni kiriting');
    if (!m.id) { const c = addCustomer({ name, phone: String(m.f.phone || '').trim(), note: String(m.f.note || '').trim() }); if (!c) return fErr(m, 'Qurilma xotirasi to‘lgan'); dropModal(m); toast('Mijoz qo‘shildi'); render(); return; }
    const c = Object.assign({}, custGet(m.id), { name, phone: String(m.f.phone || '').trim(), note: String(m.f.note || '').trim() });
    try { m.busy = true; renderModal(); await writeCfg('cust/' + c.id, c); S.cust.set(c.id, c); invalidate(); dropModal(m); toast('Saqlandi'); render(); }
    catch (e) { fErr(m, 'Saqlab bo‘lmadi: ' + dbErrCode(e)); }
  },
  debtPay: d => pushModal({ type: 'debtPay', id: d.id, f: { m: 'cash' } }),
  setAmt: d => { const m = topModal(); m.f.amount = String(d.v); const el = $('#dpamt'); if (el) el.value = moneyVal(d.v); },
  debtPayOk: () => {
    const m = topModal(), a = num(m.f.amount), sh = curShift(), bal = debtBook().bal.get(m.id) || 0;
    if (!a) return fErr(m, 'Summani kiriting');
    if (a > bal) return fErr(m, 'Summa qarzdan katta: ' + som(bal));
    if (!sh || sh.user !== S.user.id) return fErr(m, 'Smena ochiq emas');
    const e = emit('debt_pay', { shift: sh.id, cust: m.id, amount: a, m: m.f.m || 'cash' });
    if (!e) return;
    dropModal(m); toast(`To‘lov saqlandi: ${som(a)}`); render();
  },
  debtAdj: d => pushModal({ type: 'debtAdj', id: d.id, f: { sign: '-' } }),
  debtAdjOk: () => {
    const m = topModal(), a = num(m.f.amount), reason = String(m.f.reason || '').trim();
    if (!a) return fErr(m, 'Summani kiriting'); if (!reason) return fErr(m, 'Sababni yozing');
    const e = emit('debt_adj', { cust: m.id, amount: m.f.sign === '+' ? a : -a, reason });
    if (!e) return;
    dropModal(m); toast('Tuzatish saqlandi'); render();
  },

  /* mahsulotlar */
  prodEdit: d => {
    if (!canAdminCfg()) return;
    const p = d.id ? PR(d.id) : null;
    pushModal({ type: 'prod', id: p ? p.id : null, f: p ? { name: p.name, barcode: p.barcode || '', price: String(p.price), unit: p.unit, cat: p.cat, fav: !!p.fav, active: !!p.active }
      : { name: '', barcode: '', price: '', unit: 'dona', cat: S.cfg.main.cats[0] || '', fav: false, active: true } });
  },
  genBar: () => { const m = topModal(); let s = '2'; for (let i = 0; i < 11; i++) s += Math.floor(Math.random() * 10); m.f.barcode = ean13(s); const el = $('#pbar'); if (el) el.value = m.f.barcode; },
  prodOk: async () => {
    const m = topModal(), f = m.f, name = String(f.name || '').trim(), price = num(f.price), bc = String(f.barcode || '').trim(), cat = String(f.cat || '').trim() || 'Boshqa';
    if (!name) return fErr(m, 'Nomini kiriting');
    if (price <= 0) return fErr(m, 'Narxni kiriting');
    if (bc && PRODUCTS().some(p => p.barcode === bc && p.id !== m.id)) return fErr(m, 'Bu shtrix-kod boshqa mahsulotda bor');
    const old = m.id ? PR(m.id) : null, id = m.id || 'p' + uid(8);
    const p = Object.assign({}, old || {}, { id, name, price, barcode: bc, unit: f.unit || 'dona', cat, fav: !!f.fav, active: !!f.active });
    m.busy = true; renderModal();
    try {
      await saveProducts([p]);
      if (!S.cfg.main.cats.includes(cat)) await saveMain(M => { M.cats.push(cat); });
      emit('admin', { text: old ? (old.price !== price ? `Narx o‘zgardi: ${name}, ${fmt(old.price)} dan ${fmt(price)} ga` : `Mahsulot tahrirlandi: ${name}`) : `Yangi mahsulot: ${name}, ${fmt(price)} ${SOM}` });
      dropModal(m); toast('Saqlandi'); render();
    } catch (e) { fErr(m, cfgErr(e)); }
  },
  prodImport: () => pushModal({ type: 'import', f: { text: '' } }),
  impSample: () => { const m = topModal(); m.f.text = 'Nomi\tNarx\tShtrix-kod\tBo‘lim\tO‘lchov\nMineral suv 0,5 l\t3000\t4780012345678\tIchimliklar\tdona\nBanan\t22000\t\tMeva-sabzavot\tkg'; m._focused = false; renderModal(); },
  impGo: async () => {
    const m = topModal(), P = parseImport(m.f.text), plan = importPlan(P.rows);
    if (!plan.list.length) return;
    m.busy = true; renderModal();
    try {
      await saveProducts(plan.list);
      const newCats = [...new Set(plan.list.map(p => p.cat))].filter(c => !S.cfg.main.cats.includes(c));
      if (newCats.length) await saveMain(M => { M.cats.push(...newCats); });
      emit('admin', { text: `Import: ${plan.nNew} ta yangi, ${plan.nUpd} ta yangilandi` });
      dropModal(m); toast(`Import tugadi: ${plan.list.length} ta mahsulot`); render();
    } catch (e) { fErr(m, cfgErr(e)); }
  },
  prodCsv: () => saveFile({ filename: 'mahsulotlar.csv', data: toCSV([['Nomi', 'Narx', 'Shtrix-kod', 'Bo‘lim', 'O‘lchov', 'Tezkor', 'Sotuvda'], ...PRODUCTS().map(p => [p.name, p.price, p.barcode || '', p.cat, p.unit, p.fav ? 'ha' : '', p.active ? 'ha' : 'yo‘q'])]) }),

  /* xodimlar */
  userEdit: d => {
    if (!canAdminCfg()) return;
    const u = d.id ? U(d.id) : null;
    pushModal({ type: 'user', id: u ? u.id : null, f: u ? { name: u.name, role: u.role, stores: (u.stores || []).slice(), active: !!u.active, pin: '' } : { name: '', role: 'cashier', stores: STORES().length === 1 ? [STORES()[0].id] : [], active: true, pin: '' } });
  },
  userOk: async () => {
    const m = topModal(), f = m.f, name = String(f.name || '').trim(), pin = String(f.pin || '').trim();
    const six = f.role === 'admin' || f.role === 'manager';
    if (!name) return fErr(m, 'Ismni kiriting');
    if (!m.id && !pin) return fErr(m, 'PIN kiriting');
    const old = m.id ? U(m.id) : null;
    if (old && !isBoss(old) && six && !pin && S.pins[m.id]) return fErr(m, 'Rol o‘zgardi: 6 raqamli yangi PIN kiriting');
    if (pin && !(six ? /^\d{6}$/ : /^\d{4,6}$/).test(pin)) return fErr(m, six ? 'PIN aynan 6 ta raqamdan iborat bo‘lishi kerak' : 'PIN 4–6 ta raqamdan iborat bo‘lishi kerak');
    if ((f.role === 'manager' || f.role === 'cashier') && !f.stores.length) return fErr(m, 'Kamida bitta do‘konni belgilang');
    const admins = STAFF().filter(u => u.active && u.role === 'admin' && u.id !== m.id);
    if (!admins.length && (f.role !== 'admin' || !f.active)) return fErr(m, 'Kamida bitta faol administrator qolishi kerak');
    const id = m.id || 'u' + uid(8);
    m.busy = true; renderModal();
    try {
      const list = STAFF().map(u => Object.assign({}, u));
      let u = list.find(x => x.id === id); if (!u) { u = { id }; list.push(u); }
      Object.assign(u, { name, role: f.role, stores: f.stores.slice(), active: !!f.active });
      let pins = null;
      if (pin) { pins = Object.assign({}, S.pins); pins[id] = await makePin(pin); }
      await saveStaff(list, pins);
      emit('admin', { text: old ? `Xodim tahrirlandi: ${name}, ${ROLES[f.role]}${pin ? ', PIN o‘zgardi' : ''}${!f.active && old.active ? ', faolsizlantirildi' : ''}` : `Yangi xodim: ${name}, ${ROLES[f.role]}` });
      if (S.user && S.user.id === id) S.user = clone(U(id));
      dropModal(m); toast('Saqlandi'); render();
    } catch (e) { fErr(m, cfgErr(e)); }
  },

  /* sozlamalar */
  addStore: () => { S.ui.cfg.stores.push({ id: 'st' + uid(6), name: 'Yangi do‘kon', address: '', open: '08:00', close: '22:00' }); S._keepScroll = true; render(); },
  saveCfg: async () => {
    const c = S.ui.cfg; if (!c) return;
    if (c.stores.some(s => !String(s.name).trim())) return toast('Do‘kon nomini kiriting', 'bad');
    if (!String(c.shop).trim()) return toast('Biznes nomini kiriting', 'bad');
    const L = { discLimit: 'Chegirma chegarasi', varLimit: 'Farq chegarasi', voidAlert: 'Bekor qilish chegarasi', varStreak: 'Takroriy farq', maxShiftH: 'Smena davomiyligi', lockMin: 'Qulflash vaqti', debtLimit: 'Nasiya limiti', refundDays: 'Qaytarish muddati' };
    const old = S.cfg.main.settings;
    Object.keys(L).forEach(k => { c.settings[k] = Math.max(0, num(c.settings[k])); });
    const ch = Object.keys(L).filter(k => num(old[k]) !== num(c.settings[k])).map(k => `${L[k]}: ${num(old[k])} dan ${num(c.settings[k])} ga`);
    try {
      await saveMain(M => { M.settings = clone(c.settings); M.stores = clone(c.stores); M.shop = { name: String(c.shop).trim() }; });
      emit('admin', { text: 'Sozlamalar saqlandi' + (ch.length ? '. ' + ch.join('; ') : '') });
      S.ui.cfg = null; toast('Sozlamalar saqlandi'); S._keepScroll = true; render();
    } catch (e) { toast(cfgErr(e), 'bad'); }
  },
  devBlock: async d => {
    const bl = S.cfg.main.blocked.includes(d.id);
    try {
      await saveMain(M => { M.blocked = bl ? M.blocked.filter(x => x !== d.id) : M.blocked.concat([d.id]); });
      emit('admin', { text: `${bl ? 'Blokdan chiqarildi' : 'Bloklandi'}: ${dname(d.id)}, ${sname(storeOfDev(d.id))}` });
      S._keepScroll = true; render();
    } catch (e) { toast(cfgErr(e), 'bad'); }
  },
  maintNow: async () => { toast('Tozalash boshlandi'); await maintenance(true); S._keepScroll = true; render(); toast('Tozalash tugadi'); },
  resetDev: () => {
    if (curShift()) return toast('Avval shu kassadagi smenani yoping', 'bad');
    if (pendingCount() > 0) return toast('Hali yuborilmagan yozuvlar bor. Internetni tekshiring.', 'bad');
    pushModal({ type: 'confirm', title: 'Qurilmani qayta ulash', text: 'Qurilma sozlamasi o‘chadi va u yangi qurilma sifatida qayta ulanadi. Avvalgi yozuvlar bazada saqlanib qoladi.', ok: 'Qayta ulash', danger: true,
      onOk: () => { resetLocalDevice(); S.modals = []; S.ui.conn = null; render(); } });
  },
  wipeAll: () => pushModal({ type: 'confirm', title: 'Barcha ma’lumotlarni o‘chirish', text: 'Barcha cheklar, smenalar, mahsulotlar, xodimlar va sozlamalar butunlay o‘chiriladi. Buni qaytarib bo‘lmaydi.', ok: 'Hammasini o‘chirish', danger: true, onOk: wipeEverything }),
  demoClear: () => pushModal({ type: 'confirm', title: 'Namunani tozalash', text: 'Namuna ma’lumotlar o‘chiriladi va o‘z do‘koningizni sozlash oynasi ochiladi.', ok: 'Tozalash', danger: true, onOk: wipeEverything }),
  confirmOk: () => { const m = topModal(); if (!m || m.busy) return; if (m.keep) return m.onOk(m); popModal(); m.onOk(m); }
});
async function wipeEverything(m) {
  const cm = { type: 'confirm', title: 'O‘chirilmoqda', text: 'Iltimos, kuting. Oynani yopmang.', ok: 'Kuting', busy: true, onOk: () => { } };
  S.modals = [cm]; renderModal();
  try {
    await clearAll();
    resetLocalDevice(); LS.del('cfgc'); LS.del('pinsc'); LS.del('maint');
    S.cfg = null; S.pins = {}; S.live.clear(); S.docEv.clear(); S.rng.clear(); S.rngEv.clear(); S.rngDocEv.clear(); S.sums.clear(); S.sumDays.clear(); S.cust = new Map(); S.debt = new Map(); S.devs = new Map();
    S.modals = []; S.ui.onb = null; invalidate(); render();
    toast('Ma’lumotlar o‘chirildi');
  } catch (e) { S.modals = []; renderModal(); toast('O‘chirib bo‘lmadi: ' + dbErrCode(e), 'bad'); }
}
const cfgErr = e => { const c = dbErrCode(e); return c === 'invalid_argument' ? 'Saqlanmadi: bu o‘zgarish faqat ilova egasining akkauntidan qilinadi.' : c === 'unavailable' ? 'Saqlanmadi: internet aloqasini tekshiring.' : 'Saqlanmadi: ' + c; };
async function copyText(t, el) {
  try { await navigator.clipboard.writeText(t); toast('Nusxa olindi'); }
  catch (e) { if (el) { el.hidden = false; el.focus(); el.select(); toast('Matn belgilandi: nusxa olish uchun Ctrl+C bosing'); } else toast('Nusxa olib bo‘lmadi', 'bad'); }
}

/* ============ Maydonlar ============ */
Object.assign(IN, {
  q: v => { S.ui.q = v; const pl = $('#plist'); if (pl) pl.innerHTML = productsHTML(); },
  rq: v => { S.ui.rq = v; const M = model(), sh = curShift(), tab = S.ui.rtab; let list = [...M.receipts.values()].filter(r => r.store === S.dev.store); list = tab === 'shift' ? (sh ? list.filter(r => r.shift === sh.id) : []) : list.filter(r => r.day === today()); if (v.trim()) list = list.filter(r => String(r.no).includes(v.trim())); list.sort((a, b) => b.ts - a.ts); const el = $('#rlist'); if (el) el.innerHTML = rListHTML(list, tab, sh); },
  pq: v => { S.ui.pq = v; const el = $('#ptbody'); if (el) el.innerHTML = prodRows(); },
  cq: v => { S.ui.cq = v; S._keepScroll = true; render(); },
  ocash: v => { S.ui.ocash = v; },
  onb: (v, el) => { S.ui.onb.f[el.dataset.f] = v; },
  connName: v => { S.ui.conn.name = v; },
  f: (v, el) => {
    const m = topModal(); if (!m) return;
    m.f[el.dataset.f] = v;
    if (m.type === 'disc') { const i = $('#dinfo'); if (i) i.innerHTML = discInfo(m); }
    if (m.type === 'qty') { const it = m.pid ? PR(m.pid) : S.cart.items[m.i], s = $('#qsum'); if (s && it) s.textContent = qnum(v) ? 'Summa: ' + som(Math.round(it.price * qnum(v))) : ''; }
    if (m.type === 'pay' && el.dataset.f === 'cq') { clearTimeout(m._t); m._t = setTimeout(() => { if (topModal() === m) renderModal(); }, 150); }
    if (m.type === 'import') { clearTimeout(m._t); m._t = setTimeout(() => { if (topModal() === m) renderModal(); }, 300); }
  },
  payGiven: v => { const m = topModal(); m.f.given = v; updPayUI(); },
  mix: (v, el) => { const m = topModal(); m.f['mix_' + el.dataset.k] = v; updPayUI(); },
  den: (v, el) => { const c = closeState(), d = el.dataset.d; c.den[d] = num(v); const s = $('#ds' + d); if (s) s.textContent = c.den[d] ? fmt(d * c.den[d]) : ''; const t = $('#counted'); if (t) t.textContent = som(countedOf(c)); },
  ctotal: v => { const c = closeState(); c.total = v; const t = $('#counted'); if (t) t.textContent = som(countedOf(c)); },
  term: (v, el) => { closeState().term[el.dataset.k] = v; },
  creason: v => { closeState().reason = v; },
  cfgN: (v, el) => { S.ui.cfg.settings[el.dataset.f] = num(v); },
  cfgT: (v, el) => { S.ui.cfg.settings[el.dataset.f] = v; },
  cfgShop: v => { S.ui.cfg.shop = v; },
  cfgS: (v, el) => { S.ui.cfg.stores[+el.dataset.i][el.dataset.f] = v; }
});
Object.assign(CH, {
  onbSample: (v, el) => { S.ui.onb.f.sample = el.checked; },
  connStore: v => { S.ui.conn.store = v; S.ui.conn.name = ''; S.ui.conn.who = null; render(); },
  storeF: v => { S.ui.store = v; render(); },
  preset: v => { applyPreset(v); render(); },
  from: v => { if (v) S.ui.from = v; if (S.ui.from > S.ui.to) S.ui.to = S.ui.from; render(); },
  to: v => { if (v) S.ui.to = v; if (S.ui.to < S.ui.from) S.ui.from = S.ui.to; render(); },
  jd: v => { if (v) S.ui.jd = v; render(); },
  jt: v => { S.ui.jt = v; render(); },
  ju: v => { S.ui.ju = v; render(); },
  jdev: v => { S.ui.jdev = v; render(); },
  pcat: v => { S.ui.pcat = v; const el = $('#ptbody'); if (el) el.innerHTML = prodRows(); },
  cfgM: (v, el) => { S.ui.cfg.settings.methods[el.dataset.k] = el.checked; },
  cfgKeep: v => { S.ui.cfg.settings.keepDays = num(v); },
  fc: (v, el) => { const m = topModal(); if (m) m.f[el.dataset.f] = el.checked; },
  fsel: (v, el) => { const m = topModal(); if (m) { m.f[el.dataset.f] = v; renderModal(); } },
  fstore: (v, el) => { const m = topModal(); if (!m) return; const k = el.dataset.k; m.f.stores = m.f.stores.filter(x => x !== k); if (el.checked) m.f.stores.push(k); }
});
