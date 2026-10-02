// StockTill reklamasi uchun 1:20 lik jozibador musiqa va ovoz effektlari.
// Hammasi kod bilan sintez qilinadi (tashqi musiqa yo'q): 120 BPM, Am–F–C–G,
// eslab qolinadigan bosh melodiya, house barabanlari, bas, akkord "stab"lari.
// Tuzilish videoning sahnalariga moslangan (har bir takt 2 soniya):
//   0–8 s intro · 8–16 s kuchayish · 16–32 s naqarot · 32–48 s kuplet ·
//   48–64 s naqarot · 64–68 s pauza · 68–76 s final · 76–80 s yakun.
'use strict';
const { reverb, svf, writeWav } = require('../audio.js');

const TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const BPM = 120, BEAT = 60 / BPM, STEP = BEAT / 4, BAR = BEAT * 4;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

const CHORDS = {
  Am: { root: 45, v: [57, 60, 64] },
  F: { root: 41, v: [57, 60, 65] },
  C: { root: 48, v: [55, 60, 64] },
  G: { root: 43, v: [55, 59, 62] },
};
const PROG = ['Am', 'F', 'C', 'G'];
// Bosh melodiya: [takt, 1/16 qadam, uzunlik (qadam), MIDI]
const HOOK = [
  [0, 0, 2, 69], [0, 3, 1, 72], [0, 4, 2, 76], [0, 6, 1, 74], [0, 7, 1, 72], [0, 8, 3, 76], [0, 12, 2, 79], [0, 14, 2, 76],
  [1, 0, 2, 77], [1, 3, 1, 76], [1, 4, 2, 72], [1, 6, 2, 69], [1, 8, 4, 72], [1, 12, 2, 69], [1, 14, 2, 72],
  [2, 0, 2, 67], [2, 3, 1, 72], [2, 4, 2, 76], [2, 6, 1, 74], [2, 7, 1, 72], [2, 8, 3, 76], [2, 12, 2, 79], [2, 14, 2, 81],
  [3, 0, 2, 79], [3, 3, 1, 76], [3, 4, 4, 74], [3, 8, 2, 71], [3, 10, 2, 74], [3, 12, 4, 74],
];
const section = (bar) => (bar < 4 ? 'intro' : bar < 8 ? 'build' : bar < 16 ? 'chorus' : bar < 24 ? 'verse' : bar < 32 ? 'chorus2' : bar < 34 ? 'break' : bar < 38 ? 'final' : 'outro');

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function render(cues, duration, sr = 48000) {
  const N = Math.ceil(duration * sr);
  const dry = [new Float32Array(N), new Float32Array(N)];
  const rev = [new Float32Array(N), new Float32Array(N)];
  const dly = [new Float32Array(N), new Float32Array(N)];
  const duck = new Float32Array(N).fill(1);
  const rand = rng(1790000000);
  const noise = () => rand() * 2 - 1;

  function add(t0, dur, gen, o = {}) {
    const { gain = 1, pan = 0, rv = 0, dl = 0, ducked = false } = o;
    const gl = Math.cos((pan + 1) * Math.PI / 4) * gain, gr = Math.sin((pan + 1) * Math.PI / 4) * gain;
    const s0 = Math.round(t0 * sr), len = Math.round(dur * sr);
    for (let k = 0; k < len; k++) {
      const i = s0 + k; if (i < 0) continue; if (i >= N) break;
      let v = gen(k / sr); if (ducked) v *= duck[i];
      const l = v * gl, r = v * gr;
      dry[0][i] += l; dry[1][i] += r;
      if (rv) { rev[0][i] += l * rv; rev[1][i] += r * rv; }
      if (dl) { dly[0][i] += l * dl; dly[1][i] += r * dl; }
    }
  }
  const blep = (t, dt) => { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; };
  const saw = (f) => { let ph = rand(); const dt = f / sr; return () => { ph += dt; if (ph >= 1) ph -= 1; return 2 * ph - 1 - blep(ph, dt); }; };
  const adsr = (t, len, a, d, s, r) => (t < a ? t / a : t < a + d ? 1 - (1 - s) * (t - a) / d : t < len ? s : s * Math.exp(-(t - len) / (r / 3)));

  // ---------- Asboblar ----------
  function lead(t0, len, m, gain, cutoff, o = {}) {
    const f = mtof(m), v = [saw(f), saw(f * 1.006), saw(f * 0.994)], flt = svf();
    add(t0, len + 0.25, (t) => {
      const env = adsr(t, len, 0.004, 0.16, 0.62, 0.12);
      const x = (v[0]() + 0.75 * v[1]() + 0.75 * v[2]()) * 0.4;
      return flt(x, cutoff * (1 + 1.8 * Math.exp(-t / 0.07)), 0.9, sr).lp * env;
    }, { gain, pan: o.pan || 0, rv: 0.22, dl: o.dl == null ? 0.32 : o.dl });
  }
  function stab(t0, notes, gain) {
    notes.forEach((m, j) => {
      const f = mtof(m), a = saw(f * 1.004), b = saw(f * 0.996), flt = svf();
      add(t0, 0.32, (t) => flt((a() + b()) * 0.5, 900 + 2400 * Math.exp(-t / 0.05), 0.8, sr).lp * Math.exp(-t / 0.1) * Math.min(1, t * 600),
        { gain, pan: [-0.35, 0, 0.35][j % 3], rv: 0.25, ducked: true });
    });
  }
  function pad(t0, len, notes, gain, cutoff = 1100) {
    notes.forEach((m, j) => {
      for (const [pan, det] of [[-0.7, 0.995], [0.7, 1.005]]) {
        const o = saw(mtof(m) * det), flt = svf();
        add(t0, len + 0.6, (t) => flt(o(), cutoff, 0.7, sr).lp * adsr(t, len, 0.35, 0.3, 0.85, 0.6) * (1 + 0.06 * Math.sin(TAU * 0.3 * (t0 + t) + j)),
          { gain, pan, rv: 0.4, ducked: true });
      }
    });
  }
  function bassNote(t0, m, len, gain) {
    const o = saw(mtof(m)), flt = svf();
    add(t0, len + 0.05, (t) => {
      const env = Math.min(1, t * 400) * (t < len ? Math.exp(-t / 0.35) : Math.exp(-len / 0.35) * Math.exp(-(t - len) / 0.012));
      return (flt(o(), 380 + 900 * Math.exp(-t / 0.04), 1.1, sr).lp + 0.35 * Math.sin(TAU * mtof(m) * t)) * env;
    }, { gain, ducked: true });
  }
  function sub(t0, len, m, gain) {
    const f = mtof(m - 12);
    add(t0, len, (t) => Math.sin(TAU * f * t) * Math.min(1, t / 0.02) * Math.min(1, (len - t) / 0.03), { gain, ducked: true });
  }
  function pluck(t0, m, gain, pan) {
    const f = mtof(m), o = saw(f), flt = svf();
    add(t0, 0.35, (t) => flt(o(), 600 + 3800 * Math.exp(-t / 0.03), 1, sr).lp * Math.exp(-t / 0.09) * Math.min(1, t * 800), { gain, pan, rv: 0.3, dl: 0.35 });
  }
  function kick(t0, gain = 1) {
    const s0 = Math.round(t0 * sr);
    for (let k = 0; k < sr * 0.4; k++) { const i = s0 + k; if (i >= N) break; duck[i] = Math.min(duck[i], 1 - 0.55 * Math.exp(-k / sr / 0.12)); }
    add(t0, 0.45, (t) => {
      const ph = TAU * (48 * t + (160 - 48) * (1 - Math.exp(-t * 28)) / 28);
      return (Math.sin(ph) * Math.exp(-t / 0.2) + 0.25 * noise() * Math.exp(-t * 900)) * Math.min(1, t * 2000);
    }, { gain: 0.33 * gain });
  }
  function clap(t0, gain = 1) {
    const flt = svf();
    add(t0, 0.3, (t) => {
      const burst = [0, 0.009, 0.018].reduce((a, o) => a + (t >= o ? Math.exp(-(t - o) / 0.006) : 0), 0) * 0.6 + Math.exp(-t / 0.12) * 0.5;
      return flt(noise(), 1150, 1.3, sr).bp * burst;
    }, { gain: 0.5 * gain, rv: 0.25 });
  }
  function hat(t0, gain = 1, open = false) {
    const flt = svf();
    add(t0, open ? 0.35 : 0.06, (t) => flt(noise(), open ? 7000 : 8500, 0.8, sr).hp * Math.exp(-t / (open ? 0.13 : 0.022)), { gain: (open ? 0.12 : 0.09) * gain, pan: open ? -0.25 : 0.25 });
  }
  function snare(t0, gain = 1) {
    const flt = svf();
    add(t0, 0.25, (t) => (flt(noise(), 1900, 0.9, sr).bp * 0.9 + 0.4 * Math.sin(TAU * 190 * t)) * Math.exp(-t / 0.09), { gain: 0.3 * gain, rv: 0.2 });
  }
  function crash(t0, gain = 1) {
    const flt = svf();
    add(t0, 2.4, (t) => flt(noise(), 5200, 0.6, sr).hp * Math.exp(-t / 0.9) * Math.min(1, t * 900), { gain: 0.16 * gain, rv: 0.5 });
  }
  function riser(t0, len, gain = 1) {
    const flt = svf();
    add(t0, len, (t) => {
      const x = t / len;
      return flt(noise(), 300 * Math.pow(30, x), 2.2, sr).bp * x * x * 0.9 + Math.sin(TAU * (180 * t + 400 * t * t / len)) * 0.08 * x;
    }, { gain: 0.22 * gain, rv: 0.4 });
  }
  function impact(t0, gain = 1) {
    add(t0, 1.8, (t) => Math.sin(TAU * (32 * t + (90 - 32) * (1 - Math.exp(-t * 14)) / 14)) * Math.exp(-t / 0.6) * Math.min(1, t * 900), { gain: 0.5 * gain });
    crash(t0, 0.9 * gain);
  }

  // ---------- Aranjirovka ----------
  const bars = Math.floor(duration / BAR);
  for (let bar = 0; bar < bars; bar++) {
    const t = bar * BAR, sec = section(bar), ch = CHORDS[PROG[bar % 4]];
    const full = sec === 'chorus' || sec === 'chorus2' || sec === 'final';
    const at = (step) => t + step * STEP;

    if (sec === 'outro') {
      if (bar === 38) {
        // yakuniy C-major akkordi
        const C = CHORDS.C;
        impact(t, 1.1);
        pad(t, 3.0, [48, 55, 60, 64, 67, 72], 0.016, 2400);
        stab(t, [55, 60, 64, 67], 0.07);
        sub(t, 2.6, 48, 0.12);
        lead(t, 1.6, 72, 0.06, 2600, { dl: 0.4 });
        lead(t, 1.6, 76, 0.045, 2600, { dl: 0.4, pan: 0.2 });
      }
      continue;
    }

    // Pad (hamma joyda, intro va pauzada asosiy)
    const padGain = sec === 'intro' ? 0.012 : sec === 'break' ? 0.016 : full ? 0.009 : 0.011;
    const padCut = sec === 'intro' ? 500 + 700 * (bar / 4) : sec === 'break' ? 900 : 1300;
    pad(t, BAR, ch.v, padGain, padCut);

    // Baraban
    if (sec === 'intro') {
      if (bar >= 2) for (let s = 2; s < 16; s += 4) hat(at(s), 0.6);
      if (bar === 3) { riser(t, BAR, 0.6); }
    } else if (sec === 'build' || full || sec === 'verse') {
      for (let b = 0; b < 4; b++) kick(at(b * 4), sec === 'build' && bar < 6 ? 0.85 : 1);
      const sparse = sec === 'build' && bar < 6;
      if (!sparse) for (const b of [4, 12]) clap(at(b), sec === 'verse' ? 0.75 : 1);
      for (let s = 0; s < 16; s += sparse ? 2 : 1) hat(at(s), (s % 4 === 2 ? 1 : s % 2 ? 0.45 : 0.65) * (sec === 'build' ? 0.8 : 1));
      if (full) for (const s of [2, 6, 10, 14]) hat(at(s), 0.8, true);
    } else if (sec === 'break') {
      if (bar === 33) { riser(t, BAR, 1); for (let s = 8; s < 16; s++) snare(at(s), 0.35 + (s - 8) * 0.09); }
    }
    // Barabanli o'tishlar
    if (bar === 7) { riser(t, BAR, 1.1); for (let s = 0; s < 16; s++) snare(at(s), 0.25 + s * 0.05); }
    if (bar === 15 || bar === 31) for (const s of [12, 13, 14, 15]) snare(at(s), 0.7);
    if (bar === 23) { riser(t, BAR, 0.8); for (let s = 8; s < 16; s++) snare(at(s), 0.3 + (s - 8) * 0.08); }
    if ([8, 24, 34].includes(bar)) impact(t, 1);
    if ([12, 16, 20, 28, 36].includes(bar)) crash(t, 0.8);
    if (bar === 32) { crash(t, 1); }

    // Bas
    if (sec === 'build' || full || sec === 'verse') {
      for (const s of [2, 6, 10, 14]) bassNote(at(s), ch.root, STEP * 1.6, 0.13);
      sub(t, BAR, ch.root, full ? 0.085 : 0.07);
    } else if (sec === 'break') {
      sub(t, BAR, ch.root, 0.07);
    }

    // Akkord stab'lari (naqarot va kuchayish)
    if (full || (sec === 'build' && bar >= 6)) for (const s of [2, 6, 10, 14]) stab(at(s), ch.v, full ? 0.07 : 0.045);

    // Arpedjio (kuplet)
    if (sec === 'verse' || sec === 'build') {
      const notes = [...ch.v.map((m) => m + 12), ch.v[1] + 24];
      const pat = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 2, 1, 3];
      for (let s = 0; s < 16; s++) pluck(at(s), notes[pat[s]], sec === 'build' ? 0.035 : 0.055, s % 2 ? 0.4 : -0.4);
    }

    // Bosh melodiya
    const phraseBar = bar % 4;
    const hookNotes = HOOK.filter((n) => n[0] === phraseBar);
    if (full) {
      const up = sec !== 'chorus';
      for (const [, st, len, m] of hookNotes) {
        lead(at(st), len * STEP, m, 0.16, 2600);
        if (up) lead(at(st), len * STEP, m + 12, 0.045, 3200, { pan: 0.15 });
        if (sec === 'final') lead(at(st), len * STEP, m - 5, 0.035, 2200, { pan: -0.2, dl: 0.2 });
      }
    } else if (sec === 'intro' && bar >= 2) {
      for (const [, st, len, m] of hookNotes) lead(at(st), len * STEP, m, 0.045, 700 + 500 * (bar - 2));
    } else if (sec === 'break') {
      for (const [, st, len, m] of hookNotes) lead(at(st), len * STEP, m, 0.06, 900 + 700 * (bar - 32));
    } else if (sec === 'verse' && bar >= 20) {
      // kupletning ikkinchi yarmi: melodiyaning yengil "pluck" varianti
      for (const [, st, len, m] of hookNotes) if (st % 4 === 0) pluck(at(st), m, 0.05, 0);
    }
  }

  // ---------- Video effektlari (sahnalarga mos, past ovozda) ----------
  const FX = {
    whoosh: (t) => { const f = svf(); add(t - 0.25, 0.7, (x) => f(noise(), 350 * Math.pow(12, x / 0.7), 1.4, sr).bp * Math.sin(Math.PI * x / 0.7) ** 2, { gain: 0.11, rv: 0.3 }); },
    pop: (t) => add(t, 0.1, (x) => Math.sin(TAU * (500 * x + 3000 * x * x)) * Math.exp(-x / 0.03), { gain: 0.06, rv: 0.2 }),
    tap: (t) => add(t, 0.05, (x) => Math.sin(TAU * 2100 * x) * Math.exp(-x * 150), { gain: 0.05 }),
    ding: (t) => [1318.5, 1975.5].forEach((f, j) => add(t + j * 0.08, 1.2, (x) => (Math.sin(TAU * f * x) + 0.3 * Math.sin(TAU * f * 2.76 * x) * Math.exp(-x * 6)) * Math.exp(-x / 0.35) * Math.min(1, x * 500), { gain: 0.045, rv: 0.5, pan: j ? 0.2 : -0.2 })),
    type: (t) => { for (let j = 0; j < 4; j++) add(t + j * 0.07, 0.03, (x) => noise() * Math.exp(-x * 400), { gain: 0.03 }); },
  };
  for (const [type, t] of cues || []) if (FX[type]) FX[type](t);

  // ---------- Effekt shinalari va mastering ----------
  // Ping-pong delay (nuqtali 1/8): 0.375 s
  const dlen = Math.round(BEAT * 0.75 * sr), dbuf = [new Float32Array(dlen), new Float32Array(dlen)];
  const dlo = [svf(), svf()];
  const dOut = [new Float32Array(N), new Float32Array(N)];
  for (let i = 0, p = 0; i < N; i++, p = (p + 1) % dlen) {
    const yl = dbuf[0][p], yr = dbuf[1][p];
    dOut[0][i] = yl; dOut[1][i] = yr;
    // kirish chap chiziqqa tushadi, aks-sado chap↔o'ng almashib qaytadi
    dbuf[0][p] = (dly[0][i] + dly[1][i]) * 0.5 + dlo[0](yr * 0.45, 3500, 0.7, sr).lp;
    dbuf[1][p] = dlo[1](yl * 0.45, 3500, 0.7, sr).lp;
  }
  const [wl, wr] = reverb(rev[0], rev[1], sr, { room: 0.82, damp: 0.5 });
  const out = [new Float32Array(N), new Float32Array(N)];
  // Kompressor (stereo bog'langan), keyin oldindan ko'ruvchi limiter (5 ms)
  const atk = Math.exp(-1 / (0.004 * sr)), rel = Math.exp(-1 / (0.09 * sr));
  const thr = -12, ratio = 2, makeup = Math.pow(10, 2 / 20);
  let env = 0;
  for (let i = 0; i < N; i++) {
    const t = i / sr;
    const fade = Math.min(1, t / 0.02) * Math.min(1, (duration - t) / 1.2);
    const l = dry[0][i] + wl[i] * 2.6 + dOut[0][i] * 0.5;
    const r = dry[1][i] + wr[i] * 2.6 + dOut[1][i] * 0.5;
    const x = Math.max(Math.abs(l), Math.abs(r));
    env = x > env ? atk * env + (1 - atk) * x : rel * env + (1 - rel) * x;
    const over = 20 * Math.log10(env + 1e-9) - thr;
    const g = (over > 0 ? Math.pow(10, -over * (1 - 1 / ratio) / 20) : 1) * makeup * fade;
    out[0][i] = l * g; out[1][i] = r * g;
  }
  // Limiter: kerakli kuchaytirishning oldinga qaragan minimumi + o'rtacha (silliq), sekin tiklanish
  let pk = 0;
  for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(out[0][i]), Math.abs(out[1][i]));
  const ceil = 0.89, pre = (ceil / (pk || 1)) * Math.pow(10, 4 / 20);
  const W = Math.round(0.005 * sr), req = new Float32Array(N), mn = new Float32Array(N);
  for (let i = 0; i < N; i++) req[i] = Math.min(1, ceil / (pre * Math.max(Math.abs(out[0][i]), Math.abs(out[1][i])) + 1e-9));
  const dq = new Int32Array(N); let h = 0, tl = 0;
  for (let i = N - 1; i >= 0; i--) {           // mn[i] = min(req[i..i+W])
    while (tl > h && req[dq[tl - 1]] >= req[i]) tl--;
    dq[tl++] = i;
    while (dq[h] > i + W) h++;
    mn[i] = req[dq[h]];
  }
  let acc = 0, g = 1;
  const relL = Math.exp(-1 / (0.08 * sr));
  for (let i = 0; i < N; i++) {
    acc += mn[i]; if (i >= W) acc -= mn[i - W];
    const sm = acc / Math.min(i + 1, W);
    g = sm < g ? sm : g + (sm - g) * (1 - relL);
    for (let c = 0; c < 2; c++) out[c][i] = Math.max(-0.99, Math.min(0.99, out[c][i] * pre * g));
  }
  return out;
}

module.exports = { render, writeWav, BAR, BEAT };

if (require.main === module) {
  const file = process.argv[2] || 'music.wav';
  const t0 = Date.now();
  writeWav(file, render([], 80, 48000), 48000);
  console.log(file, ((Date.now() - t0) / 1000).toFixed(1) + ' s');
}
