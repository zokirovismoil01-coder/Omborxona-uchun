const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/calc.js');
const X = require('../js/xlsx.js');
const E = require('../js/export.js');

/** ZIP'ni o'qiydi: { nom → matn }. Markaziy katalog va CRC'larni tekshiradi. */
function unzip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endPos = bytes.length - 22;
  assert.equal(dv.getUint32(endPos, true), 0x06054b50, 'ZIP oxiri topilmadi');
  const count = dv.getUint16(endPos + 10, true);
  let p = dv.getUint32(endPos + 16, true);
  const files = {};
  for (let i = 0; i < count; i++) {
    assert.equal(dv.getUint32(p, true), 0x02014b50);
    const crc = dv.getUint32(p + 16, true);
    const size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const off = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    assert.equal(dv.getUint32(off, true), 0x04034b50);
    const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
    const data = bytes.subarray(start, start + size);
    assert.equal(X.crc32(data), crc, name + ' CRC');
    files[name] = new TextDecoder().decode(data);
    p += 46 + nameLen;
  }
  return files;
}

function sampleState() {
  const s = C.seedState('2026-09');
  s.months.push({
    key: '2026-10', closed: false, closedAt: '', snapshot: null,
    members: s.employees.map((e) => ({ employeeId: e.id, absent: 0, carryStart: 0 })),
    ops: [
      { id: 'a', employeeId: 'e-9', type: 'avans', amount: 1000000, date: '2026-10-05', note: 'naqd <&>' },
      { id: 'b', employeeId: 'e-8', type: 'avans', amount: 5000000, date: '2026-10-07', note: '' },
    ],
  });
  return s;
}

test('crc32 ma\'lum qiymat bilan mos', () => {
  assert.equal(X.crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('oy hisoboti: yaroqli xlsx tuzilmasi va qiymatlar', () => {
  const s = sampleState();
  const all = C.computeAll(s);
  const res = all.get('2026-10');
  const wb = E.monthWorkbook(s, res, s.months[1], new Date(2026, 9, 19, 9, 5));
  const files = unzip(wb.toBytes());
  for (const name of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml',
    'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml',
    'xl/worksheets/sheet4.xml']) {
    assert.ok(files[name], name + ' yo\'q');
  }
  assert.match(files['xl/workbook.xml'], /name="Xulosa".*name="Oylik hisob".*name="Amallar".*name="Guruhlar"/);
  const payroll = files['xl/worksheets/sheet2.xml'];
  assert.match(payroll, /Kamola/);
  assert.match(payroll, /<v>2666000<\/v>/);
  assert.match(payroll, /<v>35498000<\/v>/); // JAMI asosiy
  const ops = files['xl/worksheets/sheet3.xml'];
  assert.match(ops, /naqd &lt;&amp;&gt;/);
  assert.match(ops, /<v>46300<\/v>/); // 05.10.2026 sana raqami
  // Har bir varaq XML'i to'g'ri yopilgan
  for (const [name, xml] of Object.entries(files)) {
    if (name.endsWith('.xml')) assert.ok(xml.trim().endsWith('>'), name);
  }
});

test('yillik hisobot: oylar va ishchilar varaqlari', () => {
  const s = sampleState();
  const all = C.computeAll(s);
  const wb = E.yearWorkbook(s, all, '2026', new Date(2026, 9, 19));
  const files = unzip(wb.toBytes());
  const book = files['xl/workbook.xml'];
  assert.match(book, /Yig&apos;ma 2026|Yig'ma 2026/);
  assert.match(book, /name="Sen 2026"/);
  assert.match(book, /name="Okt 2026"/);
  const summary = files['xl/worksheets/sheet1.xml'];
  assert.match(summary, /Sentabr 2026/);
  assert.match(summary, /Oktabr 2026/);
  assert.match(summary, /<v>35500000<\/v>/); // fond
  assert.match(summary, /<v>71000000<\/v>/); // ikki oy fondi jami
  const people = files['xl/worksheets/sheet2.xml'];
  assert.match(people, /Uborsa/);
});

test('varaq nomlari Excel qoidalariga moslanadi', () => {
  const wb = new X.Workbook();
  const a = wb.addSheet('Hisob: [okt]/2026?');
  const b = wb.addSheet('hisob  okt  2026');
  const c = wb.addSheet('x'.repeat(40));
  assert.equal(a.name, 'Hisob   okt  2026');
  assert.notEqual(a.name.toLowerCase(), b.name.toLowerCase());
  assert.equal(c.name.length, 31);
});

test('fayl nomlari xavfsiz', () => {
  const s = C.emptyState();
  s.settings.business = "Baliq'xona / Markaz";
  assert.equal(E.monthFileName(s, '2026-10'), 'Baliq_xona_Markaz_oylik_2026-10.xlsx');
  assert.equal(E.yearFileName(s, '2026'), 'Baliq_xona_Markaz_oylik_2026-yil.xlsx');
});
