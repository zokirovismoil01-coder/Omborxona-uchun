const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/calc.js');

const GROUPS = [
  { id: 'of', name: 'Ofitsiant', base: 4000000, norm: 5, workDays: 26 },
  { id: 'mo', name: 'Moyka', base: 4000000, norm: 2, workDays: 26 },
  { id: 'sh', name: 'Shef', base: 4000000, norm: 1, workDays: 26 },
  { id: 'ub', name: 'Uborsa', base: 3500000, norm: 1, workDays: 26 },
];

const member = (employeeId, groupId, extra) =>
  Object.assign({ employeeId, name: employeeId, groupId, absent: 0, carry: 0 }, extra);

const byId = (res) => Object.fromEntries(res.rows.map((r) => [r.employeeId, r]));
const groupById = (res) => Object.fromEntries(res.groups.map((g) => [g.id, g]));

test("asl Excel jadvali bilan bir xil natija", () => {
  const members = [
    member('Ofitsiant 1', 'of'), member('Ofitsiant 2', 'of'), member('Ofitsiant 3', 'of'),
    member('Ofitsiant 5', 'of'), member('Moyka 1', 'mo'), member('Moyka 2', 'mo'),
    member('Shef', 'sh'), member('Uborsa', 'ub'), member('Ali', 'of'), member('Kamola', 'mo'),
  ];
  const res = C.computeMonth({ groups: GROUPS, members, ops: [], step: 1000 });
  const g = groupById(res);
  assert.equal(g.of.perPerson, 4000000);
  assert.equal(g.mo.perPerson, 2666000);
  assert.equal(g.mo.status, 'over');
  assert.equal(g.mo.rounding, 2000);
  assert.equal(res.totals.fund, 35500000);
  assert.equal(res.totals.base, 35498000);
  assert.equal(res.totals.saved, 2000);
  assert.equal(res.totals.due, 35498000);
  assert.equal(byId(res).Kamola.balance, 2666000);
  assert.equal(byId(res).Kamola.status, 'unpaid');
});

test("davomat, amallar, qarz va bo'sh o'rin (Excel'da tekshirilgan holat)", () => {
  const members = [
    member('Ofitsiant 1', 'of'), member('Ofitsiant 2', 'of'), member('Ofitsiant 3', 'of'),
    member('Ali', 'of'), member('Moyka 1', 'mo'), member('Moyka 2', 'mo'),
    member('Kamola', 'mo', { absent: 2 }), member('Shef', 'sh', { absent: 26 }),
    member('Uborsa', 'ub', { carry: -500000 }), member('Vali', 'yoq'),
  ];
  const op = (employeeId, type, amount) => ({ employeeId, type, amount });
  const ops = [
    op('Ali', 'avans', 1000000), op('Ali', 'avans', 500000), op('Ali', 'mukofot', 200000),
    op('Moyka 1', 'jarima', 100000), op('Ofitsiant 1', 'tolov', 4000000),
    op('Ofitsiant 2', 'tolov', 1000000), op('Nobody', 'avans', 100), op('Uborsa', 'avans', 4000000),
    op('Ali', 'bonus', 5),
  ];
  const res = C.computeMonth({ groups: GROUPS, members, ops, step: 1000 });
  const r = byId(res);
  const g = groupById(res);

  assert.equal(r.Kamola.base, 2460000); // 2 666 000 × 24 ÷ 26 = 2 460 923 → 2 460 000
  assert.equal(r.Shef.base, 0);
  assert.equal(r.Shef.status, 'none');
  assert.equal(r['Ofitsiant 1'].status, 'paid');
  assert.equal(r['Ofitsiant 2'].status, 'partial');
  assert.equal(r['Ofitsiant 2'].balance, 3000000);
  assert.equal(r.Ali.total, 4200000);
  assert.equal(r.Ali.toPay, 2700000);
  assert.equal(r['Moyka 1'].balance, 2566000);
  assert.equal(r.Uborsa.balance, -1000000);
  assert.equal(r.Uborsa.status, 'debt');
  assert.equal(r.Vali.status, 'no-group');
  assert.equal(r.Vali.base, 0);

  assert.equal(g.of.status, 'vacant');
  assert.equal(g.of.vacancy, 4000000);
  assert.equal(g.mo.absence, 206000);
  assert.equal(g.sh.absence, 4000000);

  const t = res.totals;
  assert.equal(t.base, 27292000);
  assert.equal(t.bonus, 200000);
  assert.equal(t.fine, 100000);
  assert.equal(t.carry, -500000);
  assert.equal(t.total, 26892000);
  assert.equal(t.advance, 5500000);
  assert.equal(t.toPay, 21392000);
  assert.equal(t.paid, 5000000);
  assert.equal(t.due, 17392000);
  assert.equal(t.debt, 1000000);
  assert.equal(t.vacancy, 4000000);
  assert.equal(t.absence, 4206000);
  assert.equal(t.rounding, 2000);
  assert.equal(t.saved, 8208000);
  assert.equal(res.orphanOps, 1); // "Nobody"; noma'lum "bonus" turi umuman sanalmaydi
  assert.ok(res.warnings.some((w) => w.text.includes('Vali')));
});

test("fond = haqiqiy oylik + tejam (tasodifiy ma'lumotlarda)", () => {
  let seed = 7;
  const rnd = (n) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % n;
  };
  for (let k = 0; k < 300; k++) {
    const groups = Array.from({ length: 1 + rnd(5) }, (_, i) => ({
      id: 'g' + i,
      name: 'G' + i,
      base: (1 + rnd(9000)) * 1000 + rnd(3) * 333,
      norm: rnd(7),
      workDays: 1 + rnd(31),
    }));
    const members = Array.from({ length: rnd(15) }, (_, i) =>
      member('e' + i, 'g' + rnd(groups.length), { absent: rnd(10) }));
    const step = [1, 100, 1000, 5000][rnd(4)];
    const res = C.computeMonth({ groups, members, ops: [], step });
    for (const g of res.groups) {
      assert.equal(g.fund, g.actual + g.saved);
      assert.equal(g.saved, g.vacancy + g.absence + g.rounding);
      assert.ok(g.vacancy >= 0 && g.absence >= 0 && g.rounding >= 0, JSON.stringify(g));
      assert.ok(g.perPerson <= g.base);
    }
    for (const r of res.rows) assert.ok(r.base <= r.perPerson && r.base >= 0);
  }
});

test('pastga yaxlitlash suzuvchi nuqta xatosiga chidamli', () => {
  assert.equal(C.floorTo(2000000, 1000), 2000000);
  assert.equal(C.floorTo(4000000 * 13 / 26, 1000), 2000000);
  assert.equal(C.floorTo(0.1 * 3 * 10000, 1000), 3000); // 3000.0000000000005
  assert.equal(C.floorTo(2999.9999999, 1000), 3000);
  assert.equal(C.floorTo(2999, 1000), 2000);
  assert.equal(C.floorTo(1234, 0), 1234);
  // 3 kishiga 10 000 000 → 3 333 000
  const res = C.computeMonth({
    groups: [{ id: 'a', name: 'A', base: 5000000, norm: 2, workDays: 30 }],
    members: [member('x', 'a'), member('y', 'a'), member('z', 'a')],
    ops: [],
    step: 1000,
  });
  assert.equal(res.groups[0].perPerson, 3333000);
  assert.equal(res.groups[0].rounding, 1000);
});

test("hech kim bo'lmagan guruh — butun fond tejaladi", () => {
  const res = C.computeMonth({ groups: GROUPS, members: [], ops: [], step: 1000 });
  for (const g of res.groups) {
    assert.equal(g.status, 'empty');
    assert.equal(g.saved, g.fund);
    assert.equal(g.vacancy, g.fund);
  }
});

function stateWithTwoMonths() {
  const s = C.seedState('2026-09');
  s.months.push({
    key: '2026-10', closed: false, closedAt: '', snapshot: null, ops: [],
    members: s.employees.map((e) => ({ employeeId: e.id, absent: 0, carryStart: 0 })),
  });
  return s;
}

test("qoldiq keyingi oyga o'tadi (manfiy ham, musbat ham)", () => {
  const s = stateWithTwoMonths();
  const uborsa = s.employees.find((e) => e.name === 'Uborsa').id;
  const ali = s.employees.find((e) => e.name === 'Ali').id;
  s.months[0].ops.push(
    { id: 'o1', employeeId: uborsa, type: 'avans', amount: 4000000, date: '2026-09-10', note: '' },
    { id: 'o2', employeeId: ali, type: 'tolov', amount: 3000000, date: '2026-09-30', note: '' },
  );
  const all = C.computeAll(s);
  const sen = all.get('2026-09');
  const okt = all.get('2026-10');
  const row = (res, id) => res.rows.find((r) => r.employeeId === id);
  assert.equal(row(sen, uborsa).balance, -500000);
  assert.equal(row(okt, uborsa).carry, -500000);
  assert.equal(row(okt, uborsa).carryFrom, '2026-09');
  assert.equal(row(okt, uborsa).total, 3000000);
  assert.equal(row(okt, ali).carry, 1000000);
  assert.equal(row(okt, ali).total, 5000000);
  // Birinchi oyda qo'lda kiritilgan boshlang'ich qoldiq ishlatiladi
  s.months[0].members.find((m) => m.employeeId === ali).carryStart = 250000;
  assert.equal(row(C.computeAll(s).get('2026-09'), ali).carry, 250000);
});

test("yopilgan oy guruh o'zgarishlaridan ta'sirlanmaydi", () => {
  const s = stateWithTwoMonths();
  const sen = C.computeAll(s).get('2026-09');
  s.months[0].closed = true;
  s.months[0].snapshot = C.makeSnapshot(sen);
  s.groups.find((g) => g.name === 'Moyka').base = 5000000;
  s.employees.find((e) => e.name === 'Ali').name = 'Ali Valiyev';
  const all = C.computeAll(s);
  assert.equal(all.get('2026-09').totals.base, sen.totals.base);
  assert.ok(all.get('2026-09').rows.some((r) => r.name === 'Ali'));
  assert.ok(all.get('2026-10').rows.some((r) => r.name === 'Ali Valiyev'));
  assert.equal(all.get('2026-10').groups.find((g) => g.name === 'Moyka').perPerson, 3333000);
});

test("zaxirani tekshirish: buzuq ma'lumot rad etiladi, ortiqchasi tozalanadi", () => {
  assert.equal(C.normalizeState(null), null);
  assert.equal(C.normalizeState({ groups: [] }), null);
  assert.equal(C.normalizeState('salom'), null);
  const raw = {
    settings: { step: '500', business: '  Baliq  ' },
    groups: [
      { id: 'g1', name: 'Ofitsiant', base: '4 000 000', norm: '5', workDays: 40 },
      { id: 'g1', name: 'Takror', base: 1, norm: 1, workDays: 1 },
      { id: 'g2', name: '', base: 1 },
    ],
    employees: [
      { id: 'e1', name: 'Ali', groupId: 'g1' },
      { id: 'e2', name: '   ' },
      null,
    ],
    months: [
      {
        key: '2026-10',
        members: [{ employeeId: 'e1', absent: 99 }, { employeeId: 'e1' }, { employeeId: 'zz' }],
        ops: [
          { id: 'o1', employeeId: 'e1', type: 'avans', amount: 1000, date: '2026-10-02' },
          { id: 'o2', employeeId: 'e1', type: 'boshqa', amount: 1000 },
          { id: 'o3', employeeId: 'e1', type: 'jarima', amount: -5 },
        ],
      },
      { key: '2026-13', members: [], ops: [] },
      { key: '2026-10', members: [], ops: [] },
    ],
  };
  const s = C.normalizeState(raw);
  assert.equal(s.settings.step, 500);
  assert.equal(s.settings.business, 'Baliq');
  assert.deepEqual(s.groups.map((g) => g.name), ['Ofitsiant']);
  assert.equal(s.groups[0].base, 4000000);
  assert.equal(s.groups[0].workDays, 31);
  assert.deepEqual(s.employees.map((e) => e.name), ['Ali']);
  assert.equal(s.months.length, 1);
  assert.equal(s.months[0].members.length, 1);
  assert.equal(s.months[0].members[0].absent, 31);
  assert.deepEqual(s.months[0].ops.map((o) => o.id), ['o1']);
});

test("boshlang'ich ma'lumot Excel'dagi bilan bir xil", () => {
  const s = C.seedState('2026-10');
  const res = C.computeAll(s).get('2026-10');
  assert.equal(s.employees.length, 10);
  assert.equal(res.totals.base, 35498000);
  assert.equal(C.normalizeState(JSON.parse(JSON.stringify(s))).employees.length, 10);
});

test('oy va sana yordamchilari', () => {
  assert.equal(C.monthName('2026-10'), 'Oktabr 2026');
  assert.equal(C.addMonths('2026-12', 1), '2027-01');
  assert.equal(C.addMonths('2026-01', -1), '2025-12');
  assert.equal(C.daysInMonth('2028-02'), 29);
  const today = new Date(2026, 9, 19);
  assert.equal(C.defaultOpDate('2026-10', today), '2026-10-19');
  assert.equal(C.defaultOpDate('2026-09', today), '2026-09-30');
  assert.equal(C.defaultOpDate('2026-11', today), '2026-11-01');
  assert.equal(C.formatMoney(-1234567), '−1 234 567');
  assert.equal(C.toInt('1 500 000'), 1500000);
  assert.equal(C.toInt('abc', 7), 7);
});
