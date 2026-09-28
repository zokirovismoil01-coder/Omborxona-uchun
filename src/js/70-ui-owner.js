/* ============ Nazorat (egasi paneli) ============ */
function dayLabel(k) { const t = today(); return k === t ? 'Bugun' : k === addD(t, -1) ? 'Kecha' : DAYS[new Date(k2ts(k)).getDay()] + ', ' + longDay(k); }
function storeSelect(id) {
  const st = myStores();
  if (st.length < 2) return '';
  return `<select class="inp" style="width:auto" id="${id}" data-ch="storeF" aria-label="Do‘kon">${[['all', 'Barcha do‘konlar'], ...st.map(s => [s.id, s.name])].map(([k, n]) => `<option value="${esc(k)}" ${S.ui.store === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
}
const netOf = (a, m) => { const b = a.by[m] || { s: 0, r: 0, v: 0 }; return b.s - b.r - b.v; };
function hoursSVG(hours) {
  let a = 23, b = 0;
  hours.forEach((v, h) => { if (v > 0) { a = Math.min(a, h); b = Math.max(b, h); } });
  if (a > b) { a = 8; b = 21; }
  a = Math.min(a, 8); b = Math.max(b, 21);
  const n = b - a + 1, W = 640, H = 190, pl = 8, pb = 22, pt = 18, bw = (W - pl * 2) / n;
  const max = Math.max(1, ...hours.map(v => Math.max(0, v)));
  const peak = hours.indexOf(Math.max(...hours));
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Soatlar bo‘yicha savdo">`;
  s += `<line class="gl" x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}"/><line class="gl" x1="0" x2="${W}" y1="${pt + (H - pb - pt) / 2}" y2="${pt + (H - pb - pt) / 2}" stroke-dasharray="3 5"/>`;
  for (let i = 0; i < n; i++) {
    const h = a + i, v = Math.max(0, hours[h]), bh = (H - pb - pt) * v / max, x = pl + i * bw;
    s += `<rect class="b" x="${(x + bw * 0.16).toFixed(1)}" y="${(H - pb - bh).toFixed(1)}" width="${(bw * 0.68).toFixed(1)}" height="${bh.toFixed(1)}" rx="3"><title>${pad(h)}:00–${pad(h + 1)}:00, ${fmt(v)} ${SOM}</title></rect>`;
    if (h === peak && v > 0) s += `<text class="vl" x="${(x + bw / 2).toFixed(1)}" y="${(H - pb - bh - 5).toFixed(1)}" text-anchor="middle">${fmt(Math.round(v / 1000))}k</text>`;
    if (i % 2 === 0) s += `<text class="ax" x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${pad(h)}</text>`;
  }
  return s + '</svg>';
}
function trendSVG(days, sel) {
  const keys = [...days.keys()], vals = keys.map(k => Math.max(0, days.get(k).net));
  const W = 640, H = 170, pl = 8, pb = 22, pt = 18, n = keys.length, bw = (W - pl * 2) / n, max = Math.max(1, ...vals);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kunlik tushum">`;
  s += `<line class="gl" x1="0" x2="${W}" y1="${H - pb}" y2="${H - pb}"/>`;
  keys.forEach((k, i) => {
    const v = vals[i], bh = (H - pb - pt) * v / max, x = pl + i * bw, on = k === sel;
    s += `<rect class="b ${on ? '' : 'dim'}" x="${(x + bw * 0.14).toFixed(1)}" y="${(H - pb - bh).toFixed(1)}" width="${(bw * 0.72).toFixed(1)}" height="${Math.max(0, bh).toFixed(1)}" rx="3" data-a="pickDay" data-d="${k}" style="cursor:pointer"><title>${dmy(k2ts(k))}, ${fmt(v)} ${SOM}</title></rect>`;
    if (on && v > 0) s += `<text class="vl" x="${(x + bw / 2).toFixed(1)}" y="${(H - pb - bh - 5).toFixed(1)}" text-anchor="middle">${fmt(Math.round(v / 1000))}k</text>`;
    s += `<text class="ax" x="${(x + bw / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${DAYS_S[new Date(k2ts(k)).getDay()]}</text>`;
  });
  return s + '</svg>';
}
VIEWS.dash = function vDash() {
  const day = S.ui.day, sf = S.ui.store, t = today(), from14 = addD(day, -13), prev = addD(day, -7);
  periodEnsure(from14, day);
  const P = periodData(day, day, sf), a = P.days.get(day);
  const pa = periodData(prev, prev, sf).days.get(prev);
  const T14 = periodData(from14, day, sf);
  const stores = myStores().filter(s => sf === 'all' || s.id === sf);
  const M = model();
  const open = [...M.shifts.values()].filter(sh => sh.openTs && !sh.closed && stores.some(s => s.id === sh.store));
  const al = alertsFor(addD(day, -6), day, sf).slice(0, 7);
  const pos = MK.map(m => [m, Math.max(0, netOf(a, m))]), sum = pos.reduce((s, [, v]) => s + v, 0);
  const cmp = pa && pa.net > 0 ? Math.round((a.net - pa.net) / pa.net * 100) : null;
  const top = Object.entries(a.items).filter(([, v]) => v[1] > 0).sort((x, y) => y[1][1] - x[1][1]).slice(0, 7);
  const topMax = top.length ? top[0][1][1] : 1;
  const book = debtBook();
  const debtors = [...book.bal.entries()].filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]).slice(0, 4);
  return `<div class="wrap">
    <div class="dhead"><div class="datenav"><button class="ib" data-a="day" data-d="-1" title="Oldingi kun" aria-label="Oldingi kun">${I.back}</button><b>${dayLabel(day)}</b><button class="ib" data-a="day" data-d="1" title="Keyingi kun" aria-label="Keyingi kun" ${day >= t ? 'disabled' : ''}>${I.fwd}</button></div>${storeSelect('dstore')}${P.loading ? '<div class="spin" title="Yuklanmoqda"></div>' : ''}</div>
    <section class="hero">
      <div class="heromain">
        <div class="lbl">Sof tushum: qaytarish va bekor qilishdan keyin</div>
        <div class="big">${som(a.net)}</div>
        ${cmp !== null ? `<span class="cmp">${cmp >= 0 ? '▲' : '▼'} ${Math.abs(cmp)}% o‘tgan ${DAYS[new Date(k2ts(prev)).getDay()].toLowerCase()}ga nisbatan</span>` : ''}
        <div class="kpis">
          <div class="kpi"><small>Cheklar</small><b>${a.n}</b></div>
          <div class="kpi"><small>O‘rtacha chek</small><b>${a.n ? fmt(Math.round(a.gross / a.n)) : '—'}</b></div>
          <div class="kpi"><small>Nasiyaga</small><b>${fmt(a.nas)}</b></div>
        </div>
      </div>
      <div class="methods"><div class="sh" style="margin:0"><h3 style="font-size:16px">To‘lov turlari</h3><span class="grow"></span><span class="note">Qaytarish: ${a.refN} ta, bekor: ${a.voidN} ta</span></div>
        <div class="mbar">${sum ? pos.filter(([, v]) => v > 0).map(([m, v]) => `<i style="width:${(v / sum * 100).toFixed(2)}%;background:var(--m-${m})" title="${mname(m)}"></i>`).join('') : ''}</div>
        <ul class="mlist">${MK.filter(m => m === 'cash' || CFG().methods[m] || netOf(a, m)).map(m => `<li><i style="background:var(--m-${m})"></i><span>${mname(m)}</span><b>${fmt(netOf(a, m))}</b></li>`).join('')}</ul>
        <div class="note">Chegirmalar: ${som(a.disc)}. Nasiya qaytarildi: ${som(a.dp)}. Inkassatsiya: ${som(a.mv.collection)}.</div>
      </div>
    </section>
    <div class="dgrid">
      <div style="display:flex;flex-direction:column;gap:18px;min-width:0">
        <section class="sec"><h2>Do‘konlar</h2>
          ${stores.map(s => { const p = periodData(day, day, s.id).days.get(day); const os = open.filter(sh => sh.store === s.id);
            const cashNow = os.reduce((x, sh) => x + shiftTotals(sh).expected, 0);
            return `<div class="srow"><span class="sn">${esc(s.name)}</span><span class="sv">${som(p.net)}</span>
              <div class="sm"><span>${p.n} ta chek</span>${os.length ? os.map(sh => `<span class="badge ok">${esc(dname(sh.dev))}: ${esc(uname(sh.user))}, ${hm(sh.openTs)} dan</span>`).join('') : `<span class="badge">Ochiq smena yo‘q</span>`}${os.length && day === t ? `<span>Kassada hisob bo‘yicha: <b class="num">${som(cashNow)}</b></span>` : ''}</div></div>`; }).join('') || `<div class="empty">Do‘kon yo‘q.</div>`}
        </section>
        <section class="sec"><h2>Soatlar bo‘yicha savdo</h2>${a.n ? hoursSVG(a.hours) : `<div class="empty">${day === t ? 'Bugun hali sotuv yo‘q. Kassada smena ochilgach, savdo shu yerda ko‘rinadi.' : 'Bu kunda sotuv bo‘lmagan.'}</div>`}</section>
        <section class="sec"><div class="sh"><h2 style="font-size:16px">Oxirgi 14 kun</h2><span class="grow"></span><span class="note">Jami: ${som(sumDays(T14.days).net)}</span></div>${trendSVG(T14.days, day)}</section>
      </div>
      <div style="display:flex;flex-direction:column;gap:18px;min-width:0">
        <section class="sec"><h2>Ogohlantirishlar</h2>
          ${al.length ? `<ul class="alist">${al.map(x => `<li class="${x.ts > S.prevSeen ? 'new' : ''}"><span class="dotc ${x.lvl === 'bad' ? 'bad' : ''}"></span><span class="ax">${esc(x.text)}</span><span class="at">${esc(ALERT_KIND[x.kind])}, ${esc(sname(x.store))}, ${dt(x.ts)}</span></li>`).join('')}</ul>
            <button class="lnk" data-a="goAlerts">Barcha ogohlantirishlar</button>` : `<div class="empty">Shubhali harakat yo‘q.</div>`}
        </section>
        <section class="sec"><h2>Eng ko‘p sotilgan</h2>
          ${top.length ? `<ul class="toplist">${top.map(([, v]) => `<li><span>${esc(v[2] || 'Mahsulot')} <small>· ${fq(v[0])}</small></span><b>${fmt(v[1])}</b><span class="tb"><i style="width:${Math.max(3, v[1] / topMax * 100).toFixed(1)}%"></i></span></li>`).join('')}</ul>` : `<div class="empty">Sotuv yo‘q.</div>`}
        </section>
        <section class="sec"><div class="sh"><h2 style="font-size:16px">Nasiya</h2><span class="grow"></span><button class="lnk" data-a="go" data-v="nasiya">Daftar</button></div>
          <div class="stats"><div class="stat"><small>Jami qarz</small><b>${som(book.total)}</b></div><div class="stat"><small>Qarzdorlar</small><b>${book.owing}</b></div></div>
          ${debtors.length ? `<ul class="toplist" style="margin-top:8px">${debtors.map(([id, v]) => `<li><span>${esc(custName(id))}</span><b>${fmt(v)}</b></li>`).join('')}</ul>` : ''}
        </section>
      </div>
    </div>
  </div>`;
};

/* ============ Hisobotlar ============ */
const PRESETS = [['today', 'Bugun'], ['yday', 'Kecha'], ['7', 'Oxirgi 7 kun'], ['30', 'Oxirgi 30 kun'], ['month', 'Shu oy'], ['pmonth', 'O‘tgan oy'], ['custom', 'Boshqa oraliq']];
function applyPreset(k) {
  const t = today();
  if (k === 'today') { S.ui.from = t; S.ui.to = t; }
  else if (k === 'yday') { S.ui.from = S.ui.to = addD(t, -1); }
  else if (k === '7') { S.ui.from = addD(t, -6); S.ui.to = t; }
  else if (k === '30') { S.ui.from = addD(t, -29); S.ui.to = t; }
  else if (k === 'month') { S.ui.from = t.slice(0, 8) + '01'; S.ui.to = t; }
  else if (k === 'pmonth') { const f = addD(t.slice(0, 8) + '01', -1); S.ui.from = f.slice(0, 8) + '01'; S.ui.to = f; }
  S.ui.preset = k;
}
function rangeBar() {
  if (!S.ui.from) applyPreset('7');
  const t = today();
  return `<select class="inp" style="width:auto" id="rpreset" data-ch="preset" aria-label="Davr">${PRESETS.map(([k, n]) => `<option value="${k}" ${S.ui.preset === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
    ${S.ui.preset === 'custom' ? `<input type="date" class="inp" style="width:auto" id="rfrom" data-ch="from" value="${S.ui.from}" max="${t}" aria-label="Dan"><input type="date" class="inp" style="width:auto" id="rto" data-ch="to" value="${S.ui.to}" max="${t}" aria-label="Gacha">` : `<span class="note">${dmy(k2ts(S.ui.from))}${S.ui.from !== S.ui.to ? ' – ' + dmy(k2ts(S.ui.to)) : ''}</span>`}`;
}
VIEWS.reports = function vReports() {
  const u = S.user, cashier = u.role === 'cashier';
  const tabs = cashier ? [['shifts', 'Smenalar']] : [['shifts', 'Smenalar'], ['days', 'Kunlar'], ['cashiers', 'Kassirlar'], ['alerts', 'Ogohlantirishlar']];
  if (!tabs.find(x => x[0] === S.ui.rep)) S.ui.rep = 'shifts';
  if (!S.ui.from) applyPreset('7');
  periodEnsure(S.ui.from, S.ui.to);
  const r = S.ui.rep, P = periodData(S.ui.from, S.ui.to, cashier ? 'all' : S.ui.store);
  S.zc = new Map(P.shifts.map(sh => [sh.id, sh]));
  let body;
  if (r === 'shifts') body = repShifts(P, cashier);
  else if (r === 'days') body = repDays(P);
  else if (r === 'cashiers') body = repCashiers(P);
  else body = repAlerts();
  return `<div class="wrap">
    <div class="toolbar"><div class="seg">${tabs.map(([k, n]) => `<button class="${r === k ? 'on' : ''}" data-a="rep" data-k="${k}">${n}</button>`).join('')}</div>
      <div class="grow"></div>${rangeBar()}${cashier ? '' : storeSelect('rstore')}
      ${r !== 'alerts' ? `<button class="btn" data-a="csv">${I.down}Excel (CSV)</button>` : ''}${P.loading ? '<div class="spin" title="Yuklanmoqda"></div>' : ''}</div>
    ${body}
  </div>`;
};
function repShifts(P, cashier) {
  const list = P.shifts.filter(sh => !cashier || sh.user === S.user.id);
  if (!list.length) return `<div class="sec"><div class="empty">Tanlangan davrda smena yo‘q.</div></div>`;
  return `<div class="sec" style="padding:4px 8px"><div class="tw"><table class="tbl hover"><thead><tr><th>Sana</th><th>Do‘kon, kassa</th><th>Kassir</th><th>Vaqt</th><th class="r">Tushum</th><th>Naqd farq</th></tr></thead><tbody>
    ${list.map(sh => { const T = shiftTotals(sh); return `<tr data-a="openZ" data-id="${esc(sh.id)}"><td class="num">${dmy(sh.openTs)}</td><td>${esc(sname(sh.store))}<small>${esc(dname(sh.dev))}</small></td><td>${esc(uname(sh.user))}</td><td class="num">${hm(sh.openTs)}–${sh.closed ? hm(sh.closed.ts) : '…'}</td><td class="r"><b>${fmt(T.netAll)}</b></td><td>${sh.closed ? varBadge(num(sh.closed.variance) + num(sh.corr)) : `<span class="badge info">Ochiq</span>`}</td></tr>`; }).join('')}
  </tbody></table></div></div>`;
}
const DAYCOLS = [['n', 'Cheklar'], ['net', 'Sof tushum'], ...MK.map(m => ['m:' + m, mname(m)]), ['refSum', 'Qaytarish'], ['voidSum', 'Bekor'], ['disc', 'Chegirma'], ['dp', 'Nasiya to‘lovi'], ['col', 'Inkassatsiya'], ['exp', 'Xarajat']];
const dayVal = (a, k) => k.startsWith('m:') ? netOf(a, k.slice(2)) : k === 'col' ? a.mv.collection : k === 'exp' ? a.mv.expense : num(a[k]);
function repDays(P) {
  const rows = [...P.days.entries()].reverse(), tot = sumDays(P.days);
  const cols = DAYCOLS.filter(([k]) => !k.startsWith('m:') || k === 'm:cash' || CFG().methods[k.slice(2)] || netOf(tot, k.slice(2)));
  return `<div class="sec" style="padding:4px 8px"><div class="tw"><table class="tbl"><thead><tr><th>Sana</th>${cols.map(([, n]) => `<th class="r">${n}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(([d, a]) => `<tr><td class="num">${dmy(k2ts(d))}<small>${DAYS[new Date(k2ts(d)).getDay()]}</small></td>${cols.map(([k]) => `<td class="r">${k === 'net' ? '<b>' + fmt(dayVal(a, k)) + '</b>' : fmt(dayVal(a, k))}</td>`).join('')}</tr>`).join('')}
    <tr class="tot"><td>Jami</td>${cols.map(([k]) => `<td class="r">${fmt(dayVal(tot, k))}</td>`).join('')}</tr>
  </tbody></table></div></div>`;
}
function cashierStats(P) {
  const map = new Map();
  for (const sh of P.shifts) {
    if (!map.has(sh.user)) map.set(sh.user, { u: sh.user, n: 0, net: 0, varSum: 0, shortN: 0, voidN: 0, discN: 0, refN: 0, hist: [] });
    const a = map.get(sh.user), T = shiftTotals(sh);
    a.n++; a.net += T.netAll; a.voidN += sh.voidN; a.discN += sh.discN; a.refN += sh.refN;
    if (sh.closed) { const v = num(sh.closed.variance) + num(sh.corr); a.varSum += v; if (v < 0) a.shortN++; a.hist.push(sh); }
  }
  return [...map.values()].sort((a, b) => a.varSum - b.varSum);
}
function repCashiers(P) {
  const list = cashierStats(P);
  if (!list.length) return `<div class="sec"><div class="empty">Tanlangan davrda smena yo‘q.</div></div>`;
  return `<div class="sec" style="padding:4px 8px"><div class="tw"><table class="tbl hover"><thead><tr><th>Kassir</th><th class="r">Smenalar</th><th class="r">Tushum</th><th class="r">Farqlar yig‘indisi</th><th class="r">Kamomadlar</th><th class="r">Bekor</th><th class="r">Chegirma</th><th class="r">Qaytarish</th></tr></thead><tbody>
    ${list.map(a => `<tr data-a="expC" data-id="${esc(a.u)}"><td><b>${esc(uname(a.u))}</b></td><td class="r">${a.n}</td><td class="r">${fmt(a.net)}</td><td class="r ${a.varSum < 0 ? 'neg' : ''}"><b>${a.varSum > 0 ? '+' : ''}${fmt(a.varSum)}</b></td><td class="r">${a.shortN}</td><td class="r">${a.voidN}</td><td class="r">${a.discN}</td><td class="r">${a.refN}</td></tr>
      ${S.ui.expC === a.u ? `<tr><td colspan="8" style="background:var(--surface-2)"><b>Farqlar tarixi</b>${a.hist.length ? a.hist.sort((x, y) => y.closed.ts - x.closed.ts).map(sh => `<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0"><span>${dt(sh.closed.ts)}, ${esc(sname(sh.store))}</span>${varBadge(num(sh.closed.variance) + num(sh.corr))}</div>`).join('') : '<div class="muted">Yopilgan smena yo‘q.</div>'}</td></tr>` : ''}`).join('')}
  </tbody></table></div></div>`;
}
function repAlerts() {
  const f = S.ui.af, list = alertsFor(S.ui.from, S.ui.to, S.ui.store).filter(a => f === 'all' || a.kind === f);
  return `<div class="chips">${[['all', 'Hammasi'], ...Object.entries(ALERT_KIND)].map(([k, n]) => `<button class="chip ${f === k ? 'on' : ''}" data-a="af" data-k="${k}">${n}</button>`).join('')}</div>
    <div class="sec">${list.length ? `<ul class="alist">${list.map(x => `<li><span class="dotc ${x.lvl === 'bad' ? 'bad' : ''}"></span><span class="ax">${esc(x.text)}</span><span class="at">${esc(ALERT_KIND[x.kind])}, ${esc(sname(x.store))}, ${dt(x.ts)}</span></li>`).join('')}</ul>` : `<div class="empty">Tanlangan davrda ogohlantirish yo‘q.</div>`}</div>`;
}
function reportCSV() {
  const r = S.ui.rep, cashier = S.user.role === 'cashier', P = periodData(S.ui.from, S.ui.to, cashier ? 'all' : S.ui.store);
  let rows;
  if (r === 'shifts') {
    rows = [['Sana', 'Do‘kon', 'Kassa', 'Kassir', 'Ochildi', 'Yopildi', 'Cheklar', ...MK.map(mname), 'Jami tushum', 'Kutilgan naqd', 'Sanalgan naqd', 'Farq', 'Sabab']];
    for (const sh of P.shifts.filter(x => !cashier || x.user === S.user.id)) {
      const T = shiftTotals(sh), c = sh.closed;
      rows.push([dmy(sh.openTs), sname(sh.store), dname(sh.dev), uname(sh.user), hm(sh.openTs), c ? dt(c.ts) : '', sh.n, ...MK.map(m => T.net[m]), T.netAll, c ? c.expected : T.expected, c ? c.counted : '', c ? num(c.variance) + num(sh.corr) : '', c ? c.reason : '']);
    }
  } else if (r === 'days') {
    const cols = DAYCOLS;
    rows = [['Sana', ...cols.map(c => c[1])]];
    for (const [d, a] of P.days) rows.push([dmy(k2ts(d)), ...cols.map(([k]) => dayVal(a, k))]);
    const tot = sumDays(P.days); rows.push(['Jami', ...cols.map(([k]) => dayVal(tot, k))]);
  } else {
    rows = [['Kassir', 'Smenalar', 'Tushum', 'Farqlar yig‘indisi', 'Kamomadlar', 'Bekor', 'Chegirma', 'Qaytarish']];
    for (const a of cashierStats(P)) rows.push([uname(a.u), a.n, a.net, a.varSum, a.shortN, a.voidN, a.discN, a.refN]);
  }
  const name = { shifts: 'smenalar', days: 'kunlar', cashiers: 'kassirlar' }[r] || 'hisobot';
  return { filename: `${name}_${S.ui.from}_${S.ui.to}.csv`, data: toCSV(rows) };
}
async function saveFile(file) {
  if (hasNat('share')) {
    const mime = /\.json$/.test(file.filename) ? 'application/json' : /\.csv$/.test(file.filename) ? 'text/csv' : 'text/plain';
    if (nat('share', file.filename, mime, file.data)) return;
  }
  if (S.dl) {
    try { await S.dl.save(file); toast('Fayl saqlandi'); return; }
    catch (e) { const c = e && e.code; if (c === 'declined') return; if (c !== 'unavailable' && c !== 'not_granted' && c !== 'capability_disabled' && c !== 'capability_removed') { toast('Faylni saqlab bo‘lmadi: ' + (c || 'xato'), 'bad'); return; } }
  }
  pushModal({ type: 'csvText', file });
}
MOD.csvText = m => ({ title: 'Jadval matni', cls: 'mid',
  body: `<p class="note" style="margin-bottom:10px">Bu ko‘rinishda faylni saqlab bo‘lmaydi. Matnni nusxalab, Excel’ga joylashtiring.</p><textarea id="csvtxt" class="inp" style="min-height:220px;font-family:var(--f-mono);font-size:12px" readonly>${esc(m.file.data.replace(/^﻿/, ''))}</textarea>`,
  foot: `<button class="btn" data-a="closeModal">Yopish</button><button class="btn pri" data-a="copyCsv">${I.copy}Nusxa olish</button>` });

/* ============ Nasiya daftari ============ */
VIEWS.nasiya = function vNasiya() {
  const book = debtBook(), q = norm(S.ui.cq), all = S.ui.cf === 'all';
  let list = allCustomers().map(c => ({ c, bal: book.bal.get(c.id) || 0, last: book.last.get(c.id) || c.at || 0 }));
  if (!all) list = list.filter(x => x.bal !== 0);
  if (q) list = list.filter(x => norm(x.c.name).includes(q) || String(x.c.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '~'));
  list.sort((a, b) => b.bal - a.bal || b.last - a.last);
  const canAdd = !S.readOnly && S.dev && S.user.role !== 'viewer';
  return `<div class="wrap">
    <div class="stats"><div class="stat"><small>Jami qarz</small><b>${som(book.total)}</b></div><div class="stat"><small>Qarzdorlar</small><b>${book.owing}</b></div><div class="stat"><small>Mijozlar</small><b>${allCustomers().length}</b></div></div>
    <div class="toolbar"><div class="seg"><button class="${!all ? 'on' : ''}" data-a="cf" data-k="debt">Qarzdorlar</button><button class="${all ? 'on' : ''}" data-a="cf" data-k="all">Hammasi</button></div>
      <label class="search" style="max-width:340px">${I.search}<input id="cq" data-in="cq" placeholder="Ism yoki telefon" value="${esc(S.ui.cq)}" autocomplete="off"></label>
      <div class="grow"></div>${canAdd ? `<button class="btn pri" data-a="custNew">${I.plus}Yangi mijoz</button>` : ''}</div>
    <div class="sec" style="padding:4px 8px"><div class="tw">${list.length ? `<table class="tbl hover"><thead><tr><th>Mijoz</th><th>Telefon</th><th>Oxirgi harakat</th><th class="r">Qarz</th></tr></thead><tbody>
      ${list.map(x => `<tr data-a="custOpen" data-id="${esc(x.c.id)}"><td><b>${esc(x.c.name)}</b>${x.c.note ? `<small>${esc(x.c.note)}</small>` : ''}</td><td class="num">${esc(x.c.phone || '—')}</td><td class="num">${x.last ? dmy(x.last) : '—'}</td><td class="r"><b class="${x.bal > 0 ? 'neg' : ''}">${fmt(x.bal)}</b></td></tr>`).join('')}
    </tbody></table>` : `<div class="empty">${all ? 'Mijozlar yo‘q.' : 'Qarzdor mijoz yo‘q.'}</div>`}</div></div>
  </div>`;
};
MOD.custNew = m => ({ title: m.id ? 'Mijozni tahrirlash' : 'Yangi mijoz', focus: '#cn_name', enter: 'custSave',
  body: `<div class="frm"><label class="f">Ismi<input id="cn_name" data-in="f" data-f="name" value="${esc(m.f.name || '')}" maxlength="50" autocomplete="off"></label>
    <label class="f">Telefon<input id="cn_phone" data-in="f" data-f="phone" value="${esc(m.f.phone || '')}" maxlength="20" inputmode="tel" placeholder="+998"></label>
    <label class="f">Izoh<input id="cn_note" data-in="f" data-f="note" value="${esc(m.f.note || '')}" maxlength="100" placeholder="Masalan: manzili, to‘lov kuni"></label></div>${errLine(m)}`,
  foot: `<button class="btn" data-a="closeModal">Bekor qilish</button><button class="btn pri" data-a="custSave">Saqlash</button>` });
MOD.custView = m => {
  const c = custGet(m.id); if (!c) return { title: 'Mijoz', body: '<div class="empty">Mijoz topilmadi.</div>' };
  const book = debtBook(), bal = book.bal.get(c.id) || 0, led = book.led.get(c.id) || [];
  const sh = isCashDev() && S.user && S.user.role !== 'viewer' ? curShift() : null, canPay = sh && sh.user === S.user.id && bal > 0;
  const KL = { sale: 'Nasiyaga sotuv', pay: 'To‘lov', void: 'Chek bekor qilindi', refund: 'Qaytarish', adj: 'Tuzatish' };
  return { title: c.name, cls: 'mid',
    body: `<div class="stats"><div class="stat"><small>Qarz</small><b class="${bal > 0 ? 'neg' : ''}">${som(bal)}</b></div><div class="stat"><small>Telefon</small><b style="font-size:16px">${esc(c.phone || '—')}</b></div></div>
      ${c.note ? `<p class="note" style="margin-top:10px">${esc(c.note)}</p>` : ''}
      <h4 style="margin:16px 0 6px">Daftar</h4>
      ${led.length ? `<ul class="ledger">${led.map(it => `<li><span>${KL[it.k] || it.k}${it.no ? ', chek ' + esc(it.no) : ''}${it.m ? ' (' + esc(mname(it.m)) + ')' : ''}</span><b class="bal ${it.a > 0 ? 'neg' : 'plus'}">${it.a > 0 ? '+' : '−'}${fmt(Math.abs(it.a))}</b><small>${dt(it.ts)}, ${esc(uname(it.u))}, ${esc(sname(it.st))}${it.note ? '. ' + esc(it.note) : ''}</small></li>`).join('')}</ul>` : '<div class="empty">Yozuv yo‘q.</div>'}
      ${!canPay && bal > 0 && isCashDev() ? `<p class="note" style="margin-top:10px">To‘lov qabul qilish uchun o‘z smenangiz ochiq bo‘lishi kerak.</p>` : ''}`,
    foot: `${S.user && S.user.role === 'admin' && !S.readOnly && S.dev ? `<button class="btn" data-a="debtAdj" data-id="${esc(c.id)}">Tuzatish</button>` : ''}${S.user && isBoss(S.user) && !S.readOnly ? `<button class="btn" data-a="custEdit" data-id="${esc(c.id)}">Tahrirlash</button>` : ''}${canPay ? `<button class="btn pri" data-a="debtPay" data-id="${esc(c.id)}">To‘lov qabul qilish</button>` : ''}<button class="btn" data-a="closeModal">Yopish</button>` };
};
MOD.debtPay = m => {
  const bal = debtBook().bal.get(m.id) || 0, ms = activeMethods().filter(x => x.k !== 'nasiya');
  return { title: 'To‘lov: ' + custName(m.id), focus: '#dpamt', enter: 'debtPayOk',
    body: `<p class="note">Qarz: <b>${som(bal)}</b></p>
      <input class="amt money" id="dpamt" data-in="f" data-f="amount" inputmode="numeric" placeholder="0" value="${moneyVal(m.f.amount)}" aria-label="Summa" autocomplete="off">
      <div class="quick" style="margin:10px 0"><button class="chip" data-a="setAmt" data-v="${bal}">Hammasi: ${fmt(bal)}</button></div>
      <div class="chips wrap">${ms.map(x => `<button class="chip ${(m.f.m || 'cash') === x.k ? 'on' : ''}" data-a="setF" data-f="m" data-v="${x.k}">${x.n}</button>`).join('')}</div>${errLine(m)}`,
    foot: `<button class="btn" data-a="closeModal">Bekor qilish</button><button class="btn pri" data-a="debtPayOk">To‘lovni saqlash</button>` };
};
MOD.debtAdj = m => ({ title: 'Qarzni tuzatish', focus: '#daamt', enter: 'debtAdjOk',
  body: `<p class="note">Masalan, qarz kechilganda yoki xato yozilganda. Tuzatish daftarda alohida yozuv sifatida qoladi.</p>
    <div class="seg" style="margin:10px 0"><button class="${m.f.sign !== '+' ? 'on' : ''}" data-a="setF" data-f="sign" data-v="-">Qarzni kamaytirish</button><button class="${m.f.sign === '+' ? 'on' : ''}" data-a="setF" data-f="sign" data-v="+">Qarzni oshirish</button></div>
    <input class="amt money" id="daamt" data-in="f" data-f="amount" inputmode="numeric" placeholder="0" value="${moneyVal(m.f.amount)}" aria-label="Summa">
    <label class="f" style="margin-top:12px">Sabab<input class="inp" id="dareas" data-in="f" data-f="reason" value="${esc(m.f.reason || '')}" maxlength="200"></label>${errLine(m)}`,
  foot: `<button class="btn" data-a="closeModal">Bekor qilish</button><button class="btn pri" data-a="debtAdjOk">Saqlash</button>` });

/* ============ Mahsulotlar ============ */
const cfgLockNote = () => canAdminCfg() ? '' : `<div class="infobox">Narxlar, xodimlar va sozlamalar faqat ilova egasining akkauntidan o‘zgartiriladi. Bu himoya: kassir akkauntidan ularni o‘zgartirib bo‘lmaydi.</div>`;
VIEWS.products = function vProducts() {
  const cats = S.cfg.main.cats;
  return `<div class="wrap">${cfgLockNote()}
    <div class="toolbar"><label class="search" style="max-width:380px">${I.search}<input id="pq" data-in="pq" placeholder="Nomi yoki shtrix-kod" value="${esc(S.ui.pq)}"></label>
      <select class="inp" style="width:auto" id="pcat" data-ch="pcat" aria-label="Bo‘lim"><option value="all">Barcha bo‘limlar</option>${cats.map(c => `<option ${S.ui.pcat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <div class="grow"></div>
      <button class="btn" data-a="prodCsv">${I.down}CSV</button>
      ${canAdminCfg() ? `<button class="btn" data-a="prodImport">${I.up}Excel’dan import</button><button class="btn pri" data-a="prodEdit">${I.plus}Mahsulot</button>` : ''}</div>
    <div class="sec" style="padding:4px 8px"><div class="tw"><table class="tbl hover"><thead><tr><th>Nomi</th><th>Bo‘lim</th><th>Shtrix-kod</th><th class="r">Narx</th><th>O‘lchov</th><th>Holat</th></tr></thead><tbody id="ptbody">${prodRows()}</tbody></table></div></div>
    <p class="note">Jami: ${PRODUCTS().length} ta mahsulot.</p></div>`;
};
function prodRows() {
  const q = norm(S.ui.pq), c = S.ui.pcat;
  const list = PRODUCTS().filter(p => (!q || norm(p.name).includes(q) || (p.barcode || '').includes(q)) && (c === 'all' || p.cat === c));
  if (!list.length) return `<tr><td colspan="6"><div class="empty">Mahsulot topilmadi.</div></td></tr>`;
  return list.slice(0, 500).map(p => `<tr ${canAdminCfg() ? `data-a="prodEdit" data-id="${esc(p.id)}"` : ''}><td><b>${esc(p.name)}</b>${p.fav ? ' <span class="badge ok">Tezkor</span>' : ''}</td><td>${esc(p.cat)}</td><td class="num">${esc(p.barcode || '—')}</td><td class="r"><b>${fmt(p.price)}</b></td><td>${esc(p.unit)}</td><td>${p.active ? '<span class="badge ok">Sotuvda</span>' : '<span class="badge">Sotuvda emas</span>'}</td></tr>`).join('');
}
MOD.prod = m => {
  const f = m.f;
  return { title: m.id ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot', cls: 'mid', focus: '#pname', enter: 'prodOk',
    body: `<div class="frm"><label class="f">Nomi<input id="pname" data-in="f" data-f="name" value="${esc(f.name)}" maxlength="80"></label>
      <div class="frm2"><label class="f">Narx, ${SOM}<input class="money" id="pprice" data-in="f" data-f="price" inputmode="numeric" value="${moneyVal(f.price)}"></label>
      <label class="f">O‘lchov birligi<select id="punit" data-ch="fsel" data-f="unit">${UNITS.map(u => `<option ${f.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label></div>
      <div class="frm2"><label class="f">Shtrix-kod<input id="pbar" data-in="f" data-f="barcode" inputmode="numeric" value="${esc(f.barcode)}" maxlength="20" placeholder="Skanerlang yoki kiriting"></label>
      <label class="f">Bo‘lim<input id="pcatin" data-in="f" data-f="cat" list="catlist" value="${esc(f.cat)}" maxlength="40"><datalist id="catlist">${S.cfg.main.cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label></div>
      <button class="lnk" style="justify-self:start" data-a="genBar">Ichki shtrix-kod yaratish</button>
      <label class="check"><input type="checkbox" id="pfav" data-ch="fc" data-f="fav" ${f.fav ? 'checked' : ''}>Kassada tezkor tugma sifatida ko‘rsatish</label>
      <label class="check"><input type="checkbox" id="pact" data-ch="fc" data-f="active" ${f.active ? 'checked' : ''}>Sotuvda</label></div>
      <p class="note" style="margin-top:8px">Mahsulot o‘chirilmaydi, faqat sotuvdan olinadi: eski cheklar buzilmasligi uchun.</p>${errLine(m)}`,
    foot: `<button class="btn" data-a="closeModal">Bekor qilish</button><button class="btn pri" data-a="prodOk" ${m.busy ? 'disabled' : ''}>Saqlash</button>` };
};
/* Excel'dan nusxa olingan jadvalni tahlil qilish */
function parseImport(text) {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { rows: [], errors: [], header: false };
  const split = l => l.includes('\t') ? l.split('\t') : l.split(/;|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(x => x.replace(/^"|"$/g, '').replace(/""/g, '"'));
  let cols = { name: 0, price: 1, barcode: 2, cat: 3, unit: 4 }, start = 0, header = false;
  const h = split(lines[0]).map(norm);
  const find = keys => h.findIndex(x => keys.some(k => x.includes(k)));
  const ni = find(['nom', 'name', 'mahsulot', 'наим']), pi = find(['narx', 'price', 'цен']);
  if (ni >= 0 && pi >= 0) {
    header = true; start = 1;
    cols = { name: ni, price: pi, barcode: find(['shtrix', 'barcode', 'kod', 'sku', 'штрих']), cat: find(['bo\'lim', 'kategor', 'category', 'катег']), unit: find(['o\'lchov', 'birlik', 'unit', 'ед']) };
  }
  const rows = [], errors = [];
  for (let i = start; i < lines.length; i++) {
    const c = split(lines[i]), get = k => cols[k] >= 0 ? String(c[cols[k]] == null ? '' : c[cols[k]]).trim() : '';
    const name = get('name'), price = num(get('price').replace(/[.,]\d{1,2}$/, ''));
    if (!name) { errors.push(`${i + 1}-qator: nomi yo‘q`); continue; }
    if (!(price > 0)) { errors.push(`${i + 1}-qator (${name}): narx noto‘g‘ri`); continue; }
    let unit = norm(get('unit')); if (!UNITS.includes(unit)) unit = /kg|кг/.test(unit) ? 'kg' : /^l|литр/.test(unit) ? 'l' : 'dona';
    rows.push({ name, price, barcode: get('barcode').replace(/\s/g, ''), cat: get('cat') || 'Boshqa', unit });
  }
  return { rows, errors, header };
}
function importPlan(rows) {
  const byBar = new Map(), byName = new Map();
  for (const p of PRODUCTS()) { if (p.barcode) byBar.set(p.barcode, p); byName.set(norm(p.name), p); }
  const out = []; let nNew = 0, nUpd = 0;
  for (const r of rows) {
    const ex = (r.barcode && byBar.get(r.barcode)) || byName.get(norm(r.name));
    if (ex) { out.push(Object.assign({}, ex, { name: r.name, price: r.price, cat: r.cat, unit: r.unit, barcode: r.barcode || ex.barcode || '' })); nUpd++; }
    else { out.push({ id: 'p' + uid(8), name: r.name, price: r.price, cat: r.cat, unit: r.unit, barcode: r.barcode, fav: false, active: true }); nNew++; }
  }
  return { list: out, nNew, nUpd };
}
MOD.import = m => {
  const P = parseImport(m.f.text), plan = importPlan(P.rows);
  return { title: 'Excel’dan import', cls: 'wide',
    body: `<p class="note">Excel yoki Google Sheets jadvalidan qatorlarni nusxalab, shu yerga joylashtiring. Ustunlar tartibi: <b>Nomi, Narx, Shtrix-kod, Bo‘lim, O‘lchov</b>. Sarlavha qatori bo‘lsa, avtomatik aniqlanadi. Shtrix-kodi yoki nomi mos mahsulotlar yangilanadi.</p>
      <label class="f" style="margin-top:10px">Jadval<textarea id="imptext" data-in="f" data-f="text" style="min-height:180px" placeholder="Nomi&#9;Narx&#9;Shtrix-kod&#9;Bo‘lim&#9;O‘lchov">${esc(m.f.text || '')}</textarea></label>
      <div class="toolbar" style="margin-top:10px"><button class="btn sm" data-a="impSample">Namuna qatorlar</button><span class="grow"></span>
      ${P.rows.length || P.errors.length ? `<span class="badge ok">${plan.nNew} ta yangi</span><span class="badge info">${plan.nUpd} ta yangilanadi</span>${P.errors.length ? `<span class="badge bad">${P.errors.length} ta xato</span>` : ''}` : ''}</div>
      ${P.errors.length ? `<details style="margin-top:8px"><summary class="note">Xatolarni ko‘rsatish</summary><pre class="csvprev">${esc(P.errors.slice(0, 50).join('\n'))}</pre></details>` : ''}${errLine(m)}`,
    foot: `<button class="btn" data-a="closeModal">Bekor qilish</button><button class="btn pri" data-a="impGo" ${plan.list.length && !m.busy ? '' : 'disabled'}>${m.busy ? 'Saqlanmoqda…' : 'Import: ' + plan.list.length + ' ta'}</button>` };
};

/* ============ Xodimlar ============ */
VIEWS.users = function vUsers() {
  return `<div class="wrap">${cfgLockNote()}
    <div class="toolbar"><p class="muted">Har bir xodimning o‘z PIN kodi bor. Barcha harakatlar shu PIN egasi nomidan yoziladi.</p><div class="grow"></div>${canAdminCfg() ? `<button class="btn pri" data-a="userEdit">${I.plus}Xodim qo‘shish</button>` : ''}</div>
    <div class="sec" style="padding:4px 8px"><div class="tw"><table class="tbl hover"><thead><tr><th>Ism</th><th>Rol</th><th>Do‘konlar</th><th>PIN</th><th>Holat</th></tr></thead><tbody>
    ${STAFF().map(u => `<tr ${canAdminCfg() ? `data-a="userEdit" data-id="${esc(u.id)}"` : ''}><td><b>${esc(u.name)}</b></td><td>${esc(ROLES[u.role] || u.role)}</td><td>${u.stores && u.stores.length ? esc(u.stores.map(sname).join(', ')) : 'Barcha do‘konlar'}</td><td>${S.pins[u.id] ? '<span class="badge ok">O‘rnatilgan</span>' : '<span class="badge warn">Yo‘q</span>'}</td><td>${u.active ? '<span class="badge ok">Faol</span>' : '<span class="badge">Faol emas</span>'}</td></tr>`).join('')}
    </tbody></table></div></div>
    <div class="infobox">Administrator va mudirning PIN kodi 6 raqamli bo‘ladi: ular chegirma, bekor qilish va kassadan pul olishni tasdiqlaydi.</div></div>`;
};
MOD.user = m => {
  const f = m.f, six = f.role === 'admin' || f.role === 'manager';
  return { title: m.id ? 'Xodimni tahrirlash' : 'Yangi xodim', cls: 'mid', focus: '#uname', enter: 'userOk',
    body: `<div class="frm"><label class="f">Ism<input id="uname" data-in="f" data-f="name" value="${esc(f.name)}" maxlength="40"></label>
      <label class="f">Rol<select id="urole" data-ch="fsel" data-f="role">${Object.entries(ROLES).map(([k, n]) => `<option value="${k}" ${f.role === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <div><div style="font-weight:600;font-size:13.5px;color:var(--ink-2);margin-bottom:4px">Do‘konlar${f.role === 'admin' || f.role === 'viewer' ? ' (belgilanmasa, barchasi)' : ''}</div>
      ${STORES().map(s => `<label class="check"><input type="checkbox" data-ch="fstore" data-k="${esc(s.id)}" ${f.stores.includes(s.id) ? 'checked' : ''}>${esc(s.name)}</label>`).join('')}</div>
      <label class="f">${m.id ? 'Yangi PIN (o‘zgartirmasangiz bo‘sh qoldiring)' : 'PIN kod'}<small>${six ? 'Aynan 6 raqam' : '4–6 raqam'}</small><input id="upin" data-in="f" data-f="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" value="${esc(f.pin)}"></label>
      <label class="check"><input type="checkbox" id="uact" data-ch="fc" data-f="active" ${f.active ? 'checked' : ''}>Faol</label></div>${errLine(m)}`,
    foot: `<button class="btn" data-a="closeModal">Bekor qilish</button><button class="btn pri" data-a="userOk" ${m.busy ? 'disabled' : ''}>${m.busy ? 'Saqlanmoqda…' : 'Saqlash'}</button>` };
};

/* ============ Sozlamalar ============ */
VIEWS.settings = function vSettings() {
  if (!S.ui.cfg) S.ui.cfg = { settings: clone(S.cfg.main.settings), stores: clone(S.cfg.main.stores), shop: S.cfg.main.shop.name };
  const c = S.ui.cfg, s = c.settings, M = model(), ro = !canAdminCfg();
  const numF = (k, label, unit) => `<label class="f">${label}<input class="inp" id="cfg_${k}" data-in="cfgN" data-f="${k}" inputmode="numeric" value="${num(s[k])}" ${ro ? 'disabled' : ''}><small>${unit}</small></label>`;
  const devs = [...S.devs.values()].sort((a, b) => (a.store < b.store ? -1 : 1) || a.code - b.code);
  return `<div class="wrap">${cfgLockNote()}
    <section class="sec"><h2>Nazorat qoidalari</h2><div class="frm3">
      ${numF('discLimit', 'Kassir beradigan chegirma', 'foiz; undan kattasiga mudir yoki administrator PIN‘i kerak')}
      ${numF('varLimit', 'Ruxsat etilgan naqd farq', `${SOM}; oshsa sabab majburiy va egaga ogohlantirish`)}
      ${numF('voidAlert', 'Bekor qilingan cheklar chegarasi', 'ta smenada; oshsa ogohlantirish')}
      ${numF('varStreak', 'Takroriy farq', 'smena ketma-ket bo‘lsa ogohlantirish')}
      ${numF('maxShiftH', 'Smenaning eng uzoq davomiyligi', 'soat')}
      ${numF('lockMin', 'Harakatsizlikdan keyin qulflash', 'daqiqa; 0 bo‘lsa qulflanmaydi')}
      ${numF('debtLimit', 'Bir mijozga nasiya limiti', `${SOM}; oshsa tasdiqlash kerak, 0 bo‘lsa cheklanmaydi`)}
      ${numF('refundDays', 'Qaytarish muddati', 'kun')}
    </div></section>
    <section class="sec"><h2>To‘lov turlari</h2><p class="note" style="margin-bottom:6px">Naqd doim yoqilgan.</p>
      ${METHODS.filter(m => m.k !== 'cash').map(m => `<label class="check"><input type="checkbox" id="cfgm_${m.k}" data-ch="cfgM" data-k="${m.k}" ${s.methods[m.k] ? 'checked' : ''} ${ro ? 'disabled' : ''}>${m.n}${m.k === 'nasiya' ? ' (qarzga savdo, mijozlar daftari bilan)' : ''}</label>`).join('')}</section>
    <section class="sec"><h2>Biznes va chek</h2><div class="frm2">
      <label class="f">Biznes nomi<input class="inp" id="cfg_shop" data-in="cfgShop" value="${esc(c.shop)}" maxlength="60" ${ro ? 'disabled' : ''}></label>
      <label class="f">Chek oxiridagi matn<input class="inp" id="cfg_footer" data-in="cfgT" data-f="footer" value="${esc(s.footer)}" maxlength="80" ${ro ? 'disabled' : ''}></label>
      ${canPrint() ? `<label class="f">Chek printeri eni<select class="inp" id="cfg_paper" data-ch="cfgPaper" ${ro ? 'disabled' : ''}><option value="80" ${num(s.paper) !== 58 ? 'selected' : ''}>80 mm</option><option value="58" ${num(s.paper) === 58 ? 'selected' : ''}>58 mm</option></select><small>Chek Android printer xizmati orqali chiqadi (masalan, RawBT)</small></label>` : ''}</div></section>
    <section class="sec"><h2>Do‘konlar</h2>
      ${c.stores.map((st, i) => `<div class="frm" style="grid-template-columns:1.2fr 1.4fr .6fr .6fr;margin-bottom:12px">
        <label class="f">Nomi<input class="inp" id="st_n${i}" data-in="cfgS" data-i="${i}" data-f="name" value="${esc(st.name)}" ${ro ? 'disabled' : ''}></label>
        <label class="f">Manzil<input class="inp" id="st_a${i}" data-in="cfgS" data-i="${i}" data-f="address" value="${esc(st.address)}" ${ro ? 'disabled' : ''}></label>
        <label class="f">Ochiladi<input class="inp" type="time" id="st_o${i}" data-in="cfgS" data-i="${i}" data-f="open" value="${esc(st.open)}" ${ro ? 'disabled' : ''}></label>
        <label class="f">Yopiladi<input class="inp" type="time" id="st_c${i}" data-in="cfgS" data-i="${i}" data-f="close" value="${esc(st.close)}" ${ro ? 'disabled' : ''}></label></div>`).join('')}
      ${ro ? '' : `<button class="btn" data-a="addStore">${I.plus}Do‘kon qo‘shish</button>`}</section>
    ${ro ? '' : `<div class="stick" style="position:static;border:0;padding:0"><button class="btn pri big" data-a="saveCfg">Sozlamalarni saqlash</button></div>`}
    <section class="sec"><h2>Qurilmalar</h2>${devs.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Nomi</th><th>Turi</th><th>Do‘kon</th><th>Oxirgi faollik</th><th></th></tr></thead><tbody>
      ${devs.map(d => { const bl = S.cfg.main.blocked.includes(d.id); return `<tr><td><b>${esc(d.name)}</b>${d.type === 'cashier' ? ` <span class="badge">№ ${num(d.code)}</span>` : ''}${S.dev && d.id === S.dev.id ? ' <span class="badge info">Shu qurilma</span>' : ''}${bl ? ' <span class="badge bad">Bloklangan</span>' : ''}</td><td>${d.type === 'cashier' ? 'Kassa' : 'Kuzatuv'}</td><td>${esc(sname(d.store))}</td><td class="num">${M.lastSeen.get(d.id) ? dt(M.lastSeen.get(d.id)) : '—'}</td><td class="r">${!ro && (!S.dev || d.id !== S.dev.id) ? `<button class="btn sm ${bl ? '' : 'danger'}" data-a="devBlock" data-id="${esc(d.id)}">${bl ? 'Blokdan chiqarish' : 'Bloklash'}</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty">Qurilma yo‘q.</div>`}
      <p class="note" style="margin-top:10px">Yo‘qolgan yoki sotilgan qurilmani bloklang: u orqali kirish va savdo qilish to‘xtaydi.</p></section>
    <section class="sec"><h2>Ma’lumotlar</h2>
      <div class="frm2"><label class="f">Batafsil yozuvlarni saqlash<select class="inp" id="cfg_keep" data-ch="cfgKeep" ${ro ? 'disabled' : ''}>${[90, 180, 365].map(d => `<option value="${d}" ${num(s.keepDays) === d ? 'selected' : ''}>${d} kun</option>`).join('')}</select><small>Keyin faqat kunlik jami ko‘rsatkichlar qoladi</small></label>
      <div class="stats" style="align-self:end"><div class="stat"><small>Rejim</small><b style="font-size:15px">${S.mode === 'local' ? 'Faqat shu qurilma' : S.readOnly ? 'Faqat ko‘rish' : 'Umumiy baza'}</b></div><div class="stat"><small>Navbatda</small><b style="font-size:15px">${pendingCount()}</b></div></div></div>
      ${S.maintInfo ? `<p class="note" style="margin-top:8px">Oxirgi tozalash: ${dt(S.maintInfo.at)}, ${S.maintInfo.removed} ta hujjat.</p>` : ''}
      ${S.lastErr ? `<p class="note" style="margin-top:8px">Oxirgi xato: <span class="num">${esc(S.lastErr)}</span></p>` : ''}
      <div class="toolbar" style="margin-top:12px">${!ro ? `<button class="btn" data-a="maintNow">Eski yozuvlarni hozir tozalash</button>` : ''}
        ${S.dev ? `<button class="btn danger" data-a="resetDev">Shu qurilmani qayta ulash</button>` : ''}
        ${!ro ? `<button class="btn danger" data-a="wipeAll">Barcha ma’lumotlarni o‘chirish</button>` : ''}</div>
      ${S.mode === 'local' ? `<div class="infobox" style="margin-top:14px">Ma\u2019lumotlar faqat shu qurilmada saqlanadi. Zaxira nusxani muntazam olib, Telegram yoki Google Drive\u2019ga saqlang: telefon almashsa yoki ilova qayta o\u2018rnatilsa, shu fayldan tiklanadi.${LS.get('lastBackup', 0) ? ` Oxirgi zaxira: ${dt(LS.get('lastBackup', 0))}.` : ''}</div>
      <div class="toolbar" style="margin-top:12px"><button class="btn pri" data-a="backupNow">${I.save}Zaxira nusxa olish</button>${!ro ? `<button class="btn" data-a="restorePick">${I.up}Zaxiradan tiklash</button>` : ''}${restoreInput()}</div>` : ''}
      ${NATIVE ? `<div class="toolbar" style="margin-top:12px"><button class="btn" data-a="openOnline">${I.link}Onlayn versiyani ochish</button><span class="note">Bir nechta qurilma sinxron ishlashi kerak bo\u2018lsa, claude.ai\u2019dagi versiyadan foydalaning.</span></div>` : ''}</section>
  </div>`;
};

/* ============ Jurnal ============ */
const EVT_GROUP = { sale: 'Sotuv', void: 'Bekor qilish', refund: 'Qaytarish', cash: 'Pul harakati', debt_pay: 'Nasiya', debt_adj: 'Nasiya', cust_add: 'Nasiya', shift_open: 'Smena', shift_close: 'Smena', correction: 'Smena', login: 'Kirish', item_remove: 'Pozitsiya', cart_clear: 'Pozitsiya', admin: 'Sozlamalar', device: 'Qurilma' };
function evText(e) {
  const r = e.r || {};
  switch (e.t) {
    case 'login': return ['Tizimga kirdi', ''];
    case 'device': return ['Qurilma ulandi', `${e.name}, ${e.type === 'cashier' ? 'kassa №' + e.code : 'kuzatuv'}${e.by ? ', ruxsat: ' + uname(e.by) : ''}`];
    case 'shift_open': return ['Smena ochildi', 'Boshlang‘ich naqd ' + som(e.cash)];
    case 'sale': return ['Sotuv', `Chek ${r.no}, ${som(r.total)}, ${paysText(r.pays)}${num(r.disc) > 0 ? ', chegirma ' + som(r.disc) + ' (' + (r.discReason || '') + ')' : ''}${r.cust ? ', mijoz: ' + custName(r.cust) : ''}`];
    case 'void': return ['Chek bekor qilindi', `Chek ${e.no}, ${som(e.amount)}. Sabab: ${e.reason}. Tasdiqladi: ${uname(e.by)}`];
    case 'refund': return ['Qaytarish', `Chek ${e.no}, ${som(e.total)}. Sabab: ${e.reason}. Tasdiqladi: ${uname(e.by)}`];
    case 'cash': return [MOVE[e.kind] || 'Pul harakati', `${som(e.amount)}. ${e.reason}${e.person ? '. Kim: ' + e.person : ''}${e.by ? '. Tasdiqladi: ' + uname(e.by) : ''}`];
    case 'debt_pay': return ['Nasiya to‘lovi', `${custName(e.cust)}: ${som(e.amount)}, ${mname(e.m)}`];
    case 'debt_adj': return ['Nasiya tuzatildi', `${custName(e.cust)}: ${sgn(e.amount)}. ${e.reason || ''}`];
    case 'cust_add': return ['Yangi mijoz', e.name || ''];
    case 'item_remove': return ['Ochiq chekdan olib tashlandi', `${e.name}, ${fq(e.qty)} × ${fmt(e.price)}`];
    case 'cart_clear': return ['Ochiq chek tozalandi', `${num(e.n)} ta pozitsiya, ${som(e.sum)}`];
    case 'shift_close': return ['Smena yopildi', `Sanalgan ${som(e.counted)}, kutilgan ${som(e.expected)}, farq ${sgn(e.variance)}${e.reason ? '. Sabab: ' + e.reason : ''}`];
    case 'correction': return ['Tuzatish yozuvi', `${sgn(e.amount)}. ${e.reason}`];
    case 'admin': return ['Sozlamalar', e.text || ''];
    default: return [e.t, ''];
  }
}
VIEWS.audit = function vAudit() {
  const f = S.ui;
  if (f.jd < S.liveFrom) loadRaw(f.jd, f.jd);
  const ready = rawReady(f.jd);
  const groups = [...new Set(Object.values(EVT_GROUP))];
  const okSt = st => canStore(S.user, st);
  const list = allEvents().filter(e => e.day === f.jd && okSt(e.store) && (f.jt === 'all' || EVT_GROUP[e.t] === f.jt) && (f.ju === 'all' || e.user === f.ju) && (f.jdev === 'all' || e.dev === f.jdev)).slice().reverse();
  const ch = f.jd >= S.liveFrom || rawReady(f.jd) ? chains() : new Map();
  const devIds = [...new Set(allEvents().filter(e => e.day === f.jd && okSt(e.store)).map(e => e.dev))];
  return `<div class="wrap"><div class="toolbar">
      <input type="date" class="inp" style="width:auto" id="jd" data-ch="jd" value="${f.jd}" max="${today()}" aria-label="Kun">
      <select class="inp" style="width:auto" id="jt" data-ch="jt" aria-label="Turi"><option value="all">Barcha harakatlar</option>${groups.map(g => `<option ${f.jt === g ? 'selected' : ''}>${g}</option>`).join('')}</select>
      <select class="inp" style="width:auto" id="ju" data-ch="ju" aria-label="Xodim"><option value="all">Barcha xodimlar</option>${STAFF().map(u => `<option value="${esc(u.id)}" ${f.ju === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>
      <select class="inp" style="width:auto" id="jdev" data-ch="jdev" aria-label="Qurilma"><option value="all">Barcha qurilmalar</option>${devIds.map(d => `<option value="${esc(d)}" ${f.jdev === d ? 'selected' : ''}>${esc(dname(d))}, ${esc(sname(storeOfDev(d)))}</option>`).join('')}</select>
      ${!ready ? '<div class="spin"></div>' : ''}</div>
    ${devIds.length && isBoss(S.user) ? `<section class="sec"><div class="sh"><span>${I.shield}</span><h3 style="font-size:16px;margin:0">Jurnal butunligi</h3></div>
      ${devIds.map(d => { const c = ch.get(d); if (!c) return `<div class="srow"><span class="sn">${esc(dname(d))}, ${esc(sname(storeOfDev(d)))}</span><span class="note">Yuborilmagan yozuvlar</span></div>`;
        return `<div class="srow"><span class="sn">${esc(dname(d))}, ${esc(sname(storeOfDev(d)))}</span>${c.probs.length ? `<span class="chainbad">${c.probs.length} ta muammo</span>` : `<span class="chainok">Butun ✓</span>`}<div class="sm">#${c.from}–#${c.to}, ${c.n} ta yozuv tekshirildi${c.probs.length ? '. ' + esc(c.probs.slice(0, 3).map(p => p.k === 'gap' ? `#${p.from}–#${p.to} yo‘q` : p.k === 'del' ? `#${p.seq} o‘chirilgan` : `#${p.seq} o‘zgargan`).join('; ')) : ''}</div></div>`; }).join('')}
      <p class="note" style="margin-top:8px">Har bir yozuv oldingisiga shifrlangan zanjir bilan bog‘langan. Yozuv o‘chirilsa yoki o‘zgartirilsa, shu yerda va ogohlantirishlarda ko‘rinadi.</p></section>` : ''}
    <div class="sec" style="padding:4px 8px"><div class="tw">${list.length ? `<table class="tbl"><thead><tr><th>Vaqt</th><th>#</th><th>Xodim</th><th>Qurilma</th><th>Harakat</th><th>Tafsilot</th></tr></thead><tbody>
      ${list.slice(0, 500).map(e => { const [a, d] = evText(e); return `<tr><td class="num">${hm(e.ts)}</td><td class="num muted">${e.seq}</td><td>${esc(uname(e.user))}</td><td>${esc(dname(e.dev))}<small>${esc(sname(e.store))}</small></td><td><b>${esc(a)}</b></td><td>${esc(d)}</td></tr>`; }).join('')}</tbody></table>` : `<div class="empty">${ready ? 'Bu kunda yozuv yo‘q.' : 'Yuklanmoqda…'}</div>`}</div></div></div>`;
};
