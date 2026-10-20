/*
 * «Tuzilishi» bo'limi interfeysi: 3D model (qismlar, parvoz, yozma sayohat),
 * darslik va parvoz laboratoriyasi (PID).
 */
(function () {
  'use strict';

  const P = window.DronParts;
  const B = window.DronDarslik;
  const L = window.DronPID;
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = 'dron-tuzilish-v1';
  const fmt = (n, d) => (window.DronModel ? window.DronModel.fmt(n, d) : String(Math.round(n)));

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
    } catch (e) { /* xotira yopiq bo'lsa ham ishlayveradi */ }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const PART = Object.fromEntries(P.PARTS.map((p) => [p.id, p]));
  const CHAPTER = Object.fromEntries(B.CHAPTERS.map((c) => [c.id, c]));
  const PART_VIEW = {
    rama: 'top', motor: 'motor', vint: 'iso', esc: 'under', pdb: 'iso', fc: 'fc', imu: 'fc', baro: 'fc',
    gps: 'iso', rx: 'rear', telem: 'rear', batareya: 'under', kamera: 'under', yuk: 'under', oyoq: 'under',
  };

  let visible = false;
  let sub = store.sub || 'model';
  let mode = 'parts';
  let viewer = null;
  let viewerTried = false;
  let selected = null;
  let tourStep = store.tour || 0;
  let maneuver = 'hover';

  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    const v = (k) => cs.getPropertyValue('--' + k).trim();
    return { stage: v('stage'), grid: v('stage-grid'), gridCenter: v('stage-grid-center'), accent: v('accent') };
  }

  // =====================================================================
  // Bo'lim ichidagi navigatsiya
  // =====================================================================

  function setSub(name) {
    sub = ['model', 'darslik', 'lab'].includes(name) ? name : 'model';
    store.sub = sub;
    save();
    document.querySelectorAll('#tzSeg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.sub === sub)));
    $('tz-model').hidden = sub !== 'model';
    $('tz-darslik').hidden = sub !== 'darslik';
    $('tz-lab').hidden = sub !== 'lab';
    syncRunning();
    if (sub === 'darslik') renderChapter(store.chapter || B.CHAPTERS[0].id, false);
    if (sub === 'lab') resizeLab();
  }

  document.querySelectorAll('#tzSeg button').forEach((b) => b.addEventListener('click', () => setSub(b.dataset.sub)));

  function syncRunning() {
    const showModel = visible && sub === 'model' && !document.hidden;
    if (showModel) {
      ensureViewer();
      if (viewer) { viewer.start(); viewer.resize(); }
    } else if (viewer) {
      viewer.stop();
    }
    labRunning = visible && sub === 'lab' && !document.hidden;
    if (labRunning) { labLast = performance.now(); requestAnimationFrame(labFrame); }
  }

  document.addEventListener('dron:tab', (e) => {
    visible = e.detail === 'tuzilish';
    if (visible) setSub(sub);
    else syncRunning();
  });
  document.addEventListener('visibilitychange', syncRunning);

  // =====================================================================
  // 3D MODEL
  // =====================================================================

  function ensureViewer() {
    if (viewer || viewerTried) return;
    viewerTried = true;
    const stage = $('stage');
    viewer = window.DronDrone3D && window.DronDrone3D.create(stage, {
      onPick: (id) => {
        if (mode === 'tour') return;
        if (mode === 'flight') { if (id) { setMode('parts'); selectPart(id); } return; }
        selectPart(id === selected ? null : id);
      },
      onFrame: (v) => { if (mode === 'flight') renderMotors(v); },
      onFailEnd: () => setManeuver('hover', true),
    });
    if (!viewer) {
      $('stageFallback').hidden = false;
      $('stageHint').hidden = true;
      return;
    }
    viewer.setTheme(readTheme());
    // Telefonda nomlar sahnani to'sib qo'ymasligi uchun boshida o'chiq
    if (stage.clientWidth < 700) $('tzLabels').checked = false;
    viewer.setLabels($('tzLabels').checked);
    setMode(mode);
  }

  function setMode(m) {
    mode = m;
    document.querySelectorAll('#modeSeg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === m)));
    $('paneParts').hidden = m !== 'parts';
    $('paneFlight').hidden = m !== 'flight';
    $('paneTour').hidden = m !== 'tour';
    if (!viewer) return;
    viewer.setMode(m === 'tour' ? 'tour' : m);
    viewer.setPath(null);
    viewer.setFlow(false);
    if (m === 'parts') {
      viewer.focus([]);
      viewer.select(selected);
      viewer.setExplode($('tzExplode').checked);
      viewer.setSpin($('tzSpin').checked);
      viewer.setView(selected ? PART_VIEW[selected] : 'iso');
      renderPartInfo();
    } else if (m === 'flight') {
      viewer.select(null);
      viewer.focus([]);
      viewer.setExplode(false);
      viewer.setView('iso');
      setManeuver('hover');
    } else {
      viewer.select(null);
      showTourStep(tourStep);
    }
  }

  document.querySelectorAll('#modeSeg button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

  // ----- Qismlar -----

  function selectPart(id) {
    selected = id || null;
    if (viewer) {
      viewer.select(selected);
      if (selected === 'pdb' && !$('tzExplode').checked) { $('tzExplode').checked = true; viewer.setExplode(true); }
      viewer.setView(selected ? PART_VIEW[selected] : 'iso');
    }
    renderPartInfo();
    document.querySelectorAll('#partList button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.part === selected)));
  }

  function renderPartList() {
    const groups = [];
    P.PARTS.forEach((p) => {
      let g = groups.find((x) => x.name === p.group);
      if (!g) { g = { name: p.group, items: [] }; groups.push(g); }
      g.items.push(p);
    });
    $('partList').innerHTML = groups.map((g) => `<div class="pl-group"><span class="pl-name">${esc(g.name)}</span>
      <div class="pl-items">${g.items.map((p) => `<button type="button" data-part="${p.id}" aria-pressed="false">${esc(p.name)}</button>`).join('')}</div></div>`).join('');
  }

  $('partList').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-part]');
    if (b) selectPart(b.dataset.part === selected ? null : b.dataset.part);
  });

  function renderPartInfo() {
    const box = $('partInfo');
    if (!selected) {
      box.innerHTML = `<h3>Yetkazish kvadrokopteri</h3>
        <p class="pi-short">Modeldagi istalgan qismga yoki pastdagi ro'yxatga bosing — u ajralib ko'rinadi va bu yerda tushuntirish chiqadi.</p>
        <dl class="pi-specs">
          <dt>O'lchami</dt><dd>650 mm (diagonal), vintlar 15″</dd>
          <dt>Massasi</dt><dd>≈ 4,5 kg, shundan 2 kg gacha yuk</dd>
          <dt>Batareya</dt><dd>LiPo 6S, 222 Wh</dd>
          <dt>Parvoz vaqti</dt><dd>≈ 18 daqiqa muallaq turishda</dd>
          <dt>Qismlar</dt><dd>${P.PARTS.length} ta asosiy qism</dd>
        </dl>
        <p class="field-note">Boshlash uchun eng yaxshi yo'l — yuqoridagi «Sayohat»: hamma qismlarni tartib bilan, yozma tushuntirish bilan ko'rsatadi.</p>`;
      return;
    }
    const p = PART[selected];
    const ch = CHAPTER[p.chapter];
    box.innerHTML = `<p class="pi-group">${esc(p.group)}</p>
      <h3>${esc(p.name)}</h3>
      <p class="pi-short">${esc(p.short)}</p>
      <h4>Vazifasi</h4><p>${esc(p.what)}</p>
      <h4>Qanday ishlaydi</h4><p>${esc(p.how)}</p>
      <dl class="pi-specs">${p.specs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      <h4>Ishdan chiqsa</h4><p>${esc(p.fail)}</p>
      <p class="pi-tip"><b>Maslahat.</b> ${esc(p.tip)}</p>
      ${ch ? `<button type="button" class="btn" data-chapter="${ch.id}">Darslikda batafsil: ${esc(ch.title)}</button>` : ''}`;
  }

  $('partInfo').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-chapter]');
    if (b) { setSub('darslik'); renderChapter(b.dataset.chapter, true); }
  });

  $('tzExplode').addEventListener('change', (e) => {
    if (!viewer) return;
    viewer.setExplode(e.target.checked);
    viewer.setView(selected ? PART_VIEW[selected] : 'iso');
  });
  $('tzLabels').addEventListener('change', (e) => { if (viewer) viewer.setLabels(e.target.checked); });
  $('tzSpin').addEventListener('change', (e) => { if (viewer) viewer.setSpin(e.target.checked); });
  $('tzReset').addEventListener('click', () => { if (viewer) viewer.setView(selected ? PART_VIEW[selected] : 'iso'); });

  // ----- Parvoz -----

  function setManeuver(id, auto) {
    maneuver = P.MANEUVERS[id] ? id : 'hover';
    if (viewer) viewer.setManeuver(maneuver);
    document.querySelectorAll('.stick button, #mvFail, #mvHover').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mv === maneuver)));
    const m = P.MANEUVERS[maneuver];
    $('flightInfo').innerHTML = `<h3>${esc(m.name)}</h3>
      <p class="mv-stick">${esc(m.stick)}</p><p>${esc(m.text)}</p>
      ${auto ? '<p class="field-note">Dron qulab tushdi — model qayta muallaq holatga qaytarildi.</p>' : ''}`;
  }

  document.querySelectorAll('[data-mv]').forEach((b) => b.addEventListener('click', () => setManeuver(b.dataset.mv === maneuver && b.dataset.mv !== 'hover' ? 'hover' : b.dataset.mv)));

  const motorEls = P.MOTORS.map((m) => {
    const el = document.createElement('div');
    el.className = 'mh-motor mh-' + m.pos.toLowerCase();
    el.innerHTML = `<span class="mh-name">M${m.n} <i class="${m.dir === 'CW' ? 'cw' : 'ccw'}">${m.dir === 'CW' ? '↻ CW' : '↺ CCW'}</i></span>
      <span class="mh-bar"><i></i></span><span class="mh-rpm"></span>`;
    return el;
  });
  motorEls.forEach((el) => $('motorHud').appendChild(el));
  const mhBody = document.createElement('div');
  mhBody.className = 'mh-body';
  mhBody.innerHTML = '<span>OLD ▲</span>';
  $('motorHud').appendChild(mhBody);

  let hudTimer = 0;
  function renderMotors(v) {
    const now = performance.now();
    if (now - hudTimer < 90) return;
    hudTimer = now;
    const m = v.state.mNow;
    const rpm = v.rpm;
    motorEls.forEach((el, i) => {
      const pct = Math.max(0, Math.min(1, m[i] / 1.3));
      el.querySelector('.mh-bar i').style.width = (pct * 100).toFixed(0) + '%';
      el.querySelector('.mh-rpm').textContent = fmt(rpm[i]) + ' ayl/daq';
      el.classList.toggle('up', m[i] > 1.03);
      el.classList.toggle('down', m[i] < 0.97);
    });
    // Kuch va momentlar (kuch ~ tezlik²)
    const t = m.map((x) => x * x);
    const total = (t[0] + t[1] + t[2] + t[3]) / 4;
    const yaw = (t[0] + t[1]) - (t[2] + t[3]);
    const roll = (t[1] + t[2]) - (t[0] + t[3]);
    const pitch = (t[1] + t[3]) - (t[0] + t[2]);
    const word = (v2, pos, neg) => (Math.abs(v2) < 0.04 ? "muvozanatda" : v2 > 0 ? pos : neg);
    $('flightCalc').innerHTML = `
      <div><span>Umumiy kuch</span><b>${fmt(total * 100)}% <small>${total > 1.03 ? 'ko\'tariladi' : total < 0.97 ? 'pastlaydi' : 'og\'irlikka teng'}</small></b></div>
      <div><span>Og'dirish (oldinga/orqaga)</span><b>${word(pitch, 'burun pastga', 'burun yuqoriga')}</b></div>
      <div><span>Og'dirish (yonga)</span><b>${word(roll, "o'ngga", 'chapga')}</b></div>
      <div><span>Burilish momenti</span><b>${word(yaw, "o'ngga (soat mili)", 'chapga')}</b></div>`;
  }

  // ----- Sayohat -----

  function showTourStep(i) {
    tourStep = Math.max(0, Math.min(P.TOUR.length - 1, i));
    store.tour = tourStep;
    save();
    const s = P.TOUR[tourStep];
    $('tourNum').textContent = `${tourStep + 1} / ${P.TOUR.length}`;
    $('tourTitle').textContent = s.title;
    $('tourText').innerHTML = s.text;
    $('tourPrev').disabled = tourStep === 0;
    $('tourNext').textContent = s.end ? "«Qanday uchadi» ga o'tish" : 'Keyingisi';
    $('tourBar').style.width = (((tourStep + 1) / P.TOUR.length) * 100).toFixed(1) + '%';
    if (!viewer) return;
    viewer.setExplode(!!s.explode);
    viewer.focus(s.focus || []);
    viewer.setPath(s.path || null);
    viewer.setFlow(!!s.maneuver);
    viewer.setView(s.view || 'iso');
  }

  $('tourPrev').addEventListener('click', () => showTourStep(tourStep - 1));
  $('tourNext').addEventListener('click', () => {
    if (P.TOUR[tourStep].end) { setMode('flight'); return; }
    showTourStep(tourStep + 1);
  });
  $('tourRestart').addEventListener('click', () => showTourStep(0));

  // =====================================================================
  // DARSLIK
  // =====================================================================

  function readSet() {
    return new Set(store.read || []);
  }

  function renderChapterNav() {
    const read = readSet();
    $('chList').innerHTML = B.CHAPTERS.map((c, i) => `<li><button type="button" data-ch="${c.id}" aria-current="${c.id === store.chapter}" class="${read.has(c.id) ? 'read' : ''}">
      <span class="ch-num">${read.has(c.id) ? '✓' : i + 1}</span><span class="ch-title">${esc(c.title)}</span><span class="ch-min">${c.min} daq</span></button></li>`).join('');
    const n = B.CHAPTERS.filter((c) => read.has(c.id)).length;
    $('chBar').style.width = ((100 * n) / B.CHAPTERS.length).toFixed(0) + '%';
    $('chProgress').textContent = `${n} / ${B.CHAPTERS.length} bob o'qildi`;
    $('chSelect').innerHTML = B.CHAPTERS.map((c, i) => `<option value="${c.id}">${i + 1}. ${esc(c.title)}${read.has(c.id) ? ' ✓' : ''}</option>`).join('');
    $('chSelect').value = store.chapter || B.CHAPTERS[0].id;
  }

  function renderChapter(id, scroll) {
    const c = CHAPTER[id] || B.CHAPTERS[0];
    store.chapter = c.id;
    save();
    const i = B.CHAPTERS.indexOf(c);
    const next = B.CHAPTERS[i + 1];
    const read = readSet();
    $('chapter').innerHTML = `
      <p class="ch-meta">${i + 1}-bob · ${c.min} daqiqa o'qish</p>
      <h2 class="ch-h">${esc(c.title)}</h2>
      ${c.parts.length ? `<div class="ch-parts"><span>3D modelda ko'rish:</span>${c.parts.map((p) => `<button type="button" class="chip-btn" data-show="${p}">${esc(PART[p].name)}</button>`).join('')}</div>` : ''}
      <div class="ch-body">${c.html}</div>
      <section class="ch-summary"><h3>Esda tuting</h3><ul>${c.summary.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>
      <section class="ch-check"><h3>O'zingizni tekshiring</h3>
        ${c.check.map((q) => `<details><summary>${esc(q.q)}</summary><p>${esc(q.a)}</p></details>`).join('')}
      </section>
      <div class="ch-actions">
        <button type="button" class="btn primary" id="chDone">${read.has(c.id) ? 'O\'qilgan' : "O'qidim"}${next ? ' — keyingi bob' : ''}</button>
        ${c.id === 'pid' ? '<button type="button" class="btn" data-lab="1">Parvoz laboratoriyasini ochish</button>' : ''}
      </div>`;
    const pid = $('chapter').querySelector('.dg-pid');
    if (pid) pid.innerHTML = pidFigure();
    renderChapterNav();
    if (scroll) $('chapter').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function pidFigure() {
    const sets = [
      { g: { p: 8, i: 0, d: 0 }, cls: 'pf-bad', label: 'faqat P' },
      { g: { p: 8, i: 0, d: 1 }, cls: 'pf-mid', label: 'P + D' },
      { g: { p: 8, i: 4, d: 1 }, cls: 'pf-good', label: 'P + I + D' },
    ];
    const W = 520;
    const H = 230;
    const m = { l: 40, r: 12, t: 14, b: 34 };
    const X = (t) => m.l + (t / 2) * (W - m.l - m.r);
    const Y = (a) => H - m.b - ((a + 10) / 60) * (H - m.t - m.b);
    let s = '';
    [-10, 0, 10, 20, 30, 40, 50].forEach((v) => {
      s += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"></line><text x="${m.l - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end">${v}°</text>`;
    });
    [0, 0.5, 1, 1.5, 2].forEach((t) => { s += `<text x="${X(t).toFixed(1)}" y="${H - m.b + 16}" text-anchor="middle">${String(t).replace('.', ',')} s</text>`; });
    s += `<line class="ln dash" x1="${m.l}" x2="${W - m.r}" y1="${Y(20).toFixed(1)}" y2="${Y(20).toFixed(1)}"></line>`;
    s += `<clipPath id="pfClip"><rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}"></rect></clipPath>`;
    sets.forEach((set) => {
      const pts = L.stepResponse(set.g, 2, 0.01).map(([t, a]) => `${X(t).toFixed(1)},${Y(a).toFixed(1)}`).join(' ');
      s += `<polyline clip-path="url(#pfClip)" class="${set.cls}" points="${pts}"></polyline>`;
    });
    s += `<g transform="translate(${m.l + 10},${m.t + 8})">${sets.map((set, k) => `<line class="${set.cls}" x1="${k * 120}" x2="${k * 120 + 22}" y1="0" y2="0"></line><text x="${k * 120 + 28}" y="4">${set.label}</text>`).join('')}</g>`;
    s += `<text x="${W - m.r}" y="${Y(20) - 6}" text-anchor="end">nishon: 20°</text>`;
    return `<figure class="dg-fig"><svg class="dg" viewBox="0 0 ${W} ${H}" role="img" aria-label="PID javobi">${s}</svg>
      <figcaption>Dronga «20° og'il» buyrug'i berildi. Faqat P bilan tebranish kuchayib, dron ag'dariladi; D tebranishni so'ndiradi; I esa aniq nishonga keltiradi.</figcaption></figure>`;
  }

  $('chList').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-ch]');
    if (b) renderChapter(b.dataset.ch, window.innerWidth < 980);
  });
  $('chSelect').addEventListener('change', (e) => renderChapter(e.target.value, false));
  $('chapter').addEventListener('click', (e) => {
    const show = e.target.closest('button[data-show]');
    if (show) {
      setSub('model');
      setMode('parts');
      selectPart(show.dataset.show);
      $('stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (e.target.closest('button[data-lab]')) { setSub('lab'); return; }
    if (e.target.closest('#chDone')) {
      const read = readSet();
      read.add(store.chapter);
      store.read = Array.from(read);
      save();
      const i = B.CHAPTERS.findIndex((c) => c.id === store.chapter);
      const next = B.CHAPTERS[i + 1];
      renderChapter(next ? next.id : store.chapter, true);
    }
  });

  // =====================================================================
  // PARVOZ LABORATORIYASI
  // =====================================================================

  let lab = new L.Lab(Object.assign({ targetDeg: 0 }, L.PRESETS.good));
  let labRunning = false;
  let labLast = 0;
  let labPreset = 'good';
  const labCanvas = $('labCanvas');
  const chartCanvas = $('labChart');
  let lw = 0;
  let lh = 0;
  let cw = 0;
  let ch = 0;
  let ldpr = 1;
  let propPhase = 0;

  function css(k) {
    return getComputedStyle(document.documentElement).getPropertyValue('--' + k).trim();
  }

  function resizeLab() {
    ldpr = Math.min(2, window.devicePixelRatio || 1);
    const r1 = labCanvas.getBoundingClientRect();
    lw = Math.round(r1.width);
    lh = Math.round(r1.height);
    labCanvas.width = lw * ldpr;
    labCanvas.height = lh * ldpr;
    const r2 = chartCanvas.getBoundingClientRect();
    cw = Math.round(r2.width);
    ch = Math.round(r2.height);
    chartCanvas.width = cw * ldpr;
    chartCanvas.height = ch * ldpr;
  }

  function applyPreset(id) {
    labPreset = id;
    const pr = L.PRESETS[id];
    $('labP').value = pr.p;
    $('labI').value = pr.i;
    $('labD').value = pr.d;
    $('labWind').checked = !!pr.wind;
    $('labWeak').checked = !!pr.weak;
    $('labNoise').checked = id === 'highd';
    $('labTarget').value = pr.wind || pr.weak ? 0 : 20;
    lab = new L.Lab({
      p: pr.p, i: pr.i, d: pr.d, wind: !!pr.wind, weak: !!pr.weak, noise: id === 'highd',
      targetDeg: +$('labTarget').value,
    });
    $('labText').textContent = pr.text;
    syncLabOutputs();
  }

  function syncLabOutputs() {
    $('labPOut').textContent = fmt(+$('labP').value, 1);
    $('labIOut').textContent = fmt(+$('labI').value, 1);
    $('labDOut').textContent = fmt(+$('labD').value, 2);
    $('labTargetOut').textContent = $('labTarget').value + '°';
  }

  $('labPreset').innerHTML = Object.entries(L.PRESETS).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
  $('labPreset').addEventListener('change', (e) => applyPreset(e.target.value));
  [['labP', 'p'], ['labI', 'i'], ['labD', 'd']].forEach(([id, key]) => {
    $(id).addEventListener('input', (e) => { lab.set(key, +e.target.value); syncLabOutputs(); });
  });
  $('labTarget').addEventListener('input', (e) => { lab.set('targetDeg', +e.target.value); syncLabOutputs(); });
  $('labWind').addEventListener('change', (e) => lab.set('wind', e.target.checked));
  $('labWeak').addEventListener('change', (e) => lab.set('weak', e.target.checked));
  $('labNoise').addEventListener('change', (e) => lab.set('noise', e.target.checked));
  $('labGust').addEventListener('click', () => lab.kick(0.9, 0.12));
  $('labStep').addEventListener('click', () => {
    const v = +$('labTarget').value === 20 ? -20 : 20;
    $('labTarget').value = v;
    lab.set('targetDeg', v);
    syncLabOutputs();
  });
  $('labReset').addEventListener('click', () => {
    const keep = { p: lab.p, i: lab.i, d: lab.d, wind: lab.wind, weak: lab.weak, noise: lab.noise, targetDeg: +$('labTarget').value };
    lab = new L.Lab(keep);
  });

  function labFrame(now) {
    if (!labRunning) return;
    const dt = Math.min(0.05, (now - labLast) / 1000 || 0.016);
    labLast = now;
    lab.step(dt);
    propPhase += dt * 40;
    drawLab();
    drawChart();
    renderTerms();
    requestAnimationFrame(labFrame);
  }

  function drawLab() {
    if (!lw) resizeLab();
    const g = labCanvas.getContext('2d');
    g.setTransform(ldpr, 0, 0, ldpr, 0, 0);
    g.fillStyle = css('stage');
    g.fillRect(0, 0, lw, lh);
    const cx = lw / 2;
    const cy = lh * 0.55;
    const ink = css('ink');
    const muted = css('muted');
    const accent = css('accent');
    const drone = css('drone');
    const mono = css('font-mono');
    // Ufq
    g.strokeStyle = css('line');
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, cy); g.lineTo(lw, cy);
    g.stroke();
    // Nishon burchagi
    const half = Math.min(lw * 0.36, 180);
    // Musbat burchak — o'ng tomon pastga (chap motor kuchliroq bo'lganda)
    g.save();
    g.translate(cx, cy);
    g.rotate(lab.target);
    g.setLineDash([6, 5]);
    g.strokeStyle = muted;
    g.beginPath();
    g.moveTo(-half - 30, 0); g.lineTo(half + 30, 0);
    g.stroke();
    g.setLineDash([]);
    g.restore();
    // Shamol
    if (lab.wind || lab.gust > 0) {
      g.strokeStyle = lab.gust > 0 ? css('warn') : muted;
      g.lineWidth = 1.5;
      for (let k = 0; k < 4; k++) {
        const y = cy - 70 + k * 30;
        const x0 = lw - 20 - ((now() * 60 + k * 37) % 70);
        g.beginPath();
        g.moveTo(x0, y); g.lineTo(x0 - 40, y);
        g.lineTo(x0 - 32, y - 5);
        g.stroke();
      }
    }
    // Dron
    g.save();
    g.translate(cx, cy);
    g.rotate(lab.angle);
    const arm = half;
    g.fillStyle = ink;
    g.fillRect(-arm, -4, arm * 2, 8);
    g.fillRect(-26, -14, 52, 22);
    [-1, 1].forEach((side) => {
      const x = side * arm;
      g.fillStyle = css('muted');
      g.fillRect(x - 9, -20, 18, 16);
      // Vint (yon tomondan — tebranuvchi chiziq)
      const w = 46 * Math.abs(Math.cos(propPhase + (side > 0 ? 0.6 : 0)));
      g.strokeStyle = side < 0 ? css('ccw-prop') : css('cw-prop');
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x - w, -24); g.lineTo(x + w, -24);
      g.stroke();
      // Kuch strelkasi
      const n = side < 0 ? lab.leftN : lab.rightN;
      const len = n * 9;
      g.strokeStyle = accent;
      g.fillStyle = accent;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, -28); g.lineTo(x, -28 - len);
      g.stroke();
      g.beginPath();
      g.moveTo(x, -36 - len); g.lineTo(x - 6, -26 - len); g.lineTo(x + 6, -26 - len); g.closePath();
      g.fill();
      g.fillStyle = ink;
      g.font = `11px ${mono}`;
      g.textAlign = 'center';
      g.fillText(fmt(n, 1) + ' N', x, 18);
    });
    g.restore();
    // Matn
    g.fillStyle = ink;
    g.textAlign = 'left';
    g.font = `500 13px ${mono}`;
    g.fillText(`burchak ${fmt(lab.angle / L.DEG, 1)}°   nishon ${fmt(lab.target / L.DEG)}°`, 14, 22);
    g.fillStyle = muted;
    g.font = `11px ${mono}`;
    g.fillText('chap motor ←          → o\'ng motor', 14, lh - 12);
    if (lab.crashed) {
      g.fillStyle = css('bad');
      g.font = `600 16px ${css('font-display')}`;
      g.textAlign = 'center';
      g.fillText("DRON AG'DARILDI — sozlamani o'zgartirib, «Qayta boshlash» ni bosing", lw / 2, 46);
    }
  }

  function now() {
    return performance.now() / 1000;
  }

  function drawChart() {
    if (!cw) return;
    const g = chartCanvas.getContext('2d');
    g.setTransform(ldpr, 0, 0, ldpr, 0, 0);
    g.fillStyle = css('surface');
    g.fillRect(0, 0, cw, ch);
    const m = { l: 36, r: 8, t: 10, b: 20 };
    const span = 8;
    const hist = lab.history;
    const tEnd = lab.t;
    const tStart = Math.max(0, tEnd - span);
    const yMax = 45;
    const X = (t) => m.l + ((t - (tEnd - span)) / span) * (cw - m.l - m.r);
    const Y = (a) => m.t + ((yMax - Math.max(-yMax, Math.min(yMax, a))) / (2 * yMax)) * (ch - m.t - m.b);
    g.strokeStyle = css('line');
    g.fillStyle = css('muted');
    g.font = `10px ${css('font-mono')}`;
    g.lineWidth = 1;
    g.textAlign = 'right';
    [-40, -20, 0, 20, 40].forEach((v) => {
      g.beginPath();
      g.moveTo(m.l, Y(v) + 0.5); g.lineTo(cw - m.r, Y(v) + 0.5);
      g.stroke();
      g.fillText(v + '°', m.l - 4, Y(v) + 3);
    });
    g.textAlign = 'left';
    g.fillText("so'nggi 8 soniya", m.l + 4, ch - 6);
    const draw = (key, color, dash, width) => {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.setLineDash(dash);
      g.beginPath();
      let started = false;
      for (const h of hist) {
        if (h.t < tStart) continue;
        const x = X(h.t);
        const y = Y(h[key]);
        if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y);
      }
      g.stroke();
      g.setLineDash([]);
    };
    draw('target', css('muted'), [5, 4], 1.5);
    draw('angle', css('accent'), [], 2.2);
  }

  function renderTerms() {
    const t = lab.terms;
    const max = L.PLANT.maxDelta;
    [['p', t.p], ['i', t.i], ['d', t.d], ['u', lab.cmd]].forEach(([k, v]) => {
      const el = $('term-' + k);
      const pct = Math.max(-1, Math.min(1, v / max));
      const bar = el.querySelector('i');
      bar.style.left = pct < 0 ? (50 + pct * 50).toFixed(1) + '%' : '50%';
      bar.style.width = (Math.abs(pct) * 50).toFixed(1) + '%';
      el.querySelector('b').textContent = (v >= 0 ? '+' : '−') + fmt(Math.abs(v), 2) + ' N';
    });
  }

  // =====================================================================
  // Ishga tushirish
  // =====================================================================

  renderPartList();
  renderPartInfo();
  setManeuver('hover');
  renderChapterNav();
  applyPreset('good');
  $('labPreset').value = 'good';
  document.querySelectorAll('#tzSeg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.sub === sub)));

  window.addEventListener('resize', () => {
    if (viewer && visible && sub === 'model') viewer.resize();
    if (visible && sub === 'lab') resizeLab();
  });

  function onTheme() {
    if (viewer) viewer.setTheme(readTheme());
  }
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onTheme);
  } catch (e) { /* eski brauzerlar */ }
  new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  window.DronTuzilish = {
    openChapter(id) { setSub('darslik'); renderChapter(id, false); },
  };
})();
