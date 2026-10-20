const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../dron/js/tuzilish-data.js');
const B = require('../dron/js/darslik.js');
const L = require('../dron/js/pidlab.js');

const partIds = new Set(P.PARTS.map((p) => p.id));
const chapterIds = new Set(B.CHAPTERS.map((c) => c.id));

test("sayohat va darslik faqat mavjud qismlar, boblar va ko'rinishlarga murojaat qiladi", () => {
  P.TOUR.forEach((s) => {
    (s.focus || []).concat(s.path || []).forEach((id) => assert.ok(partIds.has(id), `${s.title}: ${id}`));
    assert.ok(P.VIEWS[s.view || 'iso'], s.view);
    if (s.maneuver) assert.ok(P.MANEUVERS[s.maneuver]);
  });
  P.PARTS.forEach((p) => assert.ok(chapterIds.has(p.chapter), `${p.id} → ${p.chapter}`));
  B.CHAPTERS.forEach((c) => {
    c.parts.forEach((id) => assert.ok(partIds.has(id), `${c.id}: ${id}`));
    assert.ok(c.summary.length >= 2 && c.check.length >= 2, c.id);
    assert.equal((c.html.match(/<svg/g) || []).length, (c.html.match(/<\/svg>/g) || []).length, c.id);
  });
});

test("diagonal qarshidagi vintlar bir xil yo'nalishda aylanadi", () => {
  const dir = Object.fromEntries(P.MOTORS.map((m) => [m.pos, m.dir]));
  assert.equal(dir.FR, dir.RL);
  assert.equal(dir.FL, dir.RR);
  assert.notEqual(dir.FR, dir.FL);
});

// Kuch ~ tezlik². M1 old o'ng CCW, M2 orqa chap CCW, M3 old chap CW, M4 orqa o'ng CW
function effects(m) {
  const t = m.map((x) => x * x);
  return {
    total: (t[0] + t[1] + t[2] + t[3]) / 4,
    pitchFwd: (t[1] + t[3]) - (t[0] + t[2]),
    rollRight: (t[1] + t[2]) - (t[0] + t[3]),
    yawRight: (t[0] + t[1]) - (t[2] + t[3]),
  };
}

test("har bir harakatda motorlar to'g'ri tezlashadi (mikser jadvali)", () => {
  const near0 = (v) => Math.abs(v) < 1e-9;
  const M = P.MANEUVERS;
  let e = effects(M.hover.m);
  assert.ok(near0(e.pitchFwd) && near0(e.rollRight) && near0(e.yawRight) && e.total === 1);
  assert.ok(effects(M.up.m).total > 1 && effects(M.down.m).total < 1);
  e = effects(M.forward.m);
  assert.ok(e.pitchFwd > 0 && near0(e.rollRight) && near0(e.yawRight));
  assert.ok(effects(M.back.m).pitchFwd < 0);
  e = effects(M.right.m);
  assert.ok(e.rollRight > 0 && near0(e.pitchFwd) && near0(e.yawRight));
  assert.ok(effects(M.left.m).rollRight < 0);
  e = effects(M.yawR.m);
  assert.ok(e.yawRight > 0 && near0(e.pitchFwd) && near0(e.rollRight));
  assert.ok(effects(M.yawL.m).yawRight < 0);
  // Burilishda umumiy kuch deyarli o'zgarmaydi
  assert.ok(Math.abs(effects(M.yawR.m).total - 1) < 0.02);
});

function settle(opts, seconds) {
  const lab = new L.Lab(opts);
  lab.step(seconds);
  return lab;
}

test('PID: yaxshi sozlangan dron nishonga keladi, faqat P bilan ag\'dariladi', () => {
  const good = settle(Object.assign({ targetDeg: 20 }, L.PRESETS.good), 3);
  assert.ok(Math.abs(good.angle / L.DEG - 20) < 1);
  assert.ok(!good.crashed);
  assert.ok(settle(Object.assign({ targetDeg: 20 }, L.PRESETS.ponly), 6).crashed);
});

test("PID: I bo'lmasa doimiy shamolda og'ish qoladi, I uni yo'qotadi", () => {
  const noI = settle({ p: 8, i: 0, d: 1, wind: true }, 5);
  const withI = settle({ p: 8, i: 4, d: 1, wind: true }, 6);
  assert.ok(Math.abs(noI.angle / L.DEG) > 2 && Math.abs(noI.angle / L.DEG) < 4);
  assert.ok(Math.abs(withI.angle / L.DEG) < 0.5);
});
