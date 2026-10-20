/*
 * «Dron qanday tuzilgan va qanday ishlaydi» — yozma darslik.
 * Har bir bob: matn, sxemalar (SVG), xulosa va o'zini tekshirish savollari.
 * parts — 3D modelda ko'rsatiladigan qismlar (tuzilish-data.js dagi id'lar).
 * Brauzerda window.DronDarslik, Node.js'da module.exports.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DronDarslik = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Sxema yordamchilari ----------

  function fig(w, h, body, caption) {
    return `<figure class="dg-fig"><svg class="dg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${caption}">${body}</svg><figcaption>${caption}</figcaption></figure>`;
  }

  const r1 = (v) => Math.round(v * 10) / 10;

  // Vintlar joylashuvi (yuqoridan ko'rinish). dirs: 1 — CW (ko'k), -1 — CCW (sariq)
  function layout(cx, cy, n, R, r, opts) {
    const o = opts || {};
    const start = o.start != null ? o.start : -Math.PI / 2 + Math.PI / n;
    let s = '';
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = start + (i * 2 * Math.PI) / n;
      pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a), i % 2 ? 1 : -1]);
    }
    pts.forEach(([x, y]) => { s += `<line class="ln" x1="${cx}" y1="${cy}" x2="${r1(x)}" y2="${r1(y)}"></line>`; });
    pts.forEach(([x, y, d]) => {
      if (o.coax) {
        s += `<circle class="${d > 0 ? 'cw' : 'ccw'}" cx="${r1(x)}" cy="${r1(y)}" r="${r}"></circle>`;
        s += `<circle class="${d > 0 ? 'ccw' : 'cw'}" cx="${r1(x)}" cy="${r1(y)}" r="${r * 0.62}"></circle>`;
      } else {
        s += `<circle class="${d > 0 ? 'cw' : 'ccw'}" cx="${r1(x)}" cy="${r1(y)}" r="${r}"></circle>`;
      }
    });
    s += `<rect class="body" x="${cx - 9}" y="${cy - 9}" width="18" height="18" rx="4"></rect>`;
    s += `<path class="fa" d="M${cx} ${cy - 30} l5 8 h-10 z"></path>`;
    return s;
  }

  function typesFigure() {
    let s = '';
    s += `<g>${layout(70, 72, 4, 38, 17)}<text x="70" y="148" text-anchor="middle">Kvadro (4)</text></g>`;
    s += `<g>${layout(200, 72, 6, 40, 14, { start: -Math.PI / 2 })}<text x="200" y="148" text-anchor="middle">Geksa (6)</text></g>`;
    s += `<g>${layout(330, 72, 8, 42, 11, { start: -Math.PI / 2 + Math.PI / 8 })}<text x="330" y="148" text-anchor="middle">Okto (8)</text></g>`;
    s += `<g>${layout(460, 72, 4, 38, 17, { coax: true })}<text x="460" y="148" text-anchor="middle">Koaksial X8</text></g>`;
    // Qanotli va VTOL
    s += `<g transform="translate(0,170)">
      <path class="body" d="M110 10 l8 40 l70 18 v10 l-70 -6 l-4 32 l18 8 v6 l-22 -4 l-22 4 v-6 l18 -8 l-4 -32 l-70 6 v-10 l70 -18 z"></path>
      <text x="110" y="132" text-anchor="middle">Qanotli (samolyot)</text>
      <g transform="translate(250,0)">
        <path class="body" d="M110 10 l8 40 l70 18 v10 l-70 -6 l-4 32 l18 8 v6 l-22 -4 l-22 4 v-6 l18 -8 l-4 -32 l-70 6 v-10 l70 -18 z"></path>
        <line class="ln" x1="65" y1="40" x2="65" y2="100"></line><line class="ln" x1="155" y1="40" x2="155" y2="100"></line>
        <circle class="ccw" cx="65" cy="40" r="13"></circle><circle class="cw" cx="65" cy="100" r="13"></circle>
        <circle class="cw" cx="155" cy="40" r="13"></circle><circle class="ccw" cx="155" cy="100" r="13"></circle>
        <text x="110" y="132" text-anchor="middle">VTOL (gibrid)</text>
      </g></g>`;
    s += `<g transform="translate(150,322)"><circle class="cw" cx="0" cy="0" r="6"></circle><text x="12" y="4">soat mili bo'yicha (CW)</text>
      <circle class="ccw" cx="170" cy="0" r="6"></circle><text x="182" y="4">teskari (CCW)</text></g>`;
    return fig(530, 336, s, "Ko'p tarqalgan dron turlari (yuqoridan ko'rinish, uchburchak — oldi tomon)");
  }

  function axesFigure() {
    const s = `
      <ellipse class="mu" cx="260" cy="120" rx="150" ry="46"></ellipse>
      <line class="ln" x1="150" y1="88" x2="370" y2="152"></line><line class="ln" x1="150" y1="152" x2="370" y2="88"></line>
      <circle class="ccw" cx="150" cy="88" r="20"></circle><circle class="cw" cx="370" cy="88" r="20"></circle>
      <circle class="cw" cx="150" cy="152" r="20"></circle><circle class="ccw" cx="370" cy="152" r="20"></circle>
      <rect class="body" x="244" y="108" width="32" height="24" rx="5"></rect>
      <line class="ac thick" x1="260" y1="120" x2="260" y2="20"></line><path class="fa" d="M260 12 l6 12 h-12 z"></path>
      <text x="270" y="28" class="em">Yaw — burilish (tik o'q)</text>
      <line class="dr thick" x1="260" y1="120" x2="260" y2="214"></line><path class="fd" d="M260 222 l6 -12 h-12 z"></path>
      <text x="270" y="216" class="em">Roll — yonga og'ish (bo'ylama o'q)</text>
      <line class="zn thick" x1="260" y1="120" x2="470" y2="120"></line><path class="fz" d="M478 120 l-12 6 v-12 z"></path>
      <text x="400" y="110" class="em" text-anchor="end">Pitch — oldinga/orqaga</text>
      <text x="400" y="138" text-anchor="end">(ko'ndalang o'q)</text>`;
    return fig(520, 232, s, 'Roll, pitch va yaw — dronning uchta aylanish o\'qi');
  }

  function tiltFigure() {
    const s = `
      <line class="mu" x1="20" y1="200" x2="500" y2="200"></line>
      <g transform="rotate(20 160 130)">
        <rect class="body" x="90" y="124" width="140" height="12" rx="3"></rect>
        <rect class="ccw" x="78" y="116" width="40" height="5"></rect><rect class="cw" x="202" y="116" width="40" height="5"></rect>
        <line class="ac thick" x1="160" y1="124" x2="160" y2="34"></line><path class="fa" d="M160 26 l6 12 h-12 z"></path>
      </g>
      <text x="200" y="40" class="em">T — tortish kuchi</text>
      <line class="mu dash" x1="160" y1="130" x2="160" y2="46"></line>
      <text x="96" y="58">T·cos θ — ko'taradi</text>
      <line class="dr thick" x1="160" y1="130" x2="196" y2="130"></line><path class="fd" d="M204 130 l-12 6 v-12 z"></path>
      <text x="210" y="134">T·sin θ — oldinga tortadi</text>
      <line class="ln thick" x1="160" y1="140" x2="160" y2="190"></line><path class="fl" d="M160 198 l6 -12 h-12 z"></path>
      <text x="170" y="186">og'irlik m·g</text>
      <text x="300" y="70" class="em">θ = 20° bo'lsa:</text>
      <text x="300" y="90">ko'taruvchi qism — 94%</text>
      <text x="300" y="108">oldinga tortuvchi — 34%</text>
      <text x="300" y="126">balandlikni ushlash uchun</text>
      <text x="300" y="144">kuchni 6% oshirish kerak</text>`;
    return fig(520, 214, s, "Og'ish: tortish kuchi ikki qismga bo'linadi");
  }

  function motorFigure() {
    const cx = 150;
    const cy = 130;
    let s = `<circle class="fs ln" cx="${cx}" cy="${cy}" r="112"></circle>`;
    for (let i = 0; i < 14; i++) {
      const a0 = (i * 2 * Math.PI) / 14 + 0.04;
      const a1 = ((i + 1) * 2 * Math.PI) / 14 - 0.04;
      const R1 = 106;
      const R0 = 92;
      const p = (R, a) => `${r1(cx + R * Math.cos(a))} ${r1(cy + R * Math.sin(a))}`;
      s += `<path class="${i % 2 ? 'mag-s' : 'mag-n'}" d="M${p(R0, a0)} L${p(R1, a0)} A${R1} ${R1} 0 0 1 ${p(R1, a1)} L${p(R0, a1)} A${R0} ${R0} 0 0 0 ${p(R0, a0)} Z"></path>`;
    }
    for (let i = 0; i < 12; i++) {
      const a = (i * 2 * Math.PI) / 12;
      const cls = ['ph-a', 'ph-b', 'ph-c'][i % 3];
      s += `<g transform="rotate(${r1((a * 180) / Math.PI)} ${cx} ${cy})">
        <rect class="tooth" x="${cx + 26}" y="${cy - 5}" width="58" height="10"></rect>
        <rect class="tooth" x="${cx + 78}" y="${cy - 13}" width="8" height="26" rx="2"></rect>
        <rect class="${cls}" x="${cx + 40}" y="${cy - 11}" width="30" height="22" rx="4"></rect></g>`;
    }
    s += `<circle class="tooth" cx="${cx}" cy="${cy}" r="30"></circle><circle class="body" cx="${cx}" cy="${cy}" r="8"></circle>`;
    s += `
      <line class="mu" x1="252" y1="62" x2="320" y2="40"></line><text x="326" y="44">Magnitlar (14 ta, N va S navbat bilan)</text>
      <line class="mu" x1="262" y1="120" x2="320" y2="96"></line><text x="326" y="100">Qo'ng'iroq — aylanadi (rotor)</text>
      <line class="mu" x1="210" y1="150" x2="320" y2="152"></line><text x="326" y="156">Mis o'ramlar — qo'zg'almaydi (stator)</text>
      <line class="mu" x1="${cx}" y1="${cy}" x2="320" y2="208"></line><text x="326" y="212">O'q — vint shunga o'rnatiladi</text>
      <rect class="ph-a" x="326" y="232" width="12" height="10"></rect><text x="344" y="241">A faza</text>
      <rect class="ph-b" x="400" y="232" width="12" height="10"></rect><text x="418" y="241">B faza</text>
      <rect class="ph-c" x="474" y="232" width="12" height="10"></rect><text x="492" y="241">C faza</text>`;
    return fig(600, 262, s, "Cho'tkasiz motor kesimi: 12 o'ram, 14 magnit («12N14P»)");
  }

  function pitchFigure() {
    const sec = (x, deg, label) => `
      <g transform="translate(${x},90)">
        <g transform="rotate(${-deg})"><path class="body" d="M-34 0 C -24 -9, 14 -10, 34 0 C 14 3, -24 4, -34 0 Z"></path></g>
        <line class="mu dash" x1="-44" y1="0" x2="44" y2="0"></line>
        <text x="0" y="48" text-anchor="middle" class="em">${deg}°</text>
        <text x="0" y="66" text-anchor="middle">${label}</text></g>`;
    const s = `
      <path class="ccw" d="M30 170 L500 182 L500 194 L30 190 Z"></path>
      <circle class="body" cx="30" cy="180" r="12"></circle>
      ${sec(110, 28, 'ildizda')}${sec(270, 16, "o'rtada")}${sec(430, 9, 'uchida')}`;
    return fig(530, 206, s, "Vint parragi buralgan: uchi ildizdan tez harakatlanadi, shuning uchun uning burchagi kichikroq. Natijada butun parrak bo'ylab havo bir xil «qadam» bilan itariladi.");
  }

  function escFigure() {
    const box = (x, y, w, h, t1, t2, cls) => `<rect class="${cls || 'fs ln'}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"></rect>
      <text x="${x + w / 2}" y="${y + h / 2 - (t2 ? 3 : -4)}" text-anchor="middle" class="em">${t1}</text>${t2 ? `<text x="${x + w / 2}" y="${y + h / 2 + 13}" text-anchor="middle">${t2}</text>` : ''}`;
    const s = `
      ${box(10, 30, 110, 50, 'Batareya', '22 V, doimiy tok')}
      ${box(10, 120, 110, 50, 'Kontroller', 'DShot buyruq')}
      ${box(160, 20, 170, 160, '', '', 'fs ln')}
      <text x="245" y="40" text-anchor="middle" class="em">ESC</text>
      ${box(175, 120, 140, 44, 'Mikrokontroller', 'qachon ulash kerak')}
      ${box(175, 52, 140, 52, '6 ta MOSFET', 'tez kalitlar')}
      ${box(380, 60, 120, 80, 'Motor', 'A · B · C')}
      <line class="ln thick" x1="120" y1="55" x2="175" y2="72"></line>
      <line class="ac" x1="120" y1="145" x2="175" y2="142"></line>
      <line class="ac dash" x1="245" y1="120" x2="245" y2="104"></line>
      <line class="ph-a-l thick" x1="315" y1="68" x2="380" y2="78"></line>
      <line class="ph-b-l thick" x1="315" y1="80" x2="380" y2="100"></line>
      <line class="ph-c-l thick" x1="315" y1="92" x2="380" y2="122"></line>
      <text x="342" y="168" text-anchor="middle">3 faza</text>
      <line class="mu dash" x1="380" y1="132" x2="315" y2="156"></line>
      <text x="170" y="198">teskari kuchlanish (back-EMF) — rotor qayerda</text>`;
    return fig(510, 206, s, "ESC ichida: kontroller buyrug'i → kalitlar → uch fazali tok");
  }

  function dischargeFigure() {
    const pts = [[0, 4.15], [5, 4.05], [10, 3.97], [20, 3.9], [30, 3.85], [40, 3.81], [50, 3.77], [60, 3.73], [70, 3.68], [80, 3.6], [85, 3.52], [90, 3.4], [95, 3.2], [100, 3.0]];
    const X = (v) => 50 + v * 4.4;
    const Y = (v) => 190 - (v - 2.9) * 125;
    let s = '';
    [3.0, 3.3, 3.6, 3.9, 4.2].forEach((v) => {
      s += `<line class="grid" x1="50" x2="490" y1="${r1(Y(v))}" y2="${r1(Y(v))}"></line><text x="44" y="${r1(Y(v) + 4)}" text-anchor="end">${String(v.toFixed(1)).replace('.', ',')} V</text>`;
    });
    [0, 20, 40, 60, 80, 100].forEach((v) => { s += `<text x="${X(v)}" y="210" text-anchor="middle">${v}%</text>`; });
    s += `<rect class="warn-zone" x="${X(80)}" y="${Y(4.2)}" width="${X(100) - X(80)}" height="${Y(2.9) - Y(4.2)}"></rect>`;
    s += `<polyline class="ac thick" points="${pts.map(([a, b]) => `${r1(X(a))},${r1(Y(b))}`).join(' ')}"></polyline>`;
    s += `<text x="${X(79)}" y="${Y(4.12)}" class="em" text-anchor="end">qo'nish vaqti →</text><text x="${X(79)}" y="${Y(4.12) + 14}" text-anchor="end">kuchlanish keskin tushadi</text>`;
    s += `<text x="270" y="228" text-anchor="middle">sarflangan sig'im</text>`;
    return fig(510, 236, s, "LiPo elementi kuchlanishi zaryad sarflangan sari (o'rtacha yuklamada)");
  }

  function chainFigure() {
    const steps = [['Sensorlar', 'IMU, GPS, barometr'], ['Baholash', 'EKF: qayerda, qanday'], ['Navigatsiya', 'qayerga borish'], ['Boshqaruv', 'PID: xatoni tuzatish'], ['Mikser', 'qaysi motorga qancha'], ['ESC → motor', 'yangi tezlik']];
    let s = '';
    steps.forEach(([a, b], i) => {
      const x = 10 + (i % 3) * 170;
      const y = i < 3 ? 20 : 120;
      s += `<rect class="fs ln" x="${x}" y="${y}" width="150" height="56" rx="8"></rect>
        <text x="${x + 75}" y="${y + 24}" text-anchor="middle" class="em">${a}</text><text x="${x + 75}" y="${y + 42}" text-anchor="middle">${b}</text>`;
    });
    s += `<path class="ac" d="M160 48 h20 M330 48 h20"></path><path class="ac" d="M500 48 h6 v100 h-6"></path>
      <path class="ac" d="M350 148 h-20 M180 148 h-20"></path>
      <path class="mu dash" d="M10 148 h-4 v-100 h4"></path>
      <text x="255" y="208" text-anchor="middle">Bu sikl sekundiga 400–8 000 marta takrorlanadi</text>`;
    return fig(520, 218, s, 'Parvoz kontrolleri ichidagi doimiy sikl');
  }

  function linkFigure() {
    const s = `
      <rect class="fs ln" x="10" y="20" width="120" height="50" rx="8"></rect><text x="70" y="42" text-anchor="middle" class="em">Pult</text><text x="70" y="58" text-anchor="middle">uchuvchi</text>
      <rect class="fs ln" x="10" y="130" width="120" height="50" rx="8"></rect><text x="70" y="152" text-anchor="middle" class="em">Yer stansiyasi</text><text x="70" y="168" text-anchor="middle">QGroundControl</text>
      <rect class="body" x="370" y="70" width="140" height="64" rx="10"></rect><text x="440" y="98" text-anchor="middle" class="em inv">Dron</text><text x="440" y="116" text-anchor="middle" class="inv">RX · telemetriya · video</text>
      <line class="ac thick" x1="130" y1="45" x2="370" y2="88"></line><text x="250" y="52" text-anchor="middle">boshqaruv: 2,4 GHz / 868 MHz →</text>
      <line class="dr thick dash" x1="130" y1="155" x2="370" y2="118"></line><text x="250" y="160" text-anchor="middle">← telemetriya va missiya (MAVLink) →</text>
      <line class="zn dash" x1="370" y1="100" x2="130" y2="100"></line><text x="250" y="96" text-anchor="middle">← video: 5,8 GHz yoki 4G</text>`;
    return fig(520, 196, s, 'Dron va yer o\'rtasidagi uchta aloqa kanali');
  }

  // ---------- Boblar ----------

  const CHAPTERS = [
    {
      id: 'kirish',
      title: 'Dron nima va qanday turlari bor',
      min: 8,
      parts: [],
      html: `
<p><b>Dron</b> — uchuvchisi bortda bo'lmagan uchish apparati. Rasmiy hujjatlarda uni <b>UUA</b> (uchuvchisiz uchish apparati, inglizcha UAV) deyishadi. Dronning o'zi, uni boshqaradigan yer stansiyasi va ular orasidagi aloqa birgalikda <b>tizim</b> (UAS) deb ataladi. Bu muhim: dron hech qachon yolg'iz ishlamaydi.</p>
<h3>Asosiy turlari</h3>
${typesFigure()}
<ul>
<li><b>Multikopter</b> — bir nechta vintli dron. Kvadrokopterda 4 ta, geksakopterda 6 ta, oktokopterda 8 ta vint bor. Joyida osilib tura oladi, istalgan joydan vertikal ko'tariladi. Kamchiligi — ko'p energiya sarflaydi.</li>
<li><b>Qanotli dron</b> — kichik samolyot. Qanot ko'tarish kuchini «bepul» beradi, motor faqat oldinga tortadi. Shuning uchun 3–5 baravar tejamkor va uzoqqa uchadi, lekin joyida turolmaydi va qo'nish uchun maydon kerak.</li>
<li><b>VTOL (gibrid)</b> — ko'tarilish va qo'nishda multikopter, yo'lda samolyot. Uzoq masofali yetkazish dronlarining ko'pchiligi shunday.</li>
<li><b>Vertolyot turidagi dron</b> — bitta katta rotor va dum rotori. Samarador, lekin mexanikasi murakkab (rotor parraklari burchagini o'zgartiruvchi «avtomat perekos»).</li>
</ul>
<h3>Nega aynan kvadrokopter mashhur?</h3>
<p>Kvadrokopterda harakatlanadigan mexanik qism faqat to'rtta motor. Vertolyotdagi murakkab sharnirlar, tortqilar yo'q — hammasini elektronika bajaradi. 2000-yillarda ikki narsa paydo bo'lgach dronlar ommaviylashdi: arzon va kichkina <b>MEMS sensorlar</b> (telefonlardagi kabi giroskop) va yengil, kuchli <b>LiPo batareyalar</b>.</p>
<p>Qiziq fakt: to'rt rotorli birinchi uchuvchi apparat 1907-yilda Fransiyada yasalgan (Breguet Gyroplane), lekin uni boshqarib bo'lmagan — inson to'rtta rotorni bir vaqtda muvozanatlay olmaydi. Bu masala faqat kompyuter boshqaruvi bilan hal bo'ldi.</p>
<h3>Konfiguratsiyani tanlash</h3>
<div class="tbl"><table>
<tr><th>Tur</th><th>Afzalligi</th><th>Qayerda</th></tr>
<tr><td>Kvadro</td><td>oddiy, arzon, tejamkor (multikopterlar ichida)</td><td>suratga olish, o'quv, kichik yetkazish</td></tr>
<tr><td>Geksa / Okto</td><td>bitta motor buzilsa ham qo'nadi, ko'proq yuk</td><td>og'ir yuk, odamlar ustidan uchish</td></tr>
<tr><td>Koaksial X8</td><td>8 motor, lekin kvadro o'lchamida</td><td>og'ir yuk, kichik joy</td></tr>
<tr><td>VTOL</td><td>uzoq masofa + vertikal qo'nish</td><td>tibbiy yetkazish, xaritalash</td></tr>
</table></div>
<p>Bu darslikda asosan kvadrokopterni o'rganamiz: qolgan multikopterlar xuddi shu tamoyilda ishlaydi, faqat motorlari ko'proq.</p>`,
      summary: [
        "Dron — tizimning bir qismi: dron + yer stansiyasi + aloqa.",
        'Multikopter joyida turadi, qanotli dron tejamkor, VTOL ikkalasini birlashtiradi.',
        "Kvadrokopterning mexanikasi oddiy, murakkabligi elektronika va dasturda.",
      ],
      check: [
        { q: "Nega uzoq masofali tibbiy yetkazishda ko'pincha VTOL ishlatiladi?", a: "Yo'lda qanot bilan tejamkor uchadi (uzoq masofa), lekin manzilda samolyot kabi maydon kerak emas — vertikal qo'nadi yoki yukni tushiradi." },
        { q: 'Geksakopterning kvadrokopterdan asosiy xavfsizlik afzalligi nima?', a: "Bitta motor ishdan chiqsa, qolgan beshtasi dronni boshqariladigan holda qo'ndira oladi." },
      ],
    },
    {
      id: 'fizika',
      title: 'Dron qanday uchadi: kuchlar va boshqaruv',
      min: 12,
      parts: ['vint', 'motor'],
      html: `
<p>Dronga parvozda to'rtta kuch ta'sir qiladi: pastga <b>og'irlik</b> (m·g), yuqoriga vintlarning <b>tortish kuchi</b>, harakatga qarshi <b>havo qarshiligi</b> va shamol. Muallaq turganda tortish kuchi og'irlikka teng.</p>
<p class="formula">4 ta motor kuchi = m · g &nbsp;→&nbsp; 4,5 kg × 9,81 = 44 N, ya'ni har bir motorga ≈ 11 N (≈ 1,1 kg)</p>
<p>Vint kuchi aylanish tezligining kvadratiga bog'liq: <b>T ≈ k · n²</b>. Kuchni 2 baravar oshirish uchun tezlikni √2 ≈ 1,41 baravar oshirish kifoya. Quvvat esa tezlikning kubiga yaqin oshadi — shuning uchun kuchli manyovrlar batareyani tez yeydi.</p>
<h3>Uchta o'q, to'rtta buyruq</h3>
${axesFigure()}
<p>Dron fazoda 6 xil harakat qila oladi: 3 ta siljish (oldinga, yonga, yuqoriga) va 3 ta burilish (roll, pitch, yaw). Lekin kvadrokopterda bor-yo'g'i 4 ta «tugma» — to'rtta motor tezligi. Shuning uchun u to'g'ridan-to'g'ri yonga siljiy olmaydi: avval og'adi, keyin og'gan tortish kuchi uni o'sha tomonga olib ketadi.</p>
<h3>Motorlar qanday birgalikda ishlaydi</h3>
<p>Parvoz kontrollerining «mikser» qismi to'rtta buyruqni to'rtta motor tezligiga aylantiradi:</p>
<div class="tbl"><table>
<tr><th>Buyruq</th><th>M1 old o'ng<br>CCW</th><th>M2 orqa chap<br>CCW</th><th>M3 old chap<br>CW</th><th>M4 orqa o'ng<br>CW</th></tr>
<tr><td>Ko'tarilish (gaz)</td><td>+</td><td>+</td><td>+</td><td>+</td></tr>
<tr><td>O'ngga og'ish (roll)</td><td>−</td><td>+</td><td>+</td><td>−</td></tr>
<tr><td>Oldinga og'ish (pitch)</td><td>−</td><td>+</td><td>−</td><td>+</td></tr>
<tr><td>O'ngga burilish (yaw)</td><td>+</td><td>+</td><td>−</td><td>−</td></tr>
</table></div>
<p>Jadvalga diqqat qiling: har bir qatorda ikki «+» va ikki «−». Bitta juftlik qancha tezlashsa, ikkinchisi shuncha sekinlashadi — umumiy kuch deyarli o'zgarmaydi va dron balandligini yo'qotmaydi.</p>
<h3>Og'ish va siljish</h3>
${tiltFigure()}
<p>Dron og'ganda tortish kuchi ikki qismga bo'linadi: biri ko'taradi, biri oldinga tortadi. Shu bois og'ganda balandlikni ushlab qolish uchun kontroller umumiy kuchni biroz oshiradi. Dronning eng katta tezligi eng katta og'ish burchagi va havo qarshiligi bilan cheklanadi.</p>
<h3>Burilish (yaw) — eng nozik harakat</h3>
<p>Motor vintni bir tomonga aylantirsa, vint motorni (va butun dronni) teskari tomonga buradi. Bu — <b>reaksiya momenti</b>. Muallaq turganda CW va CCW juftliklar momenti teng. O'ngga burilish uchun CCW motorlar tezlashadi: ularning reaksiyasi dronni soat mili bo'yicha buradi. Bu moment og'dirish momentidan ancha zaif, shuning uchun dronlar burilishni sekinroq bajaradi.</p>
<h3>Ikki qiziq hodisa</h3>
<ul>
<li><b>Yer effekti.</b> Yerga yaqin (taxminan bir vint diametri balandlikda) havo oqimi yerga urilib qaytadi va dron ko'proq ko'tarish kuchi oladi. Qo'nishda dron go'yo «yostiqqa» tushgandek sekinlashadi.</li>
<li><b>Quyun halqasi (vortex ring state).</b> Dron tik pastga tez tushsa, o'z vintlari itargan havoga qayta kirib qoladi va kuchni yo'qotadi — tushish tezlashib ketadi. Shuning uchun baland joydan tushishda qiya yo'l bilan yoki sekin tushiladi.</li>
</ul>`,
      summary: [
        "Muallaq turganda 4 motor kuchi yig'indisi og'irlikka teng.",
        "Kuch ~ tezlik², quvvat ~ tezlik³.",
        "Siljish uchun dron avval og'adi; burilish — CW va CCW juftliklar farqi bilan.",
      ],
      check: [
        { q: "Nega yaw buyrug'ida dron balandligini yo'qotmaydi?", a: "Bitta juftlik tezlashsa, ikkinchisi sekinlashadi — umumiy tortish kuchi deyarli o'zgarmaydi, faqat reaksiya momentlari muvozanati buziladi." },
        { q: "Kvadrokopter nega to'g'ridan-to'g'ri yonga siljiy olmaydi?", a: "Unda yonga itaruvchi alohida motor yo'q. Barcha vintlar tepaga qaragan, shuning uchun gorizontal kuch faqat dron og'ganda paydo bo'ladi." },
        { q: "Kuchni 4 baravar oshirish uchun motor tezligi taxminan qancha oshishi kerak?", a: "2 baravar, chunki kuch tezlikning kvadratiga proporsional." },
      ],
    },
    {
      id: 'rama',
      title: 'Rama: skelet va konfiguratsiya',
      min: 7,
      parts: ['rama', 'oyoq'],
      html: `
<p>Rama hamma qismlarni o'zaro to'g'ri masofada ushlab turadi. Uning o'lchami <b>wheelbase</b> bilan belgilanadi — diagonal bo'yicha qarama-qarshi ikki motor o'qi orasidagi masofa, millimetrda.</p>
<div class="tbl"><table>
<tr><th>Sinf</th><th>Wheelbase</th><th>Vint</th><th>Misol</th></tr>
<tr><td>Kichik FPV</td><td>200–250 mm</td><td>5″</td><td>poyga, akrobatika</td></tr>
<tr><td>O'rta</td><td>450–550 mm</td><td>10–12″</td><td>o'quv, kamera, kichik yuk</td></tr>
<tr><td>Katta</td><td>650–1 200 mm</td><td>15–30″</td><td>yetkazish, qishloq xo'jaligi</td></tr>
</table></div>
<h3>Shakllar</h3>
<ul>
<li><b>X</b> — eng keng tarqalgan: nurlar bir xil, boshqaruv simmetrik.</li>
<li><b>H</b> — ikki bo'ylama nur, o'rtada keng joy (batareya, kamera uchun).</li>
<li><b>+ (plyus)</b> — bitta nur oldinga qaragan; eski dronlarda uchraydi.</li>
<li><b>Yig'iladigan nurlar</b> — tashish uchun; yetkazish dronlarida ko'p.</li>
</ul>
<h3>Materiallar</h3>
<div class="tbl"><table>
<tr><th>Material</th><th>Xususiyati</th></tr>
<tr><td>Karbon tola</td><td>eng yengil va qattiq; tok o'tkazadi; radio signalni to'sadi</td></tr>
<tr><td>Alyuminiy</td><td>arzon, ishlov berish oson, karbondan og'irroq</td></tr>
<tr><td>Shisha tola (G10)</td><td>radio signalni to'smaydi, tok o'tkazmaydi</td></tr>
<tr><td>Plastik, neylon (3D bosma)</td><td>prototip va o'quv dronlari uchun; titrashni yaxshi so'ndiradi</td></tr>
</table></div>
<h3>Qattiqlik va titrash</h3>
<p>Motor va vintlar doimiy titrash hosil qiladi. Agar rama shu chastotada «rezonansga» tushsa, titrash kuchayadi va parvoz kontrolleridagi sensorlar shovqinli ma'lumot oladi. Shuning uchun nurlar qattiq bo'lishi, kontroller esa rezina amortizatorlarga o'rnatilishi kerak.</p>
<h3>Og'irlik markazi</h3>
<p>Og'irlik markazi dronning geometrik markazida, iloji boricha vintlar tekisligidan pastroqda bo'lishi kerak. Agar u bir tomonga siljisa, kontroller o'sha tomondagi motorlarni doim ko'proq aylantirishga majbur — energiya bekor sarflanadi va boshqaruv zahirasi kamayadi. Batareyani surib, dronni barmoqlaringiz uchida ushlab muvozanatini tekshirish — oddiy va to'g'ri usul.</p>
<h3>Qo'nish oyoqlari</h3>
<p>Oyoqlar pastdagi batareya, kamera va yuk mexanizmini yerdan uzoqda ushlaydi. Chang'ilar orasi keng bo'lsa, dron qiya joyda ham ag'darilmaydi.</p>`,
      summary: [
        'Wheelbase — diagonal motorlar orasidagi masofa (mm).',
        "Rama qattiq bo'lishi, kontroller esa titrashdan himoyalangan bo'lishi kerak.",
        "Og'irlik markazi — aynan o'rtada.",
      ],
      check: [
        { q: 'Karbon ramada nima uchun simlarni ehtiyot qilish kerak?', a: "Karbon tok o'tkazadi. Simning izolyatsiyasi qirraga ishqalanib yeyilsa, qisqa tutashuv bo'ladi." },
        { q: "Og'irlik markazi oldinga siljigan dronda nima bo'ladi?", a: "Old motorlar doim ko'proq ishlaydi: ular tezroq qiziydi, energiya ko'p sarflanadi va oldinga og'ish uchun zahira qolmaydi." },
      ],
    },
    {
      id: 'motor',
      title: "Cho'tkasiz motorlar",
      min: 10,
      parts: ['motor'],
      html: `
<p>Dronlarda <b>cho'tkasiz doimiy tok motorlari</b> (BLDC) ishlatiladi. Oddiy o'yinchoq motorlarda tok aylanuvchi qismga ishqalanuvchi «cho'tka» orqali beriladi — u yeyiladi va uchqun chiqaradi. Cho'tkasiz motorda mis o'ramlar qo'zg'almaydi, aylanayotgani esa faqat magnitlar. Natijada motor yengil, kuchli, deyarli yeyilmaydi va FIK 80–90% ga yetadi.</p>
${motorFigure()}
<h3>Qanday aylanadi</h3>
<p>Dron motorlari <b>outrunner</b> turida: magnitlar tashqi «qo'ng'iroq»ning ichiga yopishtirilgan, o'ramlar esa ichkarida. O'ramlar uchta guruhga (A, B, C fazalar) bo'lingan. ESC bu fazalarga navbat bilan tok beradi va magnit maydon xuddi aylanayotgandek bo'ladi. Qo'ng'iroqdagi magnitlar shu maydon ortidan «quvib» aylanadi.</p>
<p>«12N14P» yozuvi — 12 ta o'ram (stator tishlari) va 14 ta magnit degani. Magnit juftlari 7 ta, shuning uchun motor bir marta aylanishi uchun ESC elektr siklini 7 marta takrorlaydi.</p>
<h3>Motor belgilari</h3>
<p><b>4006</b>, <b>2207</b>, <b>5010</b> kabi raqamlar stator o'lchamini bildiradi: dastlabki ikki raqam — diametri, keyingi ikkitasi — balandligi (mm). Stator qancha katta bo'lsa, motor shuncha katta moment beradi va katta vintni aylantira oladi.</p>
<p><b>KV</b> — motor yuksiz holatda 1 voltga necha marta aylanishi (ayl/daq). Masalan, 400 KV motor 6S batareyada (22,2 V) yuksiz ≈ 8 900 ayl/daq aylanadi; vint bilan yuklanganda taxminan 70–80% i qoladi.</p>
<ul>
<li><b>Yuqori KV</b> (1 500–2 500) — tez, kichik vintlar uchun (FPV dronlar).</li>
<li><b>Past KV</b> (100–500) — sekin, lekin kuchli; katta vintlar va yuk dronlari uchun. Bir xil tok bilan kattaroq moment beradi.</li>
</ul>
<h3>Ishlab chiqaruvchi jadvalini o'qish</h3>
<p>Motor tanlashda tortish kuchi jadvali ishlatiladi. Quyidagi raqamlar — 4006 380 KV motor 15″ vint bilan 6S da (taxminiy namuna):</p>
<div class="tbl"><table>
<tr><th>Gaz</th><th>Tok</th><th>Kuch</th><th>Quvvat</th><th>Samaradorlik</th></tr>
<tr><td>50%</td><td>3,5 A</td><td>780 g</td><td>78 Vt</td><td>10,0 g/Vt</td></tr>
<tr><td>75%</td><td>8 A</td><td>1 550 g</td><td>178 Vt</td><td>8,7 g/Vt</td></tr>
<tr><td>100%</td><td>14 A</td><td>2 400 g</td><td>330 Vt</td><td>7,3 g/Vt</td></tr>
</table></div>
<p>Muhim kuzatuv: past gazda motor <b>samaraliroq</b> (har vattga ko'proq gramm). Shuning uchun yaxshi loyihalangan dron muallaq turganda gazning 40–55% ida ishlaydi — ham tejamkor, ham manyovr uchun zahira qoladi.</p>
<h3>Issiqlik</h3>
<p>Tok o'ramlardan o'tganda issiqlik chiqadi (yo'qotish ~ tok²). Juda qizib ketgan motorning magnitlari kuchsizlanadi va izolyatsiya buziladi. Parvozdan keyin motor qo'l bilan ushlab bo'lmaydigan darajada qizigan bo'lsa — u haddan tashqari yuklangan: vint juda katta yoki dron og'ir.</p>`,
      summary: [
        "Cho'tkasiz motorda o'ramlar qo'zg'almaydi, magnitli qo'ng'iroq aylanadi.",
        'Belgi (4006) — stator o\'lchami; KV — 1 voltga aylanish.',
        "Past KV + katta vint — yuk dronlari uchun tejamkor tanlov.",
      ],
      check: [
        { q: '2207 motor va 4006 motor — qaysi biri katta vintni aylantirishga mos?', a: "4006: statori kengroq (40 mm), katta moment beradi. 2207 — kichik FPV vintlari uchun." },
        { q: "Nega dron muallaq turganda gazning 40–55% ida ishlashi yaxshi?", a: "Motor past gazda samaraliroq, va qolgan 45–60% manyovr, shamol va favqulodda holatlar uchun zahira bo'ladi." },
      ],
    },
    {
      id: 'vint',
      title: 'Vintlar: dronning qanotlari',
      min: 8,
      parts: ['vint'],
      html: `
<p>Vint parragi — aylanuvchi kichik qanot. Parrak profili havoni pastga yo'naltiradi; Nyutonning uchinchi qonuniga ko'ra, havo pastga itarilsa, vint yuqoriga itariladi. Har bir sekundda yuzlab gramm havo pastga otiladi — dron ostida kuchli shamol sezilishi shundan.</p>
<h3>Belgilar: diametr × qadam</h3>
<p><b>15×5,5</b> — diametri 15 dyuym (38 sm), qadami 5,5 dyuym. <b>Qadam</b> — vint qattiq jismga buralgan vint kabi harakat qilsa, bir aylanishda qancha oldinga siljishi. Katta qadam — har aylanishda ko'proq havo, ko'proq tezlik, lekin ko'proq tok.</p>
${pitchFigure()}
<h3>Nega katta vint tejamkor</h3>
<p>Bir xil kuchni ikki usulda olish mumkin: oz havoni tez itarish yoki ko'p havoni sekin itarish. Fizika ikkinchisini afzal ko'radi: havoga beriladigan energiya tezlikning kvadratiga bog'liq. Katta vint ko'p havoni sekin itaradi — quvvat kam ketadi. Vertolyotlar va yuk dronlarining vintlari ulkanligi shundan.</p>
<p>Taqqoslang: tortish kuchi ~ <b>n²·D⁴</b>, quvvat ~ <b>n³·D⁵</b> (n — tezlik, D — diametr). Diametrni ozgina oshirish ham kuchni sezilarli ko'paytiradi.</p>
<h3>Parraklar soni</h3>
<ul>
<li><b>2 parrakli</b> — eng samarali, muvozanatlash oson.</li>
<li><b>3 parrakli</b> — bir xil diametrda ko'proq kuch, lekin samaradorligi pastroq. Rama kichik bo'lsa ishlatiladi.</li>
</ul>
<h3>Yo'nalish va o'rnatish</h3>
<p>Har bir to'plamda CW va CCW vintlar bor (CCW ko'pincha «R» harfi bilan belgilanadi). Noto'g'ri o'rnatilgan vint havoni yuqoriga itaradi va dron ko'tarilish o'rniga ag'dariladi. Har yangi o'rnatishdan keyin vint yo'nalishini motor aylanishi bilan solishtiring.</p>
<h3>Uchi tezligi va shovqin</h3>
<p>15″ vint 6 000 ayl/daq da aylanganda parrak uchi sekundiga ≈ 120 metr yo'l bosadi — tovush tezligining uchdan biri. Uchi qancha tez bo'lsa, shovqin shuncha kuchli. Shuning uchun shahar ichida uchadigan dronlarda katta va sekin vintlar afzal.</p>
<h3>Muvozanat va xavfsizlik</h3>
<p>Muvozanatsiz vint titrash beradi — bu sensorlarni adashtiradi va podshipniklarni yeyadi. Kichik tirnalgan yoki egilgan vintni almashtiring: u arzon, buzilgan dron esa qimmat. Sozlash va sinash paytida vintlarni doim yechib qo'ying.</p>`,
      summary: [
        'Vint havoni pastga itaradi — reaksiya kuchi dronni ko\'taradi.',
        "Belgi D×P: diametr va qadam (dyuymda).",
        "Katta va sekin vint — tejamkor va kam shovqinli.",
      ],
      check: [
        { q: '10×4,5 vint nimani bildiradi?', a: 'Diametri 10 dyuym (25,4 sm), qadami 4,5 dyuym.' },
        { q: "Nega yuk dronlarida katta diametrli vintlar ishlatiladi?", a: "Ko'p havoni sekin itarish bir xil kuch uchun kamroq quvvat talab qiladi — dron tejamkor va jimroq bo'ladi." },
      ],
    },
    {
      id: 'esc',
      title: 'ESC: motor haydovchisi',
      min: 8,
      parts: ['esc'],
      html: `
<p>Cho'tkasiz motorni oddiy batareyaga ulab bo'lmaydi — u aylanmaydi. Unga o'ramlarni to'g'ri tartibda, to'g'ri vaqtda ulab-uzib turuvchi qurilma kerak. Bu — <b>ESC</b> (Electronic Speed Controller).</p>
${escFigure()}
<h3>Ichida nima bor</h3>
<ul>
<li><b>Mikrokontroller</b> — kichik protsessor: qaysi fazaga qachon tok berishni hisoblaydi.</li>
<li><b>6 ta MOSFET</b> — elektron kalitlar. Uchta juftlik har bir fazani batareyaning «+» yoki «−» qutbiga ulaydi.</li>
<li><b>Drayverlar</b> — MOSFET'larni tez ochib-yopish uchun.</li>
</ul>
<p>Rotor qayerda turganini bilish uchun ESC bo'sh turgan fazadagi <b>teskari kuchlanishni</b> (back-EMF) kuzatadi: aylanayotgan magnit o'ramda kuchlanish hosil qiladi, uning nolga tushgan paytida keyingi qadamga o'tiladi. Shu sababli motorlarda alohida datchik yo'q. Zamonaviy ESC'lar <b>FOC</b> usulida tokni sinusoida shaklida beradi — motor jimroq va samaraliroq ishlaydi.</p>
<h3>Kontroller bilan aloqa</h3>
<div class="tbl"><table>
<tr><th>Protokol</th><th>Qanday</th><th>Izoh</th></tr>
<tr><td>PWM</td><td>1 000–2 000 mks impuls</td><td>eski, sekin, kalibrovka talab qiladi</td></tr>
<tr><td>OneShot, Multishot</td><td>qisqaroq impulslar</td><td>tezroq analog usul</td></tr>
<tr><td>DShot (150/300/600)</td><td>raqamli paket + tekshiruv yig'indisi</td><td>kalibrovka kerak emas, xatoga chidamli</td></tr>
<tr><td>Ikki tomonlama DShot</td><td>ESC motor tezligini qaytaradi</td><td>kontroller titrashni aniqroq filtrlaydi</td></tr>
</table></div>
<h3>ESC tanlash</h3>
<ul>
<li><b>Tok</b>: motor jadvalidagi eng katta tokdan 20–30% ko'p (masalan, motor 14 A → ESC 20 A yoki ko'proq).</li>
<li><b>Kuchlanish</b>: batareya elementlari soniga mos (6S batareya — 6S ESC).</li>
<li><b>Joylashuv</b>: alohida ESC'lar nurlarda (yaxshi soviydi) yoki to'rttasi bitta platada — «4 in 1» (ixcham).</li>
<li><b>Dastur</b>: BLHeli, AM32, Bluejay — sozlanadigan ochiq dasturlar.</li>
</ul>
<h3>Foydali bilim</h3>
<p>Motor teskari aylansa, ESC'ning uchta simidan ixtiyoriy ikkitasini almashtirsangiz yoki dasturda yo'nalishni o'zgartirsangiz kifoya. Ko'pgina ESC'lar sekinlashganda motorni faol tormozlaydi — bu dronga tezroq javob berishga yordam beradi.</p>`,
      summary: [
        "ESC doimiy tokni uch fazali o'zgaruvchan tokka aylantiradi.",
        'Rotor holatini teskari kuchlanishdan biladi — motorga datchik kerak emas.',
        "Zamonaviy aloqa — raqamli DShot.",
      ],
      check: [
        { q: 'Motor teskari aylanayapti. Sim bilan qanday tuzatsa bo\'ladi?', a: "ESC va motor orasidagi uchta simdan ixtiyoriy ikkitasining joyini almashtirish kerak (yoki dasturda yo'nalishni teskari qilish)." },
        { q: "Motor 30 A gacha tok tortadi. Qanday ESC olish kerak?", a: "Kamida 35–40 A uzluksiz tokka mo'ljallangan ESC." },
      ],
    },
    {
      id: 'batareya',
      title: 'Batareya va energiya tizimi',
      min: 11,
      parts: ['batareya', 'pdb'],
      html: `
<p>Batareya — dronning eng og'ir qismi va parvoz vaqtini cheklovchi asosiy omil. Ko'pchilik dronlarda <b>LiPo</b> (litiy-polimer) yoki <b>Li-ion</b> (silindrsimon elementlardan yig'ilgan) batareyalar ishlatiladi.</p>
<h3>Element, S va P</h3>
<ul>
<li>Bitta LiPo element: <b>4,2 V</b> to'la, <b>3,7 V</b> nominal, <b>3,8 V</b> saqlash uchun, yuklama ostida <b>3,5 V</b> dan pastga tushirmaslik kerak.</li>
<li><b>S</b> — ketma-ket ulangan elementlar soni: 4S = 14,8 V, 6S = 22,2 V, 12S = 44,4 V.</li>
<li><b>P</b> — parallel ulangan guruhlar: 6S2P — sig'im ikki baravar ko'p.</li>
</ul>
<h3>Sig'im va energiya</h3>
<p>Sig'im mAh da yoziladi: 10 000 mAh = 10 Ah. Lekin turli kuchlanishdagi batareyalarni solishtirish uchun <b>Wh</b> (vatt-soat) kerak:</p>
<p class="formula">Energiya (Wh) = kuchlanish (V) × sig'im (Ah) → 22,2 × 10 = 222 Wh</p>
<p><b>C reytingi</b> — batareya qancha tez tok bera olishi: maksimal tok = C × sig'im. 25C × 10 Ah = 250 A. Bu yuk dronlari uchun yetarli; poyga dronlariga yuqoriroq C kerak.</p>
<h3>Kuchlanish egri chizig'i</h3>
${dischargeFigure()}
<p>Zaryadning katta qismida kuchlanish sekin tushadi, oxirida esa keskin «quladi». Shuning uchun batareyaning oxirgi 20% ini ishlatmaslik kerak: kuchlanish birdan tushib, motorlarga kuch yetmay qoladi. Kuchli manyovrda kuchlanish vaqtincha cho'kadi (ichki qarshilik) — batareya eskirgan sari bu ko'proq seziladi.</p>
<h3>Parvoz vaqtini hisoblash</h3>
<p class="formula">Vaqt (daq) ≈ Energiya (Wh) × 0,8 ÷ o'rtacha quvvat (Vt) × 60</p>
<p>Misol: 222 Wh batareya, muallaq turish quvvati 600 Vt: 222 × 0,8 ÷ 600 × 60 ≈ <b>18 daqiqa</b>. 0,8 — 20% zaxira.</p>
<p>Batareyani ikki baravar kattalashtirsangiz, vaqt ikki baravar oshmaydi: dron og'irlashadi va har daqiqaga ko'proq energiya sarflaydi. Buni «Hisoblash» bo'limida o'zingiz tekshirib ko'ring.</p>
<h3>LiPo va Li-ion</h3>
<div class="tbl"><table>
<tr><th></th><th>LiPo</th><th>Li-ion (18650, 21700)</th></tr>
<tr><td>Energiya zichligi</td><td>150–200 Wh/kg</td><td>200–260 Wh/kg</td></tr>
<tr><td>Katta tok</td><td>juda yaxshi</td><td>o'rtacha</td></tr>
<tr><td>Qayerda</td><td>kuchli manyovr, og'ir yuk</td><td>uzoq va tekis parvoz, VTOL</td></tr>
</table></div>
<h3>Quvvat tizimi</h3>
<p>Batareya quvvat taqsimlash platasiga (PDB) ulanadi, u yerdan tok ESC'larga bo'linadi. Quvvat moduli kuchlanish va tokni o'lchab, kontrollerga yuboradi. Kontroller sarflangan energiyani hisoblab boradi va belgilangan chegarada (masalan, har elementda 3,6 V) dronni avtomatik qaytaradi.</p>
<h3>Xavfsizlik — juda muhim</h3>
<ul>
<li>Zaryadlashni faqat <b>balansli</b> zaryadlagich bilan, odatda 1C tokda, yong'inga chidamli sumkada va qarovsiz qoldirmay qiling.</li>
<li><b>Shishgan</b> (puffed) batareyani ishlatmang — ichida gaz hosil bo'lgan, yong'in xavfi bor.</li>
<li>Uzoq saqlashda har elementda 3,8 V qoldiring. To'la zaryadlangan holda saqlash batareyani tez eskirtiradi.</li>
<li>Sovuqda batareya sig'imi va tok berishi pasayadi: qishda uni parvozgacha iliq joyda saqlang.</li>
<li>Samolyotda tashish cheklangan: odatda 100 Wh gacha qo'l yukida ruxsat, 100–160 Wh — aviakompaniya ruxsati bilan.</li>
</ul>`,
      summary: [
        'S — ketma-ket elementlar; Wh = V × Ah; C — tok berish qobiliyati.',
        "Oxirgi 20% ishlatilmaydi: kuchlanish keskin tushadi.",
        "Vaqt ≈ Wh × 0,8 ÷ Vt × 60.",
      ],
      check: [
        { q: '4S 5 000 mAh batareyada qancha energiya bor?', a: '14,8 V × 5 Ah = 74 Wh.' },
        { q: "Muallaq turish 400 Vt, batareya 148 Wh. Taxminan qancha uchadi (20% zaxira bilan)?", a: '148 × 0,8 ÷ 400 × 60 ≈ 17,8 daqiqa.' },
        { q: 'Batareyani uzoq saqlashda qanday kuchlanishda qoldirish kerak?', a: 'Har elementda taxminan 3,8 V (saqlash rejimi).' },
      ],
    },
    {
      id: 'kontroller',
      title: 'Parvoz kontrolleri va avtopilot',
      min: 11,
      parts: ['fc', 'imu', 'baro'],
      html: `
<p>Parvoz kontrolleri — dron ichidagi kompyuter. Uning yagona vazifasi — sekundiga yuzlab–minglab marta qaror qabul qilish: «dron hozir qanday turibdi, qanday turishi kerak, buning uchun har bir motor qancha aylansin».</p>
<h3>Platada nima bor</h3>
<ul>
<li><b>Mikrokontroller</b> (masalan, STM32H7, 480 MHz) — hamma hisob-kitoblar.</li>
<li><b>IMU</b> — giroskop va akselerometr (jiddiy kontrollerlarda 2–3 nusxada).</li>
<li><b>Barometr</b> — balandlik uchun.</li>
<li><b>Xotira kartasi</b> — parvoz jurnali (log): har bir parvozning har bir sensori yoziladi.</li>
<li><b>Portlar</b>: GPS, telemetriya, radio qabul qilgich, ESC chiqishlari, quvvat moduli.</li>
</ul>
<h3>Ichki sikl</h3>
${chainFigure()}
<p><b>Baholash</b> bosqichi eng murakkabi. Har bir sensorning o'z kamchiligi bor: giroskop suzadi, akselerometr shovqinli, GPS sekin, barometr shamoldan adashadi. <b>Kengaytirilgan Kalman filtri</b> (EKF) ularning har biriga ishonch darajasini hisoblab, eng ehtimoliy holatni topadi: joylashuv, tezlik, og'ish burchaklari.</p>
<p>Boshqaruv bir necha qavatli (kaskad): <i>joylashuv</i> → kerakli <i>tezlik</i> → kerakli <i>og'ish burchagi</i> → kerakli <i>aylanish tezligi</i> → motorlar. Ichki qavat (aylanish tezligi) eng tez ishlaydi, tashqi qavat (GPS bo'yicha joy) eng sekin.</p>
<h3>Avtopilot dasturlari</h3>
<div class="tbl"><table>
<tr><th>Dastur</th><th>Maqsadi</th></tr>
<tr><td>ArduPilot</td><td>avtonom missiyalar, yetkazish, qishloq xo'jaligi; multikopter, samolyot, VTOL, qayiq, mashina</td></tr>
<tr><td>PX4</td><td>avtonom dronlar, sanoat va tadqiqot; ROS 2 bilan yaxshi ishlaydi</td></tr>
<tr><td>Betaflight</td><td>FPV va poyga dronlari — juda tez javob, lekin avtonomiya kam</td></tr>
<tr><td>INAV</td><td>FPV dronlarga GPS va navigatsiya qo'shadi</td></tr>
</table></div>
<p>Logistika yo'nalishi uchun <b>ArduPilot</b> va <b>PX4</b> ni o'rganing — ikkalasi ochiq kodli, bepul va kompyuterda virtual dron bilan sinash mumkin (SITL).</p>
<h3>Yangi dronni sozlash tartibi</h3>
<ol>
<li>Dasturni yuklash va dron turini tanlash (masalan, Quad X).</li>
<li>Akselerometr va kompas kalibrovkasi.</li>
<li>Pult kalibrovkasi va parvoz rejimlarini kalitlarga biriktirish.</li>
<li><b>Motor tekshiruvi</b> (vintlarsiz!): har bir motor to'g'ri o'rinda va to'g'ri yo'nalishda aylanayaptimi.</li>
<li>Failsafe sozlamalari: aloqa uzilsa, batareya kamaysa nima qilinadi.</li>
<li>Birinchi parvoz past balandlikda, keyin avtosozlash (autotune).</li>
</ol>
<h3>Yordamchi kompyuter</h3>
<p>Yetkazish dronlarida ko'pincha ikkinchi, kuchliroq kompyuter (Raspberry Pi, NVIDIA Jetson) bo'ladi. U kamera tasviridan qo'nish joyini, odamlar va to'siqlarni aniqlaydi va kontrollerga MAVLink orqali buyruq beradi. Parvoz kontrolleri esa «xavfsizlik qatlami» bo'lib qoladi.</p>`,
      summary: [
        'Kontroller sikli: sensorlar → baholash (EKF) → navigatsiya → PID → mikser → motorlar.',
        "Boshqaruv kaskadli: joy → tezlik → burchak → aylanish tezligi.",
        "Logistika uchun asosiy dasturlar — ArduPilot va PX4.",
      ],
      check: [
        { q: 'EKF nima uchun kerak?', a: "Har bir sensorning kamchiligi bor. EKF ularni birlashtirib, dronning eng ehtimoliy holatini (joy, tezlik, burchak) hisoblaydi." },
        { q: "Nega motor tekshiruvi vintlarsiz qilinadi?", a: "Motor tartibi yoki yo'nalishi xato bo'lsa, dron yerda ag'darilib, jarohat yetkazishi mumkin. Vintsiz sinov xavfsiz." },
      ],
    },
    {
      id: 'sensorlar',
      title: 'Sensorlar: dron atrofni qanday sezadi',
      min: 11,
      parts: ['imu', 'baro', 'gps'],
      html: `
<h3>Giroskop va akselerometr (IMU)</h3>
<p><b>Giroskop</b> uchta o'q atrofidagi aylanish tezligini o'lchaydi (gradus/sekund). U juda tez va aniq, lekin uning ma'lumotini vaqt bo'yicha qo'shib burchak topilganda kichik xatolar yig'ilib boradi — burchak «suzadi».</p>
<p><b>Akselerometr</b> tezlanishni o'lchaydi. Dron tinch turganda u faqat yerning tortish kuchini sezadi — demak, «past» qayerdaligini va dron qancha og'ganini biladi. Suzmaydi, lekin titrash va keskin harakatlardan shovqinli.</p>
<p>Ikkalasini birlashtirishning eng oddiy usuli — <b>to'ldiruvchi filtr</b>:</p>
<p class="formula">burchak = 0,98 × (burchak + giroskop × dt) + 0,02 × akselerometr_burchagi</p>
<p>Ya'ni har lahzada 98% giroskopga ishonamiz (tez va silliq), 2% akselerometrga (suzishni asta tuzatadi). Haqiqiy avtopilotlar buni Kalman filtri bilan, hamma sensorlarni birga hisoblab bajaradi.</p>
<h3>Titrash — sensorlarning dushmani</h3>
<p>Motorlar sekundiga 100 marta aylansa, IMU ham shu chastotada titraydi. Kontroller bu shovqinni filtrlar bilan tozalaydi: past chastotali filtr, «notch» filtr va motor tezligiga moslashuvchi RPM filtri. Lekin eng yaxshi filtr — muvozanatlangan vintlar va amortizatorli o'rnatish.</p>
<h3>Barometr</h3>
<p>Havo bosimi har metr ko'tarilganda ≈ 12 Pa kamayadi. Barometr shundan nisbiy balandlikni 10–20 sm aniqlikda topadi. Ob-havo o'zgarishi bilan bosim ham o'zgaradi, shuning uchun u uzoq vaqt davomida GPS bilan to'ldiriladi.</p>
<h3>Magnitometr (kompas)</h3>
<p>Yerning magnit maydoni yo'nalishini o'lchaydi — burun qayoqqa qaraganini biladi. Juda sezgir: kuchli tok simlari, motorlar va temir buyumlar uni adashtiradi. Shuning uchun u GPS moduli ichida, baland ustunda joylashadi. Magnit shimol va geografik shimol bir oz farq qiladi — avtopilot buni joylashuvga qarab o'zi tuzatadi.</p>
<h3>GNSS (GPS)</h3>
<p>Sun'iy yo'ldoshlar o'z aniq vaqti va joyini doimiy uzatib turadi. Qabul qilgich signal kelish vaqtlari farqidan har bir yo'ldoshgacha masofani topadi va kamida 4 tasidan o'z joyini hisoblaydi. Oddiy aniqlik — 1–3 metr.</p>
<ul>
<li><b>RTK</b> — yerdagi tayanch stansiya tuzatmalarini yuborib, aniqlikni 1–3 sm gacha oshiradi. Aniq qo'nish va xaritalashda ishlatiladi.</li>
<li>Baland binolar orasida signal devorlardan qaytadi va xato beradi (multipath).</li>
<li>Signalni bostirish (jamming) va soxtalashtirish (spoofing) xavfi bor — jiddiy tizimlar buni aniqlay oladi.</li>
</ul>
<h3>Boshqa sensorlar</h3>
<div class="tbl"><table>
<tr><th>Sensor</th><th>Nima beradi</th><th>Qayerda kerak</th></tr>
<tr><td>Optik oqim (pastga qaragan kamera)</td><td>yerga nisbatan siljish</td><td>GPS yo'q joyda, bino ichida</td></tr>
<tr><td>Lidar / masofa o'lchagich</td><td>yergacha aniq masofa</td><td>aniq qo'nish, past parvoz</td></tr>
<tr><td>Stereo kamera, radar</td><td>to'siqlar</td><td>to'siqdan qochish</td></tr>
<tr><td>Havo tezligi (Pito naychasi)</td><td>havoga nisbatan tezlik</td><td>qanotli va VTOL dronlar</td></tr>
</table></div>
<h3>Zaxira (ortiqchalik)</h3>
<p>Jiddiy dronlarda 2–3 ta IMU, 2 ta barometr, 2 ta GPS bo'ladi. Bittasi g'alati ma'lumot bersa, filtr unga ishonishni to'xtatadi va boshqasiga o'tadi.</p>`,
      summary: [
        'Giroskop tez, lekin suzadi; akselerometr suzmaydi, lekin shovqinli — birga ishlatiladi.',
        "Barometr — balandlik, kompas — yo'nalish, GNSS — joy.",
        "Titrash — sensorlar uchun asosiy muammo.",
      ],
      check: [
        { q: "To'ldiruvchi filtrda nega giroskopga 98% ishoniladi?", a: "Giroskop qisqa vaqt ichida juda aniq va silliq. Uning suzishini akselerometrning kichik ulushi asta-sekin tuzatib boradi." },
        { q: "Kompas nega GPS moduli bilan baland ustunga qo'yiladi?", a: "Motorlar va kuchli tok simlari magnit maydon hosil qiladi. Ulardan uzoqlashtirish kompas xatosini kamaytiradi." },
      ],
    },
    {
      id: 'pid',
      title: 'Muvozanat siri: PID boshqaruv',
      min: 12,
      parts: ['fc', 'imu'],
      html: `
<p>Dron tabiatan beqaror: o'z holiga qo'yilsa, ozgina shamol uni og'diradi va u ag'dariladi. Uni muvozanatda ushlab turuvchi narsa — <b>teskari aloqa</b>: kontroller doimiy ravishda <i>xato</i>ni o'lchaydi (kerakli burchak − haqiqiy burchak) va uni kamaytiruvchi buyruq beradi.</p>
<p>Eng ko'p ishlatiladigan usul — <b>PID</b>. Unda buyruq uch qismdan yig'iladi:</p>
<p class="formula">buyruq = P × xato + I × (xatolar yig'indisi) + D × (xato o'zgarish tezligi)</p>
<h3>P — hozirgi xato</h3>
<p>Xato qancha katta bo'lsa, tuzatish shuncha kuchli. P kichik bo'lsa, dron «bo'sh», shamolda qiyshayib qoladi. P katta bo'lsa, dron nishondan o'tib ketadi, qaytadi, yana o'tib ketadi — tebranadi.</p>
<h3>I — o'tmishdagi xato</h3>
<p>Doimiy kichik xato ham vaqt o'tishi bilan yig'iladi va I qismi o'sib boradi, toki xato yo'qolmaguncha. Bu doimiy shamol, og'irlik markazining siljishi yoki zaif motor kabi «surunkali» muammolarni tuzatadi. I juda katta bo'lsa — sekin, katta tebranishlar.</p>
<h3>D — kelajakni sezish</h3>
<p>D xato qanchalik tez o'zgarayotganiga qaraydi. Dron nishonga tez yaqinlashayotgan bo'lsa, D oldindan tormoz beradi — xuddi mashina amortizatori kabi tebranishni so'ndiradi. D juda katta bo'lsa, u sensor shovqinini kuchaytiradi: motorlar «xirillaydi» va qiziydi.</p>
<div class="dg-pid"></div>
<h3>Belgilarga qarab sozlash</h3>
<div class="tbl"><table>
<tr><th>Nima bo'lyapti</th><th>Ehtimoliy sabab</th><th>Nima qilish kerak</th></tr>
<tr><td>Tez, mayda tebranish</td><td>P yoki D juda katta</td><td>P ni, keyin D ni kamaytiring</td></tr>
<tr><td>Keskin harakatdan keyin chayqalib qoladi</td><td>D kichik</td><td>D ni oshiring</td></tr>
<tr><td>Shamolda bir tomonga og'ib qoladi</td><td>I kichik</td><td>I ni oshiring</td></tr>
<tr><td>Sekin, katta to'lqinsimon tebranish</td><td>I juda katta</td><td>I ni kamaytiring</td></tr>
<tr><td>Motorlar qiziydi, ovozi notekis</td><td>D juda katta yoki titrash</td><td>D ni kamaytiring, vintlarni tekshiring</td></tr>
</table></div>
<p>Haqiqiy dronlarda har bir o'q (roll, pitch, yaw) uchun alohida PID bor, va ular kaskadda ishlaydi: tashqi halqa burchak xatosidan kerakli aylanish tezligini topadi, ichki halqa aylanish tezligi xatosini motorlarga uzatadi. ArduPilot va PX4'da <b>avtosozlash</b> (autotune) bor: dron o'zi tebranib ko'rib, mos koeffitsiyentlarni topadi.</p>
<p class="note">«Parvoz laboratoriyasi» bo'limida P, I va D ni o'zingiz burab, dron qanday javob berishini ko'ring.</p>`,
      summary: [
        'PID: P — hozirgi xato, I — yig\'ilgan xato, D — xato o\'zgarishi.',
        'P katta — tebranish; I yo\'q — doimiy og\'ish; D katta — shovqin.',
        "Har bir o'q uchun alohida, kaskadli PID.",
      ],
      check: [
        { q: "Dron doimiy shamolda biroz og'ib qolyapti va to'g'rilanmayapti. Qaysi qism yetishmayapti?", a: 'I qismi: u doimiy xatoni yig\'ib, uni yo\'qotguncha buyruqni oshiradi.' },
        { q: "D qismini juda katta qilsak, nima bo'ladi?", a: "Sensor shovqini kuchayadi: motorlar tez-tez o'zgarib, qiziydi va xirillaydi." },
      ],
    },
    {
      id: 'aloqa',
      title: 'Aloqa: pult, telemetriya va video',
      min: 8,
      parts: ['rx', 'telem'],
      html: `
${linkFigure()}
<h3>Uchta kanal</h3>
<ul>
<li><b>Boshqaruv kanali</b> — pultdan dronga: dastalar va kalitlar holati. Kechikishi kichik (5–20 ms) va ishonchli bo'lishi shart.</li>
<li><b>Telemetriya</b> — ikki tomonlama: dron holati yerga, missiya va buyruqlar dronga. Protokoli — MAVLink.</li>
<li><b>Video</b> — kamera tasviri: analog (kechikish juda kam, sifat past) yoki raqamli (sifatli, kechikish biroz ko'proq).</li>
</ul>
<h3>Chastotalar</h3>
<div class="tbl"><table>
<tr><th>Chastota</th><th>Xususiyati</th></tr>
<tr><td>2,4 GHz</td><td>keng tarqalgan, kichik antenna, to'siqlarni yomonroq o'tadi</td></tr>
<tr><td>868 / 915 MHz</td><td>uzoqroqqa boradi, daraxt va devorlardan yaxshiroq o'tadi</td></tr>
<tr><td>5,8 GHz</td><td>asosan video</td></tr>
<tr><td>4G / LTE</td><td>mobil tarmoq bor joyda masofa cheklanmaydi; yetkazish dronlarida asosiy kanal</td></tr>
</table></div>
<p>Har bir mamlakatda qaysi chastota va qanday quvvatda ruxsat etilganini qonun belgilaydi — uskunani o'rnatishdan oldin mahalliy qoidalarni tekshiring.</p>
<h3>Masofaga nima ta'sir qiladi</h3>
<ul>
<li><b>Ko'rinish chizig'i</b>: antennalar orasida to'siq bo'lmasligi kerak. Dron bino orqasiga o'tsa, signal keskin kuchsizlanadi.</li>
<li><b>Antenna yo'nalishi</b>: antennalarning qutblanishi bir xil bo'lishi kerak; ikkita antennani 90° burchakda qo'yish dron qanday burilmasin signalni saqlaydi.</li>
<li><b>Uzatish quvvati va antenna kuchaytirishi.</b></li>
</ul>
<h3>Failsafe — aloqa uzilsa</h3>
<p>Aloqa uzilishi — «agar» emas, «qachon» masalasi. Shuning uchun har bir dronda failsafe sozlanadi:</p>
<ul>
<li><b>Boshqaruv yo'qolsa</b>: uyga qaytish (RTL) yoki joyida qo'nish. Avtonom missiyada dron missiyani davom ettirishi mumkin.</li>
<li><b>Telemetriya yo'qolsa</b>: odatda missiya davom etadi yoki uyga qaytiladi.</li>
<li><b>GPS yo'qolsa</b>: balandlikni ushlab, qo'nish.</li>
<li><b>Batareya kamaysa</b>: avval ogohlantirish, keyin qaytish, oxirida majburiy qo'nish.</li>
</ul>
<h3>Xavfsizlik</h3>
<p>Zamonaviy tizimlar (ExpressLRS, Crossfire) pult va qabul qilgichni «bog'laydi» (binding) — begona pult dronni boshqara olmaydi. Telemetriya va 4G kanallari shifrlanishi kerak: begona odam missiyani o'zgartirmasligi uchun.</p>`,
      summary: [
        'Uch kanal: boshqaruv, telemetriya (MAVLink), video.',
        "Sub-GHz (868/915) uzoqroqqa boradi; 4G — masofa cheklanmagan.",
        "Failsafe — har bir dronda majburiy sozlama.",
      ],
      check: [
        { q: "Nega qabul qilgichning ikki antennasi bir-biriga burchak ostida qo'yiladi?", a: "Dron qanday burilmasin, kamida bitta antennaning qutblanishi pult antennasiga mos keladi va signal saqlanadi." },
        { q: 'Avtonom yetkazishda boshqaruv kanali uzilsa, dron nima qilishi mumkin?', a: "Failsafe sozlamasiga qarab: missiyani davom ettiradi, uyga qaytadi (RTL) yoki joyida qo'nadi." },
      ],
    },
    {
      id: 'rejimlar',
      title: 'Parvoz rejimlari va avtonom uchish',
      min: 9,
      parts: ['gps', 'fc'],
      html: `
<p>Parvoz rejimi — kontroller qaysi sensorlarga tayanishi va uchuvchi nimani boshqarishini belgilaydi. Rejimlar oddiydan murakkabga qarab qo'shimcha sensorlarni ishga soladi:</p>
<div class="tbl"><table>
<tr><th>Rejim (ArduPilot / PX4)</th><th>Sensorlar</th><th>Uchuvchi nimani boshqaradi</th></tr>
<tr><td>Acro / Manual</td><td>giroskop</td><td>aylanish tezligi; dron o'zi tekislanmaydi</td></tr>
<tr><td>Stabilize / Stabilized</td><td>+ akselerometr</td><td>og'ish burchagi; dasta qo'yilsa, dron tekislanadi</td></tr>
<tr><td>AltHold / Altitude</td><td>+ barometr</td><td>balandlik avtomatik ushlanadi</td></tr>
<tr><td>Loiter, PosHold / Position</td><td>+ GPS, kompas</td><td>dasta qo'yilsa, dron shamolda ham joyida turadi</td></tr>
<tr><td>Auto / Mission</td><td>hammasi</td><td>hech narsa — dron marshrut bo'yicha o'zi uchadi</td></tr>
<tr><td>RTL / Return</td><td>hammasi</td><td>uyga qaytish va qo'nish</td></tr>
<tr><td>Guided / Offboard</td><td>hammasi</td><td>kompyuter yoki server real vaqtda buyruq beradi</td></tr>
</table></div>
<h3>Yetkazish missiyasi qanday ko'rinadi</h3>
<ol>
<li><b>Ko'tarilish</b> — 60 m balandlikka.</li>
<li><b>Marshrut nuqtalari</b> — taqiqlangan zonalarni aylanib, manzilgacha.</li>
<li><b>Manzil ustida kutish</b> — kamera qo'nish joyini tekshiradi.</li>
<li><b>Pastlash</b> — 10 m gacha.</li>
<li><b>Yukni tushirish</b> — lebyodka buyrug'i, yuk yerga tekkanda ilgak ochiladi.</li>
<li><b>Ko'tarilish va qaytish</b> (RTL).</li>
<li><b>Aniq qo'nish</b> — maxsus belgi (marker) yoki infraqizil mayoq bo'yicha santimetr aniqlikda.</li>
</ol>
<p>Missiya QGroundControl yoki Mission Planner'da xaritada nuqtalarni qo'yib tuziladi va telemetriya orqali dronga yuklanadi. Katta parklarda esa missiyalarni server avtomatik tuzadi va dronlarni Guided rejimida boshqaradi — xuddi «Simulyator» bo'limidagi dispetcher kabi.</p>
<h3>Geofence</h3>
<p>Geofence — dasturiy chegara: maksimal balandlik, uydan maksimal masofa yoki xaritadagi taqiqlangan ko'pburchaklar. Dron chegaraga yetsa, to'xtaydi yoki qaytadi. Bu inson xatosi va dasturiy xatolardan himoya qiladi.</p>
<h3>RTL qanday ishlaydi</h3>
<p>RTL buyrug'ida dron avval xavfsiz balandlikka ko'tariladi (daraxt va binolardan yuqori), keyin uchgan joyiga to'g'ri chiziq bo'ylab qaytadi va qo'nadi. RTL balandligini hududdagi eng baland to'siqdan yuqori qilib sozlash kerak.</p>`,
      summary: [
        "Har bir rejim yangi sensorni qo'shadi: giroskop → akselerometr → barometr → GPS.",
        "Auto rejimda dron oldindan yuklangan missiyani bajaradi.",
        'Geofence va RTL — asosiy xavfsizlik vositalari.',
      ],
      check: [
        { q: 'Loiter rejimi Stabilize\'dan nimasi bilan farq qiladi?', a: "Loiter GPS va kompasdan foydalanib, dronni shamolda ham joyida ushlab turadi. Stabilize faqat tekis turishni ta'minlaydi, dron shamolda siljiydi." },
        { q: 'RTL balandligi nima uchun muhim?', a: "Dron qaytishda to'g'ri chiziq bo'ylab uchadi. Balandlik past bo'lsa, daraxt yoki binoga urilishi mumkin." },
      ],
    },
    {
      id: 'loyiha',
      title: 'Dron loyihalash: qismlarni bir-biriga moslash',
      min: 10,
      parts: ['motor', 'vint', 'batareya'],
      html: `
<p>Dron qismlari bir-biriga bog'liq: batareyani kattalashtirsangiz — massa oshadi, kuchliroq motor kerak bo'ladi, u ko'proq tok tortadi, yana katta batareya kerak... Loyihalash — shu zanjirda muvozanat topish. Quyida 2 kg yuk tashuvchi dronni bosqichma-bosqich loyihalaymiz.</p>
<h3>1. Talablar</h3>
<p>Yuk — 2 kg, mijozgacha — 5 km (borib-qaytish 10 km), tezlik — 15 m/s, zaxira — 20%.</p>
<h3>2. Massani taxmin qilish</h3>
<p>Tajribaviy qoida: batareya — umumiy massaning 30–40%, rama va elektronika — 30–35%, yuk — qolgani. Bizda: rama va elektronika ≈ 2,2 kg, batareya ≈ 1,3 kg, yuk 2 kg → jami ≈ <b>5,5 kg</b>.</p>
<h3>3. Tortish kuchi zahirasi</h3>
<p>Barcha motorlarning maksimal kuchi dron massasidan <b>kamida 2 baravar</b> ko'p bo'lishi kerak (yuk dronlari uchun 2–2,5; poyga dronlari 5–10). Bizga: 5,5 × 2 = 11 kg, har bir motorga ≈ <b>2,75 kg</b>.</p>
<h3>4. Vint va motor</h3>
<p>Rama 650 mm bo'lsa, unga 15–17″ vint sig'adi. Motor jadvalidan shunday motorni tanlaymiz: 15″ vint bilan 100% gazda ≥ 2,75 kg, muallaq turishda (har biriga 1,4 kg) gazning ~50% i. Bu — 4006–5010 o'lchamdagi, 300–400 KV motor.</p>
<h3>5. ESC</h3>
<p>Jadvaldagi eng katta tok 16 A bo'lsa — 20–25 A ESC.</p>
<h3>6. Batareya</h3>
<p>Motor 6S uchun mo'ljallangan → 6S batareya. Muallaq turish quvvati ≈ 4 × 160 Vt ≈ 650 Vt. Parvoz taxminan 14 daqiqa davom etadi (10 km ÷ 15 m/s ≈ 11 daq + ko'tarilish, tushirish):</p>
<p class="formula">Kerakli energiya ≈ 650 Vt × 14/60 soat ÷ 0,8 ≈ 190 Wh → 6S 10 000 mAh (222 Wh)</p>
<h3>7. Tekshirish va takrorlash</h3>
<p>Batareya massasini qayta tekshiramiz: 222 Wh LiPo ≈ 1,3 kg — taxminimizga mos. Mos kelmasa, 2-bosqichdan qaytadan hisoblanadi. Bu jarayonni ilovadagi «Hisoblash» bo'limi avtomatik bajaradi: parametrlarni kiriting va radius, energiya, narxni darhol ko'ring.</p>
<h3>Oltin qoidalar</h3>
<ul>
<li>Muallaq turishda gaz 40–55% — yaxshi loyiha belgisi.</li>
<li>Har bir gramm muhim: keraksiz qismlarni olib tashlang.</li>
<li>Katta vint + past KV — tejamkor; kichik vint + yuqori KV — chaqqon.</li>
<li>Har bir hisobni haqiqiy sinov bilan tasdiqlang: parvoz jurnalidagi tok va kuchlanish eng ishonchli ma'lumot.</li>
</ul>`,
      summary: [
        "Kuch zahirasi: maksimal kuch ≥ 2 × massa.",
        'Batareya ≈ 30–40% massa; energiya = quvvat × vaqt ÷ 0,8.',
        "Loyihalash — takrorlanuvchi jarayon: massa → kuch → motor → batareya → massa.",
      ],
      check: [
        { q: '3 kg li dron uchun har bir motor (kvadro) kamida qancha kuch berishi kerak?', a: "3 × 2 = 6 kg umumiy, har bir motorga 1,5 kg." },
        { q: "Nega batareyani cheksiz kattalashtirib bo'lmaydi?", a: "Batareya og'irlashgani sari uni ko'tarish uchun ko'proq energiya ketadi. Ma'lum nuqtadan keyin qo'shimcha Wh parvoz vaqtini deyarli oshirmaydi." },
      ],
    },
    {
      id: 'xavfsizlik',
      title: 'Xavfsizlik va texnik xizmat',
      min: 7,
      parts: [],
      html: `
<h3>Parvozdan oldin</h3>
<ol>
<li>Ob-havo: shamol tezligi dron imkoniyatidan ancha past, yomg'ir va qor yo'q.</li>
<li>Hudud: taqiqlangan zona emas, odamlar va to'siqlar yo'q, ruxsatlar bor.</li>
<li>Rama, nurlar, vintlar: yoriq, egilish, bo'shagan vint yo'q.</li>
<li>Batareya to'liq zaryadlangan, shishmagan, mahkam bog'langan.</li>
<li>Og'irlik markazi o'rtada; yuk mahkamlangan.</li>
<li>GPS: kamida 10–12 yo'ldosh, «uy» nuqtasi yozilgan.</li>
<li>Kompas va IMU xatosiz; pult va telemetriya aloqasi bor.</li>
<li>Failsafe va RTL balandligi to'g'ri sozlangan.</li>
<li>Missiya xaritada tekshirilgan: balandliklar, geofence.</li>
<li>Birinchi soniyalar: 2–3 m da muallaq turib, dron barqarorligini kuzating.</li>
</ol>
<h3>Parvozdan keyin</h3>
<ul>
<li>Motorlar va ESC'lar haroratini tekshiring (ehtiyotkorlik bilan).</li>
<li>Batareya har elementining kuchlanishini yozib boring — notekis elementlar eskirish belgisi.</li>
<li>Parvoz jurnalini ko'rib chiqing: titrash, tok, GPS xatolari.</li>
</ul>
<h3>Texnik xizmat jadvali</h3>
<div class="tbl"><table>
<tr><th>Qachon</th><th>Nima</th></tr>
<tr><td>Har parvoz</td><td>vintlar, mahkamlagichlar, batareya holati</td></tr>
<tr><td>Har 10–20 parvoz</td><td>motor podshipniklari (qo'lda aylantirib, g'ijirlash bormi), simlar, ulagichlar</td></tr>
<tr><td>Har 50–100 soat</td><td>motorlarni almashtirish yoki tekshirish, rama yoriqlari, kalibrovkalar</td></tr>
</table></div>
<h3>Ko'p uchraydigan nosozliklar</h3>
<div class="tbl"><table>
<tr><th>Belgisi</th><th>Ehtimoliy sabab</th></tr>
<tr><td>Ko'tarilishda ag'dariladi</td><td>vint yo'nalishi yoki motor tartibi xato</td></tr>
<tr><td>Joyida aylana chizib uchadi</td><td>kompas xato yoki noto'g'ri yo'nalishda o'rnatilgan</td></tr>
<tr><td>Bir tomonga siljiydi</td><td>akselerometr kalibrovkasi yoki og'irlik markazi</td></tr>
<tr><td>Tebranadi, motorlar qiziydi</td><td>PID sozlamalari yoki titrash</td></tr>
<tr><td>Parvoz vaqti qisqargan</td><td>batareya eskirgan, motor podshipnigi yeyilgan</td></tr>
</table></div>
<h3>Shaxsiy xavfsizlik</h3>
<ul>
<li>Stolda ishlaganda vintlarni doim yeching.</li>
<li>Batareyani ulagandan keyin dronni «qurollangan» deb hisoblang — odamlardan uzoqda turing.</li>
<li>LiPo yong'ini suv bilan o'chirilmaydi; qum yoki maxsus o't o'chirgich kerak.</li>
<li>Qonunni bilish ham xavfsizlik: «O'rganish» bo'limidagi O'zbekiston qoidalari haqidagi qismni o'qing.</li>
</ul>`,
      summary: [
        "Parvozdan oldin tekshiruv ro'yxati — har safar, istisnosiz.",
        "Parvoz jurnali — nosozlikni oldindan ko'rsatadi.",
        'Vintlarni yechib ishlang; LiPo bilan ehtiyot bo\'ling.',
      ],
      check: [
        { q: "Dron ko'tarilishi bilan ag'darilib ketdi. Birinchi navbatda nimani tekshirish kerak?", a: "Motorlar tartibi va aylanish yo'nalishi, vintlar to'g'ri (CW/CCW) o'rnatilganini." },
        { q: "Batareya elementlaridan biri boshqalaridan doim 0,1 V past. Bu nimani bildiradi?", a: "Element eskirgan yoki shikastlangan. Batareyani kuzatib boring va kerak bo'lsa almashtiring." },
      ],
    },
  ];

  return { CHAPTERS };
});
