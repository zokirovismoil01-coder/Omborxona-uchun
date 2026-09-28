const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../js/parser.js');

// 2026-09-28 — dushanba
const today = new Date(2026, 8, 28);
const opts = { today };
const parse = (text, extra) => P.parse(text, Object.assign({}, opts, extra));

test('raqamli xarajat', () => {
  const r = parse("Non uchun 5000 so'm sarfladim");
  assert.equal(r.type, 'expense');
  assert.equal(r.amount, 5000);
  assert.equal(r.description, 'Non');
  assert.equal(r.category, 'Oziq-ovqat');
  assert.equal(r.date, '2026-09-28');
});

test("so'z bilan aytilgan summa", () => {
  const r = parse("taksiga yigirma besh ming so'm berdim");
  assert.equal(r.type, 'expense');
  assert.equal(r.amount, 25000);
  assert.equal(r.category, 'Transport');
  assert.equal(r.description, 'Taksiga');
});

test('aralash yozuvlar: 15 ming, 25 000, 1,5 million', () => {
  assert.equal(parse("benzinga 15 ming so'm").amount, 15000);
  assert.equal(parse("bozorga 25 000 so'm ketdi").amount, 25000);
  assert.equal(parse("ijara uchun 1,5 million so'm to'ladim").amount, 1500000);
  assert.equal(parse("dori 120.000 so'm").amount, 120000);
  assert.equal(parse("kiyim uchun ikki yuz ellik ming so'm").amount, 250000);
  assert.equal(parse("telefon uchun bir million ikki yuz ming so'm").amount, 1200000);
  assert.equal(parse("ikki yarim ming so'm choy").amount, 2500);
});

test('miqdorni summadan ajratish', () => {
  const r = parse("2 kilo go'sht 180 ming so'm oldim");
  assert.equal(r.type, 'expense');
  assert.equal(r.amount, 180000);
  assert.equal(r.category, 'Oziq-ovqat');
  const r2 = parse('uchta non 12000 sarfladim');
  assert.equal(r2.amount, 12000);
});

test("so'm aytilmasa ham xarajat fe'li bilan aniqlanadi", () => {
  const r = parse('svet uchun 80000 toʻladim');
  assert.equal(r.type, 'expense');
  assert.equal(r.amount, 80000);
  assert.equal(r.category, 'Kommunal');
});

test('kecha qilingan xarajat', () => {
  const r = parse("kecha kafeda 60 ming so'm sarfladim");
  assert.equal(r.date, '2026-09-27');
  assert.equal(r.amount, 60000);
});

test('oddiy vazifa', () => {
  const r = parse('onamga qoʻngʻiroq qilish');
  assert.equal(r.type, 'task');
  assert.equal(r.text, "Onamga qo'ng'iroq qilish");
  assert.equal(r.date, '2026-09-28');
  assert.equal(r.time, null);
});

test('ertaga + soat', () => {
  const r = parse('ertaga soat 10 da bankka borishim kerak');
  assert.equal(r.type, 'task');
  assert.equal(r.date, '2026-09-29');
  assert.equal(r.time, '10:00');
  assert.equal(r.text, 'Bankka borishim kerak');
});

test("so'z bilan vaqt va kechqurun", () => {
  assert.equal(parse('kechqurun soat yettida sport zalga borish').time, '19:00');
  assert.equal(parse("soat o'n ikkida tushlik uchrashuvi").time, '12:00');
  assert.equal(parse('soat 3 yarimda majlis').time, '15:30');
  assert.equal(parse('14:45 da hisobot topshirish').time, '14:45');
  assert.equal(parse('ertalab soat 6 da yugurish').time, '06:00');
});

test('pul haqidagi vazifa vazifa boʻlib qoladi', () => {
  const r = parse("ertaga internet uchun 100 ming so'm to'lashim kerak");
  assert.equal(r.type, 'task');
  assert.equal(r.date, '2026-09-29');
});

test('hafta kuni', () => {
  assert.equal(parse('juma kuni hisobot topshirish').date, '2026-10-02');
  assert.equal(parse('dushanba majlis').date, '2026-10-05');
});

test('bajarildi buyrugʻi', () => {
  const r = parse('onamga qoʻngʻiroq bajarildi');
  assert.equal(r.type, 'done');
  const tasks = [
    { id: 1, text: 'Non olish' },
    { id: 2, text: "Onamga qo'ng'iroq qilish" },
  ];
  assert.equal(P.matchTask(r.query, tasks).id, 2);
  assert.equal(P.matchTask('mashina yuvish', tasks), null);
});

test('majburiy rejim', () => {
  assert.equal(parse("non 5000 so'm", { mode: 'task' }).type, 'task');
  const r = parse('sovgʻa', { mode: 'expense' });
  assert.equal(r.type, 'expense');
  assert.equal(r.amount, null);
});

test('bir gapda bir nechta xarajat', () => {
  const items = P.parseMany("non 5000 so'm va sut 12 ming so'm", opts);
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((i) => i.amount), [5000, 12000]);
  assert.deepEqual(items.map((i) => i.description), ['Non', 'Sut']);
});

test('pul formati', () => {
  assert.equal(P.formatMoney(1250000), "1 250 000 so'm");
});

test("ming aytilsa so'm aytilmasa ham xarajat", () => {
  const r = parse("sut uchun o'n ikki ming");
  assert.equal(r.type, 'expense');
  assert.equal(r.amount, 12000);
  assert.equal(parse("mashina moyi 300 ming so'mga").category, 'Transport');
  assert.equal(parse('3 ta kitob oldim').type, 'task');
});

test("nisbiy vaqt: '5 daqiqadan keyin'", () => {
  const now = new Date(2026, 8, 28, 14, 3, 40);
  const r = P.parse('5 daqiqadan keyin uchrashuv', { today: now });
  assert.equal(r.type, 'task');
  assert.equal(r.text, 'Uchrashuv');
  assert.equal(r.date, '2026-09-28');
  assert.equal(r.time, '14:08');
  assert.equal(r.at, now.getTime() + 5 * 60000);
});

test("nisbiy vaqt: soat, yarim soat, so'z bilan son", () => {
  const now = new Date(2026, 8, 28, 14, 0, 0);
  const p = (s) => P.parse(s, { today: now });
  assert.equal(p("yarim soatdan keyin onamga qo'ng'iroq qilish").time, '14:30');
  assert.equal(p('bir yarim soatdan keyin dori ichish').time, '15:30');
  assert.equal(p("2 soatdan so'ng majlis").time, '16:00');
  assert.equal(p("o'n besh minutdan keyin choy").time, '14:15');
  const d = p('3 kundan keyin hisobot topshirish');
  assert.equal(d.date, '2026-10-01');
  assert.equal(d.time, null);
});

test('nisbiy vaqt yarim tundan oshsa, ertangi kunga oʻtadi', () => {
  const r = P.parse('10 daqiqadan keyin uxlash', { today: new Date(2026, 8, 28, 23, 55) });
  assert.equal(r.date, '2026-09-29');
  assert.equal(r.time, '00:05');
});
