(function () {
  'use strict';

  const P = window.UzParser;
  const STORE_KEY = 'kundalik-yordamchi-v1';
  const $ = (id) => document.getElementById(id);
  // Android ilovasi (APK) ichida ishlaganda Java tomonidan beriladigan ko'prik
  const Native = window.AndroidBridge || null;

  const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
  const CAT_ICONS = Object.fromEntries(P.CATEGORIES.map((c) => [c.name, c.icon]));

  // ---------- Holat ----------

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const todayKey = () => P.dateKey(new Date());
  const parseKey = (k) => {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const nowHM = () => {
    const n = new Date();
    return String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
  };

  let data = load();
  let selected = todayKey();
  let reportMonth = selected.slice(0, 7);
  let mode = 'auto';
  let undoSnapshot = null;

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE_KEY));
      if (d && Array.isArray(d.tasks) && Array.isArray(d.expenses)) {
        d.settings = d.settings || {};
        return d;
      }
    } catch (e) { /* bo'sh holatdan boshlaymiz */ }
    return { tasks: [], expenses: [], settings: {} };
  }

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) {
      toast("Saqlab bo'lmadi — xotira to'lgan bo'lishi mumkin");
    }
    syncNativeReminders();
  }

  function snapshot() {
    undoSnapshot = JSON.stringify(data);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function dateText(key, withWeekday) {
    const d = parseKey(key);
    const base = d.getDate() + '-' + MONTHS[d.getMonth()];
    const diff = Math.round((d - parseKey(todayKey())) / 86400000);
    const rel = { '-1': 'Kecha', 0: 'Bugun', 1: 'Ertaga' }[diff];
    const wd = withWeekday ? ' (' + WEEKDAYS[d.getDay()] + ')' : '';
    return rel ? rel + ', ' + base + wd : base + wd;
  }

  function monthText(ym) {
    const [y, m] = ym.split('-').map(Number);
    return MONTHS[m - 1].charAt(0).toUpperCase() + MONTHS[m - 1].slice(1) + ' ' + y;
  }

  // ---------- Chizish ----------

  function render() {
    $('dateLabel').textContent = dateText(selected, true);
    renderTasks();
    renderExpenses();
    renderStats();
    renderReport();
  }

  function sortTasks(a, b) {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return a.createdAt - b.createdAt;
  }

  function taskItem(t, opts) {
    const isToday = t.date === todayKey();
    const late = !t.done && t.time && ((isToday && t.time < nowHM()) || t.date < todayKey());
    const li = document.createElement('li');
    li.className = 'item' + (t.done ? ' done' : '');
    li.innerHTML =
      '<button class="check" aria-label="Bajarildi">' + (t.done ? '✓' : '') + '</button>' +
      '<button class="item-body"><span class="item-text">' + esc(t.text) + '</span>' +
      (opts && opts.showDate ? '<span class="item-meta">' + esc(dateText(t.date)) + '</span>' : '') +
      '</button>' +
      (t.time ? '<span class="time-badge' + (late ? ' late' : '') + '">' + esc(t.time) + '</span>' : '') +
      (opts && opts.moveBtn ? '<button class="btn move" title="Bugunga ko\'chirish">↪ Bugun</button>' : '');
    li.querySelector('.check').onclick = () => toggleTask(t.id);
    li.querySelector('.item-body').onclick = () => openTaskEditor(t);
    const mv = li.querySelector('.move');
    if (mv) {
      mv.onclick = () => {
        snapshot();
        t.date = todayKey();
        t.reminded = false;
        save();
        render();
        toast("Bugunga ko'chirildi", true);
      };
    }
    return li;
  }

  function renderTasks() {
    const list = $('taskList');
    list.innerHTML = '';
    const tasks = data.tasks.filter((t) => t.date === selected).sort(sortTasks);
    tasks.forEach((t) => list.appendChild(taskItem(t)));
    $('taskEmpty').hidden = tasks.length > 0;

    const done = tasks.filter((t) => t.done).length;
    $('taskProgress').hidden = tasks.length === 0;
    $('taskProgress').firstElementChild.style.width = (tasks.length ? (done / tasks.length) * 100 : 0) + '%';

    const overdue = selected === todayKey()
      ? data.tasks.filter((t) => !t.done && t.date < selected).sort((a, b) => a.date.localeCompare(b.date))
      : [];
    $('overdueBox').hidden = overdue.length === 0;
    const ol = $('overdueList');
    ol.innerHTML = '';
    overdue.forEach((t) => ol.appendChild(taskItem(t, { showDate: true, moveBtn: true })));
  }

  function renderExpenses() {
    const list = $('expenseList');
    list.innerHTML = '';
    const items = data.expenses.filter((e) => e.date === selected).sort((a, b) => b.createdAt - a.createdAt);
    items.forEach((e) => {
      const li = document.createElement('li');
      li.className = 'item';
      const at = new Date(e.createdAt);
      const meta = e.category + (P.dateKey(at) === e.date
        ? ' · ' + String(at.getHours()).padStart(2, '0') + ':' + String(at.getMinutes()).padStart(2, '0')
        : '');
      li.innerHTML =
        '<span class="cat-icon" aria-hidden="true">' + (CAT_ICONS[e.category] || '📦') + '</span>' +
        '<button class="item-body"><span class="item-text">' + esc(e.description) + '</span>' +
        '<span class="item-meta">' + esc(meta) + '</span></button>' +
        '<span class="amount">' + esc(P.formatMoney(e.amount)) + '</span>';
      li.querySelector('.item-body').onclick = () => openExpenseEditor(e);
      list.appendChild(li);
    });
    $('expenseEmpty').hidden = items.length > 0;
    const total = items.reduce((s, e) => s + e.amount, 0);
    $('expenseTotal').hidden = items.length === 0;
    $('expenseTotal').innerHTML = '<span>Jami</span><span>' + esc(P.formatMoney(total)) + '</span>';
  }

  function sumWhere(fn) {
    return data.expenses.filter(fn).reduce((s, e) => s + e.amount, 0);
  }

  function renderStats() {
    const tasks = data.tasks.filter((t) => t.date === selected);
    $('statTasks').textContent = tasks.filter((t) => t.done).length + ' / ' + tasks.length;
    $('statSpent').textContent = P.formatMoney(sumWhere((e) => e.date === selected));
    const ym = selected.slice(0, 7);
    $('statMonth').textContent = P.formatMoney(sumWhere((e) => e.date.startsWith(ym)));
  }

  function renderReport() {
    $('monthLabel').textContent = monthText(reportMonth);
    const items = data.expenses.filter((e) => e.date.startsWith(reportMonth));
    const total = items.reduce((s, e) => s + e.amount, 0);
    $('monthTotal').textContent = P.formatMoney(total);

    const [y, m] = reportMonth.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const isCurrent = todayKey().startsWith(reportMonth);
    const days = isCurrent ? new Date().getDate() : daysInMonth;
    $('monthAvg').textContent = total ? "Kuniga o'rtacha: " + P.formatMoney(total / days) : '';

    const byCat = {};
    items.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const max = cats.length ? cats[0][1] : 1;
    $('categoryBars').innerHTML = cats.length
      ? cats.map(([name, sum]) =>
        '<li><div class="bar-label"><span>' + (CAT_ICONS[name] || '📦') + ' ' + esc(name) + '</span>' +
        '<span><b>' + esc(P.formatMoney(sum)) + '</b> · ' + Math.round((sum / total) * 100) + '%</span></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + (sum / max) * 100 + '%"></div></div></li>'
      ).join('')
      : '<li class="empty">Bu oyda xarajat yo\'q</li>';

    const byDay = {};
    items.forEach((e) => { byDay[e.date] = (byDay[e.date] || 0) + e.amount; });
    const dl = $('dayTotals');
    dl.innerHTML = '';
    Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0])).forEach(([day, sum]) => {
      const li = document.createElement('li');
      li.className = 'item';
      li.innerHTML = '<button class="item-body"><span class="item-text">' + esc(dateText(day, true)) + '</span></button>' +
        '<span class="amount">' + esc(P.formatMoney(sum)) + '</span>';
      li.querySelector('.item-body').onclick = () => {
        selected = day;
        showTab('expenses');
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      dl.appendChild(li);
    });
  }

  // ---------- Amallar ----------

  function toggleTask(id) {
    const t = data.tasks.find((x) => x.id === id);
    if (!t) return;
    snapshot();
    t.done = !t.done;
    t.doneAt = t.done ? Date.now() : null;
    save();
    render();
    if (t.done) {
      const left = data.tasks.filter((x) => x.date === t.date && !x.done).length;
      toast(left ? '✅ Bajarildi. Yana ' + left + ' ta ish qoldi' : '🎉 Barcha ishlar bajarildi!', true);
    }
  }

  function addTask(r) {
    const t = { id: uid(), text: r.text, date: r.date, time: r.time || null, done: false, createdAt: Date.now() };
    data.tasks.push(t);
    return t;
  }

  function addExpense(r) {
    const e = {
      id: uid(),
      amount: r.amount,
      description: r.description,
      category: r.category || 'Boshqa',
      date: r.date,
      createdAt: Date.now(),
    };
    data.expenses.push(e);
    return e;
  }

  function handleText(text) {
    text = String(text || '').trim();
    if (!text) return;
    const results = P.parseMany(text, { mode, today: new Date(), defaultDate: selected });
    const first = results[0];

    if (first.type === 'empty') {
      toast("Hech narsa tushunilmadi, qaytadan urinib ko'ring");
      return;
    }

    if (first.type === 'done') {
      // Avval shu kun va o'tgan kunlardan, topilmasa kelgusi vazifalardan qidiramiz
      const open = data.tasks.filter((t) => !t.done);
      const match = P.matchTask(first.query, open.filter((t) => t.date === selected || t.date <= todayKey()))
        || P.matchTask(first.query, open);
      if (!match) {
        toast('Mos vazifa topilmadi: «' + first.query + '»');
        return;
      }
      snapshot();
      match.done = true;
      match.doneAt = Date.now();
      save();
      showTab('tasks');
      render();
      toast('✅ Bajarildi: ' + match.text, true);
      return;
    }

    if (first.type === 'expense' && results.length === 1 && !first.amount) {
      // Summa aniqlanmadi — foydalanuvchidan so'raymiz
      openExpenseEditor(Object.assign({ isNew: true }, first));
      toast('Summani kiriting');
      return;
    }

    snapshot();
    const messages = [];
    let lastDate = null;
    results.forEach((r) => {
      if (r.type === 'task') {
        const t = addTask(r);
        if (t.time) askNotificationsIfNeeded();
        messages.push('📝 ' + t.text + (t.time ? ' (' + t.time + ')' : ''));
        lastDate = t.date;
        showTab('tasks');
      } else if (r.type === 'expense' && r.amount) {
        const e = addExpense(r);
        messages.push('💰 ' + e.description + ' — ' + P.formatMoney(e.amount));
        lastDate = e.date;
        showTab('expenses');
      }
    });
    save();
    let msg = messages.join(', ');
    if (lastDate && lastDate !== selected) msg += ' → ' + dateText(lastDate);
    render();
    toast(msg, true);
  }

  // ---------- Tahrirlash oynasi ----------

  const dialog = $('editDialog');
  let editing = null;

  function field(label, html) {
    return '<label class="field">' + label + html + '</label>';
  }

  function openTaskEditor(t) {
    editing = { kind: 'task', item: t };
    $('editTitle').textContent = 'Vazifani tahrirlash';
    $('editFields').innerHTML =
      field('Vazifa', '<input name="text" required value="' + esc(t.text) + '">') +
      field('Sana', '<input name="date" type="date" required value="' + esc(t.date) + '">') +
      field('Vaqt (ixtiyoriy)', '<input name="time" type="time" value="' + esc(t.time || '') + '">');
    $('editDelete').hidden = false;
    dialog.returnValue = '';
    dialog.showModal();
  }

  function openExpenseEditor(e) {
    editing = { kind: 'expense', item: e };
    $('editTitle').textContent = e.isNew ? "Xarajat qo'shish" : 'Xarajatni tahrirlash';
    const opts = P.CATEGORIES.map((c) =>
      '<option' + (c.name === e.category ? ' selected' : '') + ' value="' + esc(c.name) + '">' + c.icon + ' ' + esc(c.name) + '</option>'
    ).join('');
    $('editFields').innerHTML =
      field("Nima uchun", '<input name="description" required value="' + esc(e.description || '') + '">') +
      field("Summa (so'm)", '<input name="amount" type="number" inputmode="numeric" min="1" step="1" required value="' + (e.amount || '') + '">') +
      field('Toifa', '<select name="category">' + opts + '</select>') +
      field('Sana', '<input name="date" type="date" required value="' + esc(e.date) + '">');
    $('editDelete').hidden = !!e.isNew;
    dialog.returnValue = '';
    dialog.showModal();
    if (e.isNew) setTimeout(() => dialog.querySelector('[name=amount]').focus(), 50);
  }

  dialog.addEventListener('close', () => {
    if (dialog.returnValue !== 'save' || !editing) {
      editing = null;
      return;
    }
    const f = $('editForm');
    const val = (n) => f.querySelector('[name=' + n + ']').value.trim();
    snapshot();
    if (editing.kind === 'task') {
      const t = editing.item;
      const newTime = val('time') || null;
      if (newTime !== t.time || val('date') !== t.date) t.reminded = false;
      t.text = val('text');
      t.date = val('date');
      t.time = newTime;
      if (newTime) askNotificationsIfNeeded();
    } else {
      const e = editing.item;
      const upd = {
        description: val('description'),
        amount: Math.round(Number(val('amount'))),
        category: val('category'),
        date: val('date'),
      };
      if (e.isNew) {
        addExpense(upd);
        showTab('expenses');
      } else Object.assign(e, upd);
    }
    editing = null;
    save();
    render();
    toast('Saqlandi', true);
  });

  $('editDelete').onclick = () => {
    if (!editing || !confirm("Rostdan ham o'chirilsinmi?")) return;
    snapshot();
    const listName = editing.kind === 'task' ? 'tasks' : 'expenses';
    data[listName] = data[listName].filter((x) => x.id !== editing.item.id);
    editing = null;
    save();
    dialog.close('deleted');
    render();
    toast("O'chirildi", true);
  };

  // ---------- Xabarlar (toast) ----------

  let toastTimer = null;
  function toast(text, undoable) {
    $('toastText').textContent = text;
    $('toastAction').hidden = !undoable || !undoSnapshot;
    $('toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, undoable ? 6000 : 4000);
  }

  $('toastAction').onclick = () => {
    if (!undoSnapshot) return;
    data = JSON.parse(undoSnapshot);
    undoSnapshot = null;
    save();
    render();
    $('toast').hidden = true;
  };

  // ---------- Ovozni tanish ----------

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = $('micBtn');
  const micStatus = $('micStatus');
  const transcriptEl = $('transcript');
  let rec = null;
  let listening = false;

  function setStatus(text) {
    micStatus.textContent = text;
  }

  if (Native) {
    // APK ichida ovozni Android'ning o'zi taniydi
  } else if (!SR) {
    micBtn.disabled = true;
    setStatus("Bu brauzer ovozni tanimaydi. Android'da Google Chrome'dan foydalaning yoki klaviaturadagi 🎤 tugmasi orqali pastdagi maydonga ayting.");
  } else if (location.protocol === 'file:') {
    setStatus("Mikrofon ishlashi uchun ilovani https:// manzil orqali oching (README'ga qarang).");
  }

  const SR_ERRORS = {
    'not-allowed': "Mikrofonga ruxsat berilmagan. Brauzer sozlamalaridan ruxsat bering.",
    'service-not-allowed': "Ovozni tanish xizmatiga ruxsat yo'q. Chrome'dan foydalaning.",
    'no-speech': "Ovoz eshitilmadi, qaytadan urinib ko'ring.",
    'audio-capture': 'Mikrofon topilmadi.',
    network: 'Ovozni tanish uchun internet kerak.',
    'language-not-supported': "Bu qurilmada o'zbek tilida ovoz tanish yo'q. Klaviaturadagi 🎤 orqali yozing.",
  };

  function startListening() {
    let finalText = '';
    let interimText = '';
    let failed = false;
    rec = new SR();
    rec.lang = 'uz-UZ';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      listening = true;
      micBtn.classList.add('listening');
      setStatus('Eshitayapman… gapiring');
      transcriptEl.textContent = '';
    };
    rec.onresult = (ev) => {
      finalText = '';
      interimText = '';
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript + ' ';
        else interimText += r[0].transcript + ' ';
      }
      transcriptEl.textContent = '«' + (finalText + interimText).trim() + '»';
    };
    rec.onerror = (ev) => {
      if (ev.error === 'aborted') return;
      failed = true;
      setStatus(SR_ERRORS[ev.error] || 'Xatolik: ' + ev.error);
    };
    rec.onend = () => {
      listening = false;
      micBtn.classList.remove('listening');
      const text = (finalText || interimText).trim();
      if (text) {
        setStatus('Tugmani bosib gapiring');
        handleText(text);
      } else if (!failed) {
        setStatus("Ovoz eshitilmadi, qaytadan urinib ko'ring.");
      }
    };
    try {
      rec.start();
    } catch (e) {
      setStatus('Mikrofonni ishga tushirib bo\'lmadi: ' + e.message);
    }
  }

  micBtn.onclick = () => {
    if (Native) {
      micBtn.classList.add('listening');
      setStatus('Eshitayapman… gapiring');
      transcriptEl.textContent = '';
      Native.startListening();
      return;
    }
    if (!SR) return;
    if (listening && rec) rec.stop();
    else startListening();
  };

  const NATIVE_SPEECH_ERRORS = {
    cancelled: 'Tugmani bosib gapiring',
    'no-match': "Tushunilmadi, qaytadan urinib ko'ring.",
    network: 'Ovozni tanish uchun internet kerak.',
    server: "Ovoz tanish xizmatida xatolik. Birozdan keyin urinib ko'ring.",
    audio: "Mikrofon bilan muammo. Ilovaga mikrofon ruxsatini tekshiring.",
    'no-recognizer': "Telefonda ovoz tanish xizmati topilmadi. Play Market'dan «Google» ilovasini o'rnating yoki yangilang.",
  };

  window.onNativeSpeechResult = (text) => {
    micBtn.classList.remove('listening');
    transcriptEl.textContent = '«' + text + '»';
    setStatus('Tugmani bosib gapiring');
    handleText(text);
  };

  window.onNativeSpeechError = (code) => {
    micBtn.classList.remove('listening');
    setStatus(NATIVE_SPEECH_ERRORS[code] || "Xatolik yuz berdi, qaytadan urinib ko'ring.");
  };

  $('textForm').onsubmit = (ev) => {
    ev.preventDefault();
    const input = $('textInput');
    handleText(input.value);
    input.value = '';
  };

  // ---------- Rejim va tablar ----------

  document.querySelectorAll('.mode').forEach((b) => {
    b.onclick = () => {
      mode = b.dataset.mode;
      document.querySelectorAll('.mode').forEach((x) => {
        x.classList.toggle('active', x === b);
        x.setAttribute('aria-checked', String(x === b));
      });
      $('textInput').placeholder = {
        auto: "Yoki yozing: non uchun 5000 so'm",
        task: 'Masalan: ertaga soat 9 da majlis',
        expense: "Masalan: taksi 20 ming so'm",
      }[mode];
    };
  });

  function showTab(name) {
    document.querySelectorAll('.tab').forEach((b) => {
      const on = b.dataset.tab === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    document.querySelectorAll('.tab-panel').forEach((p) => { p.hidden = p.id !== 'tab-' + name; });
    if (name === 'report') {
      reportMonth = selected.slice(0, 7);
      renderReport();
    }
  }
  document.querySelectorAll('.tab').forEach((b) => { b.onclick = () => showTab(b.dataset.tab); });

  // ---------- Sana boshqaruvi ----------

  function shiftDay(n) {
    selected = P.dateKey(P.addDays(parseKey(selected), n));
    render();
  }
  $('prevDay').onclick = () => shiftDay(-1);
  $('nextDay').onclick = () => shiftDay(1);
  $('dateLabel').onclick = () => { selected = todayKey(); render(); };

  function shiftMonth(n) {
    const [y, m] = reportMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    reportMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    renderReport();
  }
  $('prevMonth').onclick = () => shiftMonth(-1);
  $('nextMonth').onclick = () => shiftMonth(1);

  // ---------- Eksport / import ----------

  function download(name, content, type) {
    if (Native) {
      Native.saveFile(name, content, type);
      return;
    }
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  $('exportCsv').onclick = () => {
    const items = data.expenses.filter((e) => e.date.startsWith(reportMonth)).sort((a, b) => a.date.localeCompare(b.date));
    if (!items.length) {
      toast("Bu oyda xarajat yo'q");
      return;
    }
    const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
    const rows = [['Sana', 'Toifa', 'Tavsif', "Summa (so'm)"].map(q).join(';')]
      .concat(items.map((e) => [e.date, e.category, e.description].map(q).concat(e.amount).join(';')));
    const total = items.reduce((s, e) => s + e.amount, 0);
    rows.push(['', '', q('Jami'), total].join(';'));
    download('xarajatlar-' + reportMonth + '.csv', '﻿' + rows.join('\r\n'), 'text/csv;charset=utf-8');
  };

  $('exportJson').onclick = () => {
    download('kundalik-zaxira-' + todayKey() + '.json', JSON.stringify(data, null, 2), 'application/json');
  };

  $('importJson').onchange = (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!Array.isArray(d.tasks) || !Array.isArray(d.expenses)) throw new Error('format');
        if (!confirm("Joriy ma'lumotlar zaxiradagi bilan almashtirilsinmi?")) return;
        snapshot();
        data = { tasks: d.tasks, expenses: d.expenses, settings: d.settings || {} };
        save();
        render();
        toast('Zaxiradan tiklandi', true);
      } catch (e) {
        toast("Fayl noto'g'ri formatda");
      }
      ev.target.value = '';
    };
    reader.readAsText(file);
  };

  window.onNativeFileSaved = (status) => {
    if (status === 'saved') toast('💾 Fayl saqlandi');
    else if (status === 'error') toast("Faylni saqlab bo'lmadi");
  };

  // ---------- Eslatmalar ----------

  let swReg = null;
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').then((r) => { swReg = r; }).catch(() => {});
  }

  function notificationsOn() {
    // APK'da eslatmalar sukut bo'yicha yoqilgan, faqat ruxsat kerak
    if (Native) return data.settings.notify !== false && Native.notificationsAllowed();
    return !!data.settings.notify && 'Notification' in window && Notification.permission === 'granted';
  }

  function updateNotifyBtn() {
    const on = notificationsOn();
    $('notifyBtn').classList.toggle('on', on);
    $('notifyBtn').title = on ? "Eslatmalar yoqilgan" : 'Eslatmalarni yoqish';
  }

  // APK: kelgusi eslatmalarni Android'ga topshiramiz (ilova yopiq bo'lsa ham ishlaydi)
  function syncNativeReminders() {
    if (!Native) return;
    const now = Date.now();
    const list = data.settings.notify === false ? [] : data.tasks
      .filter((t) => !t.done && t.time && t.date)
      .map((t) => {
        const [y, m, d] = t.date.split('-').map(Number);
        const [hh, mm] = t.time.split(':').map(Number);
        return { id: t.id, at: new Date(y, m - 1, d, hh, mm).getTime(), text: t.time + ' — ' + t.text };
      })
      .filter((r) => r.at > now);
    try {
      Native.syncReminders(JSON.stringify(list));
    } catch (e) { /* ko'prik mavjud bo'lmasa, jim o'tamiz */ }
  }

  // APK: birinchi vaqtli vazifa qo'shilganda bildirishnomaga bir marta ruxsat so'raymiz
  function askNotificationsIfNeeded() {
    if (Native && data.settings.notify !== false && !Native.notificationsAllowed()) {
      Native.askNotificationsOnce();
    }
  }

  window.onNativeNotifyPermission = (state) => {
    updateNotifyBtn();
    if (state === 'granted') toast("🔔 Eslatmalar yoqildi. Ilova yopiq bo'lsa ham vaqtida eslataman");
    else if (state === 'settings') toast('Sozlamalarda «Kundalik» uchun bildirishnomalarni yoqing');
    else toast('Bildirishnomaga ruxsat berilmadi');
  };

  $('notifyBtn').onclick = async () => {
    if (Native) {
      if (notificationsOn()) {
        data.settings.notify = false;
        save();
        updateNotifyBtn();
        toast("Eslatmalar o'chirildi");
      } else {
        data.settings.notify = true;
        save();
        Native.requestNotifications();
      }
      return;
    }
    if (!('Notification' in window)) {
      toast("Bu brauzer bildirishnomalarni qo'llamaydi");
      return;
    }
    if (data.settings.notify && Notification.permission === 'granted') {
      data.settings.notify = false;
      save();
      updateNotifyBtn();
      toast("Eslatmalar o'chirildi");
      return;
    }
    const perm = await Notification.requestPermission();
    data.settings.notify = perm === 'granted';
    save();
    updateNotifyBtn();
    toast(perm === 'granted'
      ? "🔔 Eslatmalar yoqildi. Vaqti kelganda xabar beraman (ilova ochiq bo'lishi kerak)"
      : 'Bildirishnomaga ruxsat berilmadi');
  };

  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    const voice = speechSynthesis.getVoices().find((v) => /^uz/i.test(v.lang));
    if (!voice) return;
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    speechSynthesis.speak(u);
  }

  function notify(title, body) {
    if (data.settings.notify && 'Notification' in window && Notification.permission === 'granted') {
      const opts = { body, icon: 'icons/icon.svg', tag: body };
      if (swReg && swReg.showNotification) swReg.showNotification(title, opts);
      else {
        try { new Notification(title, opts); } catch (e) { /* Android'da faqat SW orqali */ }
      }
    }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }

  function checkReminders() {
    const today = todayKey();
    const now = nowHM();
    let changed = false;
    data.tasks.forEach((t) => {
      if (t.done || t.reminded || !t.time || t.date !== today || t.time > now) return;
      t.reminded = true;
      changed = true;
      // Juda eski eslatmalarni (1 soatdan ko'p o'tgan) ko'rsatmaymiz
      const [h, m] = t.time.split(':').map(Number);
      const n = new Date();
      if (n.getHours() * 60 + n.getMinutes() - (h * 60 + m) > 60) return;
      notify('⏰ Eslatma', t.time + ' — ' + t.text);
      toast('⏰ Vaqti keldi: ' + t.text);
      speak('Eslatma: ' + t.text);
    });
    if (changed) {
      save();
      render();
    }
  }

  // Kun almashganda sanani yangilash
  let lastToday = todayKey();
  setInterval(() => {
    const t = todayKey();
    if (t !== lastToday) {
      if (selected === lastToday) selected = t;
      lastToday = t;
      render();
    }
    checkReminders();
  }, 20000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkReminders();
      updateNotifyBtn();
      render();
    }
  });

  // APK: telefonning "orqaga" tugmasi. true qaytarsa, ilova yopilmaydi.
  window.onNativeBack = () => {
    if (dialog.open) {
      dialog.close('cancel');
      return true;
    }
    if ($('tab-tasks').hidden) {
      showTab('tasks');
      return true;
    }
    if (selected !== todayKey()) {
      selected = todayKey();
      render();
      return true;
    }
    return false;
  };

  updateNotifyBtn();
  render();
  checkReminders();
  syncNativeReminders();
})();
