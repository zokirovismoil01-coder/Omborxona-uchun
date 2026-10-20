const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../dron/js/model.js');
const S = require('../dron/js/sim.js');

const near = (a, b, eps) => Math.abs(a - b) <= eps;

test("havo zichligi: dengiz sathida 15°C da ~1,225", () => {
  assert.ok(near(M.airDensity(15, 0), 1.225, 0.002));
  assert.ok(M.airDensity(40, 450) < M.airDensity(0, 450), 'issiqda havo siyrakroq');
});

test("muallaq turish quvvati massaning 1,5 darajasiga proporsional", () => {
  const d = M.PRESETS.cargo;
  const ratio = M.hoverPower(d, 20, 1.2) / M.hoverPower(d, 10, 1.2);
  assert.ok(near(ratio, Math.pow(2, 1.5), 1e-9));
});

test("multikopter: o'rtacha tezlikda muallaq turishdan kam quvvat sarflaydi", () => {
  const d = M.PRESETS.cargo;
  const hover = M.hoverPower(d, 9, 1.2);
  assert.ok(near(M.cruisePower(d, 9, 0, 1.2), hover, 1e-6));
  assert.ok(M.cruisePower(d, 9, 12, 1.2) < hover);
  assert.ok(M.cruisePower(d, 9, 30, 1.2) > M.cruisePower(d, 9, 15, 1.2), 'tez uchganda havo qarshiligi oshadi');
});

test("shamol yo'nalishi va yerga nisbatan tezlik", () => {
  const w = M.windVector(5, 0); // shimoldan esadi -> janubga (y+) qarab
  assert.ok(near(w.x, 0, 1e-9) && near(w.y, 5, 1e-9));
  assert.ok(near(M.groundSpeed(15, w, 0, 1), 20, 1e-9), 'orqadan shamol');
  assert.ok(near(M.groundSpeed(15, w, 0, -1), 10, 1e-9), 'qarshi shamol');
  assert.ok(near(M.groundSpeed(15, w, 1, 0), Math.sqrt(200), 1e-9), 'yonlama shamol');
  assert.equal(M.groundSpeed(4, w, 1, 0), 0, 'shamol dron tezligidan kuchli');
});

test("yuk og'irlashsa va havo soviganda yetkazish radiusi kamayadi", () => {
  const d = M.PRESETS.cargo;
  const empty = M.roundTrip(d, { payloadKg: 0, tempC: 20 });
  const full = M.roundTrip(d, { payloadKg: 3, tempC: 20 });
  const cold = M.roundTrip(d, { payloadKg: 3, tempC: -5 });
  assert.ok(empty.radiusKm > full.radiusKm);
  assert.ok(full.radiusKm > cold.radiusKm);
  assert.ok(M.roundTrip(d, { payloadKg: 3.5 }).overweight);
  const windy = M.roundTrip(d, { payloadKg: 1, windAlong: 8 });
  assert.ok(windy.radiusKm < M.roundTrip(d, { payloadKg: 1 }).radiusKm);
});

test('VTOL: tezlik qulash tezligidan katta va masofasi uzoq', () => {
  const d = M.PRESETS.vtol;
  const r = M.roundTrip(d, { payloadKg: 2, tempC: 20 });
  assert.ok(d.cruiseMs > r.stallMs * 1.3);
  assert.ok(r.radiusKm > 30);
  assert.ok(M.bestSpeed(d, 11, r.rho) >= r.stallMs);
});

test("iqtisodiyot: bo'laklar yig'indisi jami narxga teng", () => {
  const d = M.PRESETS.cargo;
  const trip = M.roundTrip(d, { payloadKg: 1, distanceM: 4000 });
  const e = M.economics(d, {}, trip, 4);
  const sum = Object.values(e.drone).reduce((a, b) => a + b, 0);
  assert.ok(near(sum, e.droneTotal, 1e-6));
  assert.ok(e.perDay > 0 && e.carTotal > 0 && e.droneMin < e.carMin);
});

test('marshrut taqiqlangan zonani aylanib o\'tadi', () => {
  const zones = [{ x: 5000, y: 5000, r: 1000 }];
  const g = S.buildGraph(zones);
  const a = { x: 2000, y: 5000 };
  const b = { x: 8000, y: 5000 };
  const p = S.findPath(zones, g, a, b);
  assert.ok(p && p.length > 2);
  for (let i = 1; i < p.length; i++) assert.ok(S.segmentClear(zones, p[i - 1], p[i]));
  const len = S.pathLength(p);
  assert.ok(len > 6000 && len < 6000 + 2 * 1000 * 1.2);
  assert.deepEqual(S.findPath(zones, g, a, { x: 2000, y: 9000 }), [a, { x: 2000, y: 9000 }]);
});

test("bir nechta manzil: tartib qisqaroq yo'l beradi", () => {
  const start = { x: 0, y: 0 };
  const stops = [{ x: 10, y: 0 }, { x: 1, y: 0 }, { x: 5, y: 0 }];
  const route = S.orderStops(start, stops);
  assert.deepEqual(route.map((p) => p.x), [1, 5, 10]);
});

test('simulyator: urug\' bir xil bo\'lsa natija ham bir xil', () => {
  const a = S.run({ fleet: 3, seed: 7 }, 3);
  const b = S.run({ fleet: 3, seed: 7 }, 3);
  assert.deepEqual(a, b);
  assert.ok(a.delivered > 10);
  assert.equal(a.lost, 0);
});

test("simulyator: og'ir, uzoq va taqiqlangan joydagi buyurtmalar rad etiladi", () => {
  const sim = new S.Sim({
    ordersPerHour: 0,
    zones: [{ id: 'z', name: 'Aeroport', x: 9000, y: 9000, r: 800 }],
    size: 60000,
    hubs: [{ id: 'h1', name: 'Ombor', x: 5000, y: 5000 }],
  });
  assert.equal(sim.addOrder(6000, 6000, 9, 'normal').status, 'rejected');
  assert.equal(sim.addOrder(9000, 9000, 1, 'normal').reason, 'zone');
  assert.equal(sim.addOrder(55000, 55000, 1, 'normal').reason, 'far');
  const ok = sim.addOrder(7000, 5000, 1, 'medical');
  assert.equal(ok.status, 'pending');
  sim.step(1800);
  assert.equal(ok.status, 'delivered');
  assert.ok(ok.deliveredAt - ok.createdAt < 10 * 60);
  const d = sim.drones.find((x) => x.deliveries === 1);
  assert.ok(d.battery < sim.capacityWh || d.state === 'idle');
});

test("batareya almashtirish dronlarni zaryadlashdan ko'ra ko'proq band qiladi", () => {
  const base = { fleet: 3, ordersPerHour: 40, seed: 3 };
  const charge = S.run(Object.assign({ energyMode: 'charge' }, base), 6);
  const swap = S.run(Object.assign({ energyMode: 'swap' }, base), 6);
  assert.ok(swap.delivered > charge.delivered);
  assert.ok(swap.utilPct > charge.utilPct);
});

test("bir parvozda bir nechta buyurtma energiyani tejaydi", () => {
  const base = { fleet: 3, ordersPerHour: 45, seed: 5, energyMode: 'swap', clusters: [{ x: 8000, y: 8000, sd: 600 }] };
  const single = S.run(base, 6);
  const batch = S.run(Object.assign({ batching: true }, base), 6);
  assert.ok(batch.whPerDelivery < single.whPerDelivery);
});
