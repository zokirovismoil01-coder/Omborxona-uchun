(function () {
  'use strict';

  const C = window.OylikCalc;
  const X = window.OylikXlsx;
  const E = window.OylikExport;
  const STORE_KEY = 'baliqxona-oylik-v1';
  const $ = (id) => document.getElementById(id);
  // Android ilovasi (APK) ichida ishlaganda Java tomonidan beriladigan ko'prik
  const Native = window.AndroidBridge || null;

  const OP_ICONS = { avans: '💸', mukofot: '🎁', jarima: '⛔', tolov: '💵' };
  const STEP_OPTIONS = [1, 100, 500, 1000, 5000, 10000];
  const BACKUP_REMIND_DAYS = 30;

  const money = (n) => C.formatMoney(n);
  const som = (n) => C.formatMoney(n) + " so'm";
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  let state = loadState();
  let all = new Map();
  let curKey = null;
  let view = 'month';
  let reportYear = null;
  let staffQuery = '';
  let undoSnapshot = null;
  let pendingBackupAt = null;

  // ---------- Saqlash ----------

  /** localStorage va (APK'da) ilova fayliga yozilgan nusxalardan eng yangisini oladi. */
  function loadState() {
    let local = null;
    let native = null;
    try {
      local = C.normalizeState(JSON.parse(localStorage.getItem(STORE_KEY)));
    } catch (e) { /* bo'sh */ }
    if (Native && Native.loadState) {
      try {
        native = C.normalizeState(JSON.parse(Native.loadState() || 'null'));
      } catch (e) { /* bo'sh */ }
    }
    if (local && native) return (native.savedAt || '') > (local.savedAt || '') ? native : local;
    return local || native;
  }

  function persist() {
    state.savedAt = new Date().toISOString();
    const json = JSON.stringify(state);
    let ok = false;
    try {
      localStorage.setItem(STORE_KEY, json);
      ok = true;
    } catch (e) { /* pastda tekshiriladi */ }
    if (Native && Native.saveState) {
      try {
        Native.saveState(json);
        ok = true;
      } catch (e) { /* pastda tekshiriladi */ }
    }
    if (!ok) toast("Saqlab bo'lmadi — telefon xotirasi to'lgan bo'lishi mumkin");
  }

  /** O'zgarishni bajaradi, saqlaydi va hammasini qayta chizadi. undoText — "Bekor qilish" uchun. */
  function mutate(fn, undoText) {
    const before = JSON.stringify(state);
    const result = fn();
    if (result === false) return false;
    persist();
    recompute();
    renderAll();
    refreshDialog();
    if (undoText) {
      undoSnapshot = before;
      toast(undoText, true);
    }
    return true;
  }

  function recompute() {
    all = C.computeAll(state);
    if (curKey && !getMonth(curKey)) curKey = null;
    if (!curKey) curKey = defaultMonthKey();
  }

  function defaultMonthKey() {
    if (!state.months.length) return null;
    const today = C.monthKey(new Date());
    if (getMonth(today)) return today;
    return sortedKeys()[state.months.length - 1];
  }

  // ---------- Yordamchilar ----------

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const sortedKeys = () => state.months.map((m) => m.key).sort();
  const getMonth = (key) => state.months.find((m) => m.key === key) || null;
  const getEmp = (id) => state.employees.find((e) => e.id === id) || null;
  const getGroup = (id) => state.groups.find((g) => g.id === id) || null;
  const curMonth = () => (curKey ? getMonth(curKey) : null);
  const curRes = () => (curKey ? all.get(curKey) : null);
  const isOpen = (m) => m && !m.closed;
  const latestOpenMonth = () => {
    const open = state.months.filter((m) => !m.closed).map((m) => m.key).sort();
    return open.length ? getMonth(open[open.length - 1]) : null;
  };

  function fmtDate(key, short) {
    const [y, m, d] = key.split('-');
    return short ? d + '.' + m : d + '.' + m + '.' + y;
  }

  function initials(name) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    const s = parts.length > 1 && !/^\d+$/.test(parts[1])
      ? parts[0][0] + parts[1][0] : String(name).trim().slice(0, 2);
    return s.toUpperCase();
  }

  function signed(n) {
    return (n > 0 ? '+' : '') + money(n);
  }

  function byName(a, b) {
    return a.name.localeCompare(b.name, 'uz');
  }

  function monthRange(key) {
    return { min: key + '-01', max: key + '-' + String(C.daysInMonth(key)).padStart(2, '0') };
  }

  /** Pul kiritish maydoni: yozish paytida 1 500 000 ko'rinishida formatlanadi. */
  function bindMoney(input, allowNegative) {
    const fmt = () => {
      const neg = allowNegative && /^\s*[-−]/.test(input.value);
      const digits = input.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
      input.value = (neg ? '−' : '') + (digits ? money(Number(digits)) : '');
    };
    input.addEventListener('input', fmt);
    fmt();
  }

  function moneyValue(input) {
    const neg = /^\s*[-−]/.test(input.value);
    const n = C.toInt(input.value.replace(/[^\d]/g, ''), 0);
    return neg ? -n : n;
  }

  // ---------- Bildirishnoma ----------

  let toastTimer = null;

  function toast(text, withUndo) {
    $('toastText').textContent = text;
    $('toastAction').hidden = !withUndo;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, withUndo ? 6000 : 3500);
  }

  $('toastAction').addEventListener('click', () => {
    if (!undoSnapshot) return;
    state = C.normalizeState(JSON.parse(undoSnapshot)) || state;
    undoSnapshot = null;
    persist();
    recompute();
    renderAll();
    refreshDialog();
    $('toast').hidden = true;
  });

  // ---------- Dialoglar (ichma-ich ochilishi mumkin) ----------

  const dlg = $('dlg');
  const dlgStack = [];

  /** spec = { title, render(body) } — render har safar ma'lumot o'zgarganda qayta chaqiriladi. */
  function openDialog(spec) {
    dlgStack.push(spec);
    showTopDialog();
  }

  function showTopDialog() {
    const top = dlgStack[dlgStack.length - 1];
    if (!top) {
      if (dlg.open) dlg.close();
      return;
    }
    $('dlgTitle').textContent = typeof top.title === 'function' ? top.title() : top.title;
    const body = $('dlgBody');
    body.innerHTML = '';
    top.render(body);
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
  }

  /** Eng yuqoridagi dialogni yopadi va undan oldingisiga qaytadi. */
  function closeDialog() {
    dlgStack.pop();
    showTopDialog();
  }

  function closeAllDialogs() {
    dlgStack.length = 0;
    showTopDialog();
  }

  function refreshDialog() {
    if (!dlgStack.length) return;
    const top = dlgStack[dlgStack.length - 1];
    if (top.live === false) return; // forma ochiq — yozilganlar o'chmasin
    const y = dlg.scrollTop;
    showTopDialog();
    dlg.scrollTop = y;
  }

  $('dlgClose').addEventListener('click', closeDialog);
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeDialog();
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) closeDialog(); // fon bosilganda
  });

  function confirmBox(text) {
    return window.confirm(text);
  }

  // ---------- Fayllar ----------

  function toBase64(bytes) {
    let bin = '';
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    }
    return btoa(bin);
  }

  function browserDownload(name, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function saveBytes(name, bytes, mime) {
    if (Native && Native.saveFileBase64) {
      Native.saveFileBase64(name, toBase64(bytes), mime);
      return;
    }
    browserDownload(name, new Blob([bytes], { type: mime }));
    toast('Fayl yuklab olindi: ' + name);
  }

  function saveText(name, text, mime) {
    if (Native && Native.saveFile) {
      Native.saveFile(name, text, mime);
      return;
    }
    browserDownload(name, new Blob([text], { type: mime }));
    toast('Fayl yuklab olindi: ' + name);
  }

  // Java tomoni fayl saqlangandan keyin chaqiradi
  window.onNativeFileSaved = function (status) {
    if (status === 'saved') {
      if (pendingBackupAt) {
        state.settings.lastBackupAt = pendingBackupAt;
        persist();
        renderReport();
      }
      toast('Fayl saqlandi ✓');
    } else if (status === 'error') {
      toast("Faylni saqlab bo'lmadi");
    }
    pendingBackupAt = null;
  };

  function shareText(title, text) {
    if (Native && Native.shareText) {
      Native.shareText(title, text);
    } else if (navigator.share) {
      navigator.share({ title, text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast('Matn nusxalandi — xabarga joylang'));
    } else {
      window.prompt('Matnni nusxalang:', text);
    }
  }

  // ---------- Asosiy chizish ----------

  function renderAll() {
    if (!state) return;
    $('bizName').textContent = state.settings.business;
    document.title = state.settings.business + ' — oylik';
    renderMonth();
    renderStaff();
    renderGroups();
    renderReport();
    const m = curMonth();
    $('quickOpBtn').hidden = !(view === 'month' && isOpen(m) && m.members.length);
  }

  function setView(v) {
    view = v;
    for (const t of document.querySelectorAll('.tab')) {
      const on = t.dataset.view === v;
      t.classList.toggle('active', on);
      t.setAttribute('aria-current', on ? 'page' : 'false');
    }
    for (const name of ['month', 'staff', 'groups', 'report']) {
      $('view-' + name).hidden = name !== v;
    }
    renderAll();
    window.scrollTo(0, 0);
  }

  document.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () => setView(t.dataset.view)));

  // ---------- Oy ko'rinishi ----------

  function renderMonth() {
    const keys = sortedKeys();
    const m = curMonth();
    $('noMonth').hidden = !!m;
    $('monthBody').hidden = !m;
    const idx = keys.indexOf(curKey);
    $('prevMonth').disabled = idx <= 0;
    $('nextMonth').disabled = idx < 0 || idx >= keys.length - 1;
    if (!m) {
      $('monthName').textContent = 'Oy tanlanmagan';
      $('monthBadge').hidden = true;
      return;
    }
    const res = all.get(m.key);
    const t = res.totals;
    const open = isOpen(m);
    $('monthName').textContent = C.monthName(m.key);
    $('monthBadge').hidden = false;
    $('monthBadge').textContent = open ? 'Ochiq' : '🔒 Yopilgan';
    $('monthBadge').classList.toggle('closed', !open);

    $('stTotal').textContent = som(t.total);
    $('stGiven').textContent = som(t.given);
    $('stGivenSub').textContent = 'avans ' + money(t.advance) + ' · to\'lov ' + money(t.paid);
    $('stDue').textContent = som(t.due);
    $('stDueSub').textContent = t.debt ? 'ishchilar qarzi: ' + money(t.debt)
      : t.count && t.due === 0 ? "hammasi to'langan ✓" : '';
    $('stSaved').textContent = som(t.saved);
    $('stFund').textContent = 'fond: ' + money(t.fund);
    $('lockNote').hidden = open;

    $('warnings').innerHTML = res.warnings.map((w) =>
      `<li class="${w.level}">${esc(w.text)}</li>`).join('');

    // Guruhlar (ixcham jadval)
    $('groupSummary').innerHTML = res.groups.length ? `
      <div class="grow ghead"><span>Guruh</span><span>Odam</span><span>1 kishiga</span></div>
      ${res.groups.map((g) => `
      <div class="grow" data-group="${esc(g.id)}" role="button" tabindex="0">
        <span class="gname">${esc(g.name)}<span class="pill ${g.status}">${esc(C.groupStatusText(g))}</span></span>
        <span class="gcount">${g.count} / ${g.norm}</span>
        <span class="gmoney">${money(g.perPerson)}</span>
      </div>`).join('')}
      <p class="gfoot">Fond: <b>${money(t.fund)}</b> · hisoblandi: <b>${money(t.base)}</b>
        ${t.saved ? ' · tejaldi: <b>' + money(t.saved) + '</b>' : ''}</p>`
      : '<p class="empty">Guruhlar yo\'q — «Guruhlar» bo\'limida qo\'shing.</p>';

    // Ishchilar
    const rows = E.sortedRows(res);
    $('memberCount').textContent = rows.length ? '(' + rows.length + ')' : '';
    $('memberEmpty').hidden = rows.length > 0;
    let html = '';
    let lastGroup = null;
    for (const r of rows) {
      const gname = r.groupName || 'Guruhsiz';
      if (gname !== lastGroup) {
        const g = res.groups.find((x) => x.id === r.groupId);
        html += `<div class="group-title"><span>${esc(gname)}</span>` +
          `<span>${g ? money(g.perPerson) + " so'm / kishi" : ''}</span></div>`;
        lastGroup = gname;
      }
      html += memberRowHtml(r);
    }
    $('memberList').innerHTML = html;

    // Amallar
    const names = new Map(res.rows.map((r) => [r.employeeId, r.name]));
    const ops = m.ops.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    $('opEmpty').hidden = ops.length > 0;
    $('opList').innerHTML = ops.map((op) => `
      <li class="row" data-op="${esc(op.id)}">
        <span class="op-ico" aria-hidden="true">${OP_ICONS[op.type]}</span>
        <div class="row-main">
          <div class="row-title">${esc(names.get(op.employeeId) || (getEmp(op.employeeId) || {}).name || '?')}</div>
          <div class="row-sub">${fmtDate(op.date, true)} · ${C.OP_LABELS[op.type]}${op.note ? ' · ' + esc(op.note) : ''}</div>
        </div>
        <div class="row-side"><span class="row-amount op-amount ${op.type}">${
          op.type === 'mukofot' ? '+' : op.type === 'jarima' ? '−' : ''}${money(op.amount)}</span></div>
      </li>`).join('');

    for (const id of ['addOpBtn', 'payAllBtn', 'addMemberBtn']) $(id).disabled = !open;
    $('payAllBtn').disabled = !open || t.due <= 0;
    $('closeMonthBtn').textContent = open ? '🔒 Oyni yopish' : '🔓 Qayta ochish';
  }

  function memberRowHtml(r) {
    const parts = [];
    if (r.status === 'no-group') parts.push('⚠ guruh yo\'q');
    if (r.absent) parts.push('kelmadi: ' + r.absent + ' kun');
    if (r.advance) parts.push('avans ' + money(r.advance));
    if (r.bonus) parts.push('mukofot +' + money(r.bonus));
    if (r.fine) parts.push('jarima −' + money(r.fine));
    if (r.carry) parts.push("o'tgan oy " + signed(r.carry));
    if (r.paid) parts.push("to'landi " + money(r.paid));
    if (!parts.length) parts.push('hisoblangan ' + money(r.total));
    const cls = r.balance < 0 ? 'neg' : r.balance === 0 ? 'zero' : '';
    return `
      <div class="row" data-emp="${esc(r.employeeId)}" role="button" tabindex="0">
        <span class="avatar" aria-hidden="true">${esc(initials(r.name))}</span>
        <div class="row-main">
          <div class="row-title">${esc(r.name)}</div>
          <div class="row-sub">${esc(parts.join(' · '))}</div>
        </div>
        <div class="row-side">
          <div class="row-amount ${cls}">${money(r.balance)}</div>
          <span class="pill ${r.status}">${esc(C.ROW_STATUS[r.status])}</span>
        </div>
      </div>`;
  }

  function onActivate(el, fn) {
    el.addEventListener('click', fn);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn(e);
      }
    });
  }

  onActivate($('memberList'), (e) => {
    const row = e.target.closest('[data-emp]');
    if (row) openMemberDialog(row.dataset.emp);
  });
  onActivate($('groupSummary'), (e) => {
    const card = e.target.closest('[data-group]');
    if (!card) return;
    if (!getGroup(card.dataset.group)) {
      toast("Bu guruh o'chirilgan (yopilgan oy surati)");
      return;
    }
    openGroupDialog(card.dataset.group);
  });
  $('opList').addEventListener('click', (e) => {
    const row = e.target.closest('[data-op]');
    if (row) openOpDialog({ opId: row.dataset.op });
  });

  $('prevMonth').addEventListener('click', () => stepMonth(-1));
  $('nextMonth').addEventListener('click', () => stepMonth(1));
  $('monthLabel').addEventListener('click', openMonthPicker);
  $('openFirstMonth').addEventListener('click', openNewMonthDialog);
  $('newMonthBtn').addEventListener('click', openNewMonthDialog);
  $('toGroups').addEventListener('click', () => setView('groups'));
  $('addMemberBtn').addEventListener('click', openAddMembersDialog);
  $('addOpBtn').addEventListener('click', () => openOpDialog({}));
  $('quickOpBtn').addEventListener('click', () => {
    if (view !== 'month') setView('month');
    openOpDialog({});
  });
  $('payAllBtn').addEventListener('click', payAll);
  $('exportMonthBtn').addEventListener('click', exportMonth);
  $('printBtn').addEventListener('click', printMonth);
  $('closeMonthBtn').addEventListener('click', toggleCloseMonth);
  $('deleteMonthBtn').addEventListener('click', deleteMonth);

  function stepMonth(d) {
    const keys = sortedKeys();
    const i = keys.indexOf(curKey) + d;
    if (i >= 0 && i < keys.length) {
      curKey = keys[i];
      renderAll();
    }
  }

  function openMonthPicker() {
    const keys = sortedKeys().reverse();
    openDialog({
      title: 'Oyni tanlash',
      render(body) {
        body.innerHTML = `
          <div class="pick-list">${keys.map((k) => {
            const r = all.get(k);
            return `<div class="row" data-key="${k}" role="button" tabindex="0">
              <div class="row-main"><div class="row-title">${C.monthName(k)}${k === curKey ? ' ✓' : ''}</div>
              <div class="row-sub">${r.totals.count} ishchi · hisoblangan ${money(r.totals.total)}</div></div>
              <span class="pill ${r.closed ? 'paid' : 'none'}">${r.closed ? 'Yopilgan' : 'Ochiq'}</span>
            </div>`;
          }).join('')}</div>
          <button class="btn primary wide" id="pkNew">🗓 Yangi oy ochish</button>`;
        onActivate(body.querySelector('.pick-list'), (e) => {
          const row = e.target.closest('[data-key]');
          if (!row) return;
          curKey = row.dataset.key;
          closeAllDialogs();
          renderAll();
        });
        body.querySelector('#pkNew').addEventListener('click', () => {
          closeAllDialogs();
          openNewMonthDialog();
        });
      },
    });
  }

  function openNewMonthDialog() {
    const keys = sortedKeys();
    const suggested = keys.length ? C.addMonths(keys[keys.length - 1], 1) : C.monthKey(new Date());
    const active = state.employees.filter((e) => e.active).length;
    openDialog({
      title: 'Yangi oy ochish',
      live: false,
      render(body) {
        body.innerHTML = `
          <form class="form" id="nmForm" novalidate>
            <label>Oy
              <input type="month" id="nmKey" value="${suggested}" required>
            </label>
            <p class="hint">Faol ishchilar (${active} kishi) avtomatik qo'shiladi. Har bir ishchining
              o'tgan oydan qolgan qoldig'i (to'lanmagan pul yoki qarz) shu oyga o'tadi.</p>
            ${!state.groups.length ? '<p class="error">Avval «Guruhlar» bo\'limida guruh qo\'shing.</p>' : ''}
            <p class="error" id="nmErr"></p>
            <div class="dialog-actions">
              <span class="spacer"></span>
              <button type="button" class="btn" data-close>Bekor</button>
              <button class="btn primary">Ochish</button>
            </div>
          </form>`;
        body.querySelector('[data-close]').addEventListener('click', closeDialog);
        body.querySelector('#nmForm').addEventListener('submit', (e) => {
          e.preventDefault();
          let key = body.querySelector('#nmKey').value.trim();
          // Eski brauzerlar "month" maydonini oddiy matn sifatida ko'rsatadi
          const mm = key.match(/^(\d{4})[-./](\d{1,2})$/) || key.match(/^(\d{1,2})[-./](\d{4})$/);
          if (mm) key = mm[1].length === 4 ? mm[1] + '-' + mm[2].padStart(2, '0') : mm[2] + '-' + mm[1].padStart(2, '0');
          if (!C.isMonthKey(key)) {
            body.querySelector('#nmErr').textContent = 'Oyni YYYY-OO ko\'rinishida kiriting, masalan 2026-11';
            return;
          }
          closeAllDialogs();
          if (getMonth(key)) {
            curKey = key;
            renderAll();
            toast(C.monthName(key) + ' allaqachon ochilgan');
            return;
          }
          mutate(() => {
            state.months.push({
              key,
              closed: false,
              closedAt: '',
              members: state.employees.filter((x) => x.active)
                .map((x) => ({ employeeId: x.id, absent: 0, carryStart: 0 })),
              ops: [],
              snapshot: null,
            });
            state.months.sort((a, b) => (a.key < b.key ? -1 : 1));
            curKey = key;
          });
          setView('month');
          toast(C.monthName(key) + ' hisobi ochildi');
        });
      },
    });
  }

  function toggleCloseMonth() {
    const m = curMonth();
    if (!m) return;
    const res = curRes();
    if (m.closed) {
      const laterClosed = state.months.some((x) => x.key > m.key && x.closed);
      const text = 'Oyni qayta ochasizmi? Raqamlar yana guruh va ishchi sozlamalariga qarab hisoblanadi.' +
        (laterClosed ? '\n\nDiqqat: keyingi oylardan biri yopilgan — bu oydagi o\'zgarishlar unga o\'tmaydi.' : '');
      if (!confirmBox(text)) return;
      mutate(() => {
        m.closed = false;
        m.snapshot = null;
        m.closedAt = '';
      });
      toast(C.monthName(m.key) + ' qayta ochildi');
      return;
    }
    const t = res.totals;
    let text = C.monthName(m.key) + ' yopilsinmi?\n\nYopilgan oyning raqamlari muhrlanadi: keyin guruh oyligi ' +
      "yoki ishchi ma'lumotlari o'zgarsa ham bu oy o'zgarmaydi.";
    if (t.due) text += '\n\nTo\'lanmagan ' + som(t.due) + ' keyingi oyga qoldiq bo\'lib o\'tadi.';
    if (t.debt) text += '\nIshchilar qarzi ' + som(t.debt) + ' keyingi oydan ushlab qolinadi.';
    if (!confirmBox(text)) return;
    mutate(() => {
      m.snapshot = C.makeSnapshot(res);
      m.closed = true;
      m.closedAt = new Date().toISOString();
    });
    toast(C.monthName(m.key) + ' yopildi 🔒');
  }

  function deleteMonth() {
    const m = curMonth();
    if (!m) return;
    if (!confirmBox(C.monthName(m.key) + " hisobini butunlay o'chirasizmi? Shu oydagi barcha amallar " +
      "(" + m.ops.length + " ta) ham o'chadi.")) return;
    const name = C.monthName(m.key);
    mutate(() => {
      state.months = state.months.filter((x) => x !== m);
      curKey = null;
    }, name + " o'chirildi");
  }

  function payAll() {
    const m = curMonth();
    const res = curRes();
    if (!isOpen(m)) return;
    const due = res.rows.filter((r) => r.balance > 0);
    if (!due.length) {
      toast("To'lanmagan qoldiq yo'q");
      return;
    }
    const sum = due.reduce((a, r) => a + r.balance, 0);
    if (!confirmBox(due.length + ' ta ishchiga jami ' + som(sum) + " to'landi deb yozilsinmi?\n\n" +
      'Har biriga qolgan summasi bo\'yicha «To\'lov» amali qo\'shiladi.')) return;
    const date = C.defaultOpDate(m.key);
    mutate(() => {
      for (const r of due) {
        m.ops.push({ id: uid(), employeeId: r.employeeId, type: 'tolov', amount: r.balance, date, note: '' });
      }
    }, due.length + " ta ishchiga to'lov yozildi");
  }

  // ---------- Ishchining oylik varag'i ----------

  function openMemberDialog(empId) {
    openDialog({
      title: () => {
        const r = (curRes() && curRes().rows.find((x) => x.employeeId === empId)) || null;
        return r ? r.name : 'Ishchi';
      },
      render(body) {
        const m = curMonth();
        const res = curRes();
        const r = res && res.rows.find((x) => x.employeeId === empId);
        if (!m || !r) {
          body.innerHTML = '<p class="empty">Bu ishchi shu oy ro\'yxatida yo\'q.</p>';
          return;
        }
        const open = isOpen(m);
        const mm = m.members.find((x) => x.employeeId === empId);
        const ops = m.ops.filter((o) => o.employeeId === empId)
          .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        const g = res.groups.find((x) => x.id === r.groupId);
        const line = (label, v, cls) =>
          `<tr class="${cls || ''}"><td>${label}</td><td>${v}</td></tr>`;
        body.innerHTML = `
          <p class="muted small">${esc(r.groupName || 'Guruhsiz')} · ${C.monthName(m.key)}
            ${g ? ' · guruhda ' + g.count + ' / ' + g.norm + ' kishi' : ''}</p>

          <div class="section-title">Davomat</div>
          <div class="stepper">
            <button type="button" id="abMinus" aria-label="Kamaytirish" ${open ? '' : 'disabled'}>−</button>
            <output id="abVal">${r.absent}</output>
            <button type="button" id="abPlus" aria-label="Ko'paytirish" ${open ? '' : 'disabled'}>+</button>
            <span class="muted small">kun kelmadi<br>ishladi: <b>${r.worked} / ${r.workDays}</b> kun</span>
          </div>

          ${r.carryFrom === null && open ? `
          <div class="section-title">Boshlang'ich qoldiq</div>
          <form class="form" id="csForm">
            <label>O'tgan oydan qolgan summa (qarz bo'lsa — minus bilan)
              <input id="csVal" type="text" inputmode="numeric" value="${r.carry ? (r.carry < 0 ? '-' : '') + Math.abs(r.carry) : ''}" placeholder="0">
            </label>
          </form>` : ''}

          <div class="section-title">Hisob</div>
          <table class="breakdown">
            ${line('1 kishiga oylik (guruh)', money(r.perPerson))}
            ${r.absent ? line('Asosiy (' + r.worked + ' / ' + r.workDays + ' kun)', money(r.base)) : line('Asosiy oylik', money(r.base))}
            ${r.bonus ? line('+ Mukofot', '+' + money(r.bonus)) : ''}
            ${r.fine ? line('− Jarima', '−' + money(r.fine)) : ''}
            ${r.carry ? line("± O'tgan oydan" + (r.carryFrom ? ' (' + C.monthName(r.carryFrom) + ')' : ''), signed(r.carry)) : ''}
            ${line('Jami hisoblangan', money(r.total), 'sum')}
            ${line('− Avans', r.advance ? '−' + money(r.advance) : '0')}
            ${line("Qo'lga beriladi", money(r.toPay), 'sum')}
            ${line("− To'landi", r.paid ? '−' + money(r.paid) : '0')}
            ${line(r.balance < 0 ? 'Qarzdor (keyingi oyga)' : 'Qoldiq', money(r.balance), 'sum big')}
          </table>
          <p><span class="pill ${r.status}">${esc(C.ROW_STATUS[r.status])}</span></p>

          <div class="section-title">Amallar</div>
          <ul class="list ops" id="mdOps">${ops.map((op) => `
            <li class="row" data-op="${esc(op.id)}">
              <span class="op-ico">${OP_ICONS[op.type]}</span>
              <div class="row-main"><div class="row-title">${C.OP_LABELS[op.type]}</div>
                <div class="row-sub">${fmtDate(op.date)}${op.note ? ' · ' + esc(op.note) : ''}</div></div>
              <div class="row-side"><span class="row-amount">${money(op.amount)}</span></div>
            </li>`).join('') || '<li class="empty">Amal yo\'q</li>'}</ul>
          ${open ? `<div class="chips" style="margin-top:8px">
            <button type="button" class="chip" data-add="avans">💸 Avans</button>
            <button type="button" class="chip" data-add="mukofot">🎁 Mukofot</button>
            <button type="button" class="chip" data-add="jarima">⛔ Jarima</button>
            <button type="button" class="chip" data-add="tolov">💵 To'lov</button>
          </div>` : ''}

          <div class="actions" style="margin-top:16px">
            ${open && r.balance > 0 ? `<button type="button" class="btn primary" id="mdPay">💵 Qoldiqni to'lash — ${som(r.balance)}</button>` : ''}
            <button type="button" class="btn" id="mdShare">📤 Ulashish</button>
            <button type="button" class="btn" id="mdEmp">👤 Ishchi ma'lumoti</button>
            ${open ? '<button type="button" class="btn danger-text" id="mdRemove">Bu oydan olib tashlash</button>' : ''}
          </div>`;

        const setAbsent = (v) => {
          const val = C.clamp(v, 0, 31);
          if (val === mm.absent) return;
          mutate(() => { mm.absent = val; });
        };
        if (open) {
          body.querySelector('#abMinus').addEventListener('click', () => setAbsent(mm.absent - 1));
          body.querySelector('#abPlus').addEventListener('click', () => setAbsent(mm.absent + 1));
        }
        const cs = body.querySelector('#csVal');
        if (cs) {
          bindMoney(cs, true);
          const commit = () => {
            const v = moneyValue(cs);
            if (v !== mm.carryStart) mutate(() => { mm.carryStart = v; });
          };
          cs.addEventListener('change', commit);
          body.querySelector('#csForm').addEventListener('submit', (e) => {
            e.preventDefault();
            commit();
          });
        }
        body.querySelector('#mdOps').addEventListener('click', (e) => {
          const row = e.target.closest('[data-op]');
          if (row) openOpDialog({ opId: row.dataset.op });
        });
        body.querySelectorAll('[data-add]').forEach((b) =>
          b.addEventListener('click', () => openOpDialog({ empId, type: b.dataset.add })));
        const pay = body.querySelector('#mdPay');
        if (pay) {
          pay.addEventListener('click', () => {
            if (!confirmBox(r.name + 'ga ' + som(r.balance) + " to'landi deb yozilsinmi?")) return;
            mutate(() => {
              m.ops.push({ id: uid(), employeeId: empId, type: 'tolov', amount: r.balance,
                date: C.defaultOpDate(m.key), note: '' });
            }, "To'lov yozildi");
          });
        }
        body.querySelector('#mdShare').addEventListener('click', () =>
          shareText(r.name + ' — ' + C.monthName(m.key), payslipText(r, m)));
        body.querySelector('#mdEmp').addEventListener('click', () => {
          if (getEmp(empId)) openEmployeeDialog(empId);
          else toast("Ishchi ma'lumoti o'chirilgan");
        });
        const rm = body.querySelector('#mdRemove');
        if (rm) {
          rm.addEventListener('click', () => {
            if (ops.length) {
              alert('Avval bu ishchining shu oydagi amallarini o\'chiring (' + ops.length + ' ta).');
              return;
            }
            if (!confirmBox(r.name + ' ' + C.monthName(m.key) + ' hisobidan olib tashlansinmi? ' +
              'Guruhdagi odamlar soni kamayadi va qolganlarning oyligi qayta hisoblanadi.')) return;
            closeDialog();
            mutate(() => {
              m.members = m.members.filter((x) => x.employeeId !== empId);
            }, r.name + ' oy ro\'yxatidan olindi');
          });
        }
      },
    });
  }

  function payslipText(r, m) {
    const lines = [
      state.settings.business + ' — ' + C.monthName(m.key),
      r.name + (r.groupName ? ' (' + r.groupName + ')' : ''),
      '',
      'Ishlagan kun: ' + r.worked + ' / ' + r.workDays,
      'Asosiy oylik: ' + money(r.base),
    ];
    if (r.bonus) lines.push('Mukofot: +' + money(r.bonus));
    if (r.fine) lines.push('Jarima: −' + money(r.fine));
    if (r.carry) lines.push("O'tgan oydan: " + signed(r.carry));
    lines.push('Jami hisoblangan: ' + money(r.total));
    const adv = m.ops.filter((o) => o.employeeId === r.employeeId && o.type === 'avans');
    if (adv.length) {
      lines.push('Avans: −' + money(r.advance) + ' (' +
        adv.map((o) => fmtDate(o.date, true) + ' — ' + money(o.amount)).join('; ') + ')');
    }
    lines.push("Qo'lga beriladi: " + money(r.toPay));
    if (r.paid) lines.push("To'landi: " + money(r.paid));
    lines.push((r.balance < 0 ? 'Qarz: ' : 'Qoldiq: ') + money(Math.abs(r.balance)) + " so'm");
    return lines.join('\n');
  }

  // ---------- Amal (avans, mukofot, jarima, to'lov) ----------

  function openOpDialog(opts) {
    const m = curMonth();
    if (!m) return;
    const existing = opts.opId ? m.ops.find((o) => o.id === opts.opId) : null;
    if (opts.opId && !existing) return;
    const open = isOpen(m);
    if (!open && !existing) return;
    const res = curRes();
    const rows = E.sortedRows(res);
    if (!existing && !rows.length) {
      toast("Avval oyga ishchi qo'shing");
      return;
    }
    const range = monthRange(m.key);
    openDialog({
      title: existing ? (open ? 'Amalni tahrirlash' : 'Amal') : 'Yangi amal',
      live: false,
      render(body) {
        const type = existing ? existing.type : opts.type || 'avans';
        const empId = existing ? existing.employeeId : opts.empId || '';
        const known = rows.some((r) => r.employeeId === empId);
        body.innerHTML = `
          <form class="form" id="opForm" novalidate>
            <div class="segmented" role="radiogroup" aria-label="Turi">
              ${C.OP_TYPES.map((t) => `<label><input type="radio" name="type" value="${t}"
                ${t === type ? 'checked' : ''} ${open ? '' : 'disabled'}><span>${OP_ICONS[t]} ${C.OP_LABELS[t]}</span></label>`).join('')}
            </div>
            <p class="hint" id="opHint"></p>
            <label>Ishchi
              <select id="opEmp" ${open ? '' : 'disabled'}>
                <option value="">— tanlang —</option>
                ${rows.map((r) => `<option value="${esc(r.employeeId)}" ${r.employeeId === empId ? 'selected' : ''}>${esc(r.name)} (${esc(r.groupName || 'guruhsiz')})</option>`).join('')}
                ${empId && !known ? `<option value="${esc(empId)}" selected>${esc((getEmp(empId) || {}).name || '?')} (oy ro'yxatida yo'q)</option>` : ''}
              </select>
            </label>
            <label>Summa (so'm)
              <input id="opAmount" type="text" inputmode="numeric" autocomplete="off" placeholder="0"
                value="${existing ? existing.amount : ''}" ${open ? '' : 'disabled'}>
            </label>
            <div class="chips" id="opChips"></div>
            <label>Sana
              <input id="opDate" type="date" min="${range.min}" max="${range.max}"
                value="${existing ? existing.date : C.defaultOpDate(m.key)}" ${open ? '' : 'disabled'}>
            </label>
            <label>Izoh (ixtiyoriy)
              <input id="opNote" type="text" maxlength="200" value="${esc(existing ? existing.note : '')}" ${open ? '' : 'disabled'}>
            </label>
            <p class="error" id="opErr"></p>
            <div class="dialog-actions">
              ${existing && open ? '<button type="button" class="btn danger-text" id="opDel">O\'chirish</button>' : ''}
              <span class="spacer"></span>
              <button type="button" class="btn" data-close>${open ? 'Bekor' : 'Yopish'}</button>
              ${open ? '<button class="btn primary">Saqlash</button>' : ''}
            </div>
          </form>`;
        const form = body.querySelector('#opForm');
        const amount = body.querySelector('#opAmount');
        bindMoney(amount, false);
        const selType = () => (form.querySelector('input[name="type"]:checked') || {}).value;
        const HINTS = {
          avans: 'Oy davomida oldindan berilgan pul — oylikdan ayiriladi.',
          mukofot: "Qo'shimcha pul (ustama, bonus) — oylikka qo'shiladi.",
          jarima: 'Ushlab qolinadigan summa — oylikdan ayiriladi.',
          tolov: 'Oylik kuni (yoki qolgan qismi) berilgan pul.',
        };
        const updateChips = () => {
          const t = selType();
          body.querySelector('#opHint').textContent = HINTS[t] || '';
          const chips = [];
          const r = rows.find((x) => x.employeeId === body.querySelector('#opEmp').value);
          if (r && (t === 'tolov' || t === 'avans') && r.balance > 0) {
            chips.push([r.balance, 'Qoldiq: ' + money(r.balance)]);
          }
          for (const v of [100000, 200000, 500000, 1000000]) chips.push([v, money(v)]);
          body.querySelector('#opChips').innerHTML = open ? chips.map(([v, label]) =>
            `<button type="button" class="chip" data-v="${v}">${label}</button>`).join('') : '';
        };
        form.addEventListener('change', updateChips);
        updateChips();
        body.querySelector('#opChips').addEventListener('click', (e) => {
          const b = e.target.closest('[data-v]');
          if (!b) return;
          amount.value = money(Number(b.dataset.v));
        });
        body.querySelector('[data-close]').addEventListener('click', closeDialog);
        const del = body.querySelector('#opDel');
        if (del) {
          del.addEventListener('click', () => {
            closeDialog();
            mutate(() => { m.ops = m.ops.filter((o) => o !== existing); },
              C.OP_LABELS[existing.type] + " o'chirildi");
          });
        }
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const err = body.querySelector('#opErr');
          const data = {
            type: selType(),
            employeeId: body.querySelector('#opEmp').value,
            amount: moneyValue(amount),
            date: body.querySelector('#opDate').value,
            note: body.querySelector('#opNote').value.trim().slice(0, 200),
          };
          if (!C.OP_TYPES.includes(data.type)) { err.textContent = 'Amal turini tanlang'; return; }
          if (!data.employeeId) { err.textContent = 'Ishchini tanlang'; return; }
          if (data.amount <= 0) { err.textContent = "Summani kiriting"; amount.focus(); return; }
          if (data.amount > 1e11) { err.textContent = 'Summa juda katta'; return; }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || data.date < range.min || data.date > range.max) {
            err.textContent = 'Sana ' + C.monthName(m.key) + ' ichida bo\'lishi kerak';
            return;
          }
          closeDialog();
          mutate(() => {
            if (existing) Object.assign(existing, data);
            else m.ops.push(Object.assign({ id: uid() }, data));
          });
          toast(C.OP_LABELS[data.type] + ' ' + (existing ? 'saqlandi' : 'yozildi') + ': ' + som(data.amount));
        });
        if (!existing && !empId) body.querySelector('#opEmp').focus();
        else if (open && !existing) amount.focus();
      },
    });
  }

  // ---------- Oyga ishchi qo'shish ----------

  function openAddMembersDialog() {
    const m = curMonth();
    if (!isOpen(m)) return;
    openDialog({
      title: "Oyga ishchi qo'shish",
      render(body) {
        const inMonth = new Set(m.members.map((x) => x.employeeId));
        const list = state.employees.filter((e) => !inMonth.has(e.id))
          .sort((a, b) => (b.active - a.active) || byName(a, b));
        body.innerHTML = `
          ${list.length ? `<form class="form" id="amForm">
            <div class="pick-list">${list.map((e) => `
              <label class="check"><input type="checkbox" value="${esc(e.id)}" ${e.active ? 'checked' : ''}>
                <span>${esc(e.name)} <span class="muted small">· ${esc((getGroup(e.groupId) || {}).name || 'guruhsiz')}${e.active ? '' : ' · ishdan ketgan'}</span></span>
              </label>`).join('')}</div>
            <div class="dialog-actions">
              <span class="spacer"></span>
              <button class="btn primary">Qo'shish</button>
            </div>
          </form>` : '<p class="empty">Ro\'yxatdagi hamma ishchi shu oyda bor.</p>'}
          <button type="button" class="btn wide" id="amNew">＋ Yangi ishchi yaratish</button>`;
        body.querySelector('#amNew').addEventListener('click', () => openEmployeeDialog(null));
        const form = body.querySelector('#amForm');
        if (!form) return;
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const ids = Array.from(form.querySelectorAll('input:checked')).map((i) => i.value);
          if (!ids.length) {
            toast('Hech kim tanlanmadi');
            return;
          }
          closeDialog();
          mutate(() => {
            for (const id of ids) m.members.push({ employeeId: id, absent: 0, carryStart: 0 });
          });
          toast(ids.length + " ta ishchi qo'shildi");
        });
      },
    });
  }

  // ---------- Ishchilar ----------

  function renderStaff() {
    const q = staffQuery.trim().toLowerCase();
    const res = curRes();
    const balances = new Map(res ? res.rows.map((r) => [r.employeeId, r]) : []);
    const list = state.employees.filter((e) => !q || e.name.toLowerCase().includes(q) ||
      (e.phone || '').includes(q));
    $('staffEmpty').hidden = list.length > 0;
    $('staffEmpty').textContent = state.employees.length ? 'Hech narsa topilmadi.' : "Ishchilar ro'yxati bo'sh.";
    const buckets = state.groups.map((g) => ({ g, items: [] }));
    const orphan = { g: { id: '', name: 'Guruhsiz' }, items: [] };
    for (const e of list) {
      const b = buckets.find((x) => x.g.id === e.groupId) || orphan;
      b.items.push(e);
    }
    let html = '';
    for (const b of buckets.concat([orphan])) {
      if (!b.items.length) continue;
      b.items.sort((a, c) => (c.active - a.active) || byName(a, c));
      const active = b.items.filter((e) => e.active).length;
      html += `<div class="group-title"><span>${esc(b.g.name)}</span><span>${active} faol</span></div>` +
        '<div class="card" style="padding:4px 10px">';
      for (const e of b.items) {
        const r = balances.get(e.id);
        html += `
          <div class="row ${e.active ? '' : 'inactive'}" data-emp="${esc(e.id)}" role="button" tabindex="0">
            <span class="avatar" aria-hidden="true">${esc(initials(e.name))}</span>
            <div class="row-main">
              <div class="row-title">${esc(e.name)}</div>
              <div class="row-sub">${esc([e.phone, e.active ? '' : 'ishdan ketgan', r ? '' : (e.active ? 'joriy oyda yo\'q' : '')].filter(Boolean).join(' · ') || ' ')}</div>
            </div>
            ${r ? `<div class="row-side"><div class="row-amount ${r.balance < 0 ? 'neg' : r.balance === 0 ? 'zero' : ''}">${money(r.balance)}</div>
              <span class="muted small">qoldiq</span></div>` : ''}
          </div>`;
      }
      html += '</div>';
    }
    $('staffList').innerHTML = html;
  }

  $('staffSearch').addEventListener('input', (e) => {
    staffQuery = e.target.value;
    renderStaff();
  });
  onActivate($('staffList'), (e) => {
    const row = e.target.closest('[data-emp]');
    if (row) openEmployeeDialog(row.dataset.emp);
  });
  $('addEmployeeBtn').addEventListener('click', () => openEmployeeDialog(null));

  function employeeHistory(empId) {
    const out = [];
    for (const k of sortedKeys()) {
      const r = all.get(k).rows.find((x) => x.employeeId === empId);
      if (r) out.push({ key: k, r });
    }
    return out;
  }

  function openEmployeeDialog(empId) {
    const e = empId ? getEmp(empId) : null;
    if (empId && !e) return;
    const target = e ? null : (isOpen(curMonth()) ? curMonth() : latestOpenMonth());
    openDialog({
      title: e ? e.name : 'Yangi ishchi',
      live: false,
      render(body) {
        const hist = e ? employeeHistory(e.id) : [];
        const usedInMonths = e ? state.months.some((m) => m.members.some((x) => x.employeeId === e.id) ||
          m.ops.some((o) => o.employeeId === e.id)) : false;
        body.innerHTML = `
          <form class="form" id="empForm" novalidate>
            <label>Ism va familiya
              <input id="empName" type="text" maxlength="80" required value="${esc(e ? e.name : '')}" autocomplete="off">
            </label>
            <label>Guruh
              <select id="empGroup">
                ${state.groups.map((g) => `<option value="${esc(g.id)}" ${e && e.groupId === g.id ? 'selected' : ''}>${esc(g.name)} — ${money(g.base)}</option>`).join('')}
                ${e && !getGroup(e.groupId) ? '<option value="" selected>— guruh tanlanmagan —</option>' : ''}
              </select>
            </label>
            ${!state.groups.length ? '<p class="error">Avval «Guruhlar» bo\'limida guruh qo\'shing.</p>' : ''}
            <div class="row2">
              <label>Telefon
                <input id="empPhone" type="tel" maxlength="30" value="${esc(e ? e.phone : '')}" placeholder="+998">
              </label>
              <label>Izoh
                <input id="empNote" type="text" maxlength="300" value="${esc(e ? e.note : '')}">
              </label>
            </div>
            ${e ? `<label class="check"><input type="checkbox" id="empActive" ${e.active ? 'checked' : ''}>
              <span>Ishlayapti <span class="muted small">(belgini olib tashlasangiz — ishdan ketgan; yangi oylarga qo'shilmaydi)</span></span></label>` : ''}
            ${!e && target ? `<label class="check"><input type="checkbox" id="empAddMonth" checked>
              <span>${C.monthName(target.key)} hisobiga qo'shish</span></label>` : ''}
            ${e && e.groupId && hist.some((h) => !all.get(h.key).closed) ? '<p class="hint">Guruhni o\'zgartirsangiz, yopilmagan oylar yangi guruh bo\'yicha qayta hisoblanadi.</p>' : ''}
            <p class="error" id="empErr"></p>
            <div class="dialog-actions">
              ${e ? '<button type="button" class="btn danger-text" id="empDel">O\'chirish</button>' : ''}
              <span class="spacer"></span>
              <button type="button" class="btn" data-close>Bekor</button>
              <button class="btn primary">Saqlash</button>
            </div>
          </form>
          ${hist.length ? `
          <div class="section-title">Oylar bo'yicha</div>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Oy</th><th>Hisoblangan</th><th>Berilgan</th><th>Qoldiq</th></tr></thead>
            <tbody>${hist.map((h) => `<tr><td>${C.monthName(h.key)}</td><td>${money(h.r.total - h.r.carry)}</td>
              <td>${money(h.r.advance + h.r.paid)}</td><td>${money(h.r.balance)}</td></tr>`).join('')}</tbody>
          </table></div>` : ''}`;
        body.querySelector('[data-close]').addEventListener('click', closeDialog);
        const del = body.querySelector('#empDel');
        if (del) {
          del.addEventListener('click', () => {
            if (usedInMonths) {
              alert("Bu ishchining oylarda hisobi bor, shuning uchun uni o'chirib bo'lmaydi.\n\n" +
                "Ishdan ketgan bo'lsa, «Ishlayapti» belgisini olib tashlang — u yangi oylarga qo'shilmaydi, " +
                'eski hisoblari esa saqlanib qoladi.');
              return;
            }
            if (!confirmBox(e.name + " ro'yxatdan o'chirilsinmi?")) return;
            closeAllDialogs();
            mutate(() => { state.employees = state.employees.filter((x) => x !== e); },
              e.name + " o'chirildi");
          });
        }
        body.querySelector('#empForm').addEventListener('submit', (ev) => {
          ev.preventDefault();
          const err = body.querySelector('#empErr');
          const name = body.querySelector('#empName').value.trim().replace(/\s+/g, ' ');
          const groupId = body.querySelector('#empGroup').value;
          if (!name) { err.textContent = 'Ismni kiriting'; return; }
          if (!groupId || !getGroup(groupId)) { err.textContent = 'Guruhni tanlang'; return; }
          const dup = state.employees.find((x) => x !== e && x.name.toLowerCase() === name.toLowerCase());
          if (dup && !confirmBox('«' + name + '» ismli ishchi allaqachon bor. Baribir saqlansinmi?')) return;
          const fields = {
            name,
            groupId,
            phone: body.querySelector('#empPhone').value.trim().slice(0, 30),
            note: body.querySelector('#empNote').value.trim().slice(0, 300),
          };
          const activeBox = body.querySelector('#empActive');
          const addBox = body.querySelector('#empAddMonth');
          closeDialog();
          mutate(() => {
            if (e) {
              Object.assign(e, fields, { active: activeBox ? activeBox.checked : e.active });
            } else {
              const emp = Object.assign({ id: uid(), active: true }, fields);
              state.employees.push(emp);
              if (addBox && addBox.checked && target) {
                target.members.push({ employeeId: emp.id, absent: 0, carryStart: 0 });
              }
            }
          });
          toast(e ? 'Saqlandi' : name + " qo'shildi" + (addBox && addBox.checked && target ? ' (' + C.monthName(target.key) + ')' : ''));
        });
        if (!e) body.querySelector('#empName').focus();
      },
    });
  }

  // ---------- Guruhlar ----------

  function renderGroups() {
    const res = curRes();
    const open = isOpen(curMonth());
    $('groupEmpty').hidden = state.groups.length > 0;
    $('groupList').innerHTML = state.groups.map((g) => {
      const active = state.employees.filter((e) => e.active && e.groupId === g.id).length;
      const cg = res && open ? res.groups.find((x) => x.id === g.id) : null;
      const st = active > g.norm ? 'over' : active < g.norm ? 'vacant' : 'ok';
      const stText = active > g.norm ? "me'yordan " + (active - g.norm) + ' ortiq'
        : active < g.norm ? (g.norm - active) + " bo'sh o'rin" : "me'yorda";
      return `
        <div class="card gcard-big" data-group="${esc(g.id)}" role="button" tabindex="0">
          <div class="gcard-top">
            <span class="gcard-name">${esc(g.name)}</span>
            <span class="pill ${st}">${active} / ${g.norm} · ${stText}</span>
          </div>
          <div class="kv">
            <span>Asosiy oylik (1 kishi)</span><span>${som(g.base)}</span>
            <span>Me'yoriy soni</span><span>${g.norm} kishi</span>
            <span>Oyiga ish kuni</span><span>${g.workDays} kun</span>
            <span>Ajratilgan fond</span><span class="strong">${som(g.base * g.norm)}</span>
            ${cg ? `<span>1 kishiga (${C.monthName(curKey)})</span><span class="strong">${som(cg.perPerson)}</span>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  onActivate($('groupList'), (e) => {
    const card = e.target.closest('[data-group]');
    if (card) openGroupDialog(card.dataset.group);
  });
  $('addGroupBtn').addEventListener('click', () => openGroupDialog(null));

  function openGroupDialog(groupId) {
    const g = groupId ? getGroup(groupId) : null;
    if (groupId && !g) return;
    openDialog({
      title: g ? g.name : 'Yangi guruh',
      live: false,
      render(body) {
        const members = g ? state.employees.filter((e) => e.groupId === g.id) : [];
        body.innerHTML = `
          <form class="form" id="grForm" novalidate>
            <label>Guruh nomi
              <input id="grName" type="text" maxlength="60" required value="${esc(g ? g.name : '')}" placeholder="masalan, Oshpaz">
            </label>
            <label>Asosiy oylik — 1 kishi uchun (so'm)
              <input id="grBase" type="text" inputmode="numeric" value="${g ? g.base : ''}" placeholder="4 000 000">
            </label>
            <div class="row2">
              <label>Me'yoriy soni (kishi)
                <input id="grNorm" type="number" inputmode="numeric" min="0" max="999" step="1" value="${g ? g.norm : 1}">
              </label>
              <label>Oyiga ish kuni
                <input id="grDays" type="number" inputmode="numeric" min="1" max="31" step="1" value="${g ? g.workDays : C.DEFAULT_WORK_DAYS}">
              </label>
            </div>
            <p class="hint">Fond = asosiy oylik × me'yoriy soni: <b id="grFund"></b>.
              Ish kuni — kelmagan kunlar shu songa nisbatan ushlab qolinadi.</p>
            ${g ? `<p class="hint">Bu guruhda ${members.length} ta ishchi (${members.filter((e) => e.active).length} ta faol).</p>` : ''}
            <p class="error" id="grErr"></p>
            <div class="dialog-actions">
              ${g ? '<button type="button" class="btn danger-text" id="grDel">O\'chirish</button>' : ''}
              <span class="spacer"></span>
              <button type="button" class="btn" data-close>Bekor</button>
              <button class="btn primary">Saqlash</button>
            </div>
          </form>`;
        const base = body.querySelector('#grBase');
        bindMoney(base, false);
        const norm = body.querySelector('#grNorm');
        const fund = () => {
          body.querySelector('#grFund').textContent = som(moneyValue(base) * Math.max(0, C.toInt(norm.value)));
        };
        base.addEventListener('input', fund);
        norm.addEventListener('input', fund);
        fund();
        body.querySelector('[data-close]').addEventListener('click', closeDialog);
        const del = body.querySelector('#grDel');
        if (del) {
          del.addEventListener('click', () => {
            if (members.length) {
              alert("Bu guruhda " + members.length + " ta ishchi bor. Avval ularni boshqa guruhga o'tkazing.");
              return;
            }
            if (!confirmBox('«' + g.name + "» guruhi o'chirilsinmi?")) return;
            closeAllDialogs();
            mutate(() => { state.groups = state.groups.filter((x) => x !== g); }, g.name + " o'chirildi");
          });
        }
        body.querySelector('#grForm').addEventListener('submit', (ev) => {
          ev.preventDefault();
          const err = body.querySelector('#grErr');
          const data = {
            name: body.querySelector('#grName').value.trim().replace(/\s+/g, ' '),
            base: moneyValue(base),
            norm: C.toInt(norm.value, -1),
            workDays: C.toInt(body.querySelector('#grDays').value, 0),
          };
          if (!data.name) { err.textContent = 'Guruh nomini kiriting'; return; }
          if (state.groups.some((x) => x !== g && x.name.toLowerCase() === data.name.toLowerCase())) {
            err.textContent = 'Bunday nomli guruh bor';
            return;
          }
          if (data.base <= 0) { err.textContent = 'Asosiy oylikni kiriting'; return; }
          if (data.norm < 0 || data.norm > 999) { err.textContent = "Me'yoriy son 0 dan 999 gacha bo'lsin"; return; }
          if (data.workDays < 1 || data.workDays > 31) { err.textContent = "Ish kuni 1 dan 31 gacha bo'lsin"; return; }
          closeDialog();
          mutate(() => {
            if (g) Object.assign(g, data);
            else state.groups.push(Object.assign({ id: uid() }, data));
          });
          toast(g ? 'Guruh saqlandi' : data.name + " guruhi qo'shildi");
        });
        if (!g) body.querySelector('#grName').focus();
      },
    });
  }

  // ---------- Hisobot ----------

  function renderReport() {
    const years = Array.from(new Set(state.months.map((m) => m.key.slice(0, 4)))).sort();
    if (!reportYear || !years.includes(reportYear)) {
      reportYear = curKey ? curKey.slice(0, 4) : years[years.length - 1] || String(new Date().getFullYear());
    }
    const yi = years.indexOf(reportYear);
    $('prevYear').disabled = yi <= 0;
    $('nextYear').disabled = yi < 0 || yi >= years.length - 1;
    $('yearLabel').textContent = reportYear + '-yil';
    const keys = sortedKeys().filter((k) => k.startsWith(reportYear + '-'));
    let sAcc = 0;
    let sGiven = 0;
    let sSaved = 0;
    const body = keys.map((k) => {
      const t = all.get(k).totals;
      const acc = t.total - t.carry;
      sAcc += acc;
      sGiven += t.given;
      sSaved += t.saved;
      return `<tr class="clickable" data-key="${k}"><td>${C.monthName(k)}${all.get(k).closed ? ' 🔒' : ''}</td>
        <td>${money(acc)}</td><td>${money(t.given)}</td><td>${money(t.due - t.debt)}</td><td>${money(t.saved)}</td></tr>`;
    }).join('');
    $('yearTable').innerHTML = keys.length ? `
      <thead><tr><th>Oy</th><th>Hisoblangan</th><th>Berilgan</th><th>Qoldiq</th><th>Tejaldi</th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><td>Jami</td><td>${money(sAcc)}</td><td>${money(sGiven)}</td><td>—</td><td>${money(sSaved)}</td></tr></tfoot>`
      : '<tbody><tr><td class="muted">Bu yilda ma\'lumot yo\'q</td></tr></tbody>';

    const people = new Map();
    for (const k of keys) {
      for (const r of all.get(k).rows) {
        let p = people.get(r.employeeId);
        if (!p) people.set(r.employeeId, (p = { name: r.name, acc: 0, given: 0, last: 0 }));
        p.name = r.name;
        p.acc += r.total - r.carry;
        p.given += r.advance + r.paid;
        p.last = r.balance;
      }
    }
    const plist = Array.from(people.values()).sort(byName);
    $('yearPeople').innerHTML = plist.length ? `
      <thead><tr><th>Ism</th><th>Hisoblangan</th><th>Berilgan</th><th>Oxirgi qoldiq</th></tr></thead>
      <tbody>${plist.map((p) => `<tr><td>${esc(p.name)}</td><td>${money(p.acc)}</td><td>${money(p.given)}</td>
        <td>${money(p.last)}</td></tr>`).join('')}</tbody>` : '';
    $('exportYearBtn').disabled = !keys.length;

    // Zaxira eslatmasi
    const last = state.settings.lastBackupAt;
    const days = last ? Math.floor((Date.now() - Date.parse(last)) / 86400000) : null;
    const needs = state.months.length && (days === null || days >= BACKUP_REMIND_DAYS);
    $('backupNag').hidden = !needs;
    if (needs) {
      $('backupNag').textContent = '💾 ' + (days === null ? 'Hali zaxira nusxa olinmagan.'
        : 'Oxirgi zaxira nusxa ' + days + ' kun oldin olingan.') +
        ' Telefon buzilsa yoki almashtirilsa ma\'lumot yo\'qolmasligi uchun «Zaxira nusxa olish» ni bosing.';
    }

    if (document.activeElement !== $('setBusiness')) $('setBusiness').value = state.settings.business;
    const stepSel = $('setStep');
    if (!STEP_OPTIONS.includes(state.settings.step) &&
        !Array.from(stepSel.options).some((o) => Number(o.value) === state.settings.step)) {
      stepSel.add(new Option(money(state.settings.step) + " so'mgacha", String(state.settings.step)));
    }
    stepSel.value = String(state.settings.step);
    const version = Native && Native.appVersion ? Native.appVersion() : '';
    $('aboutText').textContent = 'Baliqxona oylik' + (version ? ' ' + version : '') + '. ' +
      state.employees.length + ' ta ishchi, ' + state.groups.length + ' ta guruh, ' +
      state.months.length + ' ta oy hisobi. Hisob qoidasi Excel shabloni bilan bir xil.';
  }

  function stepYear(d) {
    const years = Array.from(new Set(state.months.map((m) => m.key.slice(0, 4)))).sort();
    const y = years[years.indexOf(reportYear) + d];
    if (y) {
      reportYear = y;
      renderReport();
    }
  }

  $('prevYear').addEventListener('click', () => stepYear(-1));
  $('nextYear').addEventListener('click', () => stepYear(1));
  $('yearTable').addEventListener('click', (e) => {
    const row = e.target.closest('[data-key]');
    if (!row) return;
    curKey = row.dataset.key;
    setView('month');
  });
  $('exportYearBtn').addEventListener('click', () => {
    const wb = E.yearWorkbook(state, all, reportYear, new Date());
    saveBytes(E.yearFileName(state, reportYear), wb.toBytes(), X.MIME);
  });

  $('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const business = $('setBusiness').value.trim().slice(0, 60);
    const step = C.toInt($('setStep').value, C.DEFAULT_STEP);
    if (!business) {
      toast('Korxona nomini kiriting');
      return;
    }
    mutate(() => {
      state.settings.business = business;
      state.settings.step = Math.max(1, step);
    });
    toast('Sozlamalar saqlandi');
  });

  // ---------- Zaxira ----------

  function backup() {
    const now = new Date();
    const copy = JSON.parse(JSON.stringify(state));
    copy.app = 'baliqxona-oylik';
    copy.exportedAt = now.toISOString();
    const name = 'baliqxona-oylik-zaxira-' + C.dateKey(now) + '.json';
    if (Native && Native.saveFile) {
      pendingBackupAt = now.toISOString();
      Native.saveFile(name, JSON.stringify(copy, null, 1), 'application/json');
    } else {
      saveText(name, JSON.stringify(copy, null, 1), 'application/json');
      state.settings.lastBackupAt = now.toISOString();
      persist();
      renderReport();
    }
  }

  function readBackupFile(file, onState) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let s = null;
      try {
        s = C.normalizeState(JSON.parse(reader.result));
      } catch (err) { /* pastda */ }
      if (!s) {
        alert("Bu fayl «Baliqxona oylik» zaxira nusxasi emas yoki buzilgan.");
        return;
      }
      onState(s);
    };
    reader.onerror = () => alert("Faylni o'qib bo'lmadi");
    reader.readAsText(file);
  }

  $('backupBtn').addEventListener('click', backup);
  $('restoreInput').addEventListener('change', (e) => {
    readBackupFile(e.target.files[0], (s) => {
      if (!confirmBox('Joriy ma\'lumotlar (' + state.employees.length + ' ishchi, ' + state.months.length +
        ' oy) zaxiradagi bilan almashtirilsinmi?\n\nZaxirada: ' + s.employees.length + ' ishchi, ' +
        s.months.length + ' oy.')) return;
      const before = JSON.stringify(state);
      state = s;
      curKey = null;
      persist();
      recompute();
      renderAll();
      undoSnapshot = before;
      toast("Ma'lumotlar zaxiradan tiklandi", true);
    });
    e.target.value = '';
  });

  $('templateBtn').addEventListener('click', () => {
    const name = 'Baliqxona_oylik_shablon.xlsx';
    if (Native && Native.saveAsset) {
      Native.saveAsset('www/Baliqxona_oylik.xlsx', name, X.MIME);
      return;
    }
    const a = document.createElement('a');
    a.href = 'Baliqxona_oylik.xlsx';
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  $('resetBtn').addEventListener('click', () => {
    if (!confirmBox("Hamma ma'lumot (ishchilar, guruhlar, oylar, amallar) o'chirilsinmi?\n\n" +
      "Avval zaxira nusxa olganingizga ishonch hosil qiling.")) return;
    if (!confirmBox("Rostdan ham o'chirilsinmi? Buni qaytarib bo'lmaydi.")) return;
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* bo'sh */ }
    if (Native && Native.saveState) Native.saveState('');
    state = null;
    curKey = null;
    closeAllDialogs();
    showWelcome();
  });

  // ---------- Excel va chop etish ----------

  function exportMonth() {
    const m = curMonth();
    if (!m) return;
    const wb = E.monthWorkbook(state, curRes(), m, new Date());
    saveBytes(E.monthFileName(state, m.key), wb.toBytes(), X.MIME);
  }

  function printMonth() {
    const m = curMonth();
    const res = curRes();
    if (!m) return;
    const rows = E.sortedRows(res);
    const t = res.totals;
    const n = (v) => `<td class="n">${money(v)}</td>`;
    $('printArea').innerHTML = `
      <h1>${esc(state.settings.business)} — ${C.monthName(m.key)} oylik qaydnomasi</h1>
      <p>${res.closed ? 'Oy yopilgan.' : 'Oy hali yopilmagan.'} Summalar so'mda. Chop etildi: ${fmtDate(C.dateKey(new Date()))}</p>
      <table>
        <thead><tr><th>№</th><th>Ism</th><th>Guruh</th><th>Ishlagan kun</th><th>Asosiy</th><th>Mukofot</th>
          <th>Jarima</th><th>O'tgan oydan</th><th>Jami hisoblangan</th><th>Avans</th><th>Qo'lga beriladi</th>
          <th>To'landi</th><th>Qoldiq</th><th>Imzo</th></tr></thead>
        <tbody>${rows.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${esc(r.name)}</td><td>${esc(r.groupName || '—')}</td>
          <td class="c">${r.worked}/${r.workDays}</td>${n(r.base)}${n(r.bonus)}${n(r.fine)}${n(r.carry)}${n(r.total)}
          ${n(r.advance)}${n(r.toPay)}${n(r.paid)}${n(r.balance)}<td class="sign"></td></tr>`).join('')}</tbody>
        <tfoot><tr><td></td><td>JAMI</td><td></td><td></td>${n(t.base)}${n(t.bonus)}${n(t.fine)}${n(t.carry)}
          ${n(t.total)}${n(t.advance)}${n(t.toPay)}${n(t.paid)}${n(t.due - t.debt)}<td></td></tr></tfoot>
      </table>
      <div class="signs"><span>Hisobladi: ______________________</span><span>Tasdiqladi: ______________________</span></div>`;
    const title = state.settings.business + ' ' + m.key + ' qaydnoma';
    if (Native && Native.printPage) Native.printPage(title);
    else window.print();
  }

  // ---------- Birinchi ishga tushirish ----------

  function showWelcome() {
    $('welcome').hidden = false;
    $('tabbar').hidden = true;
    $('quickOpBtn').hidden = true;
    for (const name of ['month', 'staff', 'groups', 'report']) $('view-' + name).hidden = true;
    $('bizName').textContent = 'Baliqxona';
  }

  function start() {
    $('welcome').hidden = true;
    $('tabbar').hidden = false;
    recompute();
    setView('month');
  }

  $('startSeed').addEventListener('click', () => {
    state = C.seedState(C.monthKey(new Date()));
    persist();
    start();
    toast("Excel'dagi guruhlar va ishchilar qo'shildi");
  });
  $('startEmpty').addEventListener('click', () => {
    state = C.emptyState();
    persist();
    start();
    setView('groups');
    toast('Avval guruhlarni qo\'shing');
  });
  $('startRestore').addEventListener('change', (e) => {
    readBackupFile(e.target.files[0], (s) => {
      state = s;
      persist();
      start();
      toast("Ma'lumotlar zaxiradan tiklandi");
    });
    e.target.value = '';
  });

  // Android "orqaga" tugmasi: avval dialog yopiladi, so'ng asosiy oynaga qaytiladi
  window.onNativeBack = function () {
    if (dlgStack.length) {
      closeDialog();
      return true;
    }
    if (state && view !== 'month') {
      setView('month');
      return true;
    }
    return false;
  };

  if (state) start();
  else showWelcome();

  if ('serviceWorker' in navigator && !Native && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
