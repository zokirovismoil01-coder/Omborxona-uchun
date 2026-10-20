(function () {
  'use strict';

  const M = window.DronModel;
  const S = window.DronSim;
  const C = window.DronContent;
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = 'dron-logistika-lab-v1';
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const fmt = M.fmt;

  // ---------- Saqlash (faqat shu qurilmada) ----------

  const store = (function () {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      return {};
    }
  })();

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch (e) { /* xotira yopiq bo'lsa ham ilova ishlayveradi */ }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  let toastTimer = null;
  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
  }

  function clock(t) {
    const total = Math.floor(8 * 3600 + t);
    const day = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    return { text: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'), day };
  }

  function modelName(id) {
    if (id === 'custom') return (store.custom && store.custom.name) || 'Mening dronim';
    return M.PRESETS[id] ? M.PRESETS[id].name : id;
  }

  // ---------- Bo'limlar ----------

  const TABS = ['tuzilish', 'sim', 'tajriba', 'hisob', 'organish'];
  let currentTab = 'tuzilish';

  function showTab(name) {
    if (!TABS.includes(name)) name = 'tuzilish';
    currentTab = name;
    TABS.forEach((t) => {
      $('view-' + t).hidden = t !== name;
      $('tabbtn-' + t).setAttribute('aria-selected', String(t === name));
    });
    try { history.replaceState(null, '', '#' + name); } catch (e) { /* ko'rinishga ta'sir qilmaydi */ }
    document.dispatchEvent(new CustomEvent('dron:tab', { detail: name }));
    if (name === 'sim') resizeMap();
    if (name === 'hisob') renderCalc();
    if (name === 'tajriba') renderExpBase();
  }

  document.querySelectorAll('.tab').forEach((b) => {
    b.addEventListener('click', () => showTab(b.dataset.tab));
  });

  // =====================================================================
  // SIMULYATOR
  // =====================================================================

  let scenario = null;
  let sim = null;
  let running = false;
  let speed = store.speed || 30;
  let tool = 'order';
  let selected = null;
  let showRadius = true;

  function scenarioById(id) {
    return C.SCENARIOS.find((s) => s.id === id) || C.SCENARIOS[0];
  }

  function makeSim(cfg) {
    if (cfg.model === 'custom') {
      if (store.custom) cfg.custom = store.custom;
      else cfg.model = 'cargo';
    }
    sim = new S.Sim(cfg);
    selected = null;
    radiusCache = null;
    lastLogLen = -1;
  }

  function loadScenario(id) {
    scenario = scenarioById(id);
    store.scenario = scenario.id;
    save();
    makeSim(clone(scenario.config));
    terrain = null;
    $('scenario').value = scenario.id;
    $('goal').textContent = scenario.goal;
    syncForm();
    resizeMap();
    renderPanels(true);
  }

  function restartSim(note) {
    const cfg = clone(sim.cfg);
    cfg.seed = (cfg.seed || 1) + 1;
    makeSim(cfg);
    renderPanels(true);
    if (note) toast(note);
  }

  // ----- Sozlamalar formasi -----

  function fillModelSelect(sel, withCustom) {
    const ids = Object.keys(M.PRESETS);
    if (withCustom && store.custom) ids.push('custom');
    sel.innerHTML = ids.map((id) => `<option value="${id}">${esc(modelName(id))}</option>`).join('');
  }

  function syncForm() {
    const c = sim.cfg;
    fillModelSelect($('model'), true);
    $('model').value = c.model;
    $('modelNote').textContent = sim.spec.note || '';
    $('fleet').value = c.fleet;
    $('rate').value = c.ordersPerHour;
    $('strategy').value = c.strategy;
    $('energy').value = c.energyMode;
    $('batching').checked = !!c.batching;
    $('wind').value = c.windMs;
    $('windDir').value = String(c.windFromDeg);
    $('temp').value = c.tempC;
    $('orderKg').max = sim.spec.maxPayloadKg * 2;
    syncOutputs();
  }

  function syncOutputs() {
    const c = sim.cfg;
    $('fleetOut').textContent = sim.drones.length > c.fleet ? `${c.fleet} ta (${sim.drones.length - c.fleet} tasi qaytmoqda)` : c.fleet + ' ta';
    $('rateOut').textContent = c.ordersPerHour + ' ta/soat';
    $('windOut').textContent = c.windMs + ' m/s';
    $('tempOut').textContent = (c.tempC > 0 ? '+' : '') + c.tempC + '°C';
    $('windText').textContent = c.windMs + ' m/s';
    $('windArrow').style.transform = `rotate(${(c.windFromDeg + 180) % 360}deg)`;
  }

  $('strategy').innerHTML = Object.entries(S.STRATEGIES).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  $('scenario').innerHTML = C.SCENARIOS.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('');

  $('scenario').addEventListener('change', (e) => loadScenario(e.target.value));
  $('model').addEventListener('change', (e) => {
    const cfg = clone(sim.cfg);
    cfg.model = e.target.value;
    makeSim(cfg);
    syncForm();
    renderPanels(true);
    toast(`Model: ${modelName(cfg.model)}. Simulyatsiya qaytadan boshlandi.`);
  });
  $('fleet').addEventListener('input', (e) => { sim.set('fleet', +e.target.value); syncOutputs(); renderPanels(true); });
  $('rate').addEventListener('input', (e) => { sim.set('ordersPerHour', +e.target.value); syncOutputs(); });
  $('strategy').addEventListener('change', (e) => sim.set('strategy', e.target.value));
  $('energy').addEventListener('change', (e) => { sim.set('energyMode', e.target.value); renderPanels(true); });
  $('batching').addEventListener('change', (e) => sim.set('batching', e.target.checked));
  $('wind').addEventListener('input', (e) => { sim.set('windMs', +e.target.value); radiusCache = null; syncOutputs(); });
  $('windDir').addEventListener('change', (e) => { sim.set('windFromDeg', +e.target.value); syncOutputs(); });
  $('temp').addEventListener('input', (e) => { sim.set('tempC', +e.target.value); radiusCache = null; syncOutputs(); });
  $('showRadius').addEventListener('change', (e) => { showRadius = e.target.checked; });

  // ----- Boshqaruv -----

  function setRunning(on) {
    running = on;
    $('playBtn').textContent = on ? 'Pauza' : (sim.t > 0 ? 'Davom etish' : 'Boshlash');
    $('hudState').textContent = on ? speed + '× tezlik' : "to'xtatilgan";
  }

  function setSpeed(v) {
    speed = v;
    store.speed = v;
    save();
    document.querySelectorAll('#speedSeg button').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.speed === v)));
    if (running) $('hudState').textContent = speed + '× tezlik';
  }

  const TOOL_HINTS = {
    order: "Xaritaga bosing — shu joyga buyurtma tushadi. Dronga bosib, uni tanlashingiz mumkin.",
    zone: "Xaritaga bosing — u yerda uchish taqiqlanadi. Dronlar zonani aylanib o'tadi.",
    hub: "Xaritaga bosing — yangi ombor ochiladi (4 tagacha). Dronlar eng yaqin omborga qaytadi.",
    erase: "Buyurtma, zona yoki omborga bosing — u olib tashlanadi.",
  };

  function setTool(t) {
    tool = t;
    document.querySelectorAll('#toolSeg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tool === t)));
    $('optOrder').hidden = t !== 'order';
    $('optZone').hidden = t !== 'zone';
    $('toolHint').textContent = TOOL_HINTS[t];
  }

  $('playBtn').addEventListener('click', () => setRunning(!running));
  $('resetBtn').addEventListener('click', () => { restartSim('Yangi ish kuni boshlandi — sozlamalar va xaritadagi o\'zgarishlar saqlandi.'); setRunning(running); });
  document.querySelectorAll('#speedSeg button').forEach((b) => b.addEventListener('click', () => setSpeed(+b.dataset.speed)));
  document.querySelectorAll('#toolSeg button').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));

  // ----- Xarita chizish -----

  const canvas = $('map');
  const ctx = canvas.getContext('2d');
  let W = 0;
  let dpr = 1;
  let scale = 1;
  let terrain = null;
  let colors = {};
  let radiusCache = null;

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    ['map', 'map-grid', 'map-label', 'water', 'road', 'park', 'ink', 'muted', 'accent', 'drone', 'zone', 'ok', 'warn', 'bad', 'surface', 'line', 'font-display', 'font-mono']
      .forEach((k) => { colors[k] = cs.getPropertyValue('--' + k).trim(); });
  }

  function resizeMap() {
    if (!sim) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    if (!rect.width) return;
    W = Math.round(rect.width);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(W * dpr);
    scale = W / sim.cfg.size;
    terrain = null;
  }

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // Shahar fonini bir marta chizib, keyin nusxasini ishlatamiz
  function buildTerrain() {
    const size = sim.cfg.size;
    const off = document.createElement('canvas');
    off.width = canvas.width;
    off.height = canvas.height;
    const g = off.getContext('2d');
    g.scale(dpr, dpr);
    const k = scale;
    const r = S.rng(hash(scenario.id));
    g.fillStyle = colors.map;
    g.fillRect(0, 0, W, W);

    // Bog'lar va dalalar
    g.fillStyle = colors.park;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.ellipse(r() * W, r() * W, (0.03 + r() * 0.05) * W, (0.02 + r() * 0.04) * W, r() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    // Daryo yoki kanal
    g.strokeStyle = colors.water;
    g.lineWidth = Math.max(4, size * 0.014 * k);
    g.lineCap = 'round';
    g.beginPath();
    const y0 = 0.3 + r() * 0.4;
    const amp = 0.06 + r() * 0.06;
    const ph = r() * 6;
    for (let i = 0; i <= 40; i++) {
      const x = i / 40;
      const y = y0 + amp * Math.sin(x * 5 + ph) + 0.15 * (x - 0.5);
      if (i) g.lineTo(x * W, y * W); else g.moveTo(x * W, y * W);
    }
    g.stroke();
    // Yo'llar: halqa va radial ko'chalar
    const hub = sim.cfg.hubs[0];
    const cx = (hub ? hub.x : size / 2) * k;
    const cy = (hub ? hub.y : size / 2) * k;
    g.strokeStyle = colors.road;
    g.lineWidth = Math.max(2.5, W * 0.006);
    g.beginPath();
    g.arc(cx, cy, W * 0.3, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + r() * 0.4;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * W * 1.5, cy + Math.sin(a) * W * 1.5);
      g.stroke();
    }
    g.lineWidth = 1;
    // Kilometr to'ri
    const step = size <= 20000 ? 1000 : 5000;
    g.strokeStyle = colors['map-grid'];
    g.beginPath();
    for (let v = step; v < size; v += step) {
      const p = Math.round(v * k) + 0.5;
      g.moveTo(p, 0); g.lineTo(p, W);
      g.moveTo(0, p); g.lineTo(W, p);
    }
    g.stroke();
    g.fillStyle = colors['map-label'];
    g.font = `10px ${colors['font-mono']}`;
    g.textBaseline = 'top';
    const every = size <= 14000 ? 2 : size <= 20000 ? 4 : 2;
    for (let v = step * every; v < size; v += step * every) {
      g.fillText(fmt(v / 1000) + ' km', v * k + 3, W - 14);
    }
    terrain = off;
  }

  function haloText(text, x, y, color, font) {
    ctx.font = font;
    ctx.lineWidth = 3;
    ctx.strokeStyle = colors.map;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function hubRadius() {
    if (radiusCache && radiusCache.v === sim.version) return radiusCache.m;
    const spec = sim.spec;
    const trip = M.roundTrip(spec, {
      payloadKg: Math.min(1, spec.maxPayloadKg), tempC: sim.cfg.tempC, altitudeM: sim.cfg.altitudeM,
      reserve: sim.cfg.reserve, windAlong: sim.cfg.windMs,
    });
    radiusCache = { v: sim.version, m: trip.radiusKm * 1000 };
    return radiusCache.m;
  }

  function drawDrone(d, x, y) {
    const lost = d.state === 'lost';
    const col = lost ? colors.bad : colors.drone;
    ctx.save();
    ctx.translate(x, y);
    if (d.id === selected) {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.rotate(d.heading + Math.PI / 2);
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 2;
    if (sim.spec.type === 'vtol') {
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(0, 8);
      ctx.moveTo(-10, -1); ctx.lineTo(10, -1);
      ctx.moveTo(-4, 7); ctx.lineTo(4, 7);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
      ctx.moveTo(6, -6); ctx.lineTo(-6, 6);
      ctx.stroke();
      ctx.lineWidth = 1.4;
      [[-6, -6], [6, -6], [-6, 6], [6, 6]].forEach(([px, py]) => {
        ctx.beginPath();
        ctx.arc(px, py, 3.4, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(0, -5); ctx.lineTo(3, 1); ctx.lineTo(-3, 1); ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // Batareya
    const pct = d.battery / sim.capacityWh;
    ctx.fillStyle = colors.line;
    ctx.fillRect(x - 8, y + 11, 16, 3);
    ctx.fillStyle = pct < 0.3 ? colors.bad : pct < 0.55 ? colors.warn : colors.ok;
    ctx.fillRect(x - 8, y + 11, 16 * Math.max(0, Math.min(1, pct)), 3);
    if (lost) haloText('×', x - 4, y - 10, colors.bad, `700 14px ${colors['font-mono']}`);
  }

  function drawOrder(o) {
    const x = o.x * scale;
    const y = o.y * scale;
    const col = o.priority === 'medical' ? colors.bad : o.priority === 'express' ? colors.warn : colors.ink;
    if (o.status === 'delivered') {
      const age = sim.t - o.deliveredAt;
      ctx.globalAlpha = Math.max(0, 1 - age / 240);
      ctx.strokeStyle = colors.ok;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 4, y); ctx.lineTo(x - 1, y + 3); ctx.lineTo(x + 5, y - 4);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    if (o.status === 'rejected' || o.status === 'failed') {
      ctx.globalAlpha = Math.max(0, 1 - (sim.t - o.closedAt) / 240);
      ctx.strokeStyle = colors.bad;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - 3.5, y - 3.5); ctx.lineTo(x + 3.5, y + 3.5);
      ctx.moveTo(x + 3.5, y - 3.5); ctx.lineTo(x - 3.5, y + 3.5);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    const late = sim.t > o.deadline;
    ctx.beginPath();
    ctx.arc(x, y, 4.6, 0, Math.PI * 2);
    if (o.status === 'assigned') {
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = col;
      ctx.fill();
      if (late) {
        ctx.strokeStyle = colors.bad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, y, 7.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (o.priority === 'medical' && o.status === 'pending') {
      ctx.strokeStyle = colors.map;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 2.6, y); ctx.lineTo(x + 2.6, y);
      ctx.moveTo(x, y - 2.6); ctx.lineTo(x, y + 2.6);
      ctx.stroke();
    }
  }

  function draw() {
    if (!W || !sim) return;
    if (!terrain) buildTerrain();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(terrain, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const k = scale;
    const display = colors['font-display'];
    const mono = colors['font-mono'];

    // Doimiy manzillar (poliklinikalar)
    if (sim.cfg.destinations) {
      sim.cfg.destinations.forEach((p) => {
        const x = p.x * k;
        const y = p.y * k;
        ctx.strokeStyle = colors.muted;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x - 4, y - 4, 8, 8);
        haloText(p.name, x + 7, y - 6, colors.muted, `500 11px ${display}`);
      });
    }

    // Taqiqlangan zonalar: aeronavigatsiya xaritasidagi kabi ichki shtrixli chegara
    sim.cfg.zones.forEach((z) => {
      const x = z.x * k;
      const y = z.y * k;
      const r = z.r * k;
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = colors.zone;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colors.zone;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      const n = Math.max(16, Math.floor((2 * Math.PI * r) / 7));
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
        ctx.lineTo(x + Math.cos(a) * (r - 6), y + Math.sin(a) * (r - 6));
      }
      ctx.stroke();
      ctx.textAlign = 'center';
      haloText(z.name.toUpperCase(), x, y + 4, colors.zone, `600 11px ${display}`);
      ctx.textAlign = 'left';
    });

    // Yetkazish radiusi
    if (showRadius) {
      const rr = hubRadius() * k;
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = colors.accent;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.2;
      sim.cfg.hubs.forEach((h) => {
        ctx.beginPath();
        ctx.arc(h.x * k, h.y * k, rr, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    // Uchayotgan dronlarning qolgan yo'li
    sim.drones.forEach((d) => {
      if (!d.path || (d.state !== 'outbound' && d.state !== 'return')) return;
      ctx.setLineDash(d.state === 'return' ? [2, 4] : [5, 4]);
      ctx.strokeStyle = d.state === 'return' ? colors.muted : colors.accent;
      ctx.lineWidth = d.id === selected ? 2 : 1.3;
      ctx.beginPath();
      ctx.moveTo(d.x * k, d.y * k);
      for (let i = d.seg; i < d.path.length; i++) ctx.lineTo(d.path[i].x * k, d.path[i].y * k);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Buyurtmalar
    for (let i = sim.orders.length - 1; i >= 0; i--) {
      const o = sim.orders[i];
      if (o.closedAt != null && sim.t - o.closedAt > 240) continue;
      if (o.status === 'cancelled') continue;
      drawOrder(o);
    }

    // Omborlar
    sim.cfg.hubs.forEach((h) => {
      const x = h.x * k;
      const y = h.y * k;
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.moveTo(x - 9, y + 7); ctx.lineTo(x - 9, y - 3); ctx.lineTo(x, y - 10); ctx.lineTo(x + 9, y - 3); ctx.lineTo(x + 9, y + 7);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = colors.map;
      ctx.fillRect(x - 3, y, 6, 7);
      ctx.textAlign = 'center';
      haloText(h.name, x, y + 22, colors.accent, `600 12px ${display}`);
      ctx.textAlign = 'left';
    });

    // Dronlar (omborda turganlari ombor atrofida aylana bo'ylab)
    const atHub = {};
    sim.drones.forEach((d) => {
      let x = d.x * k;
      let y = d.y * k;
      if (d.state === 'idle' || d.state === 'charging' || d.state === 'swap') {
        const n = (atHub[d.hubId] = (atHub[d.hubId] || 0) + 1) - 1;
        const a = -Math.PI / 2 + n * 0.9;
        const rad = 22 + 8 * Math.floor(n / 7);
        x += Math.cos(a) * rad;
        y += Math.sin(a) * rad;
      }
      d._sx = x;
      d._sy = y;
      drawDrone(d, x, y);
      if (d.id === selected) haloText(d.name, x + 12, y - 8, colors.ink, `500 11px ${mono}`);
    });

    // Masshtab
    const sizeKm = sim.cfg.size / 1000;
    const barKm = sizeKm <= 14 ? 2 : sizeKm <= 24 ? 5 : 10;
    const bx = 12;
    const by = W - 30;
    ctx.fillStyle = colors.ink;
    ctx.fillRect(bx, by, barKm * 1000 * k, 2);
    ctx.fillRect(bx, by - 4, 1.5, 6);
    ctx.fillRect(bx + barKm * 1000 * k - 1.5, by - 4, 1.5, 6);
    haloText(barKm + ' km', bx, by - 8, colors.ink, `500 10px ${mono}`);
  }

  // ----- Xaritaga bosish -----

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = (px / rect.width) * sim.cfg.size;
    const y = (py / rect.height) * sim.cfg.size;
    const pxToM = sim.cfg.size / rect.width;

    // Dronni tanlash
    const hit = sim.drones.find((d) => d._sx != null && Math.hypot(d._sx - px, d._sy - py) < 14);
    if (hit && tool !== 'erase') {
      selected = selected === hit.id ? null : hit.id;
      renderPanels(true);
      return;
    }
    if (tool === 'order') {
      const kg = Math.max(0.1, parseFloat($('orderKg').value) || 1);
      const o = sim.addOrder(x, y, kg, $('orderPriority').value);
      if (o.status === 'rejected') {
        toast({
          heavy: `Rad etildi: ${fmt(kg, 1)} kg — bu dron ko'pi bilan ${fmt(sim.spec.maxPayloadKg, 1)} kg ko'taradi.`,
          far: 'Rad etildi: juda uzoq, dron borib qaytishga batareya yetmaydi.',
          zone: "Rad etildi: bu joy taqiqlangan zonada.",
        }[o.reason]);
      } else {
        toast(`Buyurtma #${o.id} qo'shildi: ${fmt(kg, 1)} kg`);
      }
    } else if (tool === 'zone') {
      const res = sim.addZone(x, y, +$('zoneR').value);
      if (res.error) toast(res.error);
      else radiusCache = null;
    } else if (tool === 'hub') {
      const res = sim.addHub(x, y);
      if (res.error) toast(res.error);
    } else if (tool === 'erase') {
      const res = sim.removeNear(x, y, 22 * pxToM);
      if (res && res.error) toast(res.error);
      else if (!res) toast("Bu yerda o'chiradigan narsa yo'q");
    }
    renderPanels(true);
  });

  // ----- Ko'rsatkichlar, dronlar ro'yxati, jurnal -----

  let lastLogLen = -1;

  function kpi(label, value, sub, state) {
    return `<div class="kpi"><span class="kpi-label">${state ? `<i class="dot ${state}"></i>` : ''}${label}</span>
      <span class="kpi-value">${value}</span><span class="kpi-sub">${sub}</span></div>`;
  }

  function renderPanels(force) {
    if (!sim) return;
    const s = sim.summary();
    const c = clock(sim.t);
    $('clock').textContent = (c.day ? c.day + 1 + '-kun ' : '') + c.text;
    if (!running) $('playBtn').textContent = sim.t > 0 ? 'Davom etish' : 'Boshlash';

    const due = s.delivered + s.overdue + s.failed;
    const onState = due < 3 ? '' : s.onTimePct >= 90 ? 'ok' : s.onTimePct >= 70 ? 'warn' : 'bad';
    const fleet = sim.drones.length;
    const qState = s.pending > fleet * 3 ? 'bad' : s.pending > fleet ? 'warn' : 'ok';
    $('kpis').innerHTML = [
      kpi('Yetkazildi', fmt(s.delivered), `${fmt(s.created)} ta buyurtmadan`),
      kpi("O'z vaqtida", due ? fmt(s.onTimePct) + '<small>%</small>' : '—', `${s.late} kechikdi, ${s.overdue} muddati o'tgan`, onState),
      kpi("O'rtacha vaqt", s.delivered ? fmt(s.avgMin, 1) + '<small>daq</small>' : '—', "buyurtmadan qo'lga tekkunicha"),
      kpi('Navbatda', fmt(s.pending), `${s.flying} ta dron havoda`, qState),
      kpi('Bandlik', fmt(s.utilPct) + '<small>%</small>', 'dron vaqtining parvozdagi ulushi'),
      kpi('Narx / yetkazish', s.delivered ? fmt(s.costPerDelivery / 1000, 1) + "<small>ming so'm</small>" : '—', s.delivered ? `${fmt(s.whPerDelivery)} Wh energiya` : 'hali yetkazish yo\'q'),
      kpi('CO₂ tejaldi', fmt(Math.max(0, s.co2SavedKg), 1) + '<small>kg</small>', 'benzinli kuryerga nisbatan'),
      kpi('Rad etildi', fmt(s.rejected), `og'ir ${s.reasons.heavy}, uzoq ${s.reasons.far}, zonada ${s.reasons.zone}`, s.lost ? 'bad' : ''),
    ].join('');
    $('kpiNote').textContent = `Uchilgan masofa: ${fmt(s.distanceKm, 1)} km, energiya: ${fmt(s.energyKwh, 2)} kVt·soat, favqulodda qo'nish: ${s.lost}.`;

    // Dronlar
    const cap = sim.capacityWh;
    $('fleetList').innerHTML = sim.drones.map((d) => {
      const pct = Math.max(0, Math.min(100, (d.battery / cap) * 100));
      const cls = pct < 30 ? 'bad' : pct < 55 ? 'warn' : '';
      const cargo = d.cargo.filter((id) => sim.orders[id - 1] && sim.orders[id - 1].status === 'assigned');
      const extra = cargo.length ? `<small>yukda: #${cargo.join(', #')}</small>` : `<small>${d.deliveries} ta yetkazdi</small>`;
      return `<li data-id="${d.id}" class="${d.id === selected ? 'sel' : ''}">
        <span class="d-name">${d.name}</span>
        <span class="d-state"><span>${esc(S.STATE_NAMES[d.state] || d.state)}</span>${extra}</span>
        <span class="batt">${fmt(pct)}%<span class="batt-bar"><i class="${cls}" style="width:${pct}%"></i></span></span>
      </li>`;
    }).join('');

    // Jurnal
    if (force || sim.log.length !== lastLogLen) {
      lastLogLen = sim.log.length;
      const items = sim.log.slice(-40).reverse();
      $('log').innerHTML = items.length
        ? items.map((l) => `<li class="k-${l.kind}"><time>${clock(l.t).text}</time><i class="dot"></i><span>${esc(l.text)}</span></li>`).join('')
        : '<li><time></time><i class="dot"></i><span>«Boshlash» tugmasini bosing — buyurtmalar tusha boshlaydi.</span></li>';
    }
    syncOutputs();
  }

  $('fleetList').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const id = +li.dataset.id;
    selected = selected === id ? null : id;
    renderPanels(true);
  });

  // ----- Asosiy sikl -----

  let lastFrame = performance.now();
  let uiTimer = 0;

  function frame(now) {
    const dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    if (running) sim.step(dt * speed);
    if (currentTab === 'sim' && !document.hidden) {
      draw();
      uiTimer -= dt;
      if (uiTimer <= 0) {
        renderPanels(false);
        uiTimer = 0.3;
      }
    }
    requestAnimationFrame(frame);
  }

  // =====================================================================
  // TAJRIBA
  // =====================================================================

  const VARS = {
    fleet: { label: 'Dronlar soni', type: 'num', from: 2, to: 8, step: 1, min: 1, max: 30, fmt: (v) => v + ' ta' },
    ordersPerHour: { label: 'Buyurtmalar oqimi', type: 'num', from: 10, to: 50, step: 10, min: 0, max: 150, fmt: (v) => v + '/soat' },
    windMs: { label: 'Shamol tezligi', type: 'num', from: 0, to: 12, step: 3, min: 0, max: 20, fmt: (v) => v + ' m/s' },
    tempC: { label: 'Havo harorati', type: 'num', from: -10, to: 40, step: 10, min: -30, max: 50, fmt: (v) => v + '°C' },
    strategy: { label: 'Dispetcher strategiyasi', type: 'cat', values: Object.keys(S.STRATEGIES), fmt: (v) => ({ fifo: 'Navbat (FIFO)', nearest: 'Eng yaqin', priority: 'Muddat va ustuvorlik' }[v]) },
    energyMode: { label: 'Energiya rejimi', type: 'cat', values: ['charge', 'swap'], fmt: (v) => (v === 'swap' ? 'Almashtirish' : 'Zaryadlash') },
    batching: { label: 'Bir parvozda bir nechta buyurtma', type: 'cat', values: [false, true], fmt: (v) => (v ? 'Ha' : "Yo'q") },
    model: { label: 'Dron modeli', type: 'cat', values: null, fmt: (v) => modelName(v) },
  };

  $('expVar').innerHTML = Object.entries(VARS).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join('');

  function catValues(key) {
    if (key === 'model') return Object.keys(M.PRESETS).concat(store.custom ? ['custom'] : []);
    return VARS[key].values;
  }

  function expValues() {
    const key = $('expVar').value;
    const def = VARS[key];
    if (def.type === 'cat') return catValues(key);
    const from = parseFloat($('expFrom').value);
    const to = parseFloat($('expTo').value);
    const step = Math.abs(parseFloat($('expStep').value)) || 1;
    if (!isFinite(from) || !isFinite(to)) return [];
    const out = [];
    const dir = to >= from ? 1 : -1;
    for (let v = from; dir > 0 ? v <= to + 1e-9 : v >= to - 1e-9; v += dir * step) {
      out.push(Math.round(Math.max(def.min, Math.min(def.max, v)) * 100) / 100);
      if (out.length >= 12) break;
    }
    return Array.from(new Set(out));
  }

  function syncExpForm() {
    const key = $('expVar').value;
    const def = VARS[key];
    $('expRange').hidden = def.type !== 'num';
    if (def.type === 'num') {
      $('expFrom').value = def.from;
      $('expTo').value = def.to;
      $('expStep').value = def.step;
    }
    renderExpValues();
  }

  function renderExpValues() {
    const key = $('expVar').value;
    const vals = expValues();
    $('expValues').textContent = vals.length
      ? 'Variantlar: ' + vals.map((v) => VARS[key].fmt(v)).join(' · ')
      : "Qiymatlarni to'g'ri kiriting";
  }

  function renderExpBase() {
    if (!sim) return;
    const c = sim.cfg;
    const key = $('expVar').value;
    const chips = [
      ['Ssenariy', scenario.name], ['Model', modelName(c.model)], ['Dronlar', c.fleet + ' ta'],
      ['Oqim', c.ordersPerHour + '/soat'], ['Dispetcher', VARS.strategy.fmt(c.strategy)],
      ['Energiya', VARS.energyMode.fmt(c.energyMode)], ['Bir nechta buyurtma', VARS.batching.fmt(!!c.batching)],
      ['Shamol', c.windMs + ' m/s'], ['Harorat', c.tempC + '°C'],
    ].filter(([k]) => VARS[key].label.indexOf(k) === -1);
    $('expBase').innerHTML = '<span>Qolgan sozlamalar simulyatordagidek:</span>'
      + chips.map(([k, v]) => `<span class="chip">${esc(k)}: ${esc(v)}</span>`).join('');
  }

  $('expVar').addEventListener('change', () => { syncExpForm(); renderExpBase(); });
  ['expFrom', 'expTo', 'expStep'].forEach((id) => $(id).addEventListener('input', renderExpValues));

  let expRunning = false;

  function average(list) {
    const out = {};
    Object.keys(list[0]).forEach((k) => {
      if (typeof list[0][k] === 'number') out[k] = list.reduce((s, x) => s + x[k], 0) / list.length;
    });
    return out;
  }

  $('expRun').addEventListener('click', () => {
    if (expRunning) return;
    const key = $('expVar').value;
    const def = VARS[key];
    const values = expValues();
    if (!values.length) { toast("Qiymatlarni to'g'ri kiriting"); return; }
    const hours = +$('expHours').value;
    const reps = +$('expReps').value;
    const base = clone(sim.cfg);
    if (store.custom) base.custom = store.custom;
    const jobs = [];
    values.forEach((v, i) => {
      for (let r = 0; r < reps; r++) jobs.push({ i, v, seed: 101 + r * 7919 });
    });
    const results = values.map(() => []);
    let j = 0;
    let cur = null;
    expRunning = true;
    $('expRun').disabled = true;
    $('expProgress').hidden = false;
    $('expBar').style.width = '0%';

    function tick() {
      const t0 = performance.now();
      while (performance.now() - t0 < 25) {
        if (!cur) {
          if (j >= jobs.length) { finish(); return; }
          const cfg = clone(base);
          cfg[key] = jobs[j].v;
          cfg.seed = jobs[j].seed;
          if (cfg.model === 'custom' && !cfg.custom) cfg.model = 'cargo';
          cur = { job: jobs[j], sim: new S.Sim(cfg) };
        }
        cur.sim.step(1800);
        if (cur.sim.t >= hours * 3600) {
          results[cur.job.i].push(cur.sim.summary());
          cur = null;
          j++;
        }
      }
      const done = j + (cur ? cur.sim.t / (hours * 3600) : 0);
      $('expBar').style.width = ((100 * done) / jobs.length).toFixed(1) + '%';
      setTimeout(tick, 0);
    }

    function finish() {
      expRunning = false;
      $('expRun').disabled = false;
      $('expProgress').hidden = true;
      const exp = {
        when: Date.now(), scenario: scenario.name, key, label: def.label, hours, reps,
        rows: values.map((v, i) => ({ label: def.fmt(v), s: average(results[i]) })),
      };
      store.history = [exp].concat(store.history || []).slice(0, 6);
      save();
      renderExperiment(exp);
      renderHistory();
    }
    tick();
  });

  function bestRow(rows) {
    let best = -1;
    rows.forEach((r, i) => {
      if (r.s.onTimePct >= 90 && r.s.delivered > 0 && (best < 0 || r.s.costPerDelivery < rows[best].s.costPerDelivery)) best = i;
    });
    return best;
  }

  function renderExperiment(exp) {
    const rows = exp.rows;
    const best = bestRow(rows);
    const table = `<div class="table-wrap"><table>
      <thead><tr><th>${esc(exp.label)}</th><th>Yetkazildi</th><th>O'z vaqtida</th><th>O'rtacha vaqt</th><th>Navbatda qoldi</th><th>Rad etildi</th><th>Bandlik</th><th>Narx / yetkazish</th><th>Wh / yetkazish</th></tr></thead>
      <tbody>${rows.map((r, i) => `<tr class="${i === best ? 'best' : ''}">
        <td>${esc(r.label)}${i === best ? '<span class="pill">eng yaxshi</span>' : ''}</td>
        <td>${fmt(r.s.delivered)}</td><td>${fmt(r.s.onTimePct)}%</td><td>${fmt(r.s.avgMin, 1)} daq</td>
        <td>${fmt(r.s.pending)}</td><td>${fmt(r.s.rejected)}</td><td>${fmt(r.s.utilPct)}%</td>
        <td>${r.s.delivered ? M.money(r.s.costPerDelivery) : '—'}</td><td>${fmt(r.s.whPerDelivery)}</td></tr>`).join('')}</tbody>
    </table></div>`;

    $('expOut').innerHTML = `
      <p class="conclusion" id="expConclusion">${conclusion(exp, best)}</p>
      <div class="charts">
        <figure class="chart"><figcaption>O'z vaqtida yetkazilgan, % (chiziq — 90% maqsad)</figcaption><div id="expChart1"></div></figure>
        <figure class="chart"><figcaption>Bir yetkazish narxi, ming so'm</figcaption><div id="expChart2"></div></figure>
      </div>
      ${table}
      <p class="field-note">${esc(exp.scenario)} · ${exp.hours} soatlik ish kuni · ${exp.reps} kun o'rtachasi. Narx: dron amortizatsiyasi, batareya, elektr, texnik xizmat, operator va doimiy xarajatlar.</p>`;
    const labels = rows.map((r) => r.label);
    $('expChart1').innerHTML = barChart({
      el: $('expChart1'), labels, values: rows.map((r) => r.s.onTimePct), max: 100, target: 90,
      fmt: (v) => fmt(v), cls: (v) => (v >= 90 ? 'ok' : v >= 70 ? 'warn' : 'bad'),
    });
    $('expChart2').innerHTML = barChart({
      el: $('expChart2'), labels, values: rows.map((r) => (r.s.delivered ? r.s.costPerDelivery / 1000 : 0)),
      fmt: (v) => fmt(v, 1), cls: (v, i) => (i === best ? 'ok' : ''),
    });
    lastExp = exp;
  }

  let lastExp = null;

  function conclusion(exp, best) {
    const rows = exp.rows;
    const parts = [];
    if (best >= 0) {
      const b = rows[best];
      parts.push(`Eng yaxshi variant: <b>${esc(b.label)}</b> — ${fmt(b.s.onTimePct)}% buyurtma o'z vaqtida, bir yetkazish ${M.money(b.s.costPerDelivery)}. Bu 90% maqsadga yetgan variantlar ichida eng arzoni.`);
    } else {
      let top = 0;
      rows.forEach((r, i) => { if (r.s.onTimePct > rows[top].s.onTimePct) top = i; });
      parts.push(`Hech bir variantda 90% ga yetilmadi. Eng yaxshisi: <b>${esc(rows[top].label)}</b> — ${fmt(rows[top].s.onTimePct)}%. Simulyatorda boshqa parametrni ham o'zgartiring (masalan, dronlar soni yoki batareya almashtirish), keyin tajribani takrorlang.`);
    }
    for (let i = 1; i < rows.length; i++) {
      const jump = rows[i].s.onTimePct - rows[i - 1].s.onTimePct;
      if (Math.abs(jump) >= 25) {
        parts.push(`«${esc(rows[i - 1].label)}» dan «${esc(rows[i].label)}» ga o'tganda natija keskin o'zgardi (${fmt(rows[i - 1].s.onTimePct)}% → ${fmt(rows[i].s.onTimePct)}%). Bu nuqtada dronlarning yetkazish quvvati buyurtmalar oqimiga tenglashadi.`);
        break;
      }
    }
    return parts.join(' ');
  }

  function renderHistory() {
    const list = store.history || [];
    $('expHistory').innerHTML = list.length
      ? list.map((h, i) => {
        const d = new Date(h.when);
        const time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        return `<li><span>${esc(h.label)} · ${esc(h.scenario)} · ${time}</span><button data-i="${i}">Ko'rish</button></li>`;
      }).join('')
      : '<li class="empty">Hali tajriba o\'tkazilmagan.</li>';
  }

  $('expHistory').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (b) renderExperiment(store.history[+b.dataset.i]);
  });

  // =====================================================================
  // GRAFIKLAR (SVG)
  // =====================================================================

  function niceTicks(min, max, count) {
    const span = max - min || 1;
    const raw = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    const step = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
    const ticks = [];
    for (let v = Math.floor(min / step) * step; v <= max + step * 0.999; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
    return ticks;
  }

  function tickFmt(v, ticks) {
    const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
    return fmt(v, step < 0.1 ? 2 : step < 1 ? 1 : 0);
  }

  function chartWidth(el) {
    return Math.max(260, Math.min(720, Math.round(el.clientWidth || el.parentElement.clientWidth || 480)));
  }

  function lineChart(o) {
    const W2 = chartWidth(o.el);
    const H2 = Math.round(Math.min(260, Math.max(180, W2 * 0.45)));
    const m = { l: 44, r: 14, t: 14, b: 36 };
    const xt = niceTicks(o.x.min, o.x.max, W2 < 400 ? 4 : 6);
    const all = o.series.flatMap((s) => s.points.map((p) => p[1])).filter(isFinite);
    const yt = niceTicks(o.y.min != null ? o.y.min : Math.min(...all), Math.max(...all) * 1.05, 4);
    const x0 = xt[0];
    const x1 = xt[xt.length - 1];
    const y0 = yt[0];
    const y1 = yt[yt.length - 1];
    const X = (v) => m.l + ((v - x0) / (x1 - x0)) * (W2 - m.l - m.r);
    const Y = (v) => H2 - m.b - ((v - y0) / (y1 - y0)) * (H2 - m.t - m.b);
    let svg = `<svg viewBox="0 0 ${W2} ${H2}" width="${W2}" height="${H2}" role="img" aria-label="${esc(o.label || '')}">`;
    yt.forEach((v) => {
      svg += `<line class="grid-l" x1="${m.l}" x2="${W2 - m.r}" y1="${Y(v)}" y2="${Y(v)}"></line>`;
      svg += `<text class="lbl" x="${m.l - 6}" y="${Y(v) + 3}" text-anchor="end">${tickFmt(v, yt)}</text>`;
    });
    xt.forEach((v) => {
      svg += `<text class="lbl" x="${X(v)}" y="${H2 - m.b + 14}" text-anchor="middle">${tickFmt(v, xt)}</text>`;
    });
    svg += `<g class="ax"><line x1="${m.l}" x2="${W2 - m.r}" y1="${H2 - m.b}" y2="${H2 - m.b}"></line></g>`;
    svg += `<text class="lbl" x="${W2 - m.r}" y="${H2 - 4}" text-anchor="end">${esc(o.x.label)}</text>`;
    svg += `<text class="lbl" x="${m.l - 6}" y="${m.t - 4}" text-anchor="start">${esc(o.y.label)}</text>`;
    o.series.forEach((s) => {
      const pts = s.points.filter((p) => isFinite(p[1]));
      if (!pts.length) return;
      const line = pts.map((p) => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
      if (s.area) {
        svg += `<polygon class="s-area" points="${X(pts[0][0])},${Y(y0)} ${line} ${X(pts[pts.length - 1][0])},${Y(y0)}"></polygon>`;
      }
      svg += `<polyline class="${s.cls}" points="${line}"></polyline>`;
    });
    (o.markers || []).forEach((mk) => {
      if (!isFinite(mk.y)) return;
      const cx = X(mk.x);
      const cy = Y(mk.y);
      const right = cx + 8 + String(mk.label).length * 6.2 > W2 - m.r;
      svg += `<circle class="${mk.cls || 'mk'}" cx="${cx}" cy="${cy}" r="4.5"></circle>`;
      svg += `<text class="mk-text" x="${cx + (right ? -8 : 8)}" y="${cy - 8}" text-anchor="${right ? 'end' : 'start'}">${esc(mk.label)}</text>`;
    });
    return svg + '</svg>';
  }

  function barChart(o) {
    const W2 = chartWidth(o.el);
    const H2 = 200;
    const m = { l: 40, r: 8, t: 18, b: 40 };
    const max = o.max || Math.max(1, ...o.values) * 1.15;
    const yt = niceTicks(0, max, 4);
    const top = o.max || yt[yt.length - 1];
    const Y = (v) => H2 - m.b - (v / top) * (H2 - m.t - m.b);
    const n = o.values.length;
    const slot = (W2 - m.l - m.r) / n;
    const bw = Math.min(46, slot * 0.62);
    let svg = `<svg viewBox="0 0 ${W2} ${H2}" width="${W2}" height="${H2}" role="img">`;
    yt.filter((v) => v <= top).forEach((v) => {
      svg += `<line class="grid-l" x1="${m.l}" x2="${W2 - m.r}" y1="${Y(v)}" y2="${Y(v)}"></line>`;
      svg += `<text class="lbl" x="${m.l - 6}" y="${Y(v) + 3}" text-anchor="end">${fmt(v)}</text>`;
    });
    o.values.forEach((v, i) => {
      const x = m.l + slot * i + (slot - bw) / 2;
      const y = Y(Math.max(0, v));
      svg += `<rect class="bar ${o.cls ? o.cls(v, i) : ''}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${(H2 - m.b - y).toFixed(1)}" rx="2"></rect>`;
      svg += `<text class="mk-text" x="${(x + bw / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle">${o.fmt(v)}</text>`;
      const lab = o.labels[i].length > 12 && slot < 90 ? o.labels[i].slice(0, 10) + '…' : o.labels[i];
      svg += `<text class="lbl" x="${(m.l + slot * i + slot / 2).toFixed(1)}" y="${H2 - m.b + 15}" text-anchor="middle">${esc(lab)}</text>`;
    });
    if (o.target != null) svg += `<line class="target" x1="${m.l}" x2="${W2 - m.r}" y1="${Y(o.target)}" y2="${Y(o.target)}"></line>`;
    svg += `<g class="ax"><line x1="${m.l}" x2="${W2 - m.r}" y1="${H2 - m.b}" y2="${H2 - m.b}"></line></g>`;
    return svg + '</svg>';
  }

  // =====================================================================
  // HISOBLASH
  // =====================================================================

  const IN = (id) => parseFloat($(id).value);
  let calcBase = store.calcPreset && M.PRESETS[store.calcPreset] ? store.calcPreset : 'cargo';

  function fillCalc(id) {
    calcBase = id;
    const p = id === 'custom' && store.custom ? store.custom : M.PRESETS[id] || M.PRESETS.cargo;
    $('cPreset').value = id;
    $('cEmpty').value = p.emptyKg;
    $('cBattery').value = p.batteryWh;
    $('cMaxPayload').value = p.maxPayloadKg;
    $('cSpeed').value = p.cruiseMs;
    $('cRotors').value = p.rotors;
    $('cDiam').value = Math.round(p.rotorDiamM / 0.0254);
    $('cCdA').value = p.cdA;
    $('cWing').value = p.wingAreaM2 || 1;
    $('cSpan').value = p.wingSpanM || 3;
    $('cPayload').max = p.maxPayloadKg;
    $('cPayload').step = p.maxPayloadKg > 5 ? 0.5 : 0.1;
    $('cPayload').value = Math.round(p.maxPayloadKg * 0.5 * 10) / 10;
    $('ePrice').value = p.priceSom / 1e6;
    $('eLife').value = p.lifeHours;
    $('eBattPrice').value = p.batteryPriceSom / 1e6;
    $('eCycles').value = p.batteryCycles;
  }

  function readSpec() {
    const base = calcBase === 'custom' && store.custom ? store.custom : M.PRESETS[calcBase] || M.PRESETS.cargo;
    const d = clone(base);
    const pos = (v, def) => (isFinite(v) && v > 0 ? v : def);
    d.emptyKg = pos(IN('cEmpty'), base.emptyKg);
    d.batteryWh = pos(IN('cBattery'), base.batteryWh);
    d.maxPayloadKg = pos(IN('cMaxPayload'), base.maxPayloadKg);
    d.cruiseMs = pos(IN('cSpeed'), base.cruiseMs);
    d.rotors = Math.round(pos(IN('cRotors'), base.rotors));
    d.rotorDiamM = pos(IN('cDiam'), base.rotorDiamM / 0.0254) * 0.0254;
    d.cdA = pos(IN('cCdA'), base.cdA);
    if (d.type === 'vtol') {
      d.wingAreaM2 = pos(IN('cWing'), base.wingAreaM2);
      d.wingSpanM = pos(IN('cSpan'), base.wingSpanM);
    }
    d.priceSom = pos(IN('ePrice'), base.priceSom / 1e6) * 1e6;
    d.lifeHours = pos(IN('eLife'), base.lifeHours);
    d.batteryPriceSom = Math.max(0, IN('eBattPrice') || 0) * 1e6;
    d.batteryCycles = pos(IN('eCycles'), base.batteryCycles);
    return d;
  }

  function readEcon() {
    const e = {};
    const num = (id) => { const v = IN(id); return isFinite(v) ? v : null; };
    if (num('eTariff') != null) e.tariffSom = num('eTariff');
    if (num('eSalary') != null) e.operatorSalarySom = num('eSalary') * 1e6;
    if (num('ePerOp') > 0) e.dronesPerOperator = num('ePerOp');
    if (num('eUtil') > 0) e.utilization = Math.min(0.95, num('eUtil') / 100);
    if (num('eFuel') != null) e.fuelPriceSom = num('eFuel');
    if (num('eCourier') != null) e.courierSalarySom = num('eCourier') * 1e6;
    return e;
  }

  function tile(label, value, unit, note) {
    return `<div class="tile"><span>${label}</span><b>${value}<small>${unit}</small></b>${note ? `<em>${note}</em>` : ''}</div>`;
  }

  function renderCalc() {
    if (currentTab !== 'hisob') return;
    const d = readSpec();
    $('view-hisob').querySelector('.calc-grid').className = 'calc-grid ' + d.type;
    $('cType').textContent = (d.type === 'vtol' ? 'Turi: VTOL qanotli. ' : 'Turi: multikopter. ') + (d.note || '');
    const payload = Math.max(0, IN('cPayload') || 0);
    $('cPayloadOut').textContent = fmt(payload, 1) + ' kg';
    const env = {
      payloadKg: payload,
      distanceM: Math.max(0, IN('cDistance') || 0) * 1000,
      windAlong: Math.max(0, IN('cWind') || 0),
      tempC: isFinite(IN('cTemp')) ? IN('cTemp') : 20,
      altitudeM: 450,
      reserve: Math.min(0.6, Math.max(0, (IN('cReserve') || 0) / 100)),
    };
    const r = M.roundTrip(d, env);
    const mass = d.emptyKg + payload;
    const vBest = M.bestSpeed(d, mass, r.rho);
    const usedPct = (r.tripWh / r.capacityWh) * 100;

    let verdict;
    if (r.overweight) verdict = `<i class="dot bad"></i>Yuk og'ir: bu dron ko'pi bilan ${fmt(d.maxPayloadKg, 1)} kg ko'taradi.`;
    else if (d.type === 'vtol' && d.cruiseMs < r.stallMs * 1.2) verdict = `<i class="dot bad"></i>Tezlik juda past: qanot ${fmt(r.stallMs, 1)} m/s dan sekin uchganda ko'tara olmaydi. Tezlikni oshiring.`;
    else if (env.windAlong >= d.cruiseMs - 0.5) verdict = '<i class="dot bad"></i>Shamol dron tezligidan kuchli — dron oldinga yura olmaydi.';
    else if (!r.feasible) verdict = `<i class="dot bad"></i>Batareya yetmaydi: borib-qaytishga ${fmt(r.tripWh)} Wh kerak, zaxirani hisobga olganda ${fmt(r.usableWh)} Wh bor.`;
    else verdict = `<i class="dot ${usedPct > 65 ? 'warn' : 'ok'}"></i>Bajarsa bo'ladi: bu parvoz batareyaning ${fmt(usedPct)}% ini sarflaydi.`;
    $('cVerdict').innerHTML = verdict;

    $('cTiles').innerHTML = [
      tile('Muallaq turish', fmt(r.hoverW / 1000, 2), 'kVt', 'yuk bilan'),
      tile('Uchish quvvati', fmt(r.cruiseW / 1000, 2), 'kVt', `${fmt(d.cruiseMs * 3.6)} km/soat tezlikda`),
      tile('Parvoz vaqti', fmt(r.enduranceMin), 'daq', 'zaxirasiz qism, yuk bilan'),
      tile('Yetkazish radiusi', fmt(r.radiusKm, 1), 'km', 'borib, yukni berib, qaytish'),
      tile('1 km ga energiya', fmt(r.whPerKm, 1), 'Wh', `eng tejamkor tezlik ${fmt(vBest, 1)} m/s`),
      tile('Mijoz kutadi', fmt(r.toCustomerSec / 60, 1), 'daq', `parvoz jami ${fmt(r.tripSec / 60, 1)} daq`),
    ].join('');

    // Radius va yuk
    const pts = [];
    const ptsCalm = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const p = (d.maxPayloadKg * i) / n;
      pts.push([p, M.roundTrip(d, Object.assign({}, env, { payloadKg: p })).radiusKm]);
      ptsCalm.push([p, M.roundTrip(d, Object.assign({}, env, { payloadKg: p, windAlong: 0 })).radiusKm]);
    }
    const series = [{ points: pts, cls: 's-main', area: true }];
    if (env.windAlong > 0) series.push({ points: ptsCalm, cls: 's-alt' });
    $('chartRadius').innerHTML = lineChart({
      el: $('chartRadius'), label: 'Yetkazish radiusi va yuk',
      x: { min: 0, max: d.maxPayloadKg, label: 'yuk, kg' },
      y: { min: 0, label: 'radius, km' },
      series,
      markers: r.overweight ? [] : [{ x: payload, y: r.radiusKm, label: `${fmt(r.radiusKm, 1)} km` }],
    }) + (env.windAlong > 0 ? `<div class="chart-legend"><span><i></i>${fmt(env.windAlong)} m/s shamol bilan</span><span><i class="alt"></i>shamolsiz</span></div>` : '');

    // Tezlik va energiya
    const vMin = Math.max(4, d.type === 'vtol' ? r.stallMs * 1.15 : 4);
    const vMax = d.type === 'vtol' ? 45 : 30;
    const sp = [];
    for (let v = vMin; v <= vMax + 1e-9; v += (vMax - vMin) / 40) sp.push([v, (M.cruisePower(d, mass, v, r.rho) / v) * 1000 / 3600]);
    const whAt = (v) => (M.cruisePower(d, mass, v, r.rho) / v) * 1000 / 3600;
    const marks = [{ x: vBest, y: whAt(vBest), label: `eng tejamkor: ${fmt(vBest, 1)} m/s`, cls: 'mk-best' }];
    if (Math.abs(d.cruiseMs - vBest) > 1 && d.cruiseMs >= vMin && d.cruiseMs <= vMax) marks.push({ x: d.cruiseMs, y: whAt(d.cruiseMs), label: `sizniki: ${fmt(d.cruiseMs, 1)} m/s` });
    $('chartSpeed').innerHTML = lineChart({
      el: $('chartSpeed'), label: '1 km ga energiya va tezlik',
      x: { min: vMin, max: vMax, label: 'tezlik, m/s' },
      y: { min: 0, label: 'Wh/km' },
      series: [{ points: sp, cls: 's-main', area: true }],
      markers: marks,
    });

    renderEcon(d, r, env.distanceM / 1000);
  }

  function costBars(items, max, cls) {
    return `<ul class="cost-bars ${cls || ''}">${items.map(([label, v]) => `<li><span>${label}</span><span class="track"><i style="width:${max ? ((100 * v) / max).toFixed(1) : 0}%"></i></span><span>${M.money(v)}</span></li>`).join('')}</ul>`;
  }

  function renderEcon(d, trip, km) {
    if (!trip.feasible || !isFinite(trip.tripSec)) {
      $('eOut').innerHTML = "<p class=\"empty\">Avval dron bu masofaga borib-qayta olishi kerak — chapdagi sharoitni o'zgartiring.</p>";
      return;
    }
    const e = M.economics(d, readEcon(), trip, km);
    const dr = e.drone;
    const items = [
      ['Amortizatsiya', dr.amort], ['Batareya eskirishi', dr.battery], ['Elektr', dr.energy],
      ['Texnik xizmat', dr.maint], ['Operator', dr.labor], ['Doimiy xarajatlar', dr.fixed],
    ];
    const carItems = [['Benzin', e.car.fuel], ['Mashina xizmati', e.car.maint], ['Kuryer maoshi', e.car.labor]];
    const max = Math.max(...items.map((x) => x[1]), ...carItems.map((x) => x[1]));
    const biggest = items.slice().sort((a, b) => b[1] - a[1])[0];
    const cheaper = e.droneTotal < e.carTotal;
    const advice = {
      Amortizatsiya: "dron narxini kamaytirish yoki xizmat muddatini uzaytirish",
      'Batareya eskirishi': "sikllari ko'p batareya tanlash",
      Elektr: 'arzonroq tarif yoki tejamkor tezlik',
      'Texnik xizmat': "ehtiyot qismlarni mahalliy topish",
      Operator: "bitta operatorga ko'proq dron biriktirish (avtomatlashtirish)",
      'Doimiy xarajatlar': "har bir dronni kuniga ko'proq uchirish",
    }[biggest[0]];
    $('eOut').innerHTML = `<div class="econ-out">
      <div>
        <div class="cost-head"><span>Dron bilan</span><b>${M.money(e.droneTotal)}</b></div>
        ${costBars(items, max)}
      </div>
      <div>
        <div class="cost-head"><span>Avtomobil-kuryer bilan</span><b>${M.money(e.carTotal)}</b></div>
        ${costBars(carItems, max, 'car')}
      </div>
      <div class="compare">
        <div><span>Bitta dron kuniga</span><b>${fmt(e.perDay)} ta yetkazish</b></div>
        <div><span>Oyiga</span><b>${fmt(e.perMonth)} ta</b></div>
        <div><span>Mijoz kutadi: dron / mashina</span><b>${fmt(e.droneMin, 1)} / ${fmt(e.carMin, 1)} daq</b></div>
        <div><span>CO₂: dron / mashina</span><b>${fmt(e.droneCo2 * 1000)} / ${fmt(e.carCo2 * 1000)} g</b></div>
      </div>
    </div>
    <p class="conclusion">${cheaper ? 'Bu sharoitda dron arzonroq' : 'Bu sharoitda avtomobil arzonroq'}: farq ${M.money(Math.abs(e.carTotal - e.droneTotal))}. Dron xarajatining eng katta qismi — <b>${biggest[0].toLowerCase()}</b>. Uni kamaytirishning yo'li: ${advice}.</p>`;
  }

  function initCalc() {
    fillModelSelect($('cPreset'), true);
    const E = M.DEFAULT_ECON;
    $('eTariff').value = E.tariffSom;
    $('eSalary').value = E.operatorSalarySom / 1e6;
    $('ePerOp').value = E.dronesPerOperator;
    $('eUtil').value = E.utilization * 100;
    $('eFuel').value = E.fuelPriceSom;
    $('eCourier').value = E.courierSalarySom / 1e6;
    if (calcBase === 'custom' && !store.custom) calcBase = 'cargo';
    fillCalc(calcBase);
    $('cPreset').addEventListener('change', (e) => {
      store.calcPreset = e.target.value;
      save();
      fillCalc(e.target.value);
      renderCalc();
    });
    $('view-hisob').addEventListener('input', (e) => { if (e.target.id !== 'cPreset') renderCalc(); });
    $('cToSim').addEventListener('click', () => {
      const d = readSpec();
      d.id = 'custom';
      d.name = 'Mening dronim';
      d.short = 'Mening';
      d.note = `Hisoblash bo'limida yasalgan: ${fmt(d.emptyKg, 1)} kg, ${fmt(d.batteryWh)} Wh, ${fmt(d.maxPayloadKg, 1)} kg gacha yuk`;
      store.custom = d;
      save();
      fillModelSelect($('cPreset'), true);
      $('cPreset').value = calcBase;
      const cfg = clone(sim.cfg);
      cfg.model = 'custom';
      makeSim(cfg);
      syncForm();
      showTab('sim');
      renderPanels(true);
      toast("«Mening dronim» simulyatorga qo'yildi. «Boshlash» ni bosing.");
    });
  }

  // =====================================================================
  // O'RGANISH
  // =====================================================================

  function renderRoadmap() {
    const done = store.road || [];
    $('roadmap').innerHTML = C.ROADMAP.map((r, i) => `<li class="${done[i] ? 'done' : ''}">
      <input type="checkbox" id="road${i}" ${done[i] ? 'checked' : ''}>
      <label for="road${i}"><span class="r-title">${esc(r.title)}</span><span class="r-time">${esc(r.time)}</span><span class="r-text">${esc(r.text)}</span></label>
    </li>`).join('');
    const count = C.ROADMAP.filter((_, i) => done[i]).length;
    $('roadBar').style.width = ((100 * count) / C.ROADMAP.length).toFixed(0) + '%';
    $('roadText').textContent = `${count} / ${C.ROADMAP.length} bosqich bajarildi`;
  }

  $('roadmap').addEventListener('change', (e) => {
    const m = /^road(\d+)$/.exec(e.target.id);
    if (!m) return;
    store.road = store.road || [];
    store.road[+m[1]] = e.target.checked;
    save();
    renderRoadmap();
  });

  function renderLessons() {
    $('lessons').innerHTML = C.LESSONS.map((l, i) => `<details class="lesson" id="lesson-${l.id}"${i === 0 ? ' open' : ''}>
      <summary><span>${esc(l.title)}</span><small>${l.min} daq</small></summary>
      <div class="lesson-body">${l.html}
        ${l.tryIt ? `<button class="btn try" data-scenario="${l.tryIt.scenario || ''}" data-tab="${l.tryIt.tab || ''}">${esc(l.tryIt.text)}</button>` : ''}
      </div></details>`).join('');
  }

  $('lessons').addEventListener('click', (e) => {
    const b = e.target.closest('button.try');
    if (!b) return;
    if (b.dataset.scenario) {
      loadScenario(b.dataset.scenario);
      showTab('sim');
      toast(`«${scenario.name}» ochildi. «Boshlash» ni bosing.`);
    } else {
      showTab(b.dataset.tab);
    }
  });

  function renderQuiz() {
    $('quiz').innerHTML = C.QUIZ.map((q, i) => `<fieldset class="q" style="border:0;padding:0;margin:0">
      <p>${i + 1}. ${esc(q.q)}</p>
      ${q.a.map((a, j) => `<label id="q${i}a${j}"><input type="radio" name="q${i}" value="${j}"><span>${esc(a)}</span></label>`).join('')}
      <p class="why" id="why${i}" hidden></p>
    </fieldset>`).join('');
    $('quizScore').textContent = store.quizBest != null ? `Eng yaxshi natijangiz: ${store.quizBest} / ${C.QUIZ.length}` : '';
  }

  $('quizCheck').addEventListener('click', () => {
    let score = 0;
    let answered = 0;
    C.QUIZ.forEach((q, i) => {
      const picked = document.querySelector(`input[name="q${i}"]:checked`);
      q.a.forEach((_, j) => $(`q${i}a${j}`).classList.remove('right', 'wrong'));
      $(`q${i}a${q.ok}`).classList.add('right');
      if (picked) {
        answered++;
        if (+picked.value === q.ok) score++;
        else $(`q${i}a${picked.value}`).classList.add('wrong');
      }
      const why = $('why' + i);
      why.textContent = q.why;
      why.hidden = false;
    });
    if (store.quizBest == null || score > store.quizBest) { store.quizBest = score; save(); }
    const text = score === C.QUIZ.length ? "A'lo! Hammasi to'g'ri." : score >= C.QUIZ.length * 0.7 ? 'Yaxshi natija.' : "Darslarni yana bir ko'rib chiqing.";
    $('quizScore').textContent = `${score} / ${C.QUIZ.length} to'g'ri${answered < C.QUIZ.length ? ` (${C.QUIZ.length - answered} ta savol javobsiz)` : ''}. ${text}`;
  });

  $('quizReset').addEventListener('click', renderQuiz);

  function renderReference() {
    $('glossary').innerHTML = C.GLOSSARY.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('');
    $('resources').innerHTML = C.RESOURCES.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('');
  }

  // =====================================================================
  // ISHGA TUSHIRISH
  // =====================================================================

  readColors();
  setSpeed(speed);
  setTool('order');
  loadScenario(store.scenario || 'shahar');
  setRunning(false);
  syncExpForm();
  renderHistory();
  initCalc();
  renderRoadmap();
  renderLessons();
  renderQuiz();
  renderReference();
  const startTab = (location.hash || '').slice(1);
  showTab(TABS.includes(startTab) ? startTab : 'tuzilish');
  window.addEventListener('hashchange', () => {
    const t = (location.hash || '').slice(1);
    if (TABS.includes(t) && t !== currentTab) showTab(t);
  });
  requestAnimationFrame(frame);

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeMap();
      if (currentTab === 'hisob') renderCalc();
      if (currentTab === 'tajriba' && lastExp) renderExperiment(lastExp);
    }, 120);
  });

  function onTheme() {
    readColors();
    terrain = null;
  }
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onTheme);
  } catch (e) { /* eski brauzerlar */ }
  new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    try {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    } catch (e) { /* oflayn rejim ixtiyoriy */ }
  }
})();
