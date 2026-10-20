/*
 * Parvoz laboratoriyasi: bitta o'q (roll) bo'yicha dron muvozanati va PID boshqaruv.
 * Yon tomondan ko'rinish: chap va o'ng motor, dron og'ish burchagi.
 * Brauzerda window.DronPID, Node.js'da module.exports.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DronPID = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEG = Math.PI / 180;

  // Fizik parametrlar: 1,5 kg dron, nurlar 0,2 m, inersiya momenti 0,02 kg·m²
  const PLANT = {
    inertia: 0.02,
    arm: 0.2,
    hoverN: 7.36, // har bir motorning muallaq turishdagi kuchi (1,5 kg × g / 2)
    maxDelta: 3, // har bir motor kuchini ±3 N gacha o'zgartirish mumkin
    motorTau: 0.04, // motor tezligini o'zgartirishga ketadigan vaqt doimiysi, s
    damping: 0.004, // havo qarshiligi momenti
    crashDeg: 75,
  };

  const PRESETS = {
    good: {
      name: 'Yaxshi sozlangan', p: 8, i: 4, d: 1,
      text: "P, I va D muvozanatda. Dron yangi burchakka tez va deyarli o'tib ketmasdan keladi, shamol zarbasidan keyin bir-ikki chayqalib tinchiydi. Doimiy shamolda ham I qismi og'ishni asta-sekin yo'qotadi.",
    },
    ponly: {
      name: 'Faqat P', p: 8, i: 0, d: 0,
      text: "Faqat P bilan dron nishonga intiladi, lekin uni hech narsa tormozlamaydi: o'tib ketadi, qaytadi, yana o'tib ketadi. Motorlar bir zumda javob bera olmagani uchun tebranish asta kuchayadi va oxiri dron ag'dariladi. Kerakli narsa — D (so'ndiruvchi).",
    },
    highp: {
      name: 'P juda katta', p: 30, i: 4, d: 0.8,
      text: "P katta bo'lsa, eng kichik xatoga ham kuchli javob beriladi. Motorlar kechikib javob bergani uchun dron har safar nishondan o'tib ketadi va to'xtovsiz chayqaladi. P ni kamaytiring yoki D ni oshiring. Haqiqiy dronda bu motorlarning «g'uvillashi» va qizishi bilan seziladi.",
    },
    highd: {
      name: 'D juda katta', p: 8, i: 4, d: 3,
      text: "D katta bo'lsa, dron juda «qovushqoq»: nishonga sekin keladi, shu payt I ortiqcha yig'ilib, keyin biroz o'tib ketadi. Sensor shovqinini yoqing — D shovqinni kuchaytirib, motor buyruqlarini tinimsiz silkitadi. Haqiqiy dronda bu motorlarni qizdiradi.",
    },
    noi: {
      name: "I yo'q, doimiy shamol", p: 8, i: 0, d: 1, wind: true,
      text: "Doimiy yon shamol esayapti. I bo'lmagani uchun dron nishonga yetmay, taxminan 3 gradus og'ib qoladi: P qismi shamolni yengish uchun xato bo'lishini «talab qiladi». I qo'shilsa, yig'ilgan xato bu og'ishni yo'qotadi.",
    },
    weak: {
      name: "Bitta motor zaiflashdi", p: 8, i: 4, d: 1, weak: true,
      text: "O'ng motor 20% kuchsizlandi. Kontroller buni bilmaydi, lekin I qismi asta-sekin o'ng motorga ko'proq buyruq berib, kamchilikni qoplaydi. Pastdagi «I hissasi» ko'rsatkichi o'sib qolganini ko'ring — bu haqiqiy dronlarda nosozlik belgisi sifatida kuzatiladi.",
    },
  };

  function rngNormal(seed) {
    let a = seed >>> 0 || 1;
    const u = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return (((t ^ (t >>> 14)) >>> 0) + 1) / 4294967297;
    };
    return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
  }

  class Lab {
    constructor(opts) {
      const o = opts || {};
      this.p = o.p != null ? o.p : PRESETS.good.p;
      this.i = o.i != null ? o.i : PRESETS.good.i;
      this.d = o.d != null ? o.d : PRESETS.good.d;
      this.target = (o.targetDeg || 0) * DEG;
      this.wind = !!o.wind; // doimiy yon shamol
      this.noise = !!o.noise; // shovqinli giroskop
      this.weak = !!o.weak; // o'ng motor 20% zaif
      this.normal = rngNormal(o.seed || 7);
      this.reset();
    }

    reset() {
      this.t = 0;
      this.angle = 0;
      this.rate = 0;
      this.integral = 0;
      this.delta = 0; // haqiqiy kuch farqi (motor kechikishi bilan)
      this.cmd = 0;
      this.gust = 0;
      this.crashed = false;
      this.terms = { p: 0, i: 0, d: 0 };
      this.history = [];
      this.measured = 0;
    }

    set(key, value) {
      this[key] = value;
      if (key === 'targetDeg') this.target = value * DEG;
    }

    kick(torque, seconds) {
      this.gust = seconds;
      this.gustTorque = torque;
    }

    get leftN() {
      return PLANT.hoverN + this.delta;
    }

    get rightN() {
      return (PLANT.hoverN - this.delta) * (this.weak ? 0.8 : 1);
    }

    step(seconds) {
      const h = 0.001;
      let left = seconds;
      while (left > 1e-9) {
        const dt = Math.min(h, left);
        left -= dt;
        if (this.crashed) { this.t += dt; continue; }
        // O'lchov: giroskop shovqini
        const noisyRate = this.rate + (this.noise ? this.normal() * 0.35 : 0);
        this.measured = this.angle + (this.noise ? this.normal() * 0.004 : 0);
        const err = this.target - this.measured;
        this.integral += err * dt;
        // I-qism to'yinishdan himoya (windup)
        const iMax = PLANT.maxDelta / Math.max(this.i, 1e-6);
        this.integral = Math.max(-iMax, Math.min(iMax, this.integral));
        const pT = this.p * err;
        const iT = this.i * this.integral;
        const dT = -this.d * noisyRate; // hosila o'lchovdan olinadi: nishon o'zgarganda «tepki» bo'lmaydi
        this.terms = { p: pT, i: iT, d: dT };
        this.cmd = Math.max(-PLANT.maxDelta, Math.min(PLANT.maxDelta, pT + iT + dT));
        // Motorlar buyruqqa darhol emas, kechikish bilan yetadi
        this.delta += ((this.cmd - this.delta) * dt) / PLANT.motorTau;
        let torque = (this.leftN - this.rightN) * PLANT.arm - PLANT.damping * this.rate * 10;
        if (this.wind) torque -= 0.15;
        if (this.gust > 0) { torque += this.gustTorque; this.gust -= dt; }
        this.rate += (torque / PLANT.inertia) * dt;
        this.angle += this.rate * dt;
        this.t += dt;
        if (Math.abs(this.angle) > PLANT.crashDeg * DEG) this.crashed = true;
      }
      this.history.push({ t: this.t, angle: this.angle / DEG, target: this.target / DEG, cmd: this.cmd });
      if (this.history.length > 2000) this.history.splice(0, this.history.length - 2000);
    }
  }

  // Grafik uchun: nishon 0 dan 20° ga o'zgarganda dron javobi
  function stepResponse(gains, seconds, dt) {
    const lab = new Lab(Object.assign({ targetDeg: 20 }, gains));
    const out = [];
    for (let t = 0; t <= seconds + 1e-9; t += dt) {
      out.push([t, lab.angle / DEG]);
      lab.step(dt);
    }
    return out;
  }

  return { Lab, PRESETS, PLANT, stepResponse, DEG };
});
