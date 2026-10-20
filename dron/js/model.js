/*
 * Dron fizikasi va iqtisodiyoti: quvvat, uchish vaqti, masofa, bir yetkazish narxi.
 * Formulalar soddalashtirilgan (o'quv maqsadida), lekin tartibi real dronlarga mos.
 * Brauzerda window.DronModel, Node.js'da module.exports sifatida ishlaydi.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DronModel = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const G = 9.81;
  const FM = 0.65; // vint samaradorligi (figure of merit) — muallaq turishda
  const ETA = 0.85; // motor va regulyator (ESC) FIK
  const CL_MAX = 1.3; // qanotning eng katta ko'tarish koeffitsiyenti
  const CLIMB_SEC = 20; // 60 m balandlikka ko'tarilish (3 m/s)
  const DESCENT_SEC = 20;

  // Taxminiy narxlar so'mda. Hammasini «Hisoblash» bo'limida o'zgartirish mumkin.
  const PRESETS = {
    mini: {
      id: 'mini', name: 'Mini kvadrokopter', short: 'Mini',
      note: "O'quv dron: hujjat, dori kabi juda yengil yuklar",
      type: 'multi', emptyKg: 0.9, batteryWh: 60, maxPayloadKg: 0.5,
      rotors: 4, rotorDiamM: 0.2, cdA: 0.02, cruiseMs: 12,
      deliverySec: 30, deliveryMode: 'hover',
      priceSom: 8e6, batteryPriceSom: 1.2e6, batteryCycles: 300, lifeHours: 600,
    },
    cargo: {
      id: 'cargo', name: 'Yuk kvadrokopteri', short: 'Kvadro',
      note: "Shahar ichida 3 kg gacha yetkazish, yukni arqonda tushiradi (Wing, Manna uslubida)",
      type: 'multi', emptyKg: 7, batteryWh: 500, maxPayloadKg: 3,
      rotors: 4, rotorDiamM: 0.56, cdA: 0.15, cruiseMs: 15,
      deliverySec: 45, deliveryMode: 'hover',
      priceSom: 90e6, batteryPriceSom: 9e6, batteryCycles: 400, lifeHours: 1500,
    },
    heavy: {
      id: 'heavy', name: "Og'ir yuk oktokopteri", short: 'Okto',
      note: "15 kg gacha: ehtiyot qismlar, qurilish, tog'li hududlar (DJI FlyCart uslubida)",
      type: 'multi', emptyKg: 22, batteryWh: 2000, maxPayloadKg: 15,
      rotors: 8, rotorDiamM: 0.71, cdA: 0.25, cruiseMs: 14,
      deliverySec: 60, deliveryMode: 'hover',
      priceSom: 250e6, batteryPriceSom: 25e6, batteryCycles: 500, lifeHours: 2000,
    },
    vtol: {
      id: 'vtol', name: 'VTOL qanotli dron', short: 'VTOL',
      note: "Uzoq masofa, tibbiy yuklar; yukni parashyutda tashlaydi (Zipline uslubida)",
      type: 'vtol', emptyKg: 9, batteryWh: 900, maxPayloadKg: 2,
      rotors: 4, rotorDiamM: 0.4, cdA: 0.05, cruiseMs: 25,
      wingAreaM2: 1.0, wingSpanM: 3, cd0: 0.028, oswald: 0.8, propEff: 0.7,
      deliverySec: 10, deliveryMode: 'drop',
      priceSom: 250e6, batteryPriceSom: 15e6, batteryCycles: 500, lifeHours: 3000,
    },
  };

  // Taxminiy qiymatlar — o'zingizning hududingizga moslab o'zgartiring.
  const DEFAULT_ECON = {
    tariffSom: 1000, // elektr energiyasi, so'm / kVt·soat
    chargeEff: 0.9, // zaryadlashdagi yo'qotish
    operatorSalarySom: 7e6, // operator oyligi
    dronesPerOperator: 5, // bitta operator nechta dronni kuzatadi
    workDays: 26,
    workHours: 10,
    utilization: 0.6, // ish vaqtining qancha qismi parvozda
    turnaroundMin: 5, // yuk ortish, batareya almashtirish
    maintenancePerHourSom: 15000, // texnik xizmat, vint va boshqa qismlar
    fixedMonthlySom: 1.5e6, // sug'urta, aloqa, joy — har bir dron uchun
    // Avtomobil-kuryer bilan solishtirish
    fuelPriceSom: 11000,
    carLPer100: 8,
    carMaintPerKmSom: 400,
    courierSalarySom: 5e6,
    carDeliveriesPerDay: 20,
    carStopsPerTrip: 3, // kuryer bir safarda nechta buyurtma olib ketadi
    carSpeedKmh: 25, // shahar ichidagi o'rtacha tezlik
    roadFactor: 1.35, // yo'l masofasi to'g'ri chiziqdan shuncha uzun
    handoverMin: 5, // kuryer mashinani qo'yib, eshikkacha borishi
    gridCo2: 0.45, // kg CO₂ / kVt·soat
    petrolCo2: 2.31, // kg CO₂ / litr benzin
  };

  // ---------- Havo va batareya ----------

  // Havo zichligi (kg/m³): issiq kunda va balandda kamayadi
  function airDensity(tempC, altitudeM) {
    const t = tempC == null ? 15 : tempC;
    const h = altitudeM || 0;
    const p = 101325 * Math.pow(1 - 2.25577e-5 * h, 5.25588);
    return p / (287.05 * (273.15 + t));
  }

  // Sovuqda Li-ion batareyaning ishlatsa bo'ladigan sig'imi kamayadi
  function batteryTempFactor(tempC) {
    if (tempC == null || tempC >= 20) return 1;
    return Math.max(0.6, 1 - 0.01 * (20 - tempC));
  }

  // ---------- Quvvat ----------

  function rotorArea(d) {
    return d.rotors * Math.PI * Math.pow(d.rotorDiamM / 2, 2);
  }

  // Impuls nazariyasi: muallaq turish quvvati ~ (m·g)^1.5 / √(2ρA)
  function hoverPower(d, massKg, rho) {
    const thrust = massKg * G;
    const vh = Math.sqrt(thrust / (2 * rho * rotorArea(d)));
    return (thrust * vh) / (FM * ETA);
  }

  function cruisePower(d, massKg, speed, rho) {
    if (d.type === 'vtol') {
      const weight = massKg * G;
      const q = 0.5 * rho * speed * speed;
      const ar = (d.wingSpanM * d.wingSpanM) / d.wingAreaM2;
      const cl = weight / (q * d.wingAreaM2);
      const cd = d.cd0 + (cl * cl) / (Math.PI * d.oswald * ar);
      return (q * d.wingAreaM2 * cd * speed) / (d.propEff * ETA);
    }
    // Multikopter: oldinga uchganda induktiv quvvat kamayadi, havo qarshiligi esa ~v³ oshadi
    const thrust = massKg * G;
    const vh = Math.sqrt(thrust / (2 * rho * rotorArea(d)));
    const vi = Math.sqrt((-speed * speed + Math.sqrt(Math.pow(speed, 4) + 4 * Math.pow(vh, 4))) / 2);
    const profile = thrust * vh * (1 / FM - 1);
    const parasite = 0.5 * rho * d.cdA * Math.pow(speed, 3);
    return (thrust * vi + profile + parasite) / ETA;
  }

  function stallSpeed(d, massKg, rho) {
    if (d.type !== 'vtol') return 0;
    return Math.sqrt((2 * massKg * G) / (rho * d.wingAreaM2 * CL_MAX));
  }

  // Yetkazish nuqtasida sarflanadigan quvvat: arqonda tushirish yoki parashyut
  function deliveryPower(d, massKg, rho) {
    return d.deliveryMode === 'drop' ? cruisePower(d, massKg, d.cruiseMs, rho) : hoverPower(d, massKg, rho);
  }

  // ---------- Shamol ----------

  // fromDeg: shamol qayerdan esadi (0 — shimoldan, 90 — sharqdan).
  // Xarita koordinatalari: x — sharqqa, y — janubga.
  function windVector(speed, fromDeg) {
    const to = ((fromDeg || 0) + 180) * Math.PI / 180;
    return { x: speed * Math.sin(to), y: -speed * Math.cos(to) };
  }

  // Yerga nisbatan tezlik: dron yonlama shamolga qarshi burilib, yo'nalishni ushlaydi
  function groundSpeed(airspeed, wind, ux, uy) {
    const along = wind.x * ux + wind.y * uy;
    const cross = wind.x * uy - wind.y * ux;
    const s = airspeed * airspeed - cross * cross;
    if (s <= 0) return 0;
    return along + Math.sqrt(s);
  }

  // ---------- Bitta yetkazish (borish-qaytish) ----------

  // windAlong: borishda qarshi, qaytishda orqadan esadigan shamol (eng yomon holat)
  function roundTrip(d, opts) {
    const o = opts || {};
    const rho = airDensity(o.tempC, o.altitudeM);
    const payload = o.payloadKg || 0;
    const v = o.speedMs || d.cruiseMs;
    const w = o.windAlong || 0;
    const loaded = d.emptyKg + payload;
    const capacity = d.batteryWh * batteryTempFactor(o.tempC);
    const usable = capacity * (1 - (o.reserve == null ? 0.2 : o.reserve));
    const vgOut = v - w;
    const vgBack = v + w;
    const pOut = cruisePower(d, loaded, v, rho);
    const pBack = cruisePower(d, d.emptyKg, v, rho);
    const fixedWh = (hoverPower(d, loaded, rho) * 1.1 * CLIMB_SEC
      + deliveryPower(d, loaded, rho) * d.deliverySec
      + hoverPower(d, d.emptyKg, rho) * 0.9 * DESCENT_SEC) / 3600;
    const whPerM = vgOut > 0.5 ? (pOut / vgOut + pBack / vgBack) / 3600 : Infinity;
    const radiusM = Math.max(0, (usable - fixedWh) / whPerM);
    const dist = o.distanceM || 0;
    const tripWh = fixedWh + dist * whPerM;
    const tripSec = CLIMB_SEC + d.deliverySec + DESCENT_SEC + (vgOut > 0.5 ? dist / vgOut + dist / vgBack : Infinity);
    const toCustomerSec = CLIMB_SEC + (vgOut > 0.5 ? dist / vgOut : Infinity) + d.deliverySec / 2;
    return {
      rho, capacityWh: capacity, usableWh: usable,
      hoverW: hoverPower(d, loaded, rho),
      cruiseW: pOut, cruiseEmptyW: pBack,
      enduranceMin: (usable / pOut) * 60,
      rangeKm: (usable / pOut) * v * 3.6,
      whPerKm: (pOut / v) * 1000 / 3600,
      radiusKm: radiusM / 1000,
      tripWh, tripSec, toCustomerSec,
      feasible: tripWh <= usable && payload <= d.maxPayloadKg && vgOut > 0.5,
      overweight: payload > d.maxPayloadKg,
      stallMs: stallSpeed(d, loaded, rho),
    };
  }

  // Eng tejamkor tezlik: 1 km uchun eng kam energiya sarflanadigan tezlik
  function bestSpeed(d, massKg, rho) {
    const vMin = Math.ceil(Math.max(4, stallSpeed(d, massKg, rho) * 1.2) * 2) / 2;
    const vMax = d.type === 'vtol' ? 45 : 30;
    let best = vMin;
    let bestWh = Infinity;
    for (let v = vMin; v <= vMax; v += 0.5) {
      const wh = cruisePower(d, massKg, v, rho) / v;
      if (wh < bestWh) { bestWh = wh; best = v; }
    }
    return best;
  }

  // ---------- Iqtisodiyot ----------

  function economics(d, econ, trip, distanceKm) {
    const e = Object.assign({}, DEFAULT_ECON, econ || {});
    const flightH = trip.tripSec / 3600;
    const missionMin = trip.tripSec / 60 + e.turnaroundMin;
    const perDay = Math.max(1, Math.floor((e.workHours * 60 * e.utilization) / missionMin));
    const perMonth = perDay * e.workDays;
    const drone = {
      amort: (d.priceSom / d.lifeHours) * flightH,
      battery: (d.batteryPriceSom / d.batteryCycles) * (trip.tripWh / d.batteryWh),
      energy: (trip.tripWh / 1000 / e.chargeEff) * e.tariffSom,
      maint: e.maintenancePerHourSom * flightH,
      labor: e.operatorSalarySom / e.dronesPerOperator / perMonth,
      fixed: e.fixedMonthlySom / perMonth,
    };
    const carKm = (2 * distanceKm * e.roadFactor) / e.carStopsPerTrip;
    const car = {
      fuel: (carKm * e.carLPer100 / 100) * e.fuelPriceSom,
      maint: carKm * e.carMaintPerKmSom,
      labor: e.courierSalarySom / (e.workDays * e.carDeliveriesPerDay),
    };
    const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    return {
      perDay, perMonth,
      drone, droneTotal: sum(drone),
      car, carTotal: sum(car),
      droneMin: trip.toCustomerSec / 60,
      carMin: (distanceKm * e.roadFactor / e.carSpeedKmh) * 60 + e.handoverMin,
      droneCo2: (trip.tripWh / 1000 / e.chargeEff) * e.gridCo2,
      carCo2: (carKm * e.carLPer100 / 100) * e.petrolCo2,
    };
  }

  // ---------- Formatlash ----------

  function fmt(n, digits) {
    if (!isFinite(n)) return '—';
    const d = digits == null ? 0 : digits;
    const s = Math.abs(n).toFixed(d);
    const [int, frac] = s.split('.');
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return (n < 0 ? '−' : '') + grouped + (frac ? ',' + frac : '');
  }

  function money(n) {
    return fmt(Math.round(n)) + " so'm";
  }

  return {
    G, FM, ETA, CLIMB_SEC, DESCENT_SEC,
    PRESETS, DEFAULT_ECON,
    airDensity, batteryTempFactor, rotorArea,
    hoverPower, cruisePower, deliveryPower, stallSpeed,
    windVector, groundSpeed,
    roundTrip, bestSpeed, economics,
    fmt, money,
  };
});
