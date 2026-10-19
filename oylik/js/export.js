/*
 * Oylik hisobini Excel (.xlsx) fayl ko'rinishida tayyorlash.
 * Oy hisoboti: Xulosa, Oylik hisob (imzo uchun qaydnoma), Amallar, Guruhlar varaqlari.
 * Yillik hisobot: Yig'ma, Ishchilar va har bir oyning qaydnomasi.
 * Brauzerda window.OylikExport, Node.js'da module.exports sifatida ishlaydi.
 */
(function (root, factory) {
  const isNode = typeof module === 'object' && module.exports;
  const api = isNode
    ? factory(require('./calc.js'), require('./xlsx.js'))
    : factory(root.OylikCalc, root.OylikXlsx);
  if (isNode) module.exports = api;
  else root.OylikExport = api;
})(typeof self !== 'undefined' ? self : this, function (C, X) {
  'use strict';

  const ROW_HEAD = ['№', 'Ism', 'Guruh', 'Kelmagan kun', 'Ishlagan kun', '1 kishiga oylik',
    'Asosiy', 'Mukofot', 'Jarima', "O'tgan oydan", 'Jami hisoblangan', 'Avans',
    "Qo'lga beriladi", "To'landi", 'Qoldiq', 'Holat', 'Imzo'];
  const ROW_WIDTHS = [5, 24, 13, 9, 9, 13, 13, 12, 12, 12, 14, 12, 14, 12, 13, 16, 14];
  const GROUP_HEAD = ['Guruh', 'Asosiy oylik', "Me'yoriy soni", 'Oyiga ish kuni',
    'Ajratilgan fond', 'Hozirgi soni', 'Holat', '1 kishiga oylik', "To'liq oylik jami",
    "Davomat bo'yicha", "Bo'sh o'rin tejami", 'Kelmagan kunlar tejami', "Yaxlitlash qoldig'i",
    'Jami tejaldi'];
  const GROUP_WIDTHS = [16, 14, 10, 10, 14, 10, 18, 14, 14, 14, 13, 13, 13, 14];

  const m = (v) => ({ v, s: 'money' });
  const tm = (v) => ({ v, s: 'totalMoney' });

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function stamp(now) {
    return pad(now.getDate()) + '.' + pad(now.getMonth() + 1) + '.' + now.getFullYear() + ' ' +
      pad(now.getHours()) + ':' + pad(now.getMinutes());
  }

  /** Qatorlarni guruhlar tartibi, so'ng ism bo'yicha saralaydi (ilovadagi bilan bir xil). */
  function sortedRows(res) {
    const order = new Map(res.groups.map((g, i) => [g.id, i]));
    return res.rows.slice().sort((a, b) => {
      const ga = order.has(a.groupId) ? order.get(a.groupId) : 1e9;
      const gb = order.has(b.groupId) ? order.get(b.groupId) : 1e9;
      return ga - gb || a.name.localeCompare(b.name, 'uz');
    });
  }

  function statusCell(r) {
    const text = C.ROW_STATUS[r.status] || '';
    const s = r.status === 'no-group' || r.status === 'debt' ? 'bad'
      : r.status === 'paid' ? 'good' : 'center';
    return { v: text, s };
  }

  function addPayrollSheet(wb, state, res, sheetName) {
    const ws = wb.addSheet(sheetName, { widths: ROW_WIDTHS, freezeRow: 4, freezeCol: 2,
      landscape: true, printTitleRow: 4 });
    ws.addRow([{ v: state.settings.business + ' — ' + C.monthName(res.key) + ' oylik qaydnomasi',
      s: 'title' }]);
    ws.addRow([{ v: (res.closed ? 'Oy yopilgan. ' : 'Oy hali yopilmagan — raqamlar o\'zgarishi mumkin. ') +
      "Summalar so'mda.", s: 'note' }]);
    ws.blank();
    ws.addRow(ROW_HEAD, 'header');
    sortedRows(res).forEach((r, i) => {
      ws.addRow([
        { v: i + 1, s: 'center' }, r.name, r.groupName || '—', { v: r.absent, s: 'int' },
        { v: r.worked, s: 'int' }, m(r.perPerson), m(r.base), m(r.bonus), m(r.fine), m(r.carry),
        m(r.total), m(r.advance), m(r.toPay), m(r.paid), m(r.balance), statusCell(r), '',
      ], 'text');
    });
    const t = res.totals;
    ws.addRow(['', 'JAMI', '', '', '', '', tm(t.base), tm(t.bonus), tm(t.fine), tm(t.carry),
      tm(t.total), tm(t.advance), tm(t.toPay), tm(t.paid), tm(t.due - t.debt), '', ''],
    'totalText');
    ws.blank();
    ws.addRow(['', 'Hisobladi: ______________________', '', '', '', '', '',
      'Tasdiqladi: ______________________']);
    return ws;
  }

  function addGroupsSheet(wb, res) {
    const ws = wb.addSheet('Guruhlar', { widths: GROUP_WIDTHS, freezeRow: 1, landscape: true,
      printTitleRow: 1 });
    ws.addRow(GROUP_HEAD, 'header');
    for (const g of res.groups) {
      ws.addRow([
        g.name, m(g.base), { v: g.norm, s: 'int' }, { v: g.workDays, s: 'int' }, m(g.fund),
        { v: g.count, s: 'int' },
        { v: C.groupStatusText(g), s: g.status === 'over' || g.status === 'no-days' ? 'bad' : 'center' },
        m(g.perPerson), m(g.full), m(g.actual), m(g.vacancy), m(g.absence), m(g.rounding), m(g.saved),
      ], 'text');
    }
    const t = res.totals;
    const sum = (f) => res.groups.reduce((a, g) => a + f(g), 0);
    ws.addRow(['JAMI', '', { v: t.norm, s: 'totalInt' }, '', tm(t.fund),
      { v: sum((g) => g.count), s: 'totalInt' }, '', '', tm(sum((g) => g.full)), tm(t.base),
      tm(t.vacancy), tm(t.absence), tm(t.rounding), tm(t.saved)], 'totalText');
    return ws;
  }

  function addOpsSheet(wb, state, res, month) {
    const ws = wb.addSheet('Amallar', { widths: [12, 24, 11, 14, 36], freezeRow: 1,
      printTitleRow: 1 });
    ws.addRow(['Sana', 'Ism', 'Turi', 'Summa', 'Izoh'], 'header');
    const names = new Map(state.employees.map((e) => [e.id, e.name]));
    for (const r of res.rows) names.set(r.employeeId, r.name);
    const ops = month.ops.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    const byType = { avans: 0, mukofot: 0, jarima: 0, tolov: 0 };
    for (const op of ops) {
      byType[op.type] += op.amount;
      ws.addRow([{ v: X.dateSerial(op.date), s: 'date' }, names.get(op.employeeId) || '?',
        { v: C.OP_LABELS[op.type], s: 'center' }, m(op.amount), op.note || ''], 'text');
    }
    if (!ops.length) ws.addRow([{ v: "Bu oyda amal yozilmagan.", s: 'note' }]);
    ws.blank();
    for (const type of C.OP_TYPES) {
      ws.addRow(['', C.OP_LABELS[type] + ' jami', '', tm(byType[type]), ''], 'totalText');
    }
    return ws;
  }

  function addSummarySheet(wb, state, res, now) {
    const ws = wb.addSheet('Xulosa', { widths: [34, 16, 3, 34, 16] });
    const t = res.totals;
    ws.addRow([{ v: state.settings.business + ' — ' + C.monthName(res.key), s: 'title' }]);
    ws.addRow([{ v: 'Tayyorlandi: ' + stamp(now) + ' · «Baliqxona oylik» ilovasi', s: 'note' }]);
    ws.blank();
    ws.addRow([{ v: 'PUL HISOBI', s: 'section' }, { v: '', s: 'section' }, '',
      { v: 'TEJALDI (fonddan ortgan pul)', s: 'section' }, { v: '', s: 'section' }]);
    const left = [
      ['Ajratilgan fond (guruhlar)', t.fund], ["Asosiy oylik (davomat bo'yicha)", t.base],
      ['+ Mukofotlar', t.bonus], ['− Jarimalar', t.fine], ["± O'tgan oydan qoldiq", t.carry],
      ['Jami hisoblangan', t.total, true], ['− Avans berilgan', t.advance],
      ["Qo'lga beriladi", t.toPay, true], ["− To'landi", t.paid],
      ["To'lanishi kerak (qoldiq)", t.due, true], ['Ishchilar qarzi (keyingi oyga)', t.debt],
    ];
    const right = [
      ["Bo'sh o'rinlar hisobiga", t.vacancy], ['Kelmagan kunlar hisobiga', t.absence],
      ["Yaxlitlash qoldig'i", t.rounding], ['Jami tejaldi', t.saved, true], null,
      ['Ishchilar soni', t.count + ' / ' + t.norm + " (me'yor)"], ['Yaxlitlash qadami', res.step],
      ['Oy holati', res.closed ? 'Yopilgan' : 'Ochiq'],
    ];
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
      const l = left[i];
      const r = right[i];
      const cells = ['', '', '', '', ''];
      if (l) {
        cells[0] = { v: l[0], s: l[2] ? 'totalText' : 'text' };
        cells[1] = { v: l[1], s: l[2] ? 'totalMoney' : 'money' };
      }
      if (r) {
        cells[3] = { v: r[0], s: r[2] ? 'totalText' : 'text' };
        cells[4] = typeof r[1] === 'number' ? { v: r[1], s: r[2] ? 'totalMoney' : 'money' }
          : { v: r[1], s: 'text' };
      }
      ws.addRow(cells);
    }
    if (res.warnings.length) {
      ws.blank();
      ws.addRow([{ v: 'OGOHLANTIRISHLAR', s: 'section' }, { v: '', s: 'section' }]);
      for (const w of res.warnings) ws.addRow([{ v: '• ' + w.text, s: 'text' }]);
    }
    return ws;
  }

  /** Bitta oy uchun to'liq hisobot (4 varaq). */
  function monthWorkbook(state, res, month, now) {
    const wb = new X.Workbook();
    addSummarySheet(wb, state, res, now || new Date());
    addPayrollSheet(wb, state, res, 'Oylik hisob');
    addOpsSheet(wb, state, res, month);
    addGroupsSheet(wb, res);
    return wb;
  }

  /** Bir yil uchun: yig'ma jadval, ishchilar kesimi va har oyning qaydnomasi. */
  function yearWorkbook(state, all, year, now) {
    const wb = new X.Workbook();
    const keys = Array.from(all.keys()).filter((k) => k.startsWith(year + '-')).sort();
    const ws = wb.addSheet("Yig'ma " + year, {
      widths: [16, 10, 14, 14, 12, 12, 14, 12, 12, 14, 12, 12, 11], freezeRow: 4, landscape: true,
    });
    ws.addRow([{ v: state.settings.business + ' — ' + year + '-yil oylik hisobi', s: 'title' }]);
    ws.addRow([{ v: 'Tayyorlandi: ' + stamp(now || new Date()), s: 'note' }]);
    ws.blank();
    ws.addRow(['Oy', 'Ishchilar', 'Fond', 'Asosiy oylik', 'Mukofot', 'Jarima',
      'Hisoblangan (shu oy)', 'Avans', "To'landi", 'Oy oxiridagi qoldiq', 'Qarz', 'Tejaldi',
      'Holat'], 'header');
    const sum = {};
    const fields = ['fund', 'base', 'bonus', 'fine', 'accrued', 'advance', 'paid', 'saved'];
    for (const k of keys) {
      const t = Object.assign({}, all.get(k).totals);
      t.accrued = t.total - t.carry;
      for (const f of fields) sum[f] = (sum[f] || 0) + t[f];
      ws.addRow([C.monthName(k), { v: t.count, s: 'int' }, m(t.fund), m(t.base), m(t.bonus),
        m(t.fine), m(t.accrued), m(t.advance), m(t.paid), m(t.due), m(t.debt), m(t.saved),
        { v: all.get(k).closed ? 'Yopilgan' : 'Ochiq', s: 'center' }], 'text');
    }
    ws.addRow(['JAMI', '', tm(sum.fund || 0), tm(sum.base || 0), tm(sum.bonus || 0),
      tm(sum.fine || 0), tm(sum.accrued || 0), tm(sum.advance || 0), tm(sum.paid || 0), '', '',
      tm(sum.saved || 0), ''], 'totalText');
    ws.addRow([{ v: "Qoldiq va qarz oylar bo'yicha qo'shilmaydi: ular keyingi oyga o'tadi. " +
      "Amaldagi qoldiqni oxirgi oy qatoridan qarang.", s: 'note' }]);
    if (!keys.length) ws.addRow([{ v: "Bu yilda ma'lumot yo'q.", s: 'note' }]);

    // Ishchilar kesimida: har oyda hisoblangani (o'tgan oydan qoldiqsiz)
    const es = wb.addSheet('Ishchilar ' + year, {
      widths: [24, 13].concat(keys.map(() => 13), [14, 14, 14]), freezeRow: 1, freezeCol: 1,
      landscape: true,
    });
    es.addRow(['Ism', 'Guruh'].concat(keys.map((k) => C.monthName(k)),
      ['Yil bo\'yicha hisoblangan', 'Berilgan (avans + to\'lov)', 'Oxirgi qoldiq']), 'header');
    const people = new Map();
    for (const k of keys) {
      for (const r of all.get(k).rows) {
        let p = people.get(r.employeeId);
        if (!p) people.set(r.employeeId, (p = { name: r.name, group: r.groupName, by: {}, given: 0 }));
        p.name = r.name;
        p.group = r.groupName || p.group;
        p.by[k] = r.total - r.carry; // shu oyning o'zida hisoblangani (qoldiqsiz)
        p.given += r.advance + r.paid;
        p.last = r.balance;
      }
    }
    const list = Array.from(people.values()).sort((a, b) => a.name.localeCompare(b.name, 'uz'));
    for (const p of list) {
      const total = keys.reduce((a, k) => a + (p.by[k] || 0), 0);
      es.addRow([p.name, p.group || '—'].concat(keys.map((k) => (k in p.by ? m(p.by[k]) : '')),
        [m(total), m(p.given), m(p.last)]), 'text');
    }
    if (!list.length) es.addRow([{ v: "Bu yilda ma'lumot yo'q.", s: 'note' }]);

    for (const k of keys) {
      const [y, mo] = k.split('-');
      const short = C.MONTHS[+mo - 1].slice(0, 3);
      addPayrollSheet(wb, state, all.get(k), short.charAt(0).toUpperCase() + short.slice(1) + ' ' + y);
    }
    return wb;
  }

  function monthFileName(state, key) {
    return safeFile(state.settings.business) + '_oylik_' + key + '.xlsx';
  }

  function yearFileName(state, year) {
    return safeFile(state.settings.business) + '_oylik_' + year + '-yil.xlsx';
  }

  function safeFile(s) {
    return String(s || 'Baliqxona').replace(/[\\/:*?"<>|'ʻʼ‘’\s]+/g, '_').replace(/^_+|_+$/g, '') ||
      'Baliqxona';
  }

  return { monthWorkbook, yearWorkbook, monthFileName, yearFileName, sortedRows };
});
