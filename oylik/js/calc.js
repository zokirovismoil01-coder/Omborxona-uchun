/*
 * Baliqxona oylik hisob-kitobi: sof hisoblash moduli (interfeysga bog'liq emas).
 * Qoidalar Excel shabloni (tools/excel_shablon.py) bilan bir xil:
 *   fond            = asosiy oylik × me'yoriy soni
 *   1 kishiga oylik = min(asosiy oylik, fond ÷ hozirgi soni), qadamgacha pastga yaxlitlanadi
 *   asosiy          = 1 kishiga oylik × ishlagan kun ÷ ish kuni (kelmagan kun bo'lsa)
 *   jami            = asosiy + mukofot − jarima ± o'tgan oydan qoldiq
 *   qo'lga beriladi = jami − avans;  qoldiq = qo'lga beriladi − to'langan
 * Brauzerda window.OylikCalc, Node.js'da module.exports sifatida ishlaydi.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OylikCalc = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const OP_TYPES = ['avans', 'mukofot', 'jarima', 'tolov'];
  const OP_LABELS = { avans: 'Avans', mukofot: 'Mukofot', jarima: 'Jarima', tolov: "To'lov" };
  const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust',
    'sentabr', 'oktabr', 'noyabr', 'dekabr'];
  const ROW_STATUS = {
    'no-group': '⚠ Guruh topilmadi',
    none: '—',
    debt: 'Qarzdor',
    paid: "✓ To'landi",
    partial: "Qisman to'landi",
    unpaid: "To'lanmagan",
  };
  const DEFAULT_STEP = 1000;
  const DEFAULT_WORK_DAYS = 26;
  const STATE_VERSION = 1;

  // ---------- Sonlar ----------

  /** Musbat butun songa aylantiradi; noto'g'ri qiymat — def. */
  function toInt(v, def) {
    if (def === undefined) def = 0;
    if (typeof v === 'string') v = v.replace(/[\s  ,']/g, '').replace('−', '-');
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n) : def;
  }

  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

  /** Qadamgacha pastga yaxlitlash. Excel'dagi INT(x/qadam + 1E-9)*qadam bilan bir xil. */
  function floorTo(x, step) {
    const s = step > 0 ? step : 1;
    return Math.floor(x / s + 1e-9) * s;
  }

  /** 4000000 → "4 000 000"; manfiy sonlar "−" belgisi bilan. */
  function formatMoney(n) {
    const v = Math.round(Number(n) || 0);
    const s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (v < 0 ? '−' : '') + s;
  }

  // ---------- Oylar ----------

  function monthKey(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  }

  function isMonthKey(k) {
    return typeof k === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(k);
  }

  function addMonths(key, n) {
    const [y, m] = key.split('-').map(Number);
    return monthKey(new Date(y, m - 1 + n, 1));
  }

  function daysInMonth(key) {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }

  /** "2026-10" → "Oktabr 2026" */
  function monthName(key) {
    const [y, m] = key.split('-').map(Number);
    const nom = MONTHS[m - 1];
    return nom.charAt(0).toUpperCase() + nom.slice(1) + ' ' + y;
  }

  function dateKey(date) {
    return monthKey(date) + '-' + String(date.getDate()).padStart(2, '0');
  }

  /** Yangi amal uchun sana: joriy oy bo'lsa — bugun, o'tgan oy — oxirgi kun, kelgusi — 1-kun. */
  function defaultOpDate(key, today) {
    const t = today || new Date();
    const cur = monthKey(t);
    if (cur === key) return dateKey(t);
    if (cur > key) return key + '-' + String(daysInMonth(key)).padStart(2, '0');
    return key + '-01';
  }

  // ---------- Bir oyning hisobi ----------

  /**
   * input = {
   *   groups:  [{ id, name, base, norm, workDays }],
   *   members: [{ employeeId, name, groupId, absent, carry, carryFrom }],
   *   ops:     [{ id, employeeId, type, amount, date, note }],
   *   step
   * }
   */
  function computeMonth(input) {
    const step = input.step > 0 ? input.step : 1;
    const groups = (input.groups || []).map((g) => ({
      id: g.id,
      name: g.name,
      base: Math.max(0, toInt(g.base)),
      norm: Math.max(0, toInt(g.norm)),
      workDays: clamp(toInt(g.workDays), 0, 31),
      count: 0,
    }));
    const byId = new Map(groups.map((g) => [g.id, g]));
    const members = input.members || [];
    for (const m of members) {
      const g = byId.get(m.groupId);
      if (g) g.count++;
    }
    for (const g of groups) {
      g.fund = g.base * g.norm;
      g.perPerson = g.count === 0 ? 0 : Math.min(g.base, floorTo(g.fund / g.count, step));
      g.full = g.perPerson * g.count;
      g.vacancy = Math.max(0, g.norm - g.count) * g.base;
      g.rounding = g.fund - g.full - g.vacancy;
      g.actual = 0;
      if (g.workDays <= 0) g.status = 'no-days';
      else if (g.count === 0) g.status = 'empty';
      else if (g.count < g.norm) g.status = 'vacant';
      else if (g.count > g.norm) g.status = 'over';
      else g.status = 'ok';
    }

    // Amallarni ishchi va tur bo'yicha yig'ish
    const memberIds = new Set(members.map((m) => m.employeeId));
    const sums = new Map();
    let orphanOps = 0;
    for (const op of input.ops || []) {
      if (!OP_TYPES.includes(op.type)) continue;
      if (!memberIds.has(op.employeeId)) { orphanOps++; continue; }
      let s = sums.get(op.employeeId);
      if (!s) sums.set(op.employeeId, (s = { avans: 0, mukofot: 0, jarima: 0, tolov: 0, count: 0 }));
      s[op.type] += Math.max(0, toInt(op.amount));
      s.count++;
    }

    const rows = members.map((m) => {
      const g = byId.get(m.groupId) || null;
      const workDays = g ? g.workDays : 0;
      const absent = clamp(toInt(m.absent), 0, 31);
      const worked = Math.max(0, workDays - absent);
      const perPerson = g ? g.perPerson : 0;
      let base;
      if (perPerson === 0) base = 0;
      else if (absent <= 0) base = perPerson;
      else if (workDays <= 0) base = 0;
      else base = floorTo(perPerson * worked / workDays, step);
      if (g) g.actual += base;

      const s = sums.get(m.employeeId) || { avans: 0, mukofot: 0, jarima: 0, tolov: 0, count: 0 };
      const carry = toInt(m.carry);
      const total = base + s.mukofot - s.jarima + carry;
      const toPay = total - s.avans;
      const balance = toPay - s.tolov;
      let status;
      if (!g) status = 'no-group';
      else if (balance === 0 && total === 0 && s.avans === 0 && s.tolov === 0) status = 'none';
      else if (balance < 0) status = 'debt';
      else if (balance === 0) status = 'paid';
      else if (s.tolov > 0) status = 'partial';
      else status = 'unpaid';
      return {
        employeeId: m.employeeId,
        name: m.name,
        groupId: m.groupId,
        groupName: g ? g.name : '',
        absent,
        workDays,
        worked,
        perPerson,
        base,
        bonus: s.mukofot,
        fine: s.jarima,
        carry,
        carryFrom: m.carryFrom || null,
        total,
        advance: s.avans,
        toPay,
        paid: s.tolov,
        balance,
        opsCount: s.count,
        status,
      };
    });

    for (const g of groups) {
      g.absence = g.full - g.actual;
      g.saved = g.fund - g.actual;
    }

    const sum = (list, f) => list.reduce((a, x) => a + f(x), 0);
    const totals = {
      fund: sum(groups, (g) => g.fund),
      norm: sum(groups, (g) => g.norm),
      count: rows.length,
      base: sum(rows, (r) => r.base),
      bonus: sum(rows, (r) => r.bonus),
      fine: sum(rows, (r) => r.fine),
      carry: sum(rows, (r) => r.carry),
      total: sum(rows, (r) => r.total),
      advance: sum(rows, (r) => r.advance),
      toPay: sum(rows, (r) => r.toPay),
      paid: sum(rows, (r) => r.paid),
      due: sum(rows, (r) => Math.max(0, r.balance)),
      debt: sum(rows, (r) => Math.max(0, -r.balance)),
      vacancy: sum(groups, (g) => g.vacancy),
      absence: sum(groups, (g) => g.absence),
      rounding: sum(groups, (g) => g.rounding),
      saved: sum(groups, (g) => g.saved),
    };
    totals.given = totals.advance + totals.paid;

    const warnings = [];
    for (const g of groups) {
      if (g.status === 'over') {
        warnings.push({ level: 'warn', text: g.name + ': me\'yordan ' + (g.count - g.norm) +
          ' kishi ortiq — fond ' + g.count + ' kishiga bo\'linib, har biriga ' +
          formatMoney(g.perPerson) + " so'm tushyapti" });
      } else if (g.status === 'vacant') {
        warnings.push({ level: 'info', text: g.name + ': ' + (g.norm - g.count) +
          " ta bo'sh o'rin (" + formatMoney(g.vacancy) + " so'm tejaldi)" });
      } else if (g.status === 'no-days' && g.count > 0) {
        warnings.push({ level: 'error', text: g.name + ': oyiga ish kuni kiritilmagan' });
      }
    }
    for (const r of rows) {
      if (r.status === 'no-group') {
        warnings.push({ level: 'error', text: r.name + ': guruhi topilmadi — oylik hisoblanmadi' });
      } else if (r.status === 'debt') {
        warnings.push({ level: 'warn', text: r.name + ': ' + formatMoney(-r.balance) +
          " so'm qarzdor (keyingi oyga o'tadi)" });
      }
    }
    if (orphanOps) {
      warnings.push({ level: 'error', text: orphanOps +
        " ta amal shu oy ro'yxatida yo'q ishchiga yozilgan va hisobga olinmadi" });
    }

    return { groups, rows, totals, warnings, orphanOps, step };
  }

  /** Guruh holati matni (Excel'dagi "Holat" ustuni bilan bir xil). */
  function groupStatusText(g) {
    switch (g.status) {
      case 'no-days': return "⚠ Ish kuni yo'q";
      case 'empty': return "Hech kim yo'q";
      case 'vacant': return "Bo'sh o'rin: " + (g.norm - g.count);
      case 'over': return "Me'yordan ortiq: " + (g.count - g.norm);
      default: return "Me'yorda";
    }
  }

  // ---------- Butun ma'lumotlar bo'yicha hisob ----------

  /**
   * Barcha oylarni xronologik tartibda hisoblaydi. Har bir ishchining oy oxiridagi qoldig'i
   * keyingi oyga "o'tgan oydan" bo'lib o'tadi. Yopilgan oy o'z suratidagi (snapshot)
   * qiymatlardan hisoblanadi va o'zgarmaydi.
   * Natija: Map(oy kaliti → computeMonth natijasi + { key, closed }).
   */
  function computeAll(state) {
    const months = state.months.slice().sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    const empById = new Map(state.employees.map((e) => [e.id, e]));
    const balances = new Map();
    const out = new Map();
    for (const m of months) {
      let input;
      if (m.closed && m.snapshot) {
        input = {
          groups: m.snapshot.groups,
          members: m.snapshot.members,
          ops: m.ops,
          step: m.snapshot.step,
        };
      } else {
        input = {
          groups: state.groups,
          members: m.members.map((mm) => {
            const e = empById.get(mm.employeeId);
            const prev = balances.get(mm.employeeId);
            return {
              employeeId: mm.employeeId,
              name: e ? e.name : "(o'chirilgan ishchi)",
              groupId: e ? e.groupId : null,
              absent: mm.absent,
              carry: prev ? prev.balance : toInt(mm.carryStart),
              carryFrom: prev ? prev.key : null,
            };
          }),
          ops: m.ops,
          step: state.settings.step,
        };
      }
      const res = computeMonth(input);
      res.key = m.key;
      res.closed = !!m.closed;
      for (const r of res.rows) balances.set(r.employeeId, { balance: r.balance, key: m.key });
      out.set(m.key, res);
    }
    return out;
  }

  /** Oyni yopish uchun surat: guruhlar, ishchilar (ism, guruh, qoldiq) va qadam muhrlanadi. */
  function makeSnapshot(result) {
    return {
      step: result.step,
      groups: result.groups.map((g) => ({
        id: g.id, name: g.name, base: g.base, norm: g.norm, workDays: g.workDays,
      })),
      members: result.rows.map((r) => ({
        employeeId: r.employeeId,
        name: r.name,
        groupId: r.groupId,
        absent: r.absent,
        carry: r.carry,
        carryFrom: r.carryFrom,
      })),
    };
  }

  // ---------- Ma'lumotlarni tekshirish (zaxiradan tiklashda) ----------

  function str(v, max) {
    return String(v == null ? '' : v).trim().slice(0, max || 120);
  }

  /** Tashqaridan kelgan (zaxira) ma'lumotni tekshiradi va tozalaydi. Yaroqsiz bo'lsa — null. */
  function normalizeState(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.groups) ||
        !Array.isArray(raw.employees) || !Array.isArray(raw.months)) return null;
    const ids = new Set();
    const uniq = (id) => {
      const s = str(id, 40);
      if (!s || ids.has(s)) return null;
      ids.add(s);
      return s;
    };
    const groups = [];
    for (const g of raw.groups) {
      if (!g) continue;
      const id = uniq(g.id);
      const name = str(g.name, 60);
      if (!id || !name) continue;
      groups.push({
        id,
        name,
        base: Math.max(0, toInt(g.base)),
        norm: Math.max(0, toInt(g.norm)),
        workDays: clamp(toInt(g.workDays, DEFAULT_WORK_DAYS), 1, 31),
      });
    }
    const employees = [];
    for (const e of raw.employees) {
      if (!e) continue;
      const id = uniq(e.id);
      const name = str(e.name, 80);
      if (!id || !name) continue;
      employees.push({
        id,
        name,
        groupId: str(e.groupId, 40) || null,
        phone: str(e.phone, 30),
        note: str(e.note, 300),
        active: e.active !== false,
      });
    }
    const empIds = new Set(employees.map((e) => e.id));
    const months = [];
    const keys = new Set();
    for (const m of raw.months) {
      if (!m || !isMonthKey(m.key) || keys.has(m.key)) continue;
      keys.add(m.key);
      const members = [];
      const seen = new Set();
      for (const mm of Array.isArray(m.members) ? m.members : []) {
        if (!mm || !empIds.has(mm.employeeId) || seen.has(mm.employeeId)) continue;
        seen.add(mm.employeeId);
        members.push({
          employeeId: mm.employeeId,
          absent: clamp(toInt(mm.absent), 0, 31),
          carryStart: toInt(mm.carryStart),
        });
      }
      const ops = [];
      for (const op of Array.isArray(m.ops) ? m.ops : []) {
        if (!op || !OP_TYPES.includes(op.type)) continue;
        const amount = toInt(op.amount);
        if (amount <= 0) continue;
        const id = uniq(op.id);
        if (!id) continue;
        ops.push({
          id,
          employeeId: str(op.employeeId, 40),
          type: op.type,
          amount,
          date: /^\d{4}-\d{2}-\d{2}$/.test(op.date) ? op.date : m.key + '-01',
          note: str(op.note, 200),
        });
      }
      let snapshot = null;
      if (m.closed && m.snapshot && Array.isArray(m.snapshot.groups) &&
          Array.isArray(m.snapshot.members)) {
        snapshot = {
          step: Math.max(1, toInt(m.snapshot.step, DEFAULT_STEP)),
          groups: m.snapshot.groups.filter(Boolean).map((g) => ({
            id: str(g.id, 40), name: str(g.name, 60), base: Math.max(0, toInt(g.base)),
            norm: Math.max(0, toInt(g.norm)), workDays: clamp(toInt(g.workDays), 0, 31),
          })),
          members: m.snapshot.members.filter(Boolean).map((s) => ({
            employeeId: str(s.employeeId, 40), name: str(s.name, 80),
            groupId: str(s.groupId, 40) || null, absent: clamp(toInt(s.absent), 0, 31),
            carry: toInt(s.carry), carryFrom: isMonthKey(s.carryFrom) ? s.carryFrom : null,
          })),
        };
      }
      months.push({
        key: m.key,
        closed: !!(m.closed && snapshot),
        closedAt: m.closed && snapshot ? str(m.closedAt, 30) : '',
        members,
        ops,
        snapshot: m.closed ? snapshot : null,
      });
    }
    months.sort((a, b) => (a.key < b.key ? -1 : 1));
    const s = raw.settings || {};
    return {
      v: STATE_VERSION,
      settings: {
        business: str(s.business, 60) || 'Baliqxona',
        step: Math.max(1, toInt(s.step, DEFAULT_STEP)),
        lastBackupAt: str(s.lastBackupAt, 30),
      },
      groups,
      employees,
      months,
      savedAt: str(raw.savedAt, 30),
    };
  }

  function emptyState() {
    return {
      v: STATE_VERSION,
      settings: { business: 'Baliqxona', step: DEFAULT_STEP, lastBackupAt: '' },
      groups: [],
      employees: [],
      months: [],
      savedAt: '',
    };
  }

  /** Asl Excel jadvalidagi guruhlar va ishchilar bilan boshlang'ich ma'lumot. */
  function seedState(key) {
    const s = emptyState();
    s.groups = [
      { id: 'g-ofitsiant', name: 'Ofitsiant', base: 4000000, norm: 5, workDays: DEFAULT_WORK_DAYS },
      { id: 'g-moyka', name: 'Moyka', base: 4000000, norm: 2, workDays: DEFAULT_WORK_DAYS },
      { id: 'g-shef', name: 'Shef', base: 4000000, norm: 1, workDays: DEFAULT_WORK_DAYS },
      { id: 'g-uborsa', name: 'Uborsa', base: 3500000, norm: 1, workDays: DEFAULT_WORK_DAYS },
    ];
    const list = [
      ['Ofitsiant 1', 'g-ofitsiant'], ['Ofitsiant 2', 'g-ofitsiant'], ['Ofitsiant 3', 'g-ofitsiant'],
      ['Ofitsiant 5', 'g-ofitsiant'], ['Moyka 1', 'g-moyka'], ['Moyka 2', 'g-moyka'],
      ['Shef', 'g-shef'], ['Uborsa', 'g-uborsa'], ['Ali', 'g-ofitsiant'], ['Kamola', 'g-moyka'],
    ];
    s.employees = list.map(([name, groupId], i) => ({
      id: 'e-' + (i + 1), name, groupId, phone: '', note: '', active: true,
    }));
    s.months = [{
      key,
      closed: false,
      closedAt: '',
      members: s.employees.map((e) => ({ employeeId: e.id, absent: 0, carryStart: 0 })),
      ops: [],
      snapshot: null,
    }];
    return s;
  }

  return {
    OP_TYPES,
    OP_LABELS,
    ROW_STATUS,
    MONTHS,
    DEFAULT_STEP,
    DEFAULT_WORK_DAYS,
    toInt,
    clamp,
    floorTo,
    formatMoney,
    monthKey,
    isMonthKey,
    addMonths,
    daysInMonth,
    monthName,
    dateKey,
    defaultOpDate,
    computeMonth,
    groupStatusText,
    computeAll,
    makeSnapshot,
    normalizeState,
    emptyState,
    seedState,
  };
});
