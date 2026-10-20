/*
 * Ssenariylar, darslar, test savollari, yo'l xaritasi va lug'at.
 * Brauzerda window.DronContent sifatida ishlaydi.
 */
(function (root) {
  'use strict';

  const CITY_ZONES = [
    { id: 'z1', name: 'Aeroport', x: 9600, y: 2600, r: 1400 },
    { id: 'z2', name: 'Harbiy obyekt', x: 2400, y: 8800, r: 800 },
    { id: 'z3', name: 'Stadion', x: 7600, y: 7500, r: 450 },
  ];
  const CITY_CLUSTERS = [
    { x: 4000, y: 3800, sd: 1400 },
    { x: 8400, y: 8800, sd: 1200 },
    { x: 3000, y: 6200, sd: 900 },
  ];

  const CLINICS = [
    ["Bo'ston QVP", 41000, 27000], ['Yangiobod QVP', 18000, 22000], ["Chorbog' QVP", 36000, 44000],
    ['Qoratepa QVP', 12000, 39000], ['Oqtepa QVP', 48000, 36000], ['Olmazor QVP', 26000, 12000],
    ["Ko'kterak QVP", 52000, 52000], ['Navbahor QVP', 8000, 10000], ['Gulzor QVP', 30000, 54000],
    ['Sarbon QVP', 54000, 20000],
  ].map(([name, x, y]) => ({ name, x, y }));

  const SCENARIOS = [
    {
      id: 'shahar',
      name: 'Shahar: oziq-ovqat va dorixona',
      goal: "Kamida 90% buyurtmani o'z vaqtida yetkazing, keyin dronlar sonini kamaytirib, eng arzon variantni toping.",
      config: {
        size: 12000, model: 'cargo', fleet: 4, ordersPerHour: 20, strategy: 'fifo',
        windMs: 4, windFromDeg: 315, tempC: 22,
        hubs: [{ id: 'h1', name: 'Markaziy ombor', x: 6000, y: 5600 }],
        zones: CITY_ZONES, clusters: CITY_CLUSTERS,
      },
    },
    {
      id: 'tiqilinch',
      name: 'Tushlik payti tiqilinch',
      goal: "Buyurtmalar odatdagidan deyarli ikki baravar ko'p. O'z vaqtida yetkazishni 90% dan oshiring: dron qo'shing, batareya almashtirishni yoqing yoki bir parvozda bir nechta buyurtma tashing.",
      config: {
        size: 12000, model: 'cargo', fleet: 4, ordersPerHour: 35, strategy: 'fifo',
        windMs: 3, windFromDeg: 45, tempC: 30,
        mix: { medical: 0.05, express: 0.5 },
        hubs: [{ id: 'h1', name: 'Markaziy ombor', x: 6000, y: 5600 }],
        zones: CITY_ZONES, clusters: CITY_CLUSTERS,
      },
    },
    {
      id: 'shamol',
      name: 'Shamolli va salqin kun',
      goal: "Kuchli shamolda qaysi buyurtmalar rad etiladi va nega? Shamolni asta oshirib, batareya qancha tez tugashini kuzating.",
      config: {
        size: 12000, model: 'cargo', fleet: 4, ordersPerHour: 20, strategy: 'fifo',
        windMs: 9, windFromDeg: 270, tempC: 4,
        hubs: [{ id: 'h1', name: 'Markaziy ombor', x: 6000, y: 5600 }],
        zones: CITY_ZONES, clusters: CITY_CLUSTERS,
      },
    },
    {
      id: 'tibbiy',
      name: 'Tibbiy yetkazish: qishloq poliklinikalari',
      goal: "Tibbiy buyurtmalar 45 daqiqada yetib borishi kerak. «Muddati yaqin va tibbiy birinchi» strategiyasini «Navbat bo'yicha» bilan solishtiring.",
      config: {
        size: 60000, model: 'vtol', fleet: 3, ordersPerHour: 4, strategy: 'priority',
        windMs: 5, windFromDeg: 0, tempC: 26,
        mix: { medical: 0.6, express: 0.3 },
        sla: { medical: 45, express: 60, normal: 120 },
        weights: [[0.7, 0.2, 1], [0.3, 1, 2]],
        hubs: [{ id: 'h1', name: 'Viloyat shifoxonasi', x: 30000, y: 30000 }],
        zones: [{ id: 'z1', name: 'Harbiy poligon', x: 44000, y: 12000, r: 4500 }],
        destinations: CLINICS,
      },
    },
    {
      id: 'tarmoq',
      name: 'Ikki omborli tarmoq',
      goal: "Katta shaharda ikkita ombor bor. Uchinchi omborni qo'shib (xaritada «Ombor» vositasi), o'rtacha yetkazish vaqti qanday o'zgarishini ko'ring.",
      config: {
        size: 18000, model: 'cargo', fleet: 6, ordersPerHour: 30, strategy: 'nearest',
        windMs: 5, windFromDeg: 315, tempC: 20,
        hubs: [
          { id: 'h1', name: 'Shimoliy ombor', x: 5000, y: 5000 },
          { id: 'h2', name: 'Janubiy ombor', x: 12500, y: 12000 },
        ],
        zones: [
          { id: 'z1', name: 'Aeroport', x: 14500, y: 4000, r: 1800 },
          { id: 'z2', name: 'Harbiy obyekt', x: 4000, y: 14000, r: 1200 },
        ],
        clusters: [
          { x: 5000, y: 6000, sd: 2200 }, { x: 12000, y: 11000, sd: 2400 }, { x: 9000, y: 15500, sd: 1600 },
        ],
      },
    },
    {
      id: 'ogir',
      name: "Qurilish maydonlariga og'ir yuk",
      goal: "Og'ir yuk masofani qisqartiradi. «Hisoblash» bo'limida 15 kg yuk bilan radiusni tekshiring, keyin bu yerda nechta dron yetarli ekanini toping.",
      config: {
        size: 20000, model: 'heavy', fleet: 2, ordersPerHour: 5, strategy: 'fifo',
        windMs: 4, windFromDeg: 315, tempC: 24,
        weights: [[0.4, 2, 6], [0.4, 6, 11], [0.2, 11, 15]],
        mix: { medical: 0, express: 0.3 },
        sla: { medical: 30, express: 45, normal: 90 },
        hubs: [{ id: 'h1', name: 'Logistika markazi', x: 4000, y: 10000 }],
        zones: [{ id: 'z1', name: 'Elektr podstansiyasi', x: 11000, y: 8000, r: 900 }],
        clusters: [{ x: 13000, y: 6000, sd: 2000 }, { x: 15000, y: 15000, sd: 1800 }, { x: 8000, y: 16000, sd: 1500 }],
      },
    },
  ];

  // ---------- Yo'l xaritasi ----------

  const ROADMAP = [
    { title: 'Asoslar', time: '1–2 hafta', text: "Dron turlari, qismlari, uchish fizikasi va batareya. Shu ilovadagi 1–4-darslar va test." },
    { title: 'Simulyatorda tajriba', time: '2–3 hafta', text: "Har bir ssenariyni o'ynab chiqing. «Tajriba» bo'limida dronlar soni, strategiya va shamolning ta'sirini o'lchang, xulosalarni daftarga yozing." },
    { title: 'Haqiqiy avtopilot dasturlari', time: '1 oy', text: "Kompyuterga QGroundControl va PX4 yoki ArduPilot SITL simulyatorini o'rnating. Dron kerak emas: virtual dronga missiya (marshrut) tuzib, uchiring." },
    { title: 'Dasturlash', time: '1–2 oy', text: "Python asoslari, keyin MAVSDK yoki pymavlink bilan virtual dronni koddan boshqarish. Marshrut uchun Google OR-Tools (VRP) kutubxonasi." },
    { title: 'Qonunchilik va xavfsizlik', time: 'doimiy', text: "O'zbekistondagi amaldagi qoidalar, havo hududi zonalari, litsenziya. Xalqaro tajriba: EASA (Yevropa), FAA (AQSh)." },
    { title: 'Biznes modeli', time: '1 oy', text: "Unit-ekonomika, mijozlar (dorixona, shifoxona, ombor, qishloq xo'jaligi), raqobatchilar. «Hisoblash» bo'limida o'z modelingizni tuzing." },
    { title: 'Amaliyot', time: 'keyin', text: "Litsenziyaga ega tashkilotda yoki rasmiy ruxsat bilan haqiqiy dron bilan ishlash. Kichik pilot loyiha: bitta ombor, bitta marshrut." },
  ];

  // ---------- Darslar ----------

  const LESSONS = [
    {
      id: 'turlar',
      title: 'Dron turlari va logistikada qaysi biri qayerda',
      min: 6,
      html: `
<p>Logistikada asosan uch xil dron ishlatiladi:</p>
<ul>
<li><b>Multikopter</b> (4, 6 yoki 8 vintli). Joyida osilib tura oladi, istalgan hovlidan ko'tariladi. Kamchiligi — energiyani ko'p sarflaydi, odatda 5–15 km radiusda ishlaydi. Shahar ichida tez yetkazish uchun qulay.</li>
<li><b>Qanotli dron</b> (samolyot kabi). Qanot ko'tarish kuchini bepul beradi, shuning uchun 3–5 marta tejamkor va 50–100 km uzoqqa uchadi. Lekin qo'nish uchun maydon yoki maxsus moslama kerak.</li>
<li><b>VTOL (gibrid)</b>. Vertikal ko'tariladi, keyin qanot bilan uchadi. Uzoq masofali tibbiy yetkazishda keng tarqalgan.</li>
</ul>
<p>Yukni topshirish usullari: qo'nish, <b>arqonda (lebyodka) tushirish</b> — dron 7–10 m balandlikda osilib turadi, yoki <b>parashyutda tashlash</b> — dron to'xtamasdan o'tib ketadi.</p>
<p class="note">Ilovadagi 4 ta tayyor model aynan shu turlarni ifodalaydi. «Hisoblash» bo'limida ularni solishtiring.</p>`,
      tryIt: { tab: 'calc', text: "Modellarni «Hisoblash» bo'limida solishtirish" },
    },
    {
      id: 'qismlar',
      title: 'Dron nimalardan iborat',
      min: 7,
      html: `
<ul>
<li><b>Rama</b> — korpus (karbon, alyuminiy, plastik).</li>
<li><b>Motorlar</b> (cho'tkasiz, BLDC) va <b>vintlar</b>. Vint diametri dyuymda o'lchanadi: 10" ≈ 25 cm.</li>
<li><b>ESC</b> (elektron tezlik regulyatori) — har bir motor aylanishini boshqaradi.</li>
<li><b>Parvoz kontrolleri</b> — dronning «miyasi». Unda PX4 yoki ArduPilot kabi avtopilot dasturi ishlaydi.</li>
<li><b>Sensorlar</b>: IMU (giroskop va akselerometr), barometr (balandlik), magnitometr (kompas), GNSS (GPS, GLONASS, Galileo). Aniq qo'nish uchun RTK — santimetr aniqlik.</li>
<li><b>Batareya</b> — odatda LiPo yoki Li-ion. Sig'imi Wh (vatt-soat) da o'lchanadi.</li>
<li><b>Aloqa</b>: pult (RC), telemetriya radiosi, uzoq masofada 4G/LTE modem.</li>
<li><b>Yuk moslamasi</b>: quti, lebyodka yoki parashyut tashlash mexanizmi.</li>
</ul>
<p>Logistik dronda yana muhim narsalar: <b>geofence</b> (taqiqlangan hududga kirmaslik), <b>RTL</b> (aloqa uzilsa uyga qaytish), to'qnashuvdan qochish sensorlari va favqulodda parashyut.</p>`,
    },
    {
      id: 'fizika',
      title: "Uchish fizikasi: nega yuk og'irlashsa masofa keskin qisqaradi",
      min: 8,
      html: `
<p>Multikopter havoni pastga itarib ko'tariladi. Impuls nazariyasiga ko'ra muallaq turish quvvati:</p>
<p class="formula">P ≈ (m·g)<sup>1,5</sup> / √(2·ρ·A)</p>
<p>Bu yerda <i>m</i> — massa, <i>ρ</i> — havo zichligi, <i>A</i> — vintlar yuzasi. Muhim xulosalar:</p>
<ul>
<li>Massa 2 baravar oshsa, quvvat 2<sup>1,5</sup> ≈ <b>2,8 baravar</b> oshadi. Shuning uchun har bir kilogramm qimmat.</li>
<li>Katta vintlar (katta <i>A</i>) tejamkorroq. Og'ir yuk dronlarining vintlari shuning uchun ulkan.</li>
<li>Issiq kunda va tog'da havo siyrak (<i>ρ</i> kichik) — dron ko'proq quvvat sarflaydi.</li>
<li>Oldinga uchganda multikopter biroz tejaydi, lekin juda tez uchsa havo qarshiligi (~v³) ortadi. Demak, <b>eng tejamkor tezlik</b> bor — «Hisoblash» bo'limidagi grafikda ko'rinadi.</li>
</ul>
<p>Qanotli dronda ko'tarish kuchini qanot beradi, motor faqat havo qarshiligini yengadi. Shuning uchun u ancha uzoqqa uchadi.</p>`,
      tryIt: { tab: 'calc', text: "Yuk og'irligini o'zgartirib, radius grafigini kuzatish" },
    },
    {
      id: 'batareya',
      title: 'Batareya va energiya rejasi',
      min: 7,
      html: `
<ul>
<li><b>Wh</b> — batareyadagi energiya. Masalan, 22,2 V × 22 Ah ≈ 488 Wh.</li>
<li>Batareyani 0% gacha ishlatib bo'lmaydi: odatda <b>20–30% zaxira</b> qoldiriladi (kutilmagan shamol, kutish, xavfsiz qo'nish uchun). Chuqur zaryadsizlanish batareya umrini qisqartiradi.</li>
<li><b>Sovuq</b> Li-ion sig'imini kamaytiradi: 0°C da 15–25% kam energiya chiqadi. Qishda radius qisqaradi.</li>
<li><b>Sikllar</b>: batareya 300–800 marta zaryadlangach almashtiriladi. Bu bir yetkazish narxiga kiradi.</li>
</ul>
<p><b>Zaryadlash yoki almashtirish?</b> Zaryadlash 40–60 daqiqa davom etadi va dron shu payt bo'sh turadi. Batareyani almashtirish 1–3 daqiqa oladi, lekin har dron uchun 2–3 ta zaxira batareya kerak. Ko'p buyurtmali tizimlarda almashtirish odatda arzonroq chiqadi, chunki kamroq dron kerak.</p>`,
      tryIt: { scenario: 'tiqilinch', text: "«Tiqilinch» ssenariysida zaryadlash va almashtirishni solishtirish" },
    },
    {
      id: 'modellar',
      title: 'Dron logistikasi modellari',
      min: 8,
      html: `
<ul>
<li><b>Last mile</b> (oxirgi masofa) — ombor yoki do'kondan mijoz eshigigacha. Eng qimmat bosqich, dronlar aynan shu yerda vaqt va pulni tejaydi.</li>
<li><b>Hub-and-spoke</b> — markaziy ombor (hub) va undan nurlar kabi tarqaladigan parvozlar. Ilovadagi simulyator shu modelda ishlaydi.</li>
<li><b>Ombor tarmog'i</b> — bir nechta kichik ombor (mikro-hub). Masofa qisqaradi, lekin har bir omborga xarajat kerak.</li>
<li><b>Mashina + dron</b> — yuk mashinasi mahallaga yetib boradi, dronlar undan uchib tarqatadi.</li>
<li><b>Tibbiy logistika</b> — qon, vaksina, dori, tahlil namunalari. Ruanda va Ganada Zipline kompaniyasi shu yo'nalishda keng ishlaydi.</li>
<li><b>Middle mile</b> — omborlar orasida yoki tog'li hududlarga og'ir yuk tashish.</li>
<li><b>Ombor ichidagi dronlar</b> — yopiq omborda tokchalardagi shtrix-kodlarni skanerlab, inventarizatsiya qilish. Bu yo'nalish ko'chada uchishga qaraganda kamroq ruxsat talab qiladi.</li>
</ul>`,
      tryIt: { scenario: 'tarmoq', text: "«Ikki omborli tarmoq» ssenariysini ochish" },
    },
    {
      id: 'marshrut',
      title: 'Marshrut va dispetcherlik algoritmlari',
      min: 9,
      html: `
<p>Dispetcher har bir buyurtmaga qaysi dron, qachon va qaysi yo'ldan uchishini hal qiladi.</p>
<ul>
<li><b>Navbat (FIFO)</b> — birinchi kelgan buyurtma birinchi yuboriladi. Adolatli, lekin har doim samarali emas.</li>
<li><b>Eng yaqin buyurtma</b> — dron eng tez yetadigan buyurtmani oladi. Energiyani tejaydi, ammo uzoqdagi mijozlar kutib qolishi mumkin.</li>
<li><b>Muddati yaqin birinchi</b> (EDF) va ustuvorlik — tibbiy va tezkor buyurtmalar navbatdan oldin o'tadi.</li>
</ul>
<p>Bir parvozda bir nechta buyurtma tashilsa, manzillar tartibi muhim: bu <b>kommivoyajer masalasi (TSP)</b>. Ko'p dronli varianti <b>VRP</b> deyiladi. Simulyatorda «eng yaqin qo'shni» usuli, so'ng <b>2-opt</b> yaxshilash ishlatiladi: kesishgan yo'llar almashtirilib, marshrut qisqartiriladi.</p>
<p>Taqiqlangan zonalarni aylanib o'tish uchun <b>ko'rinish grafi + A*</b> qidiruvi ishlatiladi: har bir zona atrofiga ko'pburchak chiziladi va eng qisqa yo'l shu burchaklar orqali topiladi.</p>`,
      tryIt: { scenario: 'shahar', text: "Xaritaga yangi taqiqlangan zona qo'yib, yo'llar qanday o'zgarishini ko'rish" },
    },
    {
      id: 'kpi',
      title: "Ko'rsatkichlar (KPI) va unit-ekonomika",
      min: 7,
      html: `
<ul>
<li><b>O'z vaqtida yetkazish</b> (SLA) — va'da qilingan vaqtda yetgan buyurtmalar ulushi. Simulyatorda: tibbiy — 20, tezkor — 30, oddiy — 60 daqiqa.</li>
<li><b>O'rtacha yetkazish vaqti</b> — buyurtma berilgandan qo'lga tekkunicha.</li>
<li><b>Bandlik</b> (utilization) — dron vaqtining qancha qismi parvozda. Past bandlik = qimmat yetkazish.</li>
<li><b>Bir yetkazish narxi</b> = amortizatsiya + batareya eskirishi + elektr + texnik xizmat + operator + doimiy xarajatlar, bo'lingan yetkazishlar soniga.</li>
</ul>
<p><b>Quvvat va talab.</b> Agar dronlar bir soatda yetkaza oladigan buyurtmalar soni kelayotgan buyurtmalardan kam bo'lsa, navbat to'xtovsiz o'sadi va deyarli hamma kechikadi. Chegarada bitta dron qo'shish natijani 45% dan 99% gacha o'zgartirishi mumkin. «Tiqilinch» ssenariysida buni o'zingiz ko'rasiz.</p>
<p>Asosiy saboq: dron narxi va operator maoshi <b>doimiy</b> xarajat. Ularni ko'proq yetkazishga bo'lsangiz, bitta yetkazish arzonlashadi. Shuning uchun dronlar soni buyurtma oqimiga mos bo'lishi kerak: kam bo'lsa — kechikish, ko'p bo'lsa — bekor turish.</p>`,
      tryIt: { tab: 'exp', text: "«Tajriba» bo'limida eng arzon dronlar sonini topish" },
    },
    {
      id: 'xavfsizlik',
      title: 'Xavfsizlik va havo hududi',
      min: 6,
      html: `
<ul>
<li><b>VLOS</b> — dron operatorning ko'z o'ngida uchadi. <b>BVLOS</b> — ko'zdan uzoqda; yetkazish xizmatlari uchun aynan shu kerak va eng ko'p ruxsat talab qiladi.</li>
<li><b>Taqiqlangan zonalar</b>: aeroportlar, harbiy va davlat obyektlari, ommaviy tadbirlar. Geofence dasturi dronni bu hududga kiritmaydi.</li>
<li><b>Remote ID</b> — dron o'zini masofadan tanitadi (raqamli «davlat raqami»).</li>
<li><b>UTM</b> — uchuvchisiz havo harakatini boshqarish tizimi: ko'p dron bir-biriga xalal bermay uchishi uchun.</li>
<li>Parvozdan oldin tekshiruv ro'yxati: batareya, vintlar, GPS signali, ob-havo, zona ruxsati, favqulodda reja.</li>
</ul>`,
    },
    {
      id: 'kod',
      title: 'Dasturlash: virtual dronni koddan boshqarish',
      min: 10,
      html: `
<p>Dronlar <b>MAVLink</b> protokoli orqali buyruq oladi. Uni kompyuterda haqiqiy dronsiz sinash mumkin: <b>PX4 SITL</b> yoki <b>ArduPilot SITL</b> virtual dronni ishga tushiradi, QGroundControl esa xaritada ko'rsatadi.</p>
<p>PX4 simulyatorini ishga tushirish (Ubuntu):</p>
<pre><code>git clone https://github.com/PX4/PX4-Autopilot.git --recursive
cd PX4-Autopilot
bash ./Tools/setup/ubuntu.sh
make px4_sitl gz_x500</code></pre>
<p>Python'da MAVSDK bilan oddiy «yetkazish» missiyasi (<code>pip install mavsdk</code>):</p>
<pre><code>import asyncio
from mavsdk import System

async def main():
    drone = System()
    await drone.connect(system_address="udpin://0.0.0.0:14540")
    async for state in drone.core.connection_state():
        if state.is_connected:
            break
    async for health in drone.telemetry.health():
        if health.is_global_position_ok and health.is_home_position_ok:
            break

    await drone.action.set_takeoff_altitude(30)
    await drone.action.arm()
    await drone.action.takeoff()
    await asyncio.sleep(10)

    # Mijoz manzili: kenglik, uzunlik, dengiz sathidan balandlik (m), yo'nalish
    await drone.action.goto_location(41.3111, 69.2797, 485, 0)
    await asyncio.sleep(60)
    await drone.action.return_to_launch()

asyncio.run(main())</code></pre>
<p class="note">Keyingi qadam: bir nechta buyurtma uchun marshrutni Google OR-Tools bilan hisoblab, nuqtalarni ketma-ket <code>goto_location</code> bilan yuborish.</p>`,
    },
  ];

  // ---------- Test ----------

  const QUIZ = [
    {
      q: "Yuk massasi 2 baravar oshsa, multikopterning muallaq turish quvvati taxminan qancha oshadi?",
      a: ['2 baravar', '2,8 baravar', '4 baravar', "O'zgarmaydi"],
      ok: 1,
      why: 'Quvvat massaning 1,5 darajasiga proporsional: 2^1,5 ≈ 2,8.',
    },
    {
      q: "80 km uzoqlikdagi qishloq shifoxonasiga qon yetkazish uchun qaysi dron mosroq?",
      a: ['Mini kvadrokopter', "Og'ir oktokopter", 'VTOL qanotli dron', 'Farqi yo\'q'],
      ok: 2,
      why: "Qanot ko'tarish kuchini beradi, shuning uchun VTOL bir zaryadda ancha uzoqqa uchadi.",
    },
    {
      q: '«Last mile» nima?',
      a: ["Ombordan mijoz eshigigacha bo'lgan oxirgi bosqich", 'Dronning eng uzoq parvozi', 'Omborlar orasidagi tashish', 'Batareyaning oxirgi 10%'],
      ok: 0,
      why: "Yetkazishning eng qimmat va sekin qismi — dronlar aynan shu yerda foyda beradi.",
    },
    {
      q: 'Borishda qarshi shamol, qaytishda orqadan shamol bo\'lsa, umumiy parvoz vaqti...',
      a: ["shamolsiz kundagidek bo'ladi", 'qisqaradi', 'uzayadi', 'shamolga bog\'liq emas'],
      ok: 2,
      why: "Qarshi shamolda yo'qotilgan vaqt orqa shamolda to'liq qaytmaydi: d/(v−w) + d/(v+w) > 2d/v.",
    },
    {
      q: 'Nima uchun batareyada 20–30% zaxira qoldiriladi?',
      a: ['Dron og\'irroq bo\'lishi uchun', "Kutilmagan shamol, kutish va xavfsiz qo'nish uchun", 'Qonun shunday talab qiladi xolos', 'Zaryadlash tezlashishi uchun'],
      ok: 1,
      why: "Zaxira — kutilmagan holatlar uchun. U batareya umrini ham uzaytiradi.",
    },
    {
      q: 'BVLOS parvoz bu...',
      a: ["Tunda uchish", "Operator ko'zidan uzoqda uchish", 'Faqat yopiq binoda uchish', 'Pultdan qo\'lda boshqarish'],
      ok: 1,
      why: "Beyond Visual Line of Sight — yetkazish xizmatlari uchun asosiy rejim, eng ko'p ruxsat talab qiladi.",
    },
    {
      q: 'Geofence nima qiladi?',
      a: ['Dronni zaryadlaydi', "Dronni taqiqlangan hududga kiritmaydi", 'Yukni tashlaydi', "Shamol tezligini o'lchaydi"],
      ok: 1,
      why: "Bu dasturiy «devor»: avtopilot belgilangan chegaradan o'tmaydi.",
    },
    {
      q: 'Batareyani almashtirishning (swap) zaryadlashdan asosiy afzalligi nima?',
      a: ["Batareya arzonlashadi", 'Dron tezroq qayta uchadi, kamroq dron kerak bo\'ladi', 'Elektr tejaladi', "Dron yengillashadi"],
      ok: 1,
      why: "Dron 1–3 daqiqada yana uchishga tayyor — bandlik oshadi, bir yetkazish arzonlashadi.",
    },
    {
      q: '0°C sovuqda Li-ion batareya bergan energiya...',
      a: ['oshadi', "o'zgarmaydi", 'kamayadi', 'nolga tushadi'],
      ok: 2,
      why: "Sovuqda kimyoviy reaksiya sekinlashadi, sig'im taxminan 15–25% kamayadi.",
    },
    {
      q: '2-opt algoritmi marshrut bilan nima qiladi?',
      a: ["Kesishgan ikki bo'lakni almashtirib, yo'lni qisqartiradi", 'Dronlar sonini ikki baravar oshiradi', "Ikki omborni birlashtiradi", 'Shamolni hisoblaydi'],
      ok: 0,
      why: "Marshrutning bir bo'lagini teskari aylantirib, umumiy masofa qisqarsa — shu variant qoldiriladi.",
    },
    {
      q: 'PX4 va ArduPilot nima?',
      a: ['Dron ishlab chiqaruvchi zavodlar', 'Ochiq kodli avtopilot dasturlari', 'Batareya turlari', 'Havo hududi qoidalari'],
      ok: 1,
      why: "Ular parvoz kontrollerida ishlaydi va SITL orqali kompyuterda ham sinab ko'rish mumkin.",
    },
    {
      q: "Issiq kunda (40°C) dron bir xil yukni ko'tarish uchun...",
      a: ['kamroq quvvat sarflaydi', "ko'proq quvvat sarflaydi", 'bir xil quvvat sarflaydi', 'umuman ucholmaydi'],
      ok: 1,
      why: "Issiq havo siyrak — vintlar bir xil kuch uchun ko'proq havoni tezroq itarishi kerak.",
    },
    {
      q: 'Bir yetkazish narxini kamaytirishning odatda eng samarali yo\'li qaysi?',
      a: ['Dronni tezroq uchirish', 'Har bir dronning kunlik yetkazishlar sonini oshirish', 'Batareyani kattalashtirish', "Ombordan uzoqroq mijozlarga yetkazish"],
      ok: 1,
      why: "Dron narxi va operator maoshi doimiy xarajat: ko'proq yetkazishga bo'linsa, har biri arzonlashadi.",
    },
  ];

  // ---------- Lug'at ----------

  const GLOSSARY = [
    ['VTOL', "Vertical Take-Off and Landing — vertikal ko'tariladigan va qo'nadigan uchish apparati."],
    ['VLOS / BVLOS', "Operator ko'z o'ngida / ko'zidan uzoqda uchish."],
    ['Payload', "Foydali yuk — dron tashiydigan yuk massasi."],
    ['Wh (vatt-soat)', "Batareyadagi energiya. 500 Wh batareya 1000 Vt quvvatda 30 daqiqa ishlaydi."],
    ['C-reyting', "Batareyani qancha tez zaryadlash yoki zaryadsizlantirish mumkinligi. 1C — 1 soatda to'liq."],
    ['ESC', "Elektron tezlik regulyatori — motor aylanishini boshqaradi."],
    ['IMU', "Inersial o'lchash bloki: giroskop va akselerometr."],
    ['GNSS / RTK', "Sun'iy yo'ldosh navigatsiyasi (GPS va boshqalar). RTK — santimetrgacha aniq tuzatma."],
    ['Geofence', "Dasturiy chegara: dron undan tashqariga chiqmaydi yoki ichiga kirmaydi."],
    ['RTL', "Return to Launch — aloqa uzilsa yoki batareya kamaysa uchgan joyiga qaytish."],
    ['MAVLink', "Dron va yer stansiyasi o'rtasidagi aloqa protokoli."],
    ['SITL', "Software In The Loop — avtopilotni kompyuterda virtual dron bilan sinash."],
    ['Hub', "Markaziy ombor yoki dronlar uchadigan baza."],
    ['Last mile', "Yetkazishning oxirgi bosqichi: ombordan mijozgacha."],
    ['SLA', "Xizmat darajasi: va'da qilingan yetkazish muddati."],
    ['Utilization (bandlik)', "Dron vaqtining parvozda o'tgan ulushi."],
    ['TSP / VRP', "Kommivoyajer masalasi / transport vositalari marshruti masalasi."],
    ['A*', "Grafda eng qisqa yo'lni topuvchi qidiruv algoritmi."],
    ['UTM', "Uchuvchisiz havo harakatini boshqarish tizimi."],
    ['Remote ID', "Dronning masofadan o'zini tanitishi."],
    ['QVP', "Qishloq vrachlik punkti."],
  ];

  const RESOURCES = [
    ['PX4 avtopilot hujjatlari', 'https://docs.px4.io/'],
    ['ArduPilot va SITL simulyatori', 'https://ardupilot.org/dev/docs/sitl-simulator-software-in-the-loop.html'],
    ['QGroundControl — yer stansiyasi', 'https://qgroundcontrol.com/'],
    ['MAVSDK — Python va C++ kutubxonasi', 'https://mavsdk.mavlink.io/'],
    ['Gazebo — 3D simulyator', 'https://gazebosim.org/'],
    ['Google OR-Tools: marshrut (VRP)', 'https://developers.google.com/optimization/routing'],
    ['EASA: Yevropa dron qoidalari', 'https://www.easa.europa.eu/en/domains/civil-drones'],
    ['FAA: AQSh dron qoidalari', 'https://www.faa.gov/uas'],
    ['Zipline — tibbiy dron yetkazish', 'https://www.zipline.com/'],
    ['Wing — shahar ichida yetkazish', 'https://wing.com/'],
  ];

  root.DronContent = { SCENARIOS, ROADMAP, LESSONS, QUIZ, GLOSSARY, RESOURCES };
})(typeof self !== 'undefined' ? self : this);
