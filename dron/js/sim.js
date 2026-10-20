/*
 * Dron-yetkazish simulyatori: buyurtmalar oqimi, dispetcher, marshrut rejalash
 * (taqiqlangan zonalarni aylanib o'tish), batareya va shamol.
 * Hech qanday DOM'ga bog'liq emas — Node.js'da ham ishlaydi (testlar va tajribalar uchun).
 * Brauzerda window.DronSim, Node.js'da module.exports.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./model.js'));
  else root.DronSim = factory(root.DronModel);
})(typeof self !== 'undefined' ? self : this, function (M) {
  'use strict';

  const PRIORITY = {
    medical: { name: 'Tibbiy', rank: 0 },
    express: { name: 'Tezkor', rank: 1 },
    normal: { name: 'Oddiy', rank: 2 },
  };

  const STATE_NAMES = {
    idle: "Bo'sh",
    charging: 'Zaryadlanmoqda',
    swap: 'Batareya almashmoqda',
    takeoff: "Ko'tarilmoqda",
    outbound: 'Mijozga uchmoqda',
    drop: 'Yukni topshirmoqda',
    return: 'Omborga qaytmoqda',
    landing: "Qo'nmoqda",
    lost: 'Favqulodda qo\'ndi',
  };

  const STRATEGIES = {
    fifo: 'Navbat bo\'yicha (FIFO)',
    nearest: 'Eng yaqin buyurtma',
    priority: 'Muddati yaqin va tibbiy birinchi',
  };

  const DEFAULTS = {
    size: 12000, // xarita tomoni, m
    model: 'cargo',
    custom: null, // «Hisoblash» bo'limida yasalgan dron
    fleet: 4,
    ordersPerHour: 20,
    strategy: 'fifo',
    batching: false,
    energyMode: 'charge', // charge — omborda quvvatlash, swap — batareyani almashtirish
    chargeC: 1, // 1C: batareya 1 soatda to'ladi
    swapSec: 120,
    windMs: 4,
    windFromDeg: 315,
    tempC: 22,
    altitudeM: 450,
    reserve: 0.2,
    sla: { medical: 20, express: 30, normal: 60 }, // daqiqa
    mix: { medical: 0.1, express: 0.2 },
    weights: [[0.6, 0.2, 1], [0.32, 1, 2.5], [0.08, 2.5, 4.5]], // [ulush, min kg, max kg]
    hubs: [{ id: 'h1', name: 'Markaziy ombor', x: 6000, y: 6000 }],
    zones: [],
    clusters: [],
    destinations: null, // doimiy manzillar (masalan, poliklinikalar)
    seed: 1,
  };

  // ---------- Yordamchilar ----------

  function rng(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function segPointDist(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
  }

  function pathLength(path) {
    let s = 0;
    for (let i = 1; i < path.length; i++) s += dist(path[i - 1], path[i]);
    return s;
  }

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  // ---------- Marshrut: ko'rinish grafi + A* ----------
  // Har bir taqiqlangan doira atrofiga ko'pburchak chiziladi. Dron yo'li shu
  // ko'pburchak uchlari orqali o'tadi — bu eng qisqa aylanma yo'lni beradi.

  const ZONE_SIDES = 12;
  const ZONE_BUFFER = 1.1;
  const CLEAR_FACTOR = 1.05;

  function buildGraph(zones) {
    const nodes = [];
    zones.forEach((z) => {
      const R = (z.r * ZONE_BUFFER) / Math.cos(Math.PI / ZONE_SIDES);
      for (let i = 0; i < ZONE_SIDES; i++) {
        const a = (2 * Math.PI * i) / ZONE_SIDES;
        const p = { x: z.x + R * Math.cos(a), y: z.y + R * Math.sin(a) };
        if (!zones.some((o) => dist(o, p) < o.r * CLEAR_FACTOR)) nodes.push(p);
      }
    });
    const edges = nodes.map(() => []);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (segmentClear(zones, nodes[i], nodes[j])) {
          const d = dist(nodes[i], nodes[j]);
          edges[i].push([j, d]);
          edges[j].push([i, d]);
        }
      }
    }
    return { nodes, edges };
  }

  function segmentClear(zones, a, b) {
    for (const z of zones) if (segPointDist(z, a, b) < z.r * CLEAR_FACTOR - 1e-6) return false;
    return true;
  }

  function inZone(zones, p) {
    return zones.find((z) => dist(z, p) < z.r) || null;
  }

  function findPath(zones, graph, a, b) {
    if (segmentClear(zones, a, b)) return [a, b];
    const n = graph.nodes.length;
    const START = n;
    const GOAL = n + 1;
    const pt = (i) => (i === START ? a : i === GOAL ? b : graph.nodes[i]);
    const neighbors = (i) => {
      if (i === START) {
        return graph.nodes.map((p, j) => [j, dist(a, p)]).filter(([j]) => segmentClear(zones, a, graph.nodes[j]));
      }
      const list = graph.edges[i].slice();
      if (segmentClear(zones, graph.nodes[i], b)) list.push([GOAL, dist(graph.nodes[i], b)]);
      return list;
    };
    const g = new Map([[START, 0]]);
    const came = new Map();
    const open = new Set([START]);
    const closed = new Set();
    while (open.size) {
      let cur = -1;
      let best = Infinity;
      for (const i of open) {
        const f = g.get(i) + dist(pt(i), b);
        if (f < best) { best = f; cur = i; }
      }
      if (cur === GOAL) {
        const path = [b];
        let c = GOAL;
        while (came.has(c)) { c = came.get(c); path.push(pt(c)); }
        return path.reverse();
      }
      open.delete(cur);
      closed.add(cur);
      for (const [j, d] of neighbors(cur)) {
        if (closed.has(j)) continue;
        const ng = g.get(cur) + d;
        if (!g.has(j) || ng < g.get(j)) {
          g.set(j, ng);
          came.set(j, cur);
          open.add(j);
        }
      }
    }
    return null;
  }

  // Bir nechta manzilni aylanish tartibi: eng yaqin qo'shni + 2-opt yaxshilash
  function orderStops(start, stops, end) {
    const rest = stops.slice();
    const route = [];
    let cur = start;
    while (rest.length) {
      let bi = 0;
      for (let i = 1; i < rest.length; i++) if (dist(cur, rest[i]) < dist(cur, rest[bi])) bi = i;
      cur = rest.splice(bi, 1)[0];
      route.push(cur);
    }
    const total = (r) => pathLength([start].concat(r, [end || start]));
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < route.length - 1; i++) {
        for (let j = i + 1; j < route.length; j++) {
          const cand = route.slice(0, i).concat(route.slice(i, j + 1).reverse(), route.slice(j + 1));
          if (total(cand) + 1e-6 < total(route)) { route.splice(0, route.length, ...cand); improved = true; }
        }
      }
    }
    return route;
  }

  // ---------- Simulyator ----------

  class Sim {
    constructor(config) {
      this.cfg = Object.assign(clone(DEFAULTS), clone(config || {}));
      this.random = rng(this.cfg.seed);
      this.t = 0;
      this.nextId = 1;
      this.orderSeq = 0;
      this.droneSeq = 0;
      this.orders = [];
      this.drones = [];
      this.log = [];
      this.version = 0;
      this.pathCache = new Map();
      this.stats = {
        created: 0, delivered: 0, onTime: 0, rejected: 0, failed: 0, lost: 0,
        sumMin: 0, flightSec: 0, distanceM: 0, energyWh: 0, carKm: 0,
        reasons: { heavy: 0, far: 0, zone: 0 },
      };
      this.dispatchTimer = 0;
      this.rebuild();
      this.spawnFleet();
      this.scheduleNextOrder();
    }

    get spec() {
      const c = this.cfg;
      return c.model === 'custom' && c.custom ? c.custom : M.PRESETS[c.model] || M.PRESETS.cargo;
    }

    get rho() {
      return M.airDensity(this.cfg.tempC, this.cfg.altitudeM);
    }

    get wind() {
      return M.windVector(this.cfg.windMs, this.cfg.windFromDeg);
    }

    get capacityWh() {
      return this.spec.batteryWh * M.batteryTempFactor(this.cfg.tempC);
    }

    rebuild() {
      this.graph = buildGraph(this.cfg.zones);
      this.pathCache.clear();
      this.version++;
    }

    say(text, kind) {
      this.log.push({ t: this.t, text, kind: kind || 'info' });
      if (this.log.length > 300) this.log.splice(0, this.log.length - 300);
    }

    // ----- Park -----

    spawnFleet() {
      for (let i = 0; i < this.cfg.fleet; i++) this.addDrone();
    }

    addDrone() {
      const hub = this.cfg.hubs[this.drones.length % this.cfg.hubs.length];
      const id = ++this.droneSeq;
      this.drones.push({
        id, name: 'D' + id, hubId: hub.id,
        x: hub.x, y: hub.y, heading: -Math.PI / 2,
        state: 'idle', battery: this.capacityWh,
        plan: [], step: 0, timer: 0, path: null, seg: 1, cargo: [],
        flightSec: 0, deliveries: 0,
      });
    }

    setFleet(n) {
      const count = Math.max(1, Math.min(30, Math.round(n)));
      this.cfg.fleet = count;
      while (this.drones.length < count) this.addDrone();
      // Ortiqcha dronlarni faqat omborda turgan bo'lsa olib tashlaymiz (qolganlari qaytgach)
      for (let i = this.drones.length - 1; i >= 0 && this.drones.length > count; i--) {
        const d = this.drones[i];
        if (['idle', 'charging', 'swap', 'lost'].includes(d.state)) this.drones.splice(i, 1);
      }
    }

    hub(id) {
      return this.cfg.hubs.find((h) => h.id === id) || this.cfg.hubs[0];
    }

    // ----- Buyurtmalar -----

    scheduleNextOrder() {
      const rate = this.cfg.ordersPerHour;
      this.nextOrderAt = rate > 0 ? this.t + (-Math.log(1 - this.random()) * 3600) / rate : Infinity;
    }

    randomPoint() {
      const c = this.cfg;
      const r = this.random;
      for (let tries = 0; tries < 40; tries++) {
        let p;
        if (c.destinations && c.destinations.length) {
          const d = c.destinations[Math.floor(r() * c.destinations.length)];
          p = { x: d.x, y: d.y, place: d.name };
        } else if (c.clusters.length && r() < 0.7) {
          const k = c.clusters[Math.floor(r() * c.clusters.length)];
          const ang = r() * Math.PI * 2;
          const rad = Math.sqrt(-2 * Math.log(1 - r())) * k.sd;
          p = { x: k.x + Math.cos(ang) * rad, y: k.y + Math.sin(ang) * rad };
        } else {
          p = { x: c.size * (0.04 + 0.92 * r()), y: c.size * (0.04 + 0.92 * r()) };
        }
        const inside = p.x > 0 && p.y > 0 && p.x < c.size && p.y < c.size;
        if (inside && !inZone(c.zones, p) && !c.hubs.some((h) => dist(h, p) < 250)) return p;
      }
      return null;
    }

    randomWeight() {
      let u = this.random();
      for (const [share, lo, hi] of this.cfg.weights) {
        if (u < share) return Math.round((lo + this.random() * (hi - lo)) * 10) / 10;
        u -= share;
      }
      const last = this.cfg.weights[this.cfg.weights.length - 1];
      return last[2];
    }

    randomPriority() {
      const u = this.random();
      if (u < this.cfg.mix.medical) return 'medical';
      if (u < this.cfg.mix.medical + this.cfg.mix.express) return 'express';
      return 'normal';
    }

    addOrder(x, y, kg, priority, place) {
      const pr = PRIORITY[priority] ? priority : 'normal';
      const o = {
        id: ++this.orderSeq, x, y, kg: Math.max(0.1, kg), priority: pr, place: place || null,
        createdAt: this.t, deadline: this.t + this.cfg.sla[pr] * 60,
        status: 'pending', droneId: null, deliveredAt: null, est: null,
      };
      this.orders.push(o);
      this.stats.created++;
      const why = this.rejectReason(o);
      if (why) this.reject(o, why);
      return o;
    }

    reject(o, why) {
      o.status = 'rejected';
      o.reason = why;
      o.closedAt = this.t;
      this.stats.rejected++;
      this.stats.reasons[why]++;
      const text = {
        heavy: `#${o.id} rad etildi: ${M.fmt(o.kg, 1)} kg — bu dron ko'tara oladiganidan og'ir`,
        far: `#${o.id} rad etildi: juda uzoq, to'liq batareya bilan ham borib-qaytolmaydi`,
        zone: `#${o.id} rad etildi: manzil taqiqlangan zonada`,
      }[why];
      this.say(text, 'warn');
    }

    rejectReason(o) {
      if (o.kg > this.spec.maxPayloadKg) return 'heavy';
      if (inZone(this.cfg.zones, o)) return 'zone';
      const full = this.capacityWh * (1 - this.cfg.reserve);
      const ok = this.cfg.hubs.some((h) => {
        const est = this.estimate(o, h);
        return est && est.wh <= full;
      });
      return ok ? null : 'far';
    }

    // ----- Marshrut va energiya -----

    path(a, b) {
      const key = `${Math.round(a.x)},${Math.round(a.y)}>${Math.round(b.x)},${Math.round(b.y)}`;
      if (this.pathCache.has(key)) return this.pathCache.get(key);
      const p = findPath(this.cfg.zones, this.graph, { x: a.x, y: a.y }, { x: b.x, y: b.y });
      if (this.pathCache.size > 20000) this.pathCache.clear();
      this.pathCache.set(key, p);
      return p;
    }

    // Yo'l bo'ylab uchish: vaqt (s) va energiya (Wh), shamolni hisobga olib
    flight(path, massKg) {
      const d = this.spec;
      const power = M.cruisePower(d, massKg, d.cruiseMs, this.rho);
      const wind = this.wind;
      let sec = 0;
      for (let i = 1; i < path.length; i++) {
        const len = dist(path[i - 1], path[i]);
        if (len < 1e-6) continue;
        const ux = (path[i].x - path[i - 1].x) / len;
        const uy = (path[i].y - path[i - 1].y) / len;
        const vg = M.groundSpeed(d.cruiseMs, wind, ux, uy);
        if (vg < 0.5) return null;
        sec += len / vg;
      }
      return { sec, wh: (power * sec) / 3600, m: pathLength(path) };
    }

    // Omborlar ichidan qaytish uchun eng tejamlisini tanlaymiz
    bestReturn(from) {
      let best = null;
      for (const h of this.cfg.hubs) {
        const p = this.path(from, h);
        if (!p) continue;
        const f = this.flight(p, this.spec.emptyKg);
        if (f && (!best || f.wh < best.f.wh)) best = { hub: h, path: p, f };
      }
      return best;
    }

    // Bir nechta buyurtmali parvoz rejasi (stops tartiblangan)
    planMission(hub, stops) {
      const d = this.spec;
      const rho = this.rho;
      let mass = d.emptyKg + stops.reduce((s, o) => s + o.kg, 0);
      const tasks = [];
      let wh = (M.hoverPower(d, mass, rho) * 1.1 * M.CLIMB_SEC) / 3600;
      let sec = M.CLIMB_SEC;
      let meters = 0;
      tasks.push({ kind: 'takeoff', dur: M.CLIMB_SEC });
      let cur = hub;
      for (const o of stops) {
        const p = this.path(cur, o);
        if (!p) return null;
        const f = this.flight(p, mass);
        if (!f) return null;
        tasks.push({ kind: 'outbound', path: p, orderId: o.id });
        wh += f.wh; sec += f.sec; meters += f.m;
        tasks.push({ kind: 'drop', dur: d.deliverySec, orderId: o.id });
        wh += (M.deliveryPower(d, mass, rho) * d.deliverySec) / 3600;
        sec += d.deliverySec;
        mass -= o.kg;
        cur = o;
      }
      const back = this.bestReturn(cur);
      if (!back) return null;
      tasks.push({ kind: 'return', path: back.path, hubId: back.hub.id });
      tasks.push({ kind: 'landing', dur: M.DESCENT_SEC, hubId: back.hub.id });
      wh += back.f.wh + (M.hoverPower(d, d.emptyKg, rho) * 0.9 * M.DESCENT_SEC) / 3600;
      sec += back.f.sec + M.DESCENT_SEC;
      meters += back.f.m;
      return { tasks, wh, sec, meters, returnHub: back.hub.id };
    }

    // Bitta buyurtma uchun baho (keshda saqlanadi, shamol/zona o'zgarsa yangilanadi)
    estimate(o, hub) {
      if (!o.est || o.est.v !== this.version) o.est = { v: this.version, byHub: {} };
      if (!(hub.id in o.est.byHub)) {
        const plan = this.planMission(hub, [o]);
        o.est.byHub[hub.id] = plan ? { wh: plan.wh, sec: plan.sec } : null;
      }
      return o.est.byHub[hub.id];
    }

    invalidate() {
      this.version++;
    }

    usable(drone) {
      return drone.battery - this.capacityWh * this.cfg.reserve;
    }

    // ----- Dispetcher -----

    dispatch() {
      if (this.drones.length > this.cfg.fleet) this.setFleet(this.cfg.fleet);
      const pending = this.orders.filter((o) => o.status === 'pending');
      if (!pending.length) return;
      const free = this.drones.filter((d) => d.state === 'idle' || d.state === 'charging');
      if (!free.length) return;
      const full = this.capacityWh * (1 - this.cfg.reserve);

      // Hech qachon bajarib bo'lmaydigan buyurtmalarni (masalan, shamol kuchaygani uchun) rad etamiz
      for (const o of pending) {
        if (!this.cfg.hubs.some((h) => { const e = this.estimate(o, h); return e && e.wh <= full; })) {
          this.reject(o, 'far');
        }
      }
      let queue = pending.filter((o) => o.status === 'pending');
      const strategy = this.cfg.strategy;
      if (strategy === 'priority') {
        queue.sort((a, b) => PRIORITY[a.priority].rank - PRIORITY[b.priority].rank || a.deadline - b.deadline);
      } else {
        queue.sort((a, b) => a.createdAt - b.createdAt);
      }

      if (strategy === 'nearest') {
        for (const drone of free) {
          const hub = this.hub(drone.hubId);
          let best = null;
          for (const o of queue) {
            if (o.status !== 'pending') continue;
            const e = this.estimate(o, hub);
            if (e && e.wh <= this.usable(drone) && (!best || e.sec < best.e.sec)) best = { o, e };
          }
          if (best) this.assign(drone, best.o);
        }
        return;
      }

      for (const o of queue) {
        if (o.status !== 'pending') continue;
        let best = null;
        for (const drone of free) {
          if (drone.state !== 'idle' && drone.state !== 'charging') continue;
          const e = this.estimate(o, this.hub(drone.hubId));
          if (e && e.wh <= this.usable(drone) && (!best || e.sec < best.e.sec || (e.sec === best.e.sec && drone.battery > best.drone.battery))) {
            best = { drone, e };
          }
        }
        if (best) this.assign(best.drone, o);
        if (!free.some((d) => d.state === 'idle' || d.state === 'charging')) break;
      }
    }

    assign(drone, first) {
      const hub = this.hub(drone.hubId);
      let stops = [first];
      let plan = this.planMission(hub, stops);
      if (!plan) return;
      const spec = this.spec;
      if (this.cfg.batching) {
        // Yaqin atrofdagi boshqa buyurtmalarni ham shu parvozga qo'shamiz
        const near = this.orders
          .filter((o) => o.status === 'pending' && o !== first && dist(o, first) < 2000)
          .sort((a, b) => dist(a, first) - dist(b, first));
        for (const o of near) {
          if (stops.length >= 4) break;
          const kg = stops.reduce((s, x) => s + x.kg, 0) + o.kg;
          if (kg > spec.maxPayloadKg) continue;
          const cand = orderStops(hub, stops.concat([o]));
          const p = this.planMission(hub, cand);
          // Hech bir buyurtma o'z muddatidan kechikib ketmasin
          if (p && p.wh <= this.usable(drone) && this.withinSla(p, cand)) { stops = cand; plan = p; }
        }
      }
      drone.plan = plan.tasks;
      drone.step = 0;
      drone.cargo = stops.map((o) => o.id);
      drone.returnHub = plan.returnHub;
      drone.missionWh = plan.wh;
      this.beginTask(drone);
      stops.forEach((o) => { o.status = 'assigned'; o.droneId = drone.id; o.assignedAt = this.t; });
      const what = stops.length > 1
        ? `${stops.length} ta buyurtma (#${stops.map((o) => o.id).join(', #')})`
        : `#${first.id} (${M.fmt(first.kg, 1)} kg, ${PRIORITY[first.priority].name.toLowerCase()})`;
      this.say(`${drone.name} ${what} ni oldi — ${M.fmt(plan.meters / 1000, 1)} km, ~${Math.round(plan.sec / 60)} daq`, 'go');
    }

    withinSla(plan, stops) {
      let t = this.t + M.CLIMB_SEC;
      let i = 0;
      for (const task of plan.tasks) {
        if (task.kind === 'outbound') {
          const f = this.flight(task.path, this.spec.emptyKg);
          t += f ? f.sec : 0;
        } else if (task.kind === 'drop') {
          t += task.dur;
          if (t > stops[i].deadline && stops[i].deadline > this.t + 60) return false;
          i++;
        }
      }
      return true;
    }

    // ----- Dron harakati -----

    beginTask(drone) {
      const task = drone.plan[drone.step];
      if (!task) return;
      drone.state = task.kind;
      if (task.dur) drone.timer = task.dur;
      if (task.path) { drone.path = task.path; drone.seg = 1; }
    }

    nextTask(drone) {
      drone.step++;
      if (drone.step >= drone.plan.length) {
        drone.plan = [];
        drone.path = null;
        if (this.cfg.energyMode === 'swap') {
          drone.state = 'swap';
          drone.timer = this.cfg.swapSec;
        } else {
          drone.state = drone.battery < this.capacityWh - 0.5 ? 'charging' : 'idle';
        }
        return;
      }
      this.beginTask(drone);
    }

    cargoKg(drone) {
      return drone.cargo.reduce((s, id) => {
        const o = this.orders[id - 1];
        return s + (o && o.status === 'assigned' ? o.kg : 0);
      }, 0);
    }

    stepDrone(drone, dt) {
      const d = this.spec;
      const rho = this.rho;
      const mass = d.emptyKg + this.cargoKg(drone);
      let power = 0;
      switch (drone.state) {
        case 'idle':
        case 'charging': {
          if (this.cfg.energyMode === 'charge') {
            const cap = this.capacityWh;
            drone.battery = Math.min(cap, drone.battery + (d.batteryWh * this.cfg.chargeC * dt) / 3600);
            drone.state = drone.battery < cap - 0.5 ? 'charging' : 'idle';
          }
          return;
        }
        case 'swap': {
          drone.timer -= dt;
          if (drone.timer <= 0) { drone.battery = this.capacityWh; drone.state = 'idle'; }
          return;
        }
        case 'lost':
          return;
        case 'takeoff':
          power = M.hoverPower(d, mass, rho) * 1.1;
          break;
        case 'landing':
          power = M.hoverPower(d, mass, rho) * 0.9;
          break;
        case 'drop':
          power = M.deliveryPower(d, mass, rho);
          break;
        default:
          power = M.cruisePower(d, mass, d.cruiseMs, rho);
      }

      drone.battery -= (power * dt) / 3600;
      drone.flightSec += dt;
      this.stats.flightSec += dt;
      this.stats.energyWh += (power * dt) / 3600;

      if (drone.battery <= 0) {
        drone.battery = 0;
        this.crash(drone);
        return;
      }

      if (drone.state === 'outbound' || drone.state === 'return') {
        this.move(drone, dt);
        return;
      }
      drone.timer -= dt;
      if (drone.timer > 0) return;
      const task = drone.plan[drone.step];
      if (task.kind === 'drop') this.deliver(drone, task.orderId);
      if (task.kind === 'landing') {
        drone.hubId = task.hubId;
        const h = this.hub(task.hubId);
        drone.x = h.x; drone.y = h.y;
      }
      this.nextTask(drone);
    }

    move(drone, dt) {
      const spec = this.spec;
      const wind = this.wind;
      let left = dt;
      while (left > 1e-9 && drone.path && drone.seg < drone.path.length) {
        const target = drone.path[drone.seg];
        const dx = target.x - drone.x;
        const dy = target.y - drone.y;
        const len = Math.hypot(dx, dy);
        if (len < 0.01) { drone.seg++; continue; }
        const ux = dx / len;
        const uy = dy / len;
        drone.heading = Math.atan2(uy, ux);
        const vg = Math.max(0.5, M.groundSpeed(spec.cruiseMs, wind, ux, uy));
        const step = vg * left;
        if (step >= len) {
          drone.x = target.x; drone.y = target.y;
          this.stats.distanceM += len;
          left -= len / vg;
          drone.seg++;
        } else {
          drone.x += ux * step; drone.y += uy * step;
          this.stats.distanceM += step;
          left = 0;
        }
      }
      if (!drone.path || drone.seg >= drone.path.length) this.nextTask(drone);
    }

    deliver(drone, orderId) {
      const o = this.orders[orderId - 1];
      if (!o || o.status !== 'assigned') return;
      o.status = 'delivered';
      o.deliveredAt = this.t;
      o.closedAt = this.t;
      const min = (o.deliveredAt - o.createdAt) / 60;
      this.stats.delivered++;
      this.stats.sumMin += min;
      const onTime = o.deliveredAt <= o.deadline;
      if (onTime) this.stats.onTime++;
      o.late = !onTime;
      drone.deliveries++;
      const hub = this.hub(drone.hubId);
      const e = M.DEFAULT_ECON;
      this.stats.carKm += (2 * dist(hub, o) / 1000 * e.roadFactor) / e.carStopsPerTrip;
      this.say(`#${o.id} yetkazildi — ${Math.round(min)} daq${onTime ? '' : ' (kechikdi)'}`, onTime ? 'ok' : 'late');
    }

    crash(drone) {
      drone.state = 'lost';
      drone.plan = [];
      drone.path = null;
      this.stats.lost++;
      drone.cargo.forEach((id) => {
        const o = this.orders[id - 1];
        if (o && o.status === 'assigned') { o.status = 'failed'; o.closedAt = this.t; this.stats.failed++; }
      });
      this.say(`${drone.name} batareyasi tugadi va favqulodda qo'ndi. Shamol yoki yuk rejadagidan og'ir bo'ldi.`, 'bad');
    }

    // ----- Asosiy sikl -----

    step(dt) {
      let left = dt;
      while (left > 0) {
        const h = Math.min(1, left);
        this.t += h;
        left -= h;
        while (this.t >= this.nextOrderAt) {
          const p = this.randomPoint();
          if (p) this.addOrder(p.x, p.y, this.randomWeight(), this.randomPriority(), p.place);
          this.scheduleNextOrder();
        }
        for (const d of this.drones) this.stepDrone(d, h);
        this.dispatchTimer -= h;
        if (this.dispatchTimer <= 0) {
          this.dispatch();
          this.dispatchTimer = 5;
        }
      }
    }

    // ----- Xarita bilan ishlash -----

    addZone(x, y, r, name) {
      const z = { id: 'z' + this.nextId++, x, y, r, name: name || 'Taqiqlangan zona' };
      if (this.cfg.hubs.some((h) => dist(h, z) < r + 150)) return { error: "Zona omborni yopib qo'yadi — boshqa joy tanlang" };
      this.cfg.zones.push(z);
      this.rebuild();
      this.orders.forEach((o) => { if (o.status === 'pending' && inZone(this.cfg.zones, o)) this.reject(o, 'zone'); });
      this.say(`Yangi taqiqlangan zona: ${z.name}, radiusi ${M.fmt(r / 1000, 1)} km`, 'info');
      return { zone: z };
    }

    addHub(x, y) {
      if (this.cfg.hubs.length >= 4) return { error: "Ko'pi bilan 4 ta ombor qo'yish mumkin" };
      if (inZone(this.cfg.zones, { x, y })) return { error: "Omborni taqiqlangan zonaga qo'yib bo'lmaydi" };
      const n = this.cfg.hubs.length + 1;
      const h = { id: 'h' + this.nextId++, name: n + '-ombor', x, y };
      this.cfg.hubs.push(h);
      this.invalidate();
      this.say(`Yangi ombor ochildi: ${h.name}`, 'info');
      return { hub: h };
    }

    removeNear(x, y, radius) {
      const p = { x, y };
      const zone = this.cfg.zones.find((z) => dist(z, p) < Math.max(radius, z.r));
      const hub = this.cfg.hubs.find((h) => dist(h, p) < radius * 1.5);
      const order = this.orders.find((o) => o.status === 'pending' && dist(o, p) < radius);
      if (order) {
        order.status = 'cancelled';
        order.closedAt = this.t;
        this.say(`#${order.id} bekor qilindi`, 'info');
        return 'order';
      }
      if (hub) {
        if (this.cfg.hubs.length === 1) return { error: "Oxirgi omborni o'chirib bo'lmaydi" };
        if (this.drones.some((d) => d.hubId === hub.id && !['idle', 'charging', 'swap', 'lost'].includes(d.state))) {
          return { error: 'Bu omborga dron qaytib kelmoqda — keyinroq urinib ko\'ring' };
        }
        this.cfg.hubs = this.cfg.hubs.filter((h) => h !== hub);
        const home = this.cfg.hubs[0];
        this.drones.forEach((d) => {
          if (d.hubId === hub.id) { d.hubId = home.id; d.x = home.x; d.y = home.y; }
        });
        this.invalidate();
        this.say(`${hub.name} yopildi, dronlari ${home.name}ga o'tdi`, 'info');
        return 'hub';
      }
      if (zone) {
        this.cfg.zones = this.cfg.zones.filter((z) => z !== zone);
        this.rebuild();
        this.say(`${zone.name} olib tashlandi`, 'info');
        return 'zone';
      }
      return null;
    }

    set(key, value) {
      this.cfg[key] = value;
      if (['windMs', 'windFromDeg', 'tempC'].includes(key)) this.invalidate();
      if (key === 'ordersPerHour') this.scheduleNextOrder();
      if (key === 'fleet') this.setFleet(value);
      if (key === 'tempC') this.drones.forEach((d) => { d.battery = Math.min(d.battery, this.capacityWh); });
      if (key === 'energyMode') {
        this.drones.forEach((d) => {
          if (value === 'swap' && (d.state === 'idle' || d.state === 'charging') && d.battery < this.capacityWh - 0.5) {
            d.state = 'swap';
            d.timer = this.cfg.swapSec;
          }
          if (value === 'charge' && d.state === 'swap') d.state = 'charging';
        });
      }
    }

    // ----- Natijalar -----

    summary() {
      const s = this.stats;
      const spec = this.spec;
      const e = M.DEFAULT_ECON;
      const hours = this.t / 3600;
      const flightH = s.flightSec / 3600;
      const cost = (s.energyWh / 1000 / e.chargeEff) * e.tariffSom
        + flightH * (spec.priceSom / spec.lifeHours + e.maintenancePerHourSom)
        + (s.energyWh / spec.batteryWh / spec.batteryCycles) * spec.batteryPriceSom
        + (hours * this.drones.length * (e.operatorSalarySom / e.dronesPerOperator + e.fixedMonthlySom)) / (e.workDays * e.workHours);
      const open = this.orders.filter((o) => o.status === 'pending' || o.status === 'assigned');
      const pending = open.filter((o) => o.status === 'pending').length;
      // Hali yetkazilmagan, lekin muddati o'tib ketganlar ham kechikkan hisoblanadi
      const overdue = open.filter((o) => o.deadline < this.t).length;
      const due = s.delivered + s.failed + overdue;
      const flying = this.drones.filter((d) => !['idle', 'charging', 'swap', 'lost'].includes(d.state)).length;
      const carCo2 = (s.carKm * e.carLPer100 / 100) * e.petrolCo2;
      const droneCo2 = (s.energyWh / 1000 / e.chargeEff) * e.gridCo2;
      return {
        hours,
        created: s.created,
        delivered: s.delivered,
        onTimePct: due ? (100 * s.onTime) / due : 100,
        late: s.delivered - s.onTime,
        overdue,
        avgMin: s.delivered ? s.sumMin / s.delivered : 0,
        pending,
        rejected: s.rejected,
        reasons: Object.assign({}, s.reasons),
        failed: s.failed,
        lost: s.lost,
        flying,
        utilPct: this.drones.length && this.t ? (100 * s.flightSec) / (this.drones.length * this.t) : 0,
        distanceKm: s.distanceM / 1000,
        energyKwh: s.energyWh / 1000,
        whPerDelivery: s.delivered ? s.energyWh / s.delivered : 0,
        costPerDelivery: s.delivered ? cost / s.delivered : 0,
        co2SavedKg: carCo2 - droneCo2,
      };
    }
  }

  // Tajriba: simulyatsiyani ekranga chizmasdan tez yuritish
  function run(config, hours) {
    const sim = new Sim(config);
    sim.step(hours * 3600);
    return sim.summary();
  }

  return {
    Sim, run, DEFAULTS, PRIORITY, STATE_NAMES, STRATEGIES,
    buildGraph, findPath, segmentClear, inZone, orderStops, pathLength, rng,
  };
});
