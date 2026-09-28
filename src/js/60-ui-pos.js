/* ============ Kassa (sotuv) ============ */
VIEWS.pos = function vPos() {
  const sh = curShift(), u = S.user;
  if (!sh) {
    if (!canStore(u, S.dev.store) || u.role === 'viewer') return msg('Smena yopiq', 'Bu kassada smena ochishga ruxsatingiz yo‘q.');
    return `<div class="center"><div class="blk">
      <h2>Smenani ochish</h2>
      <p class="muted">Kassadagi boshlang‘ich naqd pulni (maydalikni) sanab kiriting. Smena ${esc(u.name)} nomiga ochiladi.</p>
      <input class="amt money" id="ocash" inputmode="numeric" autocomplete="off" placeholder="0" value="${moneyVal(S.ui.ocash)}" data-in="ocash" aria-label="Boshlang‘ich naqd, so‘m">
      ${numpad('ocash')}
      <button class="btn pri big wide" data-a="openShift">Smenani ochish</button>
    </div></div>`;
  }
  if (sh.user !== u.id) return msg(`Bu kassada ${esc(uname(sh.user))}ning smenasi ochiq`,
    `Smena ${dt(sh.openTs)} da ochilgan. Sotuvni faqat smena egasi qiladi. Kassir almashsa, avval shu smena yopiladi.`,
    `<div class="toolbar">${isBoss(u) ? `<button class="btn pri" data-a="go" data-v="close">Smenani yopish</button>` : ''}<button class="btn" data-a="lock">Boshqa foydalanuvchi</button></div>`);
  const cats = S.cfg.main.cats;
  return `<div class="pos">
    <section class="pos-left">
      <div class="searchrow"><label class="search">${I.search}<input id="q" data-in="q" placeholder="Mahsulot nomi yoki shtrix-kod" value="${esc(S.ui.q)}" autocomplete="off" aria-label="Mahsulot qidirish"></label>
        <button class="btn" data-a="go" data-v="close" title="Smenani yopish">${I.close}<span>Smenani yopish</span></button></div>
      <div class="chips" id="cats">${[['fav', 'Tezkor'], ['all', 'Hammasi'], ...cats.map(c => [c, c])].map(([k, n]) => `<button class="chip ${S.ui.cat === k ? 'on' : ''}" data-a="cat" data-k="${esc(k)}">${esc(n)}</button>`).join('')}</div>
      <div class="grid-products" id="plist">${productsHTML()}</div>
      <button class="cartbar" data-a="cartOpen" id="cartbar">${cartbarHTML()}</button>
    </section>
    <aside class="cart ${S.ui.cartOpen ? 'open' : ''}" id="cart" aria-label="Ochiq chek">${cartHTML()}</aside>
  </div>`;
};
function productsHTML() {
  const q = norm(S.ui.q), cat = S.ui.cat;
  let list = PRODUCTS().filter(p => p.active);
  if (q) list = list.filter(p => norm(p.name).includes(q) || (p.barcode || '').startsWith(q));
  else if (cat === 'fav') list = list.filter(p => p.fav);
  else if (cat !== 'all') list = list.filter(p => p.cat === cat);
  if (!list.length) return `<div class="empty">${q ? `“${esc(S.ui.q)}” bo‘yicha mahsulot topilmadi.` : cat === 'fav' ? 'Tezkor tugmalar yo‘q. Mahsulotlar bo‘limida mahsulotni “tezkor” deb belgilang.' : 'Bu bo‘limda mahsulot yo‘q.'}</div>`;
  return list.slice(0, 300).map(p => `<button class="tile" style="--cc:${catColor(p.cat)}" data-a="add" data-id="${esc(p.id)}"><span class="tn">${esc(p.name)}</span><span class="tp">${fmt(p.price)} <small>${SOM}${p.unit !== 'dona' ? ' / ' + esc(p.unit) : ''}</small></span></button>`).join('');
}
function cartCalc() {
  const c = S.cart;
  const sub = c.items.reduce((s, i) => s + Math.round(i.price * i.qty), 0);
  let disc = 0;
  if (c.disc && sub > 0) disc = c.disc.pct ? Math.round(sub * c.disc.pct / 100) : Math.min(num(c.disc.amount), sub);
  return { sub, disc, total: sub - disc };
}
function cartbarHTML() { const k = cartCalc(), n = S.cart.items.length; return `<span>${n ? n + ' ta pozitsiya' : 'Chek bo‘sh'}</span><span>${som(k.total)}</span>`; }
function cartHTML() {
  const c = S.cart, k = cartCalc();
  return `<div class="cart-h"><div class="t"><b>Ochiq chek</b><small>№ ${esc(nextReceipt().no)}</small></div>
    ${c.items.length ? `<button class="lnk" data-a="cartClear">Tozalash</button>` : ''}
    <button class="ib mob" data-a="cartClose" title="Yopish" aria-label="Yopish">${I.x}</button></div>
  <div class="cart-items">${c.items.length ? c.items.map((it, i) => `<div class="ci">
      <div class="ci-n">${esc(it.name)}<small>${fmt(it.price)} ${SOM}${it.unit !== 'dona' ? ' / ' + esc(it.unit) : ''}</small></div>
      <div class="ci-t">${fmt(Math.round(it.price * it.qty))}</div>
      <div class="ci-q"><button class="qb" data-a="qty" data-i="${i}" data-d="-1" aria-label="Kamaytirish">&minus;</button><button class="qv" data-a="qtyEdit" data-i="${i}" aria-label="Miqdor">${fq(it.qty)}${it.unit !== 'dona' ? ' ' + esc(it.unit) : ''}</button><button class="qb" data-a="qty" data-i="${i}" data-d="1" aria-label="Ko‘paytirish">+</button></div>
      <button class="ib rm" data-a="rmItem" data-i="${i}" title="Olib tashlash" aria-label="Olib tashlash">${I.x}</button>
    </div>`).join('') : `<div class="empty">Mahsulotni skanerlang yoki ro‘yxatdan tanlang.</div>`}</div>
  <div class="cart-f">
    <div class="row"><span>Jami</span><b>${som(k.sub)}</b></div>
    <div class="row"><button class="lnk" data-a="disc" ${c.items.length ? '' : 'disabled'}>${k.disc ? 'Chegirma: ' + esc(c.disc.reason) : 'Chegirma qo‘shish'}</button><span>${k.disc ? '&minus;' + som(k.disc) : ''}</span></div>
    <button class="btn pri big wide pay" data-a="pay" ${c.items.length && k.total > 0 ? '' : 'disabled'}><span>To‘lash</span><span>${som(k.total)}</span></button>
  </div>`;
}
function refreshCart() {
  saveSoft('cart', S.cart);
  const c = $('#cart'); if (c) c.innerHTML = cartHTML();
  const b = $('#cartbar'); if (b) b.innerHTML = cartbarHTML();
}
function addToCart(p, q) {
  const ex = S.cart.items.find(i => i.p === p.id && i.price === p.price);
  if (ex) ex.qty = r3(ex.qty + q); else S.cart.items.push({ p: p.id, name: p.name, price: p.price, unit: p.unit, qty: r3(q) });
  refreshCart();
}
function setQty(i, q) {
  const it = S.cart.items[i], sh = curShift(); if (!it) return;
  q = r3(Math.max(0, q));
  if (q < it.qty && sh) emit('item_remove', { shift: sh.id, p: it.p, name: it.name, price: it.price, qty: r3(it.qty - q) });
  if (q <= 0) S.cart.items.splice(i, 1); else it.qty = q;
  if (!S.cart.items.length) S.cart.disc = null;
  refreshCart();
}
function scanOrPick(v) {
  v = String(v || '').trim(); if (!v) return;
  const p = PRODUCTS().find(x => x.active && x.barcode && x.barcode === v);
  if (p) ACT.add({ id: p.id });
  else {
    const q = norm(v), list = PRODUCTS().filter(x => x.active && norm(x.name).includes(q));
    if (list.length === 1) ACT.add({ id: list[0].id });
    else if (/^\d{5,}$/.test(v)) toast('Shtrix-kod topilmadi: ' + v, 'bad');
    else return;
  }
  S.ui.q = ''; const qi = $('#q'); if (qi) qi.value = '';
  const pl = $('#plist'); if (pl) pl.innerHTML = productsHTML();
}
function doSale(pays, given, change, extra) {
  const sh = curShift(); if (!sh || sh.user !== S.user.id) { toast('Smena ochiq emas', 'bad'); return; }
  const k = cartCalc(), c = S.cart, nr = nextReceipt();
  const r = { id: uid(12), rn: nr.rn, no: nr.no, items: c.items.map(it => ({ p: it.p, name: it.name, qty: it.qty, price: it.price, unit: it.unit })),
    sub: k.sub, disc: k.disc, discPct: k.sub ? Math.round(k.disc / k.sub * 1000) / 10 : 0, discReason: c.disc ? c.disc.reason : '', discBy: c.disc ? c.disc.by || null : null,
    total: k.total, pays: pays.filter(p => num(p.a) > 0), given: given || 0, change: change || 0 };
  if (extra && extra.cust) r.cust = extra.cust;
  if (extra && extra.debtOver) { r.debtOver = true; r.debtBy = extra.debtBy || null; }
  const e = emit('sale', { shift: sh.id, r }, { rec: nr.rn });
  if (!e) return;
  S.cart = { items: [], disc: null }; saveSoft('cart', S.cart); S.ui.cartOpen = false;
  S.modals = [];
  render();
  pushModal({ type: 'receipt', id: r.id, fresh: true });
}

/* ---------- To'lov ---------- */
function quickCash(t) {
  const out = [];
  for (const st of [1000, 5000, 10000, 50000, 100000, 200000]) { const v = Math.ceil(t / st) * st; if (v > t && !out.includes(v)) out.push(v); }
  return out.slice(0, 5);
}
const mixSum = m => activeMethods().reduce((a, x) => a + num(m.f['mix_' + x.k]), 0);
function payNas(m, total) { return m.method === 'nasiya' ? total : m.method === 'mix' ? num(m.f.mix_nasiya) : 0; }
function payOk(m, total) {
  if (payNas(m, total) > 0 && !m.f.cust) return false;
  if (m.method === 'cash') { const g = num(m.f.given); return g === 0 || g >= total; }
  if (m.method === 'mix') return mixSum(m) === total;
  return true;
}
function changeHTML(m, total) {
  const g = num(m.f.given);
  if (!g) return `<span>Qaytim</span><span>0 ${SOM}</span>`;
  return g >= total ? `<span>Qaytim</span><span>${som(g - total)}</span>` : `<span>Yetmaydi</span><span>${som(total - g)}</span>`;
}
function mixHTML(m, total) {
  const r = total - mixSum(m);
  return r === 0 ? `<span>Summa to‘g‘ri</span><span>${som(total)}</span>` : r > 0 ? `<span>Qoldi</span><span>${som(r)}</span>` : `<span>Ortiqcha</span><span>${som(-r)}</span>`;
}
function custPickHTML(m, total) {
  const nas = payNas(m, total);
  if (nas <= 0) return '';
  const q = norm(m.f.cq), book = debtBook();
  const sel = m.f.cust ? custGet(m.f.cust) : null;
  if (m.f.newCust) return `<div class="custpick"><b>Yangi mijoz</b>
    <label class="f">Ismi<input class="inp" id="nc_name" data-in="f" data-f="ncName" value="${esc(m.f.ncName || '')}" maxlength="50" autocomplete="off"></label>
    <label class="f">Telefon<input class="inp" id="nc_phone" data-in="f" data-f="ncPhone" value="${esc(m.f.ncPhone || '')}" maxlength="20" inputmode="tel" placeholder="+998"></label>
    <div class="toolbar"><button class="btn sm" data-a="ncCancel">Bekor qilish</button><button class="btn sm pri" data-a="ncSave">Mijozni qo‘shish</button></div></div>`;
  if (sel) {
    const bal = book.bal.get(sel.id) || 0, lim = num(CFG().debtLimit);
    return `<div class="custpick"><div class="custrow on" style="border:1px solid var(--line);border-radius:13px"><span><b>${esc(sel.name)}</b><small>${esc(sel.phone || '')}</small></span><span style="text-align:right">Qarzi: <b>${som(bal)}</b><small>${lim ? 'Limit: ' + som(lim) : ''}</small></span></div>
      ${lim && bal + nas > lim ? `<div class="warnbox"><b>Limitdan oshadi:</b> ${som(bal + nas)}. Mudir yoki administrator tasdiqlaydi.</div>` : ''}
      <button class="lnk" data-a="custClear">Boshqa mijoz</button></div>`;
  }
  const list = allCustomers().filter(c => !q || norm(c.name).includes(q) || String(c.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '~')).sort((a, b) => (book.bal.get(b.id) || 0) - (book.bal.get(a.id) || 0)).slice(0, 30);
  return `<div class="custpick"><b>Nasiya kimga yoziladi?</b>
    <label class="search">${I.search}<input id="cpq" data-in="f" data-f="cq" placeholder="Ism yoki telefon" value="${esc(m.f.cq || '')}" autocomplete="off"></label>
    <div class="custlist">${list.map(c => `<button class="custrow" data-a="custPick" data-id="${esc(c.id)}"><span><b>${esc(c.name)}</b><small>${esc(c.phone || '')}</small></span><span class="bal">${fmt(book.bal.get(c.id) || 0)}</span></button>`).join('') || '<div class="empty" style="padding:14px">Mijoz topilmadi</div>'}</div>
    <button class="btn sm" data-a="ncOpen">${I.plus}Yangi mijoz</button></div>`;
}
function updPayUI() {
  const m = topModal(); if (!m || m.type !== 'pay') return;
  const t = cartCalc().total, ch = $('#change'), mx = $('#mixRest'), ok = $('#payOk');
  if (ch) { ch.innerHTML = changeHTML(m, t); ch.classList.toggle('bad', num(m.f.given) > 0 && num(m.f.given) < t); }
  if (mx) { mx.innerHTML = mixHTML(m, t); mx.classList.toggle('bad', mixSum(m) !== t); }
  if (ok) ok.disabled = !payOk(m, t);
  const cp = $('#custpick'); if (cp && m.method === 'mix') { const had = !!cp.innerHTML.trim(), need = payNas(m, t) > 0; if (had !== need) renderModal(); }
}
MOD.pay = m => {
  const t = cartCalc().total, ms = activeMethods(), meth = m.method;
  let right;
  if (meth === 'cash') right = `<label class="f">Xaridor bergan pul<input class="amt money" id="given" data-in="payGiven" inputmode="numeric" placeholder="${fmt(t)}" value="${moneyVal(m.f.given)}" autocomplete="off"></label>
      <div class="quick" style="margin-top:10px">${quickCash(t).map(v => `<button class="chip" data-a="quick" data-v="${v}">${fmt(v)}</button>`).join('')}</div>
      <div class="change" id="change">${changeHTML(m, t)}</div>${numpad('given')}`;
  else if (meth === 'mix') right = ms.map(x => `<div class="mixrow"><button class="lnk" data-a="mixFill" data-k="${x.k}" title="Qolgan summani shu yerga yozish">${x.n}</button><input class="inp money" id="mix_${x.k}" data-in="mix" data-k="${x.k}" inputmode="numeric" placeholder="0" value="${moneyVal(m.f['mix_' + x.k])}" aria-label="${x.n}"></div>`).join('')
      + `<div class="change" id="mixRest">${mixHTML(m, t)}</div><p class="note">To‘lov turi nomini bossangiz, qolgan summa shu qatorga yoziladi.</p><div id="custpick">${custPickHTML(m, t)}</div>`;
  else if (meth === 'nasiya') right = `<p style="font-size:17px">${som(t)} to‘liq qarzga yoziladi.</p><div id="custpick">${custPickHTML(m, t)}</div>`;
  else right = `<p style="font-size:17px">${esc(mname(meth))} orqali <b>${som(t)}</b> to‘lovni o‘tkazing. To‘lov muvaffaqiyatli o‘tgach, tasdiqlang.</p>`;
  return { title: 'To‘lov', cls: 'mid', focus: meth === 'cash' ? '#given' : null, enter: 'payOk',
    body: `<div class="dueline"><span>To‘lanadi</span><strong>${som(t)}</strong></div><div class="paygrid"><div class="mtabs">${[...ms, { k: 'mix', n: 'Aralash' }].map(x => `<button class="mtab ${meth === x.k ? 'on' : ''}" data-a="payM" data-k="${x.k}" style="--mc:${x.k === 'mix' ? 'var(--ink-3)' : 'var(--m-' + x.k + ')'}"><i></i>${x.n}</button>`).join('')}</div><div>${right}</div></div>${errLine(m)}`,
    foot: `<button class="btn" data-a="closeModal">Bekor qilish</button><button class="btn pri big" id="payOk" data-a="payOk" ${payOk(m, t) ? '' : 'disabled'}>To‘lovni tasdiqlash</button>` };
};

/* ---------- Chek ---------- */
function rStatus(r) {
  if (r.status === 'voided') return ['Bekor qilingan', 'bad'];
  if (r.refundedTotal >= num(r.total) && r.refundedTotal > 0) return ['Qaytarilgan', 'warn'];
  if (r.refundedTotal > 0) return ['Qisman qaytarilgan', 'warn'];
  return [r.cust && nasiyaPart(r.pays) ? 'Nasiya' : 'To‘langan', r.cust && nasiyaPart(r.pays) ? 'vio' : 'ok'];
}
const paysText = pays => (pays || []).map(p => mname(p.m) + ((pays || []).length > 1 ? ' ' + fmt(p.a) : '')).join(', ');
/* do'kon nomi biznes nomi bilan bir xil bo'lsa, chekda bir marta yoziladi */
function storeLine(st) {
  const shop = S.cfg ? S.cfg.main.shop.name : '';
  return st.name && norm(st.name) !== norm(shop) ? st.name : '';
}
function paperHTML(r) {
  const st = ST(r.store) || {}, sn = storeLine(st);
  return `<div class="paper">
    <div class="c"><b>${esc(S.cfg ? S.cfg.main.shop.name : '')}</b>${sn ? '<br>' + esc(sn) : ''}${st.address ? '<br>' + esc(st.address) : ''}</div><hr>
    <div class="row"><span>Chek</span><span>№ ${esc(r.no)}</span></div>
    <div class="row"><span>${dt(r.ts)}</span><span>${esc(dname(r.dev))}</span></div>
    <div class="row"><span>Kassir</span><span>${esc(uname(r.user))}</span></div><hr>
    ${r.items.map((it, i) => `<div class="it"><div>${esc(it.name)}</div><div class="row"><span>${fq(it.qty)} × ${fmt(it.price)}</span><span>${fmt(Math.round(num(it.price) * qnum(it.qty)))}</span></div>${r.refunded && r.refunded[i] ? `<div class="rf">Qaytarilgan: ${fq(r.refunded[i])}</div>` : ''}</div>`).join('')}
    <hr>${num(r.disc) > 0 ? `<div class="row"><span>Oraliq jami</span><span>${fmt(r.sub)}</span></div><div class="row"><span>Chegirma</span><span>&minus;${fmt(r.disc)}</span></div>` : ''}
    <div class="row big"><span>JAMI</span><span>${fmt(r.total)}</span></div>
    ${r.pays.map(p => `<div class="row"><span>${esc(mname(p.m))}</span><span>${fmt(p.a)}</span></div>`).join('')}
    ${num(r.given) > 0 ? `<div class="row"><span>Berildi</span><span>${fmt(r.given)}</span></div><div class="row"><span>Qaytim</span><span>${fmt(r.change)}</span></div>` : ''}
    ${r.cust ? `<div class="row"><span>Mijoz</span><span>${esc(custName(r.cust))}</span></div>` : ''}
    ${r.refundedTotal ? `<div class="row"><span>Qaytarilgan jami</span><span>${fmt(r.refundedTotal)}</span></div>` : ''}
    ${r.status === 'voided' ? `<div class="stamp">BEKOR QILINGAN</div>` : ''}
    <hr><div class="c">${esc(CFG().footer)}</div><div class="c small">Ichki nazorat cheki. Fiskal chek emas.</div>
  </div>`;
}
function receiptText(r) {
  const st = ST(r.store) || {}, L = [], sn = storeLine(st);
  L.push((S.cfg ? S.cfg.main.shop.name : '') + (sn ? ', ' + sn : ''));
  L.push('Chek № ' + r.no + '   ' + dt(r.ts));
  L.push('Kassir: ' + uname(r.user));
  L.push('--------------------------------');
  for (const it of r.items) L.push(it.name, '  ' + fq(it.qty) + ' x ' + fmt(it.price) + ' = ' + fmt(Math.round(num(it.price) * qnum(it.qty))));
  L.push('--------------------------------');
  if (num(r.disc) > 0) L.push('Chegirma: -' + fmt(r.disc));
  L.push('JAMI: ' + som(r.total));
  for (const p of r.pays) L.push(mname(p.m) + ': ' + fmt(p.a));
  if (num(r.given) > 0) L.push('Qaytim: ' + fmt(r.change));
  if (r.status === 'voided') L.push('BEKOR QILINGAN');
  L.push(CFG().footer);
  return L.join('\n').replace(/ /g, ' ');
}
function refundAllowed(r) { return dayDiff(r.day || dkey(r.ts), today()) <= num(CFG().refundDays); }
MOD.receipt = m => {
  const r = model().receipts.get(m.id);
  if (!r) return { title: 'Chek', body: `<div class="empty">Chek topilmadi.</div>` };
  const sh = curShift(), mine = isCashDev() && sh && sh.user === S.user.id && r.store === S.dev.store;
  const canVoid = mine && r.status === 'paid' && !r.refundedTotal && r.shift === sh.id;
  const canRefund = mine && r.status === 'paid' && r.refundedTotal < num(r.total) && refundAllowed(r);
  const v = r.voidEv;
  return { title: m.fresh ? 'To‘lov qabul qilindi' : 'Chek ' + r.no, cls: 'mid', focus: m.fresh ? '#newRec' : null,
    body: `${m.fresh && num(r.change) > 0 ? `<div class="change"><span>Qaytim</span><span>${som(r.change)}</span></div>` : ''}${paperHTML(r)}
      ${v ? `<p style="margin-top:12px">Bekor qildi: <b>${esc(uname(v.user))}</b>, ${dt(v.ts)}. Sabab: ${esc(v.reason)}. Tasdiqladi: ${esc(uname(v.by))}.</p>` : ''}
      ${r.refunds.length ? `<h4 style="margin:14px 0 6px">Qaytarishlar</h4>${r.refunds.map(f => `<p style="margin:4px 0">${dt(f.ts)}: <b>${som(f.total)}</b> (${esc(paysText(f.pays))}). Sabab: ${esc(f.reason)}. Tasdiqladi: ${esc(uname(f.by))}.</p>`).join('')}` : ''}
      ${!mine && r.status === 'paid' && isCashDev() && r.store === S.dev.store ? `<p class="note" style="margin-top:10px">Bekor qilish yoki qaytarish uchun o‘z smenangiz ochiq bo‘lishi kerak.</p>` : ''}
      ${mine && r.status === 'paid' && !refundAllowed(r) ? `<p class="note" style="margin-top:10px">Qaytarish muddati (${num(CFG().refundDays)} kun) o‘tgan.</p>` : ''}
      <textarea id="rtext" readonly hidden>${esc(receiptText(r))}</textarea>`,
    foot: `${canVoid ? `<button class="btn danger" data-a="voidRec" data-id="${esc(r.id)}">Bekor qilish</button>` : ''}${canRefund ? `<button class="btn" data-a="refundRec" data-id="${esc(r.id)}">Qaytarish</button>` : ''}
      ${canPrint() ? `<button class="btn" data-a="printRec" data-id="${esc(r.id)}">${I.print}Chop etish</button>` : ''}<button class="btn" data-a="copyRec">${I.copy}Nusxa olish</button>${m.fresh ? `<button class="btn pri" id="newRec" data-a="closeModal">Yangi chek</button>` : ''}` };
};

/* ---------- Chegirma, miqdor ---------- */
const reasonChips = (m, list, field) => `<div class="chips wrap">${list.map(x => `<button class="chip ${m.f[field || 'reason'] === x ? 'on' : ''}" data-a="setF" data-f="${field || 'reason'}" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  ${m.f[field || 'reason'] === 'Boshqa' ? `<label class="f" style="margin-top:10px">Sababni yozing<input class="inp" id="fnote" data-in="f" data-f="note" value="${esc(m.f.note || '')}" maxlength="200"></label>` : ''}`;
const reasonOf = m => m.f.reason === 'Boshqa' ? String(m.f.note || '').trim() : String(m.f.reason || '').trim();
function discInfo(m) {
  const k = cartCalc(), v = num(m.f.val);
  if (!v) return `Jami: ${som(k.sub)}`;
  const amt = m.f.mode === 'pct' ? Math.round(k.sub * v / 100) : v, pct = k.sub ? amt / k.sub * 100 : 0;
  let s = `Chegirma ${som(amt)} (${fq(Math.round(pct * 10) / 10)}%), to‘lanadi ${som(k.sub - amt)}.`;
  if (pct > num(CFG().discLimit)) s += ` Chegara ${CFG().discLimit}% dan katta: ${S.user.role === 'cashier' ? 'mudir yoki administrator tasdiqlaydi, ' : ''}egaga ogohlantirish boradi.`;
  return esc(s);
}
MOD.disc = m => {
  const f = m.f; if (!f.mode) f.mode = 'pct';
  return { title: 'Chegirma', focus: '#dval', enter: 'discOk',
    body: `<div class="seg" style="margin-bottom:12px"><button class="${f.mode === 'pct' ? 'on' : ''}" data-a="setF" data-f="mode" data-v="pct">Foiz</button><button class="${f.mode === 'sum' ? 'on' : ''}" data-a="setF" data-f="mode" data-v="sum">Summa</button></div>
      <input class="amt ${f.mode === 'sum' ? 'money' : ''}" id="dval" data-in="f" data-f="val" inputmode="numeric" placeholder="0" value="${f.mode === 'sum' ? moneyVal(f.val) : esc(f.val || '')}" aria-label="${f.mode === 'pct' ? 'Foiz' : 'Summa'}" autocomplete="off">
      <p class="note" id="dinfo" style="margin-top:8px">${discInfo(m)}</p><p style="font-weight:600;margin:14px 0 8px">Sabab</p>
      ${reasonChips(m, ['Doimiy xaridor', 'Aksiya', 'Nuqsonli mahsulot', 'Boshqa'])}${errLine(m)}`,
    foot: `${S.cart.disc ? `<button class="btn danger" data-a="discDel">Chegirmani olib tashlash</button>` : ''}<button class="btn" data-a="closeModal">Bekor qilish</button><button class="btn pri" data-a="discOk">Qo‘llash</button>` };
};
MOD.qty = m => {
  const it = m.pid ? PR(m.pid) : S.cart.items[m.i];
  if (!it) return { title: 'Miqdor', body: '' };
  const dec = it.unit !== 'dona' && it.unit !== 'quti';
  return { title: it.name, focus: '#qv', enter: 'qtyOk',
    body: `<p class="muted">${fmt(it.price)} ${SOM} / ${esc(it.unit)}. ${dec ? 'Tarozidagi og‘irlikni kiriting.' : 'Miqdorni kiriting.'}</p>
      <div style="display:flex;align-items:baseline;gap:8px;margin:10px 0"><input class="amt" id="qv" data-in="f" data-f="q" inputmode="decimal" placeholder="0" value="${esc(m.f.q || '')}" autocomplete="off"><b>${esc(it.unit)}</b></div>
      <p id="qsum" class="note">${qnum(m.f.q) ? 'Summa: ' + som(Math.round(it.price * qnum(m.f.q))) : ''}</p>${numpad('qv', dec)}`,
    foot: `<button class="btn" data-a="closeModal">Bekor qilish</button><button class="btn pri" data-a="qtyOk">Tayyor</button>` };
};

/* ---------- Tasdiqlash oynasi ---------- */
MOD.approve = m => {
  const who = m.who ? U(m.who) : null;
  if (!who) {
    const list = approvers();
    return { title: 'Tasdiqlash kerak', body: `<p style="font-weight:600">${esc(m.text)}</p><p class="note" style="margin:6px 0 12px">Kim tasdiqlaydi?</p>
      <div class="who" style="width:100%">${list.map(u => `<button class="whob" data-a="apWho" data-id="${esc(u.id)}">${avatar(u)}<b>${esc(u.name)}</b><small>${esc(ROLES[u.role])}</small></button>`).join('') || '<p class="muted">Bu do‘kon uchun mudir yoki administrator yo‘q.</p>'}</div>` };
  }
  return { title: 'Tasdiqlash',
    body: `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center">
      <p style="font-weight:600">${esc(m.text)}</p><p class="note">${esc(who.name)}, PIN kodingizni kiriting.</p>
      <div id="apdots">${pinDots(m.pin.length, !!m.err, 6)}</div><div class="err" id="aperr">${esc(m.busy ? 'Tekshirilmoqda…' : m.err)}</div>${keypad('apin')}
      <button class="lnk" data-a="apBack">Boshqa xodim</button></div>` };
};
function updApUI(m) { const d = $('#apdots'); if (d) d.innerHTML = pinDots(m.pin.length, !!m.err, 6); const e = $('#aperr'); if (e) e.textContent = m.busy ? 'Tekshirilmoqda…' : m.err; }
async function apinKey(k) {
  const m = topModal(); if (!m || m.type !== 'approve' || !m.who || m.busy) return;
  m.err = '';
  if (k === 'bk') m.pin = m.pin.slice(0, -1);
  else if (k !== 'ok') { if (m.pin.length < 6) m.pin += k; if (m.pin.length < 6) return updApUI(m); }
  if (k === 'ok' || m.pin.length === 6) {
    if (m.pin.length < 4) { m.err = 'PIN kamida 4 raqam'; return updApUI(m); }
    m.busy = true; updApUI(m);
    const u = U(m.who), ok = u && await checkPin(m.pin, S.pins[u.id]);
    m.busy = false; m.pin = '';
    if (!ok) { m.err = 'PIN noto‘g‘ri'; return updApUI(m); }
    dropModal(m); m.cb(u.id); return;
  }
  updApUI(m);
}

/* ---------- Bekor qilish va qaytarish ---------- */
function lineRefund(r, i, q) { const ratio = num(r.sub) ? num(r.total) / num(r.sub) : 1; return Math.round(num(r.items[i].price) * q * ratio); }
function refundCalc(r, qmap) {
  const items = []; let total = 0, allRest = true;
  r.items.forEach((it, i) => {
    const left = r3(qnum(it.qty) - (r.refunded[i] || 0)), q = Math.min(qmap[i] || 0, Math.max(0, left));
    if (q > 0) { const a = lineRefund(r, i, q); items.push({ i, qty: q, amount: a, p: it.p, name: it.name }); total += a; }
    if (q < left) allRest = false;
  });
  const maxLeft = num(r.total) - r.refundedTotal;
  if (allRest && items.length) total = maxLeft;
  total = Math.max(0, Math.min(total, maxLeft));
  const pays = []; let rest = total;
  /* avval naqd bo'lmagan turlarga (nasiya, karta), keyin naqdga: pul qayerdan kelgan bo'lsa, o'sha yerga qaytadi */
  const order = r.pays.slice().sort((a, b) => (a.m === 'cash') - (b.m === 'cash'));
  for (const p of order) { const avail = num(p.a) - (r.refundedBy[p.m] || 0); const a = Math.min(rest, Math.max(0, avail)); if (a > 0) { pays.push({ m: p.m, a }); rest -= a; } }
  return { items, total, pays };
}
MOD.void = m => {
  const r = model().receipts.get(m.id);
  return { title: 'Chek ' + r.no + 'ni bekor qilish',
    body: `<p>Chek o‘chirilmaydi: “bekor qilingan” holatiga o‘tadi va ${som(r.total)} teskari yozuv bilan qaytariladi (${esc(paysText(r.pays))}).</p>
      <p style="font-weight:600;margin:14px 0 8px">Sabab</p>${reasonChips(m, ['Xato urilgan', 'Xaridor voz kechdi', 'To‘lov o‘tmadi', 'Boshqa'])}${errLine(m)}`,
    foot: `<button class="btn" data-a="closeModal">Orqaga</button><button class="btn danger fill" data-a="voidOk">Chekni bekor qilish</button>` };
};
MOD.refund = m => {
  const r = model().receipts.get(m.id);
  if (!r) return { title: 'Qaytarish', body: '<div class="empty">Chek topilmadi.</div>' };
  if (r.day < S.liveFrom) { let ready = true; for (let d = r.day; d < S.liveFrom; d = addD(d, 1)) if (!rawReady(d)) ready = false; if (!ready) { loadRaw(r.day, addD(S.liveFrom, -1)); return { title: 'Qaytarish, chek ' + r.no, body: `<div class="center" style="min-height:120px"><div class="spin"></div><p class="note">Avvalgi qaytarishlar tekshirilmoqda…</p></div>` }; } }
  const calc = refundCalc(r, m.f.q);
  const rows = r.items.map((it, i) => {
    const left = r3(qnum(it.qty) - (r.refunded[i] || 0)), q = m.f.q[i] || 0;
    return `<div class="ci" style="padding:10px 0"><div class="ci-n">${esc(it.name)}<small>Sotilgan ${fq(it.qty)}, qaytarish mumkin ${fq(Math.max(0, left))}</small></div>
      <div class="ci-t">${q ? fmt(lineRefund(r, i, q)) : ''}</div>
      ${left > 0 ? `<div class="ci-q"><button class="qb" data-a="rq" data-i="${i}" data-d="-1" aria-label="Kamaytirish">&minus;</button><span class="qv" style="display:inline-grid;place-items:center">${fq(q)}</span><button class="qb" data-a="rq" data-i="${i}" data-d="1" aria-label="Ko‘paytirish">+</button></div>` : `<div class="ci-q muted">To‘liq qaytarilgan</div>`}</div>`;
  }).join('');
  return { title: 'Qaytarish, chek ' + r.no, cls: 'mid',
    body: `<p class="note">Qaytariladigan mahsulot va miqdorni tanlang. Pul asl to‘lov turida qaytariladi${r.cust && nasiyaPart(r.pays) ? ', nasiya qismi qarzdan ayriladi' : ''}.</p>${rows}
      <div class="change" style="margin-top:14px"><span>Qaytariladi</span><span>${som(calc.total)}</span></div>
      ${calc.pays.length ? `<p style="margin:0 0 12px">${calc.pays.map(p => `${esc(mname(p.m))}: <b>${som(p.a)}</b>`).join(', ')}</p>` : ''}
      <p style="font-weight:600;margin:14px 0 8px">Sabab</p>${reasonChips(m, ['Sifatsiz mahsulot', 'Muddati o‘tgan', 'Xaridor fikrini o‘zgartirdi', 'Boshqa'])}${errLine(m)}`,
    foot: `<button class="btn" data-a="closeModal">Orqaga</button><button class="btn pri" data-a="refundOk" ${calc.total > 0 ? '' : 'disabled'}>Qaytarishni tasdiqlash</button>` };
};
MOD.find = m => ({ title: 'Chekni topish', focus: '#fno', enter: 'findOk',
  body: `<label class="f">Chek raqami<input class="inp" id="fno" data-in="f" data-f="no" placeholder="Masalan: ${esc(S.dev && S.dev.code ? S.dev.code : 1)}-000012" value="${esc(m.f.no || '')}" autocomplete="off"></label>
    <p class="note" style="margin-top:8px">To‘liq raqamni yoki shu kassadagi chekning tartib raqamini kiriting. Shu do‘konning oxirgi ${num(CFG().keepDays)} kunlik cheklari qidiriladi.</p>${m.busy ? '<div class="toolbar" style="margin-top:10px"><div class="spin"></div><span class="note">Qidirilmoqda…</span></div>' : ''}${errLine(m)}`,
  foot: `<button class="btn" data-a="closeModal">Bekor qilish</button><button class="btn pri" data-a="findOk" ${m.busy ? 'disabled' : ''}>Topish</button>` });
async function findReceipt(m) {
  const v = String(m.f.no || '').trim(); if (!v) return fErr(m, 'Chek raqamini kiriting');
  const st = S.dev.store, M0 = model();
  let code = num(S.dev.code) || 1, n = 0;
  if (/^\d+-\d+$/.test(v)) { const [a, b] = v.split('-'); code = num(a); n = num(b); } else if (/^\d+$/.test(v)) n = num(v); else return fErr(m, 'Raqam noto‘g‘ri');
  const no = code + '-' + String(n).padStart(6, '0');
  let id = M0.byNo.get(st + '|' + no);
  if (!id && S.db) {
    m.busy = true; m.err = ''; renderModal();
    try {
      const devs = [...S.devs.values()].filter(d => d.store === st && d.type === 'cashier' && num(d.code) === code);
      for (const d of devs) {
        const snap = await withTimeout(S.db.collection('sum').where('dev', '==', d.id).where('r0', '<=', n).get(), 25000);
        const hit = snap.docs.map(x => x.data()).filter(s => num(s.r1) >= n).sort((a, b) => a.day < b.day ? 1 : -1)[0];
        if (hit) { await loadRaw(hit.day, hit.day); break; }
      }
    } catch (e) { handleDbErr(e, 'find'); }
    m.busy = false;
    id = model().byNo.get(st + '|' + no);
  }
  if (!id) return fErr(m, 'Bu do‘konda bunday chek topilmadi');
  dropModal(m); pushModal({ type: 'receipt', id });
}

/* ============ Cheklar ro'yxati ============ */
VIEWS.receipts = function vReceipts() {
  const M = model(), sh = curShift(), tab = S.ui.rtab, q = S.ui.rq.trim();
  let list = [...M.receipts.values()].filter(r => r.store === S.dev.store);
  if (tab === 'shift') list = sh ? list.filter(r => r.shift === sh.id) : [];
  else list = list.filter(r => r.day === today());
  if (q) list = list.filter(r => String(r.no).includes(q));
  list.sort((a, b) => b.ts - a.ts);
  return `<div class="wrap">
    <div class="toolbar"><div class="seg"><button class="${tab === 'shift' ? 'on' : ''}" data-a="rtab" data-k="shift">Joriy smena</button><button class="${tab === 'today' ? 'on' : ''}" data-a="rtab" data-k="today">Bugun, do‘kon</button></div>
      <label class="search" style="max-width:300px">${I.search}<input id="rq" data-in="rq" placeholder="Chek raqami" value="${esc(S.ui.rq)}" inputmode="numeric"></label>
      <div class="grow"></div><button class="btn" data-a="findRec">${I.search}Eski chekni topish</button></div>
    <div class="sec" style="padding:4px 8px"><div class="tw" id="rlist">${rListHTML(list, tab, sh)}</div></div>
  </div>`;
};
function rListHTML(list, tab, sh) {
  if (!list.length) return `<div class="empty">${tab === 'shift' && !sh ? 'Smena ochilmagan. Cheklar smena ochilgandan keyin shu yerda ko‘rinadi.' : 'Cheklar yo‘q.'}</div>`;
  return `<table class="tbl hover"><thead><tr><th>Chek</th><th>Vaqt</th><th>Kassir</th><th>To‘lov</th><th class="r">Summa</th><th>Holat</th></tr></thead><tbody>
    ${list.slice(0, 400).map(r => { const [t, c] = rStatus(r); return `<tr data-a="openRec" data-id="${esc(r.id)}"><td><b>${esc(r.no)}</b></td><td class="num">${hm(r.ts)}</td><td>${esc(uname(r.user))}</td><td>${esc(paysText(r.pays))}</td><td class="r"><b>${fmt(r.total)}</b></td><td><span class="badge ${c}">${t}</span></td></tr>`; }).join('')}
  </tbody></table>`;
}

/* ============ Kassa puli ============ */
VIEWS.cash = function vCash() {
  const sh = curShift();
  if (!sh || sh.user !== S.user.id) return msg('Smena ochilmagan', 'Kassaga pul kiritish va olish faqat o‘z smenangiz ochiq bo‘lganda yoziladi.', `<button class="btn pri" data-a="go" data-v="pos">Kassaga o‘tish</button>`);
  const T = shiftTotals(sh), evs = (model().shiftEv.get(sh.id) || []);
  const moves = evs.filter(e => e.t === 'cash' || e.t === 'debt_pay').slice().reverse();
  return `<div class="wrap">
    <div class="acts">
      <button class="act" data-a="move" data-k="collection">${I.out}<b>Inkassatsiya</b><small>Pulni egaga yoki bankka topshirish</small></button>
      <button class="act" data-a="move" data-k="expense">${I.exp}<b>Xarajat</b><small>Kassadan to‘langan xarajat</small></button>
      <button class="act" data-a="move" data-k="float_in">${I.inn}<b>Maydalik kiritish</b><small>Kassaga qo‘shimcha pul qo‘yish</small></button>
    </div>
    ${isBoss(S.user) ? `<div class="stats"><div class="stat"><small>Hisob bo‘yicha kassadagi naqd</small><b>${som(T.expected)}</b></div><div class="stat"><small>Smena tushumi</small><b>${som(T.netAll)}</b></div></div>` : ''}
    <div class="sec"><h3>Shu smenadagi pul harakatlari</h3>
    ${moves.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Vaqt</th><th>Turi</th><th>Sabab</th><th>Kim</th><th>Tasdiqladi</th><th class="r">Summa</th></tr></thead><tbody>
      ${moves.map(m => m.t === 'debt_pay'
        ? `<tr><td class="num">${hm(m.ts)}</td><td>Nasiya to‘lovi (${esc(mname(m.m))})</td><td>Qarzni qaytardi</td><td>${esc(custName(m.cust))}</td><td>—</td><td class="r"><b>+${fmt(m.amount)}</b></td></tr>`
        : `<tr><td class="num">${hm(m.ts)}</td><td>${esc(MOVE[m.kind] || m.kind)}</td><td>${esc(m.reason)}</td><td>${esc(m.person || '—')}</td><td>${m.by ? esc(uname(m.by)) : '—'}</td><td class="r"><b>${m.kind === 'float_in' ? '+' : '&minus;'}${fmt(m.amount)}</b></td></tr>`).join('')}
    </tbody></table></div>` : `<div class="empty">Hali pul harakati yo‘q.</div>`}</div>
  </div>`;
};
MOD.move = m => {
  const out = m.kind !== 'float_in';
  return { title: MOVE[m.kind], focus: '#mamt', enter: 'moveOk',
    body: `<input class="amt money" id="mamt" data-in="f" data-f="amount" inputmode="numeric" placeholder="0" value="${moneyVal(m.f.amount)}" aria-label="Summa, so‘m" autocomplete="off">
      ${numpad('mamt')}
      <div class="frm" style="margin-top:14px"><label class="f">Sabab<input class="inp" id="mreason" data-in="f" data-f="reason" value="${esc(m.f.reason || '')}" maxlength="200" placeholder="${m.kind === 'collection' ? 'Masalan: kun o‘rtasida egaga topshirildi' : m.kind === 'expense' ? 'Masalan: ichimlik suvi uchun to‘lov' : 'Masalan: maydalik tugadi'}"></label>
      <label class="f">${out ? 'Pulni kim oldi' : 'Pulni kim berdi'}<input class="inp" id="mperson" data-in="f" data-f="person" value="${esc(m.f.person || '')}" maxlength="80"></label></div>
      ${out && !isBoss(S.user) ? `<p class="note" style="margin-top:8px">Kassadan pul olish mudir yoki administrator PIN‘i bilan tasdiqlanadi.</p>` : ''}${errLine(m)}`,
    foot: `<button class="btn" data-a="closeModal">Bekor qilish</button><button class="btn pri" data-a="moveOk">Saqlash</button>` };
};

/* ============ Smenani yopish (ko'r sanash) ============ */
function closeState() {
  if (!S.ui.close) S.ui.close = { mode: 'den', den: {}, total: '', term: {}, reason: '', tried: false };
  return S.ui.close;
}
function countedOf(c) { return c.mode === 'den' ? DENOMS.reduce((s, d) => s + d * num(c.den[d]), 0) : num(c.total); }
const DEN_C = { 200000: '#8a6fb3', 100000: '#b98a3e', 50000: '#5d8f6a', 20000: '#b0704f', 10000: '#6c8bb5', 5000: '#9a7aa0', 2000: '#7aa39a', 1000: '#a58a6a' };
VIEWS.close = function vClose() {
  const sh = curShift(), u = S.user;
  if (!sh) return msg('Ochiq smena yo‘q', 'Bu kassada hozir ochiq smena yo‘q.', `<button class="btn pri" data-a="go" data-v="pos">Kassaga o‘tish</button>`);
  if (sh.user !== u.id && !isBoss(u)) return msg('Ruxsat yo‘q', 'Smenani uning egasi, mudir yoki administrator yopadi.');
  const c = closeState(), counted = countedOf(c), ms = activeMethods().filter(m => m.k !== 'cash' && m.k !== 'nasiya');
  const cartBlock = S.cart.items.length && sh.user === u.id;
  return `<div class="wrap">
    <p class="muted">${esc(uname(sh.user))} smenasi, ${dt(sh.openTs)} dan. Kassadagi pulni sanang: tizim kutilgan summani yopilgunga qadar ko‘rsatmaydi.</p>
    ${cartBlock ? `<div class="warnbox"><b>Ochiq chek bor.</b> Avval uni to‘lang yoki tozalang, keyin smenani yoping.</div>` : ''}
    <div class="cgrid">
      <section class="sec"><h3>1. Naqd pulni sanang</h3>
        <div class="seg" style="margin-bottom:10px"><button class="${c.mode === 'den' ? 'on' : ''}" data-a="cmode" data-k="den">Kupyuralar bo‘yicha</button><button class="${c.mode === 'sum' ? 'on' : ''}" data-a="cmode" data-k="sum">Umumiy summa</button></div>
        ${c.mode === 'den' ? DENOMS.map(d => `<div class="den"><span class="dl" style="--dc:${DEN_C[d] || 'var(--line-2)'}">${fmt(d)}</span>
            <span class="dc"><button class="qb" data-a="den" data-d="${d}" data-s="-1" aria-label="Kamaytirish">&minus;</button><input id="den${d}" data-in="den" data-d="${d}" inputmode="numeric" value="${num(c.den[d]) || ''}" placeholder="0" aria-label="${fmt(d)} so‘mlik soni"><button class="qb" data-a="den" data-d="${d}" data-s="1" aria-label="Ko‘paytirish">+</button></span>
            <span class="ds" id="ds${d}">${num(c.den[d]) ? fmt(d * num(c.den[d])) : ''}</span></div>`).join('')
        : `<input class="amt money" id="ctotal" data-in="ctotal" inputmode="numeric" placeholder="0" value="${moneyVal(c.total)}" aria-label="Sanalgan naqd">${numpad('ctotal')}`}
        <div class="counted"><span>Sanalgan naqd</span><strong id="counted">${som(counted)}</strong></div>
      </section>
      <section class="sec"><h3>2. Terminal va ilovalar yakuni</h3>
        <p class="note" style="margin-bottom:12px">Terminal, Click va Payme’ning smena yakuniy hisobotidagi summani kiriting.</p>
        <div class="frm">${ms.map(m => `<label class="f">${m.n}<input class="money" id="term_${m.k}" data-in="term" data-k="${m.k}" inputmode="numeric" placeholder="0" value="${moneyVal(c.term[m.k])}"></label>`).join('') || '<p class="muted">Karta va ilova to‘lovlari o‘chirilgan.</p>'}</div>
      </section>
    </div>
    ${c.tried ? `<div class="warnbox"><b>Sanalgan summa hisobdagi bilan mos kelmadi.</b> Pulni qayta sanang. Farq saqlanib qolsa, sababini yozib yoping: egaga xabar boradi.
      <label class="f" style="margin-top:10px">Farq sababi<textarea id="creason" data-in="creason" maxlength="300">${esc(c.reason)}</textarea></label></div>` : ''}
    <div class="stick"><button class="btn" data-a="go" data-v="pos">Orqaga</button><button class="btn pri big" data-a="closeShift" ${cartBlock ? 'disabled' : ''}>Smenani yopish</button></div>
  </div>`;
};

/* ============ Smena hisoboti (Z) ============ */
const varBadge = v => { v = num(v); const lim = num(CFG().varLimit); return v === 0 ? `<span class="badge ok">Farq yo‘q</span>` : `<span class="badge ${Math.abs(v) > lim ? 'bad' : 'warn'}">${v < 0 ? 'Kamomad ' : 'Ortiqcha '}${fmt(Math.abs(v))}</span>`; };
function zHTML(sh) {
  const T = shiftTotals(sh), c = sh.closed, u = S.user;
  const showExp = !!c || (u && u.role !== 'cashier');
  const used = MK.filter(m => m === 'cash' || (sh.by[m] && (sh.by[m].s || sh.by[m].r || sh.by[m].v || sh.by[m].d)));
  const b = m => sh.by[m] || { s: 0, r: 0, v: 0, d: 0 };
  const col = k => used.reduce((s, m) => s + b(m)[k], 0);
  const tbl = (head, rows) => `<div class="tw"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  const evs = model().shiftEv.get(sh.id) || [];
  const cash = b('cash');
  let h = `<div class="zr"><div class="zr-h"><div><b>${esc(sname(sh.store))}</b>, ${esc(dname(sh.dev))}</div><div>Kassir: ${esc(uname(sh.user))}</div><div>Ochildi: ${dt(sh.openTs)}${c ? `. Yopildi: ${dt(c.ts)}${c.by && c.by !== sh.user ? ' (' + esc(uname(c.by)) + ')' : ''}` : '. Smena ochiq'}</div></div>
    <h4>To‘lov turlari bo‘yicha</h4>
    ${tbl(`<th>To‘lov turi</th><th class="r">Sotuv</th><th class="r">Qaytarish</th><th class="r">Bekor</th><th class="r">Nasiya to‘lovi</th><th class="r">Sof sotuv</th>`,
      used.map(m => `<tr><td>${mname(m)}</td><td class="r">${fmt(b(m).s)}</td><td class="r">${fmt(b(m).r)}</td><td class="r">${fmt(b(m).v)}</td><td class="r">${fmt(b(m).d)}</td><td class="r"><b>${fmt(T.net[m])}</b></td></tr>`).join('')
      + `<tr class="tot"><td>Jami</td><td class="r">${fmt(col('s'))}</td><td class="r">${fmt(col('r'))}</td><td class="r">${fmt(col('v'))}</td><td class="r">${fmt(col('d'))}</td><td class="r">${fmt(T.netAll)}</td></tr>`)}
    <p style="margin-top:10px">Cheklar: ${sh.n} ta. Chegirmalar: ${sh.discN} ta, ${som(sh.disc)}. Bekor qilingan: ${sh.voidN} ta. Qaytarishlar: ${sh.refN} ta. Ochiq chekdan olib tashlashlar: ${sh.rmN} ta.</p>`;
  if (showExp) {
    const v = c ? num(c.variance) : null;
    h += `<h4>Naqd pul</h4><table class="kv">
      <tr><td>Boshlang‘ich naqd</td><td>${som(sh.openCash)}</td></tr>
      <tr><td>+ Naqd sotuv</td><td>${som(cash.s)}</td></tr>
      <tr><td>&minus; Naqd qaytarish</td><td>${som(cash.r)}</td></tr>
      <tr><td>&minus; Bekor qilingan naqd</td><td>${som(cash.v)}</td></tr>
      <tr><td>+ Nasiya to‘lovlari (naqd)</td><td>${som(cash.d)}</td></tr>
      <tr><td>+ Maydalik kiritish</td><td>${som(sh.mv.float_in)}</td></tr>
      <tr><td>&minus; Inkassatsiya</td><td>${som(sh.mv.collection)}</td></tr>
      <tr><td>&minus; Xarajat</td><td>${som(sh.mv.expense)}</td></tr>
      <tr class="sum"><td>Kutilgan naqd</td><td>${som(c ? c.expected : T.expected)}</td></tr>
      ${c ? `<tr><td>Sanalgan naqd</td><td>${som(c.counted)}</td></tr>
      <tr><td><b>Farq</b></td><td>${varBadge(v)}</td></tr>
      ${c.reason ? `<tr><td>Sabab</td><td style="white-space:normal">${esc(c.reason)}</td></tr>` : ''}
      ${sh.corr ? `<tr><td>Tuzatishlar</td><td>${sgn(sh.corr)}</td></tr><tr><td><b>Tuzatishdan keyingi farq</b></td><td>${varBadge(v + sh.corr)}</td></tr>` : ''}` : ''}
    </table>`;
    if (c && c.terms && Object.keys(c.terms).length) {
      h += `<h4>Terminal va ilovalar solishtiruvi</h4>${tbl(`<th>To‘lov turi</th><th class="r">Tizimda</th><th class="r">Terminalda</th><th class="r">Farq</th>`,
        Object.keys(c.terms).map(k => { const sys = num(c.sys && c.sys[k]), tr = num(c.terms[k]), d = tr - sys; return `<tr><td>${esc(mname(k))}</td><td class="r">${fmt(sys)}</td><td class="r">${fmt(tr)}</td><td class="r ${d ? 'neg' : ''}"><b>${d > 0 ? '+' : ''}${fmt(d)}</b></td></tr>`; }).join(''))}`;
    }
  }
  const voids = evs.filter(e => e.t === 'void'), refs = evs.filter(e => e.t === 'refund'), moves = evs.filter(e => e.t === 'cash'), dps = evs.filter(e => e.t === 'debt_pay'), corr = evs.filter(e => e.t === 'correction');
  if (voids.length) h += `<h4>Bekor qilingan cheklar</h4>${tbl(`<th>Chek</th><th>Vaqt</th><th>Sabab</th><th>Tasdiqladi</th><th class="r">Summa</th>`, voids.map(v => `<tr><td>${esc(v.no)}</td><td>${hm(v.ts)}</td><td>${esc(v.reason)}</td><td>${esc(uname(v.by))}</td><td class="r">${fmt(v.amount)}</td></tr>`).join(''))}`;
  if (refs.length) h += `<h4>Qaytarishlar</h4>${tbl(`<th>Asl chek</th><th>Vaqt</th><th>Sabab</th><th>Tasdiqladi</th><th class="r">Summa</th>`, refs.map(f => `<tr><td>${esc(f.no)}</td><td>${hm(f.ts)}</td><td>${esc(f.reason)}</td><td>${esc(uname(f.by))}</td><td class="r">${fmt(f.total)}</td></tr>`).join(''))}`;
  if (moves.length) h += `<h4>Kassaga pul kiritish va olish</h4>${tbl(`<th>Turi</th><th>Vaqt</th><th>Sabab</th><th>Kim</th><th class="r">Summa</th>`, moves.map(m => `<tr><td>${esc(MOVE[m.kind])}</td><td>${hm(m.ts)}</td><td>${esc(m.reason)}</td><td>${esc(m.person || '—')}${m.by ? ', tasdiq: ' + esc(uname(m.by)) : ''}</td><td class="r">${m.kind === 'float_in' ? '+' : '&minus;'}${fmt(m.amount)}</td></tr>`).join(''))}`;
  if (dps.length) h += `<h4>Nasiya to‘lovlari</h4>${tbl(`<th>Mijoz</th><th>Vaqt</th><th>Turi</th><th class="r">Summa</th>`, dps.map(d => `<tr><td>${esc(custName(d.cust))}</td><td>${hm(d.ts)}</td><td>${esc(mname(d.m))}</td><td class="r">${fmt(d.amount)}</td></tr>`).join(''))}`;
  if (corr.length) h += `<h4>Tuzatish yozuvlari</h4>${tbl(`<th>Vaqt</th><th>Kim</th><th>Sabab</th><th class="r">Summa</th>`, corr.map(k => `<tr><td>${dt(k.ts)}</td><td>${esc(uname(k.user))}</td><td>${esc(k.reason)}</td><td class="r">${sgn(k.amount)}</td></tr>`).join(''))}`;
  if (!evs.length && sh.openTs) h += `<p class="note" style="margin-top:14px">Bu smenaning batafsil yozuvlari arxivlangan: faqat jami ko‘rsatkichlar mavjud.</p>`;
  return h + '</div>';
}
MOD.z = m => {
  const sh = (S.zc && S.zc.get(m.id)) || model().shifts.get(m.id);
  if (!sh) return { title: 'Smena hisoboti', body: `<div class="empty">Smena topilmadi.</div>` };
  return { title: 'Smena hisoboti', cls: 'wide', body: zHTML(sh),
    foot: `${S.user && S.user.role === 'admin' && sh.closed && !S.readOnly && S.dev ? `<button class="btn" data-a="corr" data-id="${esc(sh.id)}">Tuzatish kiritish</button>` : ''}${canPrint() ? `<button class="btn" data-a="printZ" data-id="${esc(sh.id)}">${I.print}Chop etish</button>` : ''}<button class="btn pri" data-a="closeModal">Yopish</button>` };
};
MOD.corr = m => ({ title: 'Tuzatish yozuvi', focus: '#camt', enter: 'corrOk',
  body: `<p class="note">Yopilgan smena tahrirlanmaydi. Tuzatish alohida yozuv bo‘lib, farqqa qo‘shiladi va jurnalda saqlanadi.</p>
    <div class="seg" style="margin:10px 0"><button class="${m.f.sign === '+' ? 'on' : ''}" data-a="setF" data-f="sign" data-v="+">Pul topildi (+)</button><button class="${m.f.sign === '-' ? 'on' : ''}" data-a="setF" data-f="sign" data-v="-">Pul yetmaydi (&minus;)</button></div>
    <input class="amt money" id="camt" data-in="f" data-f="amount" inputmode="numeric" placeholder="0" value="${moneyVal(m.f.amount)}" aria-label="Summa">
    <label class="f" style="margin-top:12px">Sabab<input class="inp" id="creas" data-in="f" data-f="reason" value="${esc(m.f.reason || '')}" maxlength="200"></label>${errLine(m)}`,
  foot: `<button class="btn" data-a="closeModal">Bekor qilish</button><button class="btn pri" data-a="corrOk">Tuzatishni saqlash</button>` });
MOD.confirm = m => ({ title: m.title, body: `<p>${esc(m.text)}</p>${m.busy ? '<div class="toolbar" style="margin-top:12px"><div class="spin"></div><span class="note" id="onbprog"></span></div>' : ''}`,
  foot: `<button class="btn" data-a="closeModal" ${m.busy ? 'disabled' : ''}>Bekor qilish</button><button class="btn ${m.danger ? 'danger fill' : 'pri'}" data-a="confirmOk" ${m.busy ? 'disabled' : ''}>${esc(m.ok)}</button>` });
