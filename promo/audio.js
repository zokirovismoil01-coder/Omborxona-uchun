// Videoning ovozi: fon musiqasi va effektlar shu yerda sintez qilinadi,
// shuning uchun tashqi musiqa fayli (va mualliflik huquqi muammosi) yo'q.
// synth(cues, duration) video.html dagi CUES ro'yxati bo'yicha ovozni kadrga moslaydi.
'use strict';
const fs = require('fs');

const TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Andrew Simper'ning TPT SVF filtri (past/polosali/yuqori o'tkazuvchi)
function svf() {
  let ic1 = 0, ic2 = 0;
  return (x, fc, q, sr) => {
    const g = Math.tan(Math.PI * Math.min(fc, sr * 0.45) / sr);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    return { lp: v2, bp: v1, hp: x - k * v1 - v2 };
  };
}

// Freeverb (Jezar) — oddiy, ammo yoqimli aks-sado
function reverb(inL, inR, sr, { room = 0.84, damp = 0.45 } = {}) {
  const sc = sr / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const apT = [556, 441, 341, 225];
  const mk = (off) => ({
    cb: combT.map((n) => new Float32Array(Math.round((n + off) * sc))),
    ci: new Int32Array(8),
    cs: new Float64Array(8),
    ab: apT.map((n) => new Float32Array(Math.round((n + off) * sc))),
    ai: new Int32Array(4),
  });
  const chans = [mk(0), mk(23)];
  const fb = room * 0.28 + 0.7;
  const d1 = damp * 0.4, d2 = 1 - d1;
  const N = inL.length;
  const out = [new Float32Array(N), new Float32Array(N)];
  for (let n = 0; n < N; n++) {
    const x = (inL[n] + inR[n]) * 0.015;
    for (let c = 0; c < 2; c++) {
      const ch = chans[c];
      let acc = 0;
      for (let j = 0; j < 8; j++) {
        const buf = ch.cb[j];
        const i = ch.ci[j];
        const y = buf[i];
        ch.cs[j] = y * d2 + ch.cs[j] * d1;
        buf[i] = x + ch.cs[j] * fb;
        ch.ci[j] = i + 1 >= buf.length ? 0 : i + 1;
        acc += y;
      }
      for (let j = 0; j < 4; j++) {
        const buf = ch.ab[j];
        const i = ch.ai[j];
        const b = buf[i];
        buf[i] = acc + b * 0.5;
        acc = b - acc;
        ch.ai[j] = i + 1 >= buf.length ? 0 : i + 1;
      }
      out[c][n] = acc;
    }
  }
  return out;
}

function synth(cues, duration, sr = 48000) {
  const N = Math.ceil(duration * sr);
  const dry = [new Float32Array(N), new Float32Array(N)];
  const send = [new Float32Array(N), new Float32Array(N)];
  const duck = new Float32Array(N).fill(1); // kik barabanidan "nafas olish" (sidechain)
  const rand = rng(20261002);
  const noise = () => rand() * 2 - 1;

  // mono signalni (gen(i, t) → qiymat) aralashmaga qo'shish
  function add(t0, dur, gen, { gain = 1, pan = 0, rev = 0, ducked = false } = {}) {
    const gl = Math.cos((pan + 1) * Math.PI / 4) * gain;
    const gr = Math.sin((pan + 1) * Math.PI / 4) * gain;
    const s0 = Math.round(t0 * sr);
    const len = Math.round(dur * sr);
    for (let k = 0; k < len; k++) {
      const i = s0 + k;
      if (i < 0) continue;
      if (i >= N) break;
      let v = gen(k, k / sr);
      if (ducked) v *= duck[i];
      dry[0][i] += v * gl;
      dry[1][i] += v * gr;
      if (rev) {
        send[0][i] += v * gl * rev;
        send[1][i] += v * gr * rev;
      }
    }
  }

  // ---------- Asboblar ----------
  const bell = (f, decay = 1.2, parts = [[1, 1], [2.0, 0.32], [2.76, 0.22], [5.4, 0.08], [8.93, 0.03]]) => (k, t) => {
    let v = 0;
    for (const [m, a] of parts) v += a * Math.sin(TAU * f * m * t) * Math.exp(-t * (1 + m * 0.9) / decay);
    return v * Math.min(1, t * 400);
  };
  const pluck = (f, decay = 0.28) => (k, t) =>
    (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 12)) * Math.exp(-t / decay) * Math.min(1, t * 300);
  const marimba = (f) => (k, t) =>
    (Math.sin(TAU * f * t) * Math.exp(-t * 5) + 0.3 * Math.sin(TAU * 4 * f * t) * Math.exp(-t * 18) + 0.08 * Math.sin(TAU * 10 * f * t) * Math.exp(-t * 40)) * Math.min(1, t * 500);
  // chastotasi f0 dan f1 ga tushadigan "gup" (kik, zarba)
  const boom = (f0, f1, decay) => (k, t) => {
    const ph = TAU * (f1 * t + (f0 - f1) * (1 - Math.exp(-t * 18)) / 18);
    return Math.sin(ph) * Math.exp(-t / decay) * Math.min(1, t * 800);
  };
  const blip = (f0, f1, dur) => (k, t) => {
    const x = t / dur;
    const ph = TAU * (f0 * t + (f1 - f0) * t * x / 2);
    return Math.sin(ph) * Math.sin(Math.PI * clamp(x)) ** 2;
  };
  function sweep(dur, f0, f1, q, shape) {
    const flt = svf();
    return (k, t) => {
      const x = t / dur;
      const fc = f0 * Math.pow(f1 / f0, x);
      return flt(noise(), fc, q, sr).bp * shape(x);
    };
  }
  function hiss(decay, fc) {
    const flt = svf();
    return (k, t) => flt(noise(), fc, 0.7, sr).hp * Math.exp(-t / decay);
  }

  // ---------- Musiqa (100 BPM) ----------
  const BEAT = 0.6;
  const CH = {
    F: { b: 41, n: [53, 57, 60, 64, 67] },
    Am: { b: 45, n: [57, 60, 64, 67, 71] },
    C: { b: 48, n: [55, 60, 62, 64, 67] },
    G: { b: 43, n: [55, 59, 62, 64, 69] },
    Gsus: { b: 43, n: [55, 60, 62, 67, 74] },
    G7: { b: 43, n: [55, 59, 62, 65, 74] },
    Cmaj9: { b: 36, n: [52, 55, 59, 62, 67, 71] },
  };
  const PROG = [[0, 'F'], [6.6, 'Am'], [9.6, 'F'], [13.2, 'C'], [16.2, 'G'], [18.0, 'Am'], [19.8, 'Gsus'], [21.7, 'G7'], [22.4, 'Cmaj9']]
    .filter(([t]) => t < duration);
  const chordEnd = (c) => (c + 1 < PROG.length ? PROG[c + 1][0] : duration + 1);

  // Pad: iliq akkordlar, chap/o'ng kanallar biroz farqli sozlangan
  for (let c = 0; c < PROG.length; c++) {
    const [ta, name] = PROG[c];
    const tb = chordEnd(c);
    const chord = CH[name];
    const att = c === 0 ? 1.6 : 0.45;
    const rel = 0.9;
    const dur = tb - ta + rel;
    const lvl = name === 'Cmaj9' ? 1.25 : name === 'Gsus' || name === 'G7' ? 1.1 : 1;
    chord.n.forEach((m, j) => {
      const f = mtof(m);
      for (const [pan, det] of [[-0.6, -0.0025], [0.6, 0.0025]]) {
        const ff = f * (1 + det * (j % 2 ? 1 : -1));
        add(ta, dur, (k, t) => {
          const env = Math.min(1, t / att) * (t > tb - ta ? Math.exp(-(t - (tb - ta)) / (rel / 3)) : 1);
          const lfo = 1 + 0.08 * Math.sin(TAU * 0.23 * (ta + t) + j);
          return env * lfo * (Math.sin(TAU * ff * t) + 0.32 * Math.sin(TAU * 2 * ff * t + 0.7) + 0.1 * Math.sin(TAU * 3 * ff * t + 1.3));
        }, { gain: 0.0125 * lvl, pan, rev: 0.5, ducked: true });
      }
    });
  }

  // Kik baraban + sidechain
  const kicks = [];
  for (let t = 3.0; t < 19.75; t += BEAT) kicks.push(t);
  for (const tk of kicks) {
    const s0 = Math.round(tk * sr);
    for (let k = 0; k < sr * 0.45; k++) {
      const i = s0 + k;
      if (i >= N) break;
      duck[i] = Math.min(duck[i], 1 - 0.42 * Math.exp(-k / sr / 0.11));
    }
    const late = tk >= 16.2; // matn sahnasida yengilroq
    add(tk, 0.5, boom(140, 46, 0.16), { gain: late ? 0.21 : 0.27 });
    add(tk, 0.02, (k, t) => noise() * Math.exp(-t * 300), { gain: 0.04 });
  }

  // Bas: akkord asosiy notasi, sidechain bilan
  for (let c = 0; c < PROG.length; c++) {
    const [ta, name] = PROG[c];
    const tb = chordEnd(c);
    const start = Math.max(ta, name === 'Cmaj9' ? ta : 3.0);
    if (tb <= 3.0 && name !== 'Cmaj9') continue;
    const f = mtof(CH[name].b);
    const dur = tb - start + 0.3;
    add(start, dur, (k, t) => {
      const env = Math.min(1, t / 0.05) * (t > tb - start ? Math.exp(-(t - (tb - start)) / 0.08) : 1);
      return env * (Math.sin(TAU * f * t) + 0.18 * Math.sin(TAU * 2 * f * t));
    }, { gain: name === 'Cmaj9' ? 0.14 : 0.1, ducked: true });
  }

  // Shaker (yarim zarblarda) va arpedjio
  for (let t = 6.6 + BEAT / 2; t < 19.75; t += BEAT) add(t, 0.09, hiss(0.03, 7000), { gain: 0.05, pan: 0.25 });
  const arpPat = [0, 2, 1, 3, 2, 4, 3, 1];
  let step = 0;
  for (let t = 6.6; t < 19.75; t += BEAT / 2, step++) {
    const name = PROG.filter((p) => p[0] <= t + 1e-6).pop()[1];
    const notes = CH[name].n;
    const m = notes[arpPat[step % arpPat.length] % notes.length] + 12;
    add(t, 0.9, pluck(mtof(m), 0.22), { gain: 0.052, pan: step % 2 ? 0.35 : -0.35, rev: 0.6, ducked: true });
  }

  // ---------- Effektlar ----------
  const FX = {
    swell: (t) => add(t, 1.4, sweep(1.4, 300, 2400, 0.8, (x) => x * x * (x < 0.85 ? 1 : (1 - x) / 0.15)), { gain: 0.1, rev: 0.4 }),
    impact: (t) => {
      add(t, 1.6, boom(90, 34, 0.55), { gain: 0.42 });
      add(t, 0.6, sweep(0.6, 900, 160, 0.9, (x) => Math.exp(-x * 6)), { gain: 0.12, rev: 0.5 });
    },
    shimmer: (t) => {
      [2093, 2637, 3136, 3951].forEach((f, j) => add(t + j * 0.05, 2.2, bell(f, 1.4), { gain: 0.022, pan: j % 2 ? 0.5 : -0.5, rev: 0.9 }));
    },
    whoosh: (t) => add(t - 0.2, 0.75, sweep(0.75, 280, 3200, 1.6, (x) => Math.sin(Math.PI * x) ** 2), { gain: 0.16, pan: 0, rev: 0.35 }),
    tap: (t) => {
      add(t, 0.05, (k, tt) => Math.sin(TAU * 2200 * tt) * Math.exp(-tt * 140), { gain: 0.07 });
      add(t, 0.12, boom(220, 90, 0.03), { gain: 0.12 });
    },
    listenOn: (t) => add(t, 0.16, blip(880, 1320, 0.16), { gain: 0.06, rev: 0.4 }),
    listenOff: (t) => add(t, 0.16, blip(1320, 880, 0.16), { gain: 0.05, rev: 0.4 }),
    tick: (t) => add(t, 0.06, (k, tt) => Math.sin(TAU * 1760 * tt) * Math.exp(-tt * 90), { gain: 0.05, rev: 0.3 }),
    ding: (t) => {
      add(t, 2.0, bell(1318.5, 1.1), { gain: 0.09, pan: 0.1, rev: 0.7 });
      add(t + 0.09, 2.0, bell(1975.5, 0.9), { gain: 0.05, pan: -0.1, rev: 0.7 });
    },
    morph: (t) => add(t, 0.35, sweep(0.35, 700, 5000, 2, (x) => Math.sin(Math.PI * x)), { gain: 0.07, rev: 0.4 }),
    coin: (t) => {
      add(t, 1.2, bell(1318.5, 0.5, [[1, 1], [2.4, 0.4], [3.9, 0.2], [6.1, 0.1]]), { gain: 0.08, pan: -0.15, rev: 0.6 });
      add(t + 0.075, 1.6, bell(2637, 0.7, [[1, 1], [2.4, 0.35], [3.9, 0.15]]), { gain: 0.07, pan: 0.15, rev: 0.6 });
      add(t, 0.4, hiss(0.09, 6500), { gain: 0.05, rev: 0.5 });
    },
    count: (t) => { for (let j = 0; j < 7; j++) add(t + j * 0.055, 0.04, (k, tt) => Math.sin(TAU * 2400 * tt) * Math.exp(-tt * 160), { gain: 0.025 }); },
    pop: (t) => add(t, 0.12, blip(420, 980, 0.12), { gain: 0.07, rev: 0.4 }),
    riser: (t) => {
      add(t, 0.7, sweep(0.7, 400, 6000, 1.2, (x) => x * x), { gain: 0.1, rev: 0.4 });
      add(t, 0.7, (k, tt) => Math.sin(TAU * (220 * tt + 300 * tt * tt)) * (tt / 0.7) ** 2 * 0.5, { gain: 0.05, rev: 0.4 });
    },
    chime: (t) => {
      add(t, 1.6, marimba(1046.5), { gain: 0.16, pan: -0.1, rev: 0.6 });
      add(t + 0.13, 1.6, marimba(1568), { gain: 0.15, pan: 0.1, rev: 0.6 });
    },
    collapse: (t) => add(t, 0.55, sweep(0.55, 4000, 300, 1.5, (x) => Math.sin(Math.PI * x) ** 2), { gain: 0.11, rev: 0.4 }),
    flash: (t) => {
      add(t, 2.2, boom(110, 32, 0.8), { gain: 0.5 });
      add(t, 1.6, hiss(0.45, 3000), { gain: 0.06, rev: 0.8 });
      add(t, 3.0, bell(1046.5, 2.0), { gain: 0.06, rev: 0.9 });
    },
  };
  for (const [type, t] of cues) if (FX[type]) FX[type](t);

  // ---------- Mastering ----------
  const [wl, wr] = reverb(send[0], send[1], sr);
  const out = [new Float32Array(N), new Float32Array(N)];
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const t = i / sr;
    const fade = Math.min(1, t / 0.02) * Math.min(1, (duration - t) / 0.9);
    for (let c = 0; c < 2; c++) {
      const x = (dry[c][i] + (c ? wr[i] : wl[i]) * 3.2) * fade;
      const y = Math.tanh(x * 1.6) / 1.6;
      out[c][i] = y;
      peak = Math.max(peak, Math.abs(y));
    }
  }
  const norm = peak > 0 ? 0.89 / peak : 1;
  for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) out[c][i] *= norm;
  return out;
}

function writeWav(file, chans, sr) {
  const N = chans[0].length;
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + N * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    buf.writeInt16LE(Math.round(clamp(chans[0][i], -1, 1) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(clamp(chans[1][i], -1, 1) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}

module.exports = { synth, writeWav, reverb, svf };
