/*
 * «Tuzilishi» bo'limi uchun ma'lumotlar: dron qismlari, yozma sayohat qadamlari
 * va parvoz harakatlari (qaysi motor qancha tez aylanadi).
 * Brauzerda window.DronParts, Node.js'da module.exports.
 *
 * Motorlar raqami PX4 va ArduPilot'dagi «Quad X» tartibida:
 *   M1 — old o'ng, soat miliga teskari (CCW)
 *   M2 — orqa chap, soat miliga teskari (CCW)
 *   M3 — old chap, soat mili bo'yicha (CW)
 *   M4 — orqa o'ng, soat mili bo'yicha (CW)
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DronParts = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MOTORS = [
    { n: 1, name: "M1 · old o'ng", pos: 'FR', dir: 'CCW' },
    { n: 2, name: 'M2 · orqa chap', pos: 'RL', dir: 'CCW' },
    { n: 3, name: 'M3 · old chap', pos: 'FL', dir: 'CW' },
    { n: 4, name: "M4 · orqa o'ng", pos: 'RR', dir: 'CW' },
  ];

  // ---------- Qismlar ----------

  const PARTS = [
    {
      id: 'rama', name: 'Rama', group: 'Korpus',
      short: "Hamma qismlar mahkamlanadigan skelet.",
      what: "Rama motorlarni bir-biridan aniq masofada ushlab turadi, elektronikani himoya qiladi va parvozdagi kuchlarni o'ziga oladi. Qattiqligi juda muhim: rama egilsa yoki titrasa, sensorlar noto'g'ri ma'lumot oladi.",
      how: "Markazda ikki qavatli plastina bor: ular orasida quvvat platasi, ustida parvoz kontrolleri joylashadi. Markazdan to'rtta nur (qo'l) chiqadi, ularning uchida motorlar o'rnatiladi. Bu modelda nurlar «X» shaklida — oldinga qarab ikkita, orqaga qarab ikkita.",
      specs: [['O\'lchami (wheelbase)', '650 mm — diagonal bo\'yicha ikki motor o\'qi orasidagi masofa'], ['Material', 'karbon tola: yengil va juda qattiq'], ['Massasi', '≈ 500–700 g (bo\'sh rama)']],
      fail: "Nur sinsa yoki egilsa, motor qiyshayadi va dron bir tomonga og'ib, boshqarib bo'lmay qoladi. Yoriq rama titrashni kuchaytiradi.",
      tip: "Karbon tok o'tkazadi! Simlar uning qirrasiga ishqalanib, izolyatsiyasi yeyilsa, qisqa tutashuv bo'ladi. Simlarni qisqich va himoya trubkasi bilan o'tkazing.",
      chapter: 'rama',
    },
    {
      id: 'motor', name: 'Motorlar', group: 'Harakat',
      short: "To'rtta cho'tkasiz (BLDC) motor vintlarni aylantiradi.",
      what: "Motor elektr energiyasini aylanish harakatiga aylantiradi. Dronda vites qutisi yo'q: vint to'g'ridan-to'g'ri motor o'qiga o'rnatiladi, shuning uchun motor tezligi = vint tezligi.",
      how: "Ichida qo'zg'almas qism — mis o'ramli stator, tashqarida esa magnitli «qo'ng'iroq» (rotor) aylanadi. ESC o'ramlarga navbat bilan tok beradi, hosil bo'lgan magnit maydon rotordagi magnitlarni o'ziga tortadi va qo'ng'iroq aylanadi. Cho'tka yo'qligi uchun motor deyarli yeyilmaydi va FIK yuqori (80–90%).",
      specs: [['Belgisi', '4006 — stator diametri 40 mm, balandligi 6 mm'], ['KV', '400 KV — 1 voltga 400 ayl/daq (yuksiz)'], ['Tezlik', '6S (22,2 V) da ≈ 5 000–7 000 ayl/daq'], ['Tortish kuchi', 'har biri 2–3 kg gacha (15″ vint bilan)']],
      fail: "Kvadrokopterda bitta motor to'xtasa, qolgan uchtasi muvozanatni ushlay olmaydi: dron aylanib, pastga tushadi. Olti yoki sakkiz motorli dronlar bitta motorsiz ham qo'nishi mumkin.",
      tip: "KV qancha kichik bo'lsa, motor sekinroq, lekin kattaroq vintni kuchliroq aylantiradi. Yuk dronlari uchun past KV + katta vint — tejamkor juftlik.",
      chapter: 'motor',
    },
    {
      id: 'vint', name: 'Vintlar', group: 'Harakat',
      short: "Havoni pastga itarib, ko'tarish kuchini hosil qiladi.",
      what: "Vint (propeller) — dronning «qanoti». Har bir parrak kichkina qanot kabi profilga ega: aylanganda ustida bosim kamayadi, ostida oshadi va havo pastga otiladi. Nyutonning uchinchi qonuniga ko'ra, havo pastga itarilsa, dron yuqoriga itariladi.",
      how: "Ikkita vint soat mili bo'yicha (CW, ko'k), ikkitasi teskari (CCW, sariq) aylanadi. Diagonal qarshidagi vintlar bir xil yo'nalishda. Shu tufayli aylanish momentlari bir-birini yo'qqa chiqaradi va dron o'z o'qi atrofida aylanib ketmaydi. Tortish kuchi aylanish tezligining kvadratiga proporsional: tezlik 2 baravar oshsa, kuch 4 baravar oshadi.",
      specs: [['Belgisi', '15×5,5 — diametri 15″ (38 sm), qadami 5,5″'], ['Qadam', 'bir aylanishda havoda nazariy siljish masofasi'], ['Parraklar', '2 ta — eng tejamkor; 3 ta — kichik o\'lchamda ko\'proq kuch']],
      fail: "Singan yoki muvozanatsiz vint kuchli titrash beradi: kamera tasviri chayqaladi, sensorlar adashadi, motor podshipnigi tez yeyiladi.",
      tip: "Vintlarni hech qachon qo'l bilan ushlab sinamang — aylanayotgan vint jiddiy jarohat yetkazadi. Sozlash ishlarini vintlarni yechib qiling.",
      chapter: 'vint',
    },
    {
      id: 'esc', name: 'ESC (tezlik regulyatori)', group: 'Energiya',
      short: "Har bir motorga qancha tok berishni boshqaradi.",
      what: "ESC (Electronic Speed Controller) parvoz kontrollerining buyrug'ini motor uchun kuchli uch fazali tokka aylantiradi. Har bir motorning o'z ESC'si bor — bu modelda ular nurlar ostida joylashgan.",
      how: "Ichida 6 ta kuchli tranzistor (MOSFET) va kichik mikrokontroller bor. U motor o'ramlariga navbat bilan tok yuboradi — sekundiga minglab marta. Rotor qayerdaligini o'ramlardagi teskari kuchlanishdan (back-EMF) bilib oladi, shuning uchun motorga alohida datchik kerak emas. Kontrollerdan buyruqni raqamli DShot protokolida oladi.",
      specs: [['Tok', '40 A uzluksiz (har bir motor uchun)'], ['Kuchlanish', '6S gacha (25,2 V)'], ['Protokol', 'DShot600 yoki PWM (1000–2000 mks)'], ['Dastur', 'BLHeli_32, AM32 yoki FOC']],
      fail: "ESC kuyib qolsa, uning motori to'xtaydi — natija motor ishdan chiqqandagidek. Ko'pincha sabab — haddan tashqari tok yoki yomon sovitish.",
      tip: "ESC toki motor tortadigan eng katta tokdan kamida 20–30% ko'p bo'lsin. ESC'ni vint havosi tushadigan joyga qo'ysangiz, yaxshi soviydi.",
      chapter: 'esc',
    },
    {
      id: 'pdb', name: 'Quvvat taqsimlash platasi', group: 'Energiya',
      short: "Batareya tokini ESC'lar va elektronikaga bo'lib beradi.",
      what: "PDB (Power Distribution Board) — markaziy «elektr shchit». Batareyadan kelgan kuchli tok shu yerda to'rtta ESC'ga bo'linadi. Unda kuchlanishni 5 V ga tushiruvchi stabilizator (BEC) va tok o'lchagich ham bor.",
      how: "Qalin mis qatlamli plata: batareya simi XT60/XT90 ulagich orqali kiradi, ESC simlari kavsharlanadi. Quvvat moduli parvoz kontrolleriga batareya kuchlanishi va tokini aytib turadi — shu bilan kontroller qolgan energiyani hisoblaydi va batareya kamayganda dronni uyiga qaytaradi.",
      specs: [['Tok', '120 A gacha'], ['BEC', '5 V, 3 A — kontroller va sensorlar uchun'], ['O\'lchov', 'kuchlanish va tok — kontrollerga']],
      fail: "Yomon kavsharlangan joy qizib ketadi va parvozda tok uzilishi mumkin — bu barcha motorlar bir vaqtda to'xtashi degani.",
      tip: "Kuchli tok simlari qisqa va yo'g'on bo'lishi kerak. Signal simlarini ulardan uzoqroq o'tkazing — kompas va radio xalaqit olmasin.",
      chapter: 'batareya',
    },
    {
      id: 'fc', name: 'Parvoz kontrolleri', group: 'Boshqaruv',
      short: "Dronning «miyasi»: sensorlarni o'qib, motorlarga buyruq beradi.",
      what: "Parvoz kontrolleri (flight controller) — kichik kompyuter. U sekundiga yuzlab–minglab marta sensorlarni o'qiydi, dron qanday holatda turganini hisoblaydi va uni kerakli holatga keltirish uchun har bir motorga qancha tezlik kerakligini aytadi. Inson dronni bunchalik tez muvozanatda ushlab tura olmaydi.",
      how: "Platada mikrokontroller (STM32 kabi) va sensorlar joylashgan. Unda avtopilot dasturi ishlaydi: PX4 yoki ArduPilot (yuk va xarita dronlari), Betaflight (FPV poyga dronlari). Dastur zanjiri: sensorlar → holatni baholash → PID boshqaruv → mikser (qaysi motorga qancha) → ESC'lar. Platadagi strelka dronning old tomonini ko'rsatadi.",
      specs: [['Protsessor', 'STM32H7, 480 MHz'], ['Boshqaruv sikli', '400–8 000 marta sekundiga'], ['Dastur', 'PX4, ArduPilot yoki Betaflight'], ['Misol', 'Pixhawk, Cube, Matek, SpeedyBee']],
      fail: "Kontroller to'xtasa, dron darhol boshqaruvni yo'qotadi. Shuning uchun jiddiy dronlarda sensorlar ikki-uch nusxada bo'ladi.",
      tip: "Kontroller dronning og'irlik markaziga iloji boricha yaqin va strelkasi oldinga qaratib o'rnatiladi. Rezina amortizatorlar uni titrashdan himoya qiladi.",
      chapter: 'kontroller',
    },
    {
      id: 'imu', name: 'IMU: giroskop va akselerometr', group: 'Sensorlar',
      short: "Dron qanchalik og'gani va qanchalik tez aylanayotganini sezadi.",
      what: "IMU (inersial o'lchash bloki) — dronning «ichki qulog'i». Giroskop aylanish tezligini (gradus/sekund), akselerometr esa tezlanishni va yerning tortish kuchi yo'nalishini o'lchaydi. Shulardan dron qaysi tomonga va qancha og'ganini bilib oladi.",
      how: "Bu — mikroskopik mexanik sensor (MEMS): kremniy ichida mitti tebranuvchi massalar bor. Dron aylansa yoki tezlansa, massalar biroz siljiydi va sig'im o'zgaradi — chip buni raqamga aylantiradi. Giroskop tez va aniq, lekin vaqt o'tishi bilan «suzib» ketadi; akselerometr suzmaydi, lekin titrashdan shovqinli. Ikkalasining ma'lumoti filtr (Kalman filtri) bilan birlashtiriladi.",
      specs: [['O\'qlar', '3 ta giroskop + 3 ta akselerometr (6 o\'q)'], ['O\'lchash chastotasi', '1 000–8 000 Hz'], ['Chiplar', 'ICM-42688-P, BMI088']],
      fail: "IMU noto'g'ri ishlasa, kontroller dron og'gan deb o'ylab, uni «tuzataman» deb ag'darib yuboradi. Kuchli titrash ham xuddi shunday ta'sir qiladi.",
      tip: "Parvozdan oldin IMU kalibrovkasi dron tekis turganda qilinadi. Vintlarni muvozanatlash — IMU uchun eng yaxshi g'amxo'rlik.",
      chapter: 'sensorlar',
    },
    {
      id: 'baro', name: 'Barometr', group: 'Sensorlar',
      short: "Havo bosimidan balandlikni aniqlaydi.",
      what: "Barometr havo bosimini o'lchaydi. Yuqoriga ko'tarilgan sari bosim kamayadi, shuning uchun bosimdan dronning balandligini bilish mumkin. «Balandlikni ushlash» (AltHold) rejimi asosan shu sensorga tayanadi.",
      how: "Yer yuzasiga yaqin joyda har 1 metr ko'tarilishda bosim taxminan 12 paskalga kamayadi. Sensor shunday kichik o'zgarishni seza oladi — 10–20 sm aniqlikda. Ustidagi qora ko'pik vint havosi va quyosh nuri sensorni adashtirmasligi uchun.",
      specs: [['Aniqlik', '≈ 10–20 sm (nisbiy)'], ['Chiplar', 'MS5611, BMP388, DPS310']],
      fail: "Ko'piksiz barometr vint shamolidan adashadi: dron balandlikda turolmay «sakraydi».",
      tip: "Barometr nisbiy balandlikni biladi: ob-havo o'zgarsa, bosim ham o'zgaradi. Shuning uchun uzoq parvozlarda GPS balandligi bilan birga ishlatiladi.",
      chapter: 'sensorlar',
    },
    {
      id: 'gps', name: 'GPS va kompas', group: 'Sensorlar',
      short: "Dron yer sharining qayerida va qaysi tomonga qarab turganini aniqlaydi.",
      what: "GNSS qabul qilgich sun'iy yo'ldoshlardan signal olib, dronning kenglik, uzunlik va balandligini aniqlaydi. Shu modulning ichida magnitometr (kompas) ham bor — u dron burni qaysi tomonga qaraganini aytadi. Marshrut bo'yicha uchish, joyida turish (Loiter) va uyga qaytish (RTL) shularsiz ishlamaydi.",
      how: "Har bir yo'ldosh aniq vaqtni yuboradi. Qabul qilgich kamida 4 ta yo'ldoshdan signal kelish vaqtlarini solishtirib, o'z joyini hisoblaydi. Bir vaqtning o'zida GPS (AQSh), GLONASS (Rossiya), Galileo (Yevropa) va BeiDou (Xitoy) tizimlaridan foydalanadi. Kompas yerning magnit maydonini sezadi; motorlar va simlarning magnit xalaqitidan uzoq bo'lishi uchun baland ustunga qo'yilgan.",
      specs: [['Aniqlik', '1–3 m oddiy; RTK bilan 1–3 sm'], ['Yo\'ldoshlar', 'odatda 15–30 tasi ko\'rinadi'], ['Yangilanish', '5–10 marta sekundiga'], ['Misol', 'u-blox M10, M9N']],
      fail: "GPS yo'qolsa, dron joyini bilmaydi: shamol uni uchirib ketadi. Kompas xato bo'lsa, dron joyida turolmay, aylana chizib uchadi (inglizcha «toilet bowl» effekti).",
      tip: "Parvozdan oldin GPS kamida 10–12 yo'ldoshni ushlaguncha kuting. Kompas kalibrovkasini temir buyumlar va mashinalardan uzoqda qiling.",
      chapter: 'sensorlar',
    },
    {
      id: 'rx', name: 'Radio qabul qilgich', group: 'Aloqa',
      short: "Uchuvchining pultidan buyruqlarni qabul qiladi.",
      what: "Pult (RC) dastalaridagi har bir harakat radio orqali shu qabul qilgichga keladi va u buyruqni parvoz kontrolleriga uzatadi. Ikkita antenna turli burchakda o'rnatilgan — dron qanday burilmasin, bittasi signalni yaxshi ushlaydi.",
      how: "Pult sekundiga 50–500 marta paket yuboradi: gaz, burilish, oldinga-orqaga, yonga va qo'shimcha kalitlar. Qabul qilgich ularni CRSF yoki SBUS protokolida kontrollerga beradi. Signal ma'lum vaqt kelmasa, kontroller «failsafe» rejimiga o'tadi: dronni uyiga qaytaradi yoki joyida qo'ndiradi.",
      specs: [['Chastota', '2,4 GHz yoki 868/915 MHz'], ['Tizimlar', 'ExpressLRS, TBS Crossfire, FrSky'], ['Masofa', 'bir necha km dan 30+ km gacha']],
      fail: "Signal uzilsa, dron failsafe bo'yicha harakat qiladi. Failsafe sozlanmagan bo'lsa — eng xavfli holat.",
      tip: "Har bir yangi dronda failsafe'ni yerda, vintlarni yechib sinab ko'ring: pultni o'chiring va kontroller nima qilishini kuzating.",
      chapter: 'aloqa',
    },
    {
      id: 'telem', name: 'Telemetriya radiosi', group: 'Aloqa',
      short: "Kompyuterdagi yer stansiyasi bilan ikki tomonlama aloqa.",
      what: "Telemetriya dron holatini — batareya, GPS, balandlik, tezlik, xatolar — yerga yuboradi va yerdan missiya (marshrut) va buyruqlarni oladi. Operator QGroundControl yoki Mission Planner dasturida xaritada dronni kuzatib turadi.",
      how: "Ma'lumot MAVLink protokolida uzatiladi. Kichik masofada alohida radio modem, uzoq masofali yetkazish dronlarida esa 4G/LTE modem ishlatiladi — u mobil tarmoq bor joyda istalgan masofada ishlaydi.",
      specs: [['Protokol', 'MAVLink'], ['Kanal', 'radio modem yoki 4G/LTE'], ['Dasturlar', 'QGroundControl, Mission Planner']],
      fail: "Telemetriya yo'qolsa, dron missiyani davom ettiradi, lekin operator uni ko'rmaydi. Ko'p tashkilotlar bunday holatda dronni qaytaradi.",
      tip: "Telemetriya va pult chastotalari bir-biriga xalaqit bermasligi kerak, antennalarni bir-biridan uzoqroq qo'ying.",
      chapter: 'aloqa',
    },
    {
      id: 'batareya', name: 'Batareya', group: 'Energiya',
      short: "Barcha energiya manbai — odatda LiPo yoki Li-ion.",
      what: "Batareya dron massasining eng og'ir qismi (ko'pincha 30–40%) va parvoz vaqtini belgilovchi asosiy omil. Bu modelda — 6 ta ketma-ket ulangan LiPo elementdan (6S) iborat to'plam.",
      how: "Har bir element 3,7 V (to'la holatda 4,2 V). 6 tasi ketma-ket — 22,2 V. Sig'im mAh da yoziladi: 10 000 mAh = 10 Ah. Energiya = kuchlanish × sig'im = 22,2 × 10 = 222 Wh. «C» reytingi qancha tez tok berishini bildiradi: 25C × 10 Ah = 250 A gacha.",
      specs: [['Turi', 'LiPo 6S 10 000 mAh 25C'], ['Energiya', '222 Wh'], ['Massasi', '≈ 1,3 kg'], ['Kuchlanish', '25,2 V to\'la, ≈ 21 V da qaytish kerak']],
      fail: "Batareya parvozda tugasa, dron quladi. Shishgan LiPo — yong'in xavfi, uni darhol ishlatishdan chiqarish kerak.",
      tip: "Saqlash uchun har bir elementda 3,8 V qoldiring. Zaryadlashni yong'inga chidamli sumkada va qarovsiz qoldirmay qiling.",
      chapter: 'batareya',
    },
    {
      id: 'kamera', name: 'Kamera va gimbal', group: 'Foydali yuk',
      short: "Ko'rish, suratga olish va yo'lni kuzatish uchun.",
      what: "Yetkazish dronlarida kamera yukni topshirish joyini ko'rish, odamlar va to'siqlarni aniqlash uchun ishlatiladi. Gimbal kamerani dron qanday og'masin, tekis ushlab turadi.",
      how: "Gimbalda 2–3 ta kichik motor va o'zining IMU'si bor. Dron oldinga og'sa, gimbal kamerani teskari tomonga buradi — tasvir tekis qoladi. Kamera tasviri alohida video kanal yoki 4G orqali operatorga boradi.",
      specs: [['Gimbal', '2 yoki 3 o\'qli'], ['Video', 'raqamli 1080p, kechikish 30–100 ms']],
      fail: "Kamera ishdan chiqsa, dron uchaveradi, lekin aniq qo'nish va to'siqlarni ko'rish qiyinlashadi.",
      tip: "Og'irlik markazi o'zgarmasligi uchun old tomondagi kamera og'irligini batareya joyi bilan muvozanatlang.",
      chapter: 'kontroller',
    },
    {
      id: 'yuk', name: 'Yuk mexanizmi (lebyodka)', group: 'Foydali yuk',
      short: "Yukni qo'nmasdan, arqonda pastga tushiradi.",
      what: "Yetkazish dronining asosiy ishi — yukni xavfsiz topshirish. Lebyodka dronni 7–10 m balandlikda ushlab, posilkani arqonda yerga tushiradi. Shunda vintlar odamlarga yaqinlashmaydi va hovliga qo'nish shart emas.",
      how: "Kichik motor g'altakni aylantiradi, arqon uchida ilgak bor. Yuk yerga tekkanda arqon bo'shashadi — sensor buni sezadi va ilgak yukni qo'yib yuboradi, arqon qayta o'raladi. Boshqa usullar: qo'nish, parashyutda tashlash, postamatga qo'yish.",
      specs: [['Arqon', '10 m gacha'], ['Yuk', '2–3 kg'], ['Tushirish tezligi', '≈ 1 m/s']],
      fail: "Ilgak ochilmasa, dron yukni qaytarib olib ketadi. Arqon daraxtga ilinsa, maxsus pichoq uni kesib yuboradi.",
      tip: "Osilgan yuk dron muvozanatini o'zgartiradi: parvoz kontrolleri uni hisobga olishi uchun yukli va yuksiz holatda sinab ko'ring.",
      chapter: 'kontroller',
    },
    {
      id: 'oyoq', name: "Qo'nish oyoqlari", group: 'Korpus',
      short: "Qo'nishda dronni va pastdagi uskunalarni himoya qiladi.",
      what: "Oyoqlar dronni yerdan yetarli balandlikda ushlab, batareya, kamera va lebyodkani yerga tegishdan saqlaydi. Qo'nishdagi zarbani ham yumshatadi.",
      how: "Ikkita gorizontal chang'i (skid) va to'rtta tirgak. Chang'ilar keng qo'yilgani uchun dron qiya joyda ham ag'darilmaydi. Ba'zi dronlarda oyoqlar parvozda yig'iladi — kamera atrofni to'liq ko'rishi uchun.",
      specs: [['Material', 'karbon trubka yoki plastik'], ['Balandligi', '≈ 15–25 sm']],
      fail: "Oyoq singanda dron qo'nishda ag'dariladi va vintlar yerga urilib sinadi.",
      tip: "Chang'ilar orasidagi masofa qancha keng bo'lsa, dron shuncha barqaror turadi.",
      chapter: 'rama',
    },
  ];

  // ---------- Yozma sayohat ----------
  // view: kamera nuqtai nazari; focus: ajratib ko'rsatiladigan qismlar;
  // explode: qismlarga ajratish; maneuver: parvoz harakati; path: navbat bilan yonadigan qismlar.

  const TOUR = [
    {
      title: 'Bu — yetkazish kvadrokopteri',
      text: "<p>Oldingizda to'rt vintli dron — kvadrokopter. Uni barmog'ingiz bilan aylantirib, kattalashtirib ko'ring. Diagonal bo'yicha o'lchami 65 sm, vintlari 38 sm, massasi yuk bilan 4–5 kg — haqiqiy yetkazish dronlariga yaqin.</p><p>Bu sayohatda har bir qismni navbat bilan ko'rib chiqamiz: u nima qiladi, qanday ishlaydi va nima uchun aynan shu joyda turadi. Oxirida qismlar birgalikda dronni qanday uchirishini ko'rasiz.</p>",
      view: 'iso', focus: [], maneuver: 'hover',
    },
    {
      title: 'Qismlarga ajratamiz',
      text: "<p>Dronni bo'laklarga ajratib qaraylik. Ko'rinib turibdiki, u uch qavatdan iborat: <b>tepada</b> — boshqaruv va aloqa, <b>o'rtada</b> — rama va quvvat taqsimoti, <b>pastda</b> — batareya, kamera va yuk.</p><p>Og'ir qismlar (batareya, yuk) markazga va pastroqqa joylashtirilgan. Og'irlik markazi aynan dron o'rtasida bo'lishi kerak — aks holda motorlar doim bir tomonni ko'proq ushlab, energiya bekor sarflanadi.</p>",
      view: 'iso', focus: [], explode: true,
    },
    {
      title: 'Rama — skelet',
      text: "<p>Rama — hamma narsa mahkamlanadigan asos. Bu yerda u karbon toladan: po'latdan 5 baravar yengil, lekin juda qattiq.</p><p>«X» shaklidagi to'rtta nur motorlarni markazdan bir xil masofada ushlaydi. Masofa nima uchun muhim? Motor markazdan qancha uzoq bo'lsa, u dronni og'dirish uchun shuncha katta «richag»ga ega bo'ladi.</p>",
      view: 'top', focus: ['rama'],
    },
    {
      title: 'Motorlar — muskullar',
      text: "<p>Har bir nur uchida cho'tkasiz motor turibdi. Ichida mis o'ramli stator qimirlamaydi, tashqi magnitli «qo'ng'iroq» esa aylanadi.</p><p>Motor sekundiga 100 martagacha aylanadi va o'z tezligini juda tez o'zgartira oladi — sekundning o'ndan bir qismidan ham tezroq. Dronning muvozanati aynan shu tezkorlikka tayanadi: dronda boshqa rul ham, qanot qopqoqlari ham yo'q, faqat to'rtta motorning tezligi bor.</p>",
      view: 'motor', focus: ['motor'],
    },
    {
      title: 'Vintlar: ikkitasi u yoqqa, ikkitasi bu yoqqa',
      text: "<p>Ko'k vintlar soat mili bo'yicha (CW), sariqlari teskari (CCW) aylanadi. Diagonal qarshidagi vintlar bir xil yo'nalishda.</p><p>Nima uchun? Vintni aylantirgan motor o'zi teskari tomonga buralishga intiladi. Agar to'rttasi bir tomonga aylansa, butun dron vertolyotning dumsiz tanasi kabi aylanib ketardi. Ikki juft qarama-qarshi aylansa, bu momentlar bir-birini yo'qqa chiqaradi.</p><p>Vintlar ostidagi nuqtalar — pastga itarilayotgan havo oqimi.</p>",
      view: 'iso', focus: ['vint'], maneuver: 'hover',
    },
    {
      title: 'ESC — motor haydovchisi',
      text: "<p>Nurlar ostidagi to'rtta kichik quti — ESC'lar. Kontroller «1-motor 62% tezlikda aylansin» deydi, ESC esa batareyadan olgan tokni motorning uchta o'ramiga navbat bilan, sekundiga minglab marta ulab-uzib beradi.</p><p>ESC qancha tez reaksiya qilsa, dron shuncha barqaror turadi.</p>",
      view: 'under', focus: ['esc'],
    },
    {
      title: 'Batareya — yoqilg\'i baki',
      text: "<p>Pastdagi katta blok — 6 elementli LiPo batareya, 222 Wh. Dronning eng og'ir qismi.</p><p>Muhim saboq: batareyani kattalashtirsangiz, parvoz vaqti cheksiz oshmaydi. Batareya og'irlashgani sari uni ko'tarish uchun ham ko'proq energiya ketadi. Har bir dron uchun «eng foydali» batareya o'lchami bor.</p>",
      view: 'under', focus: ['batareya'],
    },
    {
      title: 'Quvvat taqsimlash',
      text: "<p>Ikki plastina orasidagi plata batareya tokini to'rtta ESC'ga bo'ladi va elektronika uchun 5 V hosil qiladi.</p><p>U yana kontrollerga batareya kuchlanishi va tokini aytib turadi. Shu tufayli dron «menda yana 7 daqiqalik energiya qoldi» deb biladi va kerak bo'lsa o'zi uyiga qaytadi.</p>",
      view: 'iso', focus: ['pdb'], explode: true,
    },
    {
      title: 'Energiya yo\'li',
      text: "<p>Energiya qanday yo'l bosishini kuzating: <b>batareya → quvvat platasi → ESC'lar → motorlar</b>.</p><p>Bu kuchli tok yo'li: muallaq turganda 4 ta motor birgalikda ≈ 30 A, to'liq gazda 60 A dan ko'proq tortadi. Shuning uchun simlar yo'g'on va iloji boricha qisqa.</p>",
      view: 'iso', focus: [], explode: true, path: ['batareya', 'pdb', 'esc', 'motor'],
    },
    {
      title: 'Parvoz kontrolleri — miya',
      text: "<p>Tepadagi plata — parvoz kontrolleri. Undagi strelka dronning old tomonini ko'rsatadi.</p><p>Kontroller sekundiga yuzlab marta bitta sikldan o'tadi: <i>sensorlarni o'qi → dron qanday turganini hisobla → qanday turishi kerakligi bilan solishtir → har bir motorga yangi tezlik ber</i>. Bu siklni inson qo'li bilan bajarib bo'lmaydi — shuning uchun dron kontrollersiz ucholmaydi.</p>",
      view: 'fc', focus: ['fc'], explode: true,
    },
    {
      title: 'IMU — muvozanat hissi',
      text: "<p>Plata ustidagi kichik chip — IMU. Ichida giroskop va akselerometr bor. Giroskop «dron hozir sekundiga necha gradus aylanayapti», akselerometr «pastki tomon qayerda» degan savolga javob beradi.</p><p>Inson qulog'i ichida ham xuddi shunday muvozanat organi bor. Dronniki esa sekundiga 1 000 martadan ko'proq o'lchaydi.</p>",
      view: 'fc', focus: ['imu'], explode: true,
    },
    {
      title: 'Barometr — balandlik hissi',
      text: "<p>Qora ko'pik ostidagi chip — barometr. Havo bosimi har metr ko'tarilganda taxminan 12 paskalga kamayadi va sensor shuni sezadi.</p><p>Ko'pik vint shamoli va quyosh nuri sensorni adashtirmasligi uchun.</p>",
      view: 'fc', focus: ['baro'], explode: true,
    },
    {
      title: 'GPS va kompas',
      text: "<p>Ustundagi «qo'ziqorin» — GPS moduli. U o'nlab sun'iy yo'ldoshlardan signal olib, dronning joyini bir necha metr aniqlikda topadi. Ichidagi kompas burun qayoqqa qaraganini aytadi.</p><p>Nega baland ustunda? Motorlar va kuchli tok simlari magnit maydon hosil qiladi va kompasni adashtiradi. Ulardan uzoqlashtirish — eng oddiy yechim.</p>",
      view: 'iso', focus: ['gps'],
    },
    {
      title: 'Radio va telemetriya',
      text: "<p>Orqadagi ikki antennali quti — pultdan buyruq oluvchi qabul qilgich. Chap tomondagisi — kompyuter bilan aloqa qiluvchi telemetriya radiosi.</p><p>Avtonom yetkazishda dron pultdan emas, oldindan yuklangan marshrut bo'yicha uchadi. Pult esa favqulodda holatda inson boshqaruvni olishi uchun kerak.</p>",
      view: 'rear', focus: ['rx', 'telem'],
    },
    {
      title: "Signal yo'li: buyruqdan harakatgacha",
      text: "<p>Siz pult dastasini oldinga surdingiz. Nima bo'ladi?</p><p><b>Qabul qilgich</b> buyruqni oladi → <b>kontroller</b> «oldinga og'ish kerak» deb hisoblaydi → <b>ESC'lar</b>ga old motorlarni sekinlatish, orqadagilarni tezlatish buyrug'i ketadi → <b>motorlar</b> tezligini o'zgartiradi. Hammasi taxminan 5–20 millisekundda.</p>",
      view: 'iso', focus: [], explode: true, path: ['rx', 'fc', 'esc', 'motor'],
    },
    {
      title: 'Kamera, yuk va oyoqlar',
      text: "<p>Pastda old tomonda — gimbaldagi kamera, o'rtada — lebyodka va osilgan posilka, yonlarda — qo'nish oyoqlari.</p><p>Yetkazish dronining asosiy farqi shu yerda: u yukni qo'nmasdan, 7–10 metr balandlikdan arqonda tushiradi. Vintlar odamlardan uzoqda qoladi.</p>",
      view: 'under', focus: ['kamera', 'yuk', 'oyoq'],
    },
    {
      title: 'Endi dron qanday uchishini ko\'ramiz',
      text: "<p>Siz barcha qismlarni ko'rdingiz. Eng qiziq savol qoldi: rulsiz, qanotsiz dron qanday qilib oldinga uchadi va buriladi?</p><p>Javob: faqat to'rtta motor tezligini turlicha o'zgartirib. Yuqoridagi <b>«Qanday uchadi»</b> rejimiga o'ting va har bir harakatda qaysi motor tezlashishini kuzating.</p>",
      view: 'iso', focus: [], maneuver: 'hover', end: true,
    },
  ];

  // ---------- Parvoz harakatlari ----------
  // m: motor tezligi koeffitsiyentlari [M1, M2, M3, M4], 1 — muallaq turish.
  // tilt: [oldinga og'ish, o'ngga og'ish] radianda; climb — vertikal tezlik; yaw — burilish tezligi (rad/s).
  // move: [x, z] — yerga nisbatan siljish yo'nalishi.

  const MANEUVERS = {
    hover: {
      name: 'Muallaq turish', stick: '—',
      m: [1, 1, 1, 1], tilt: [0, 0], climb: 0, yaw: 0, move: [0, 0],
      text: "To'rtta motor bir xil tezlikda. Ularning umumiy tortish kuchi dron og'irligiga teng, shuning uchun dron havoda qotib turadi. Ikki CW va ikki CCW vintning aylanish momentlari teng — dron aylanmaydi.",
    },
    up: {
      name: 'Ko\'tarilish', stick: 'Chap dasta — yuqoriga (gaz)',
      m: [1.12, 1.12, 1.12, 1.12], tilt: [0, 0], climb: 1, yaw: 0, move: [0, 0],
      text: "Hamma motorlar teng ravishda tezlashadi. Tortish kuchi og'irlikdan oshadi va dron yuqoriga ko'tariladi. Kuch aylanish tezligining kvadratiga bog'liq: tezlik 12% oshsa, kuch ≈ 25% oshadi.",
    },
    down: {
      name: 'Pastga tushish', stick: 'Chap dasta — pastga',
      m: [0.9, 0.9, 0.9, 0.9], tilt: [0, 0], climb: -1, yaw: 0, move: [0, 0],
      text: "Hamma motorlar teng sekinlashadi, kuch og'irlikdan kamayadi — dron pastlaydi. Juda tez tushish xavfli: dron o'z vintlari hosil qilgan quyun ichiga tushib qolishi mumkin (vortex ring state).",
    },
    forward: {
      name: 'Oldinga', stick: "O'ng dasta — oldinga",
      m: [0.9, 1.1, 0.9, 1.1], tilt: [0.26, 0], climb: 0, yaw: 0, move: [0, -1],
      text: "Old motorlar (M1, M3) sekinlashadi, orqadagilar (M2, M4) tezlashadi. Dron burnini pastga egadi. Endi vintlar kuchi biroz oldinga qaragan: uning bir qismi dronni ko'tarsa, bir qismi oldinga tortadi. Kerakli burchakka yetgach, motorlar yana tenglashadi va dron qiya holatda oldinga uchaveradi.",
    },
    back: {
      name: 'Orqaga', stick: "O'ng dasta — orqaga",
      m: [1.1, 0.9, 1.1, 0.9], tilt: [-0.26, 0], climb: 0, yaw: 0, move: [0, 1],
      text: "Old motorlar tezlashadi, orqadagilar sekinlashadi. Dron burnini ko'taradi va kuch orqaga qaraydi. Tormoz berish ham xuddi shunday: oldinga uchayotgan dron orqaga og'ib to'xtaydi.",
    },
    right: {
      name: "O'ngga", stick: "O'ng dasta — o'ngga",
      m: [0.9, 1.1, 1.1, 0.9], tilt: [0, 0.26], climb: 0, yaw: 0, move: [1, 0],
      text: "Chap motorlar (M2, M3) tezlashadi, o'ngdagilar (M1, M4) sekinlashadi. Dron o'ng tomonga og'adi va o'ngga siljiydi. Burni esa oldinga qarab qolaveradi.",
    },
    left: {
      name: 'Chapga', stick: "O'ng dasta — chapga",
      m: [1.1, 0.9, 0.9, 1.1], tilt: [0, -0.26], climb: 0, yaw: 0, move: [-1, 0],
      text: "O'ng motorlar tezlashadi, chapdagilar sekinlashadi. Dron chapga og'adi va chapga siljiydi.",
    },
    yawR: {
      name: "O'ngga burilish", stick: "Chap dasta — o'ngga",
      m: [1.1, 1.1, 0.9, 0.9], tilt: [0, 0], climb: 0, yaw: 1, move: [0, 0],
      text: "Eng qiziq harakat. Soat miliga teskari aylanadigan M1 va M2 tezlashadi, soat mili bo'yicha aylanadigan M3 va M4 sekinlashadi. Umumiy kuch o'zgarmaydi — dron ko'tarilmaydi ham, tushmaydi ham. Lekin CCW vintlarning reaksiya momenti kuchayadi va dron tanasini soat mili bo'yicha, ya'ni o'ngga buradi.",
    },
    yawL: {
      name: 'Chapga burilish', stick: 'Chap dasta — chapga',
      m: [0.9, 0.9, 1.1, 1.1], tilt: [0, 0], climb: 0, yaw: -1, move: [0, 0],
      text: "CW motorlar (M3, M4) tezlashadi, CCW motorlar (M1, M2) sekinlashadi. Reaksiya momenti dronni chapga buradi. Bu kuch og'ishga qaraganda zaifroq, shuning uchun dronlar sekinroq buriladi.",
    },
    fail: {
      name: "Bitta motor to'xtasa", stick: 'Favqulodda holat',
      m: [0, 1, 1, 1], tilt: [0.5, 0.5], climb: -1.4, yaw: 3, move: [0, 0],
      text: "M1 to'xtadi. Old o'ng burchak kuchsiz qoldi — dron shu tomonga og'adi. Bundan tashqari CCW momentlar muvozanati buzildi: qolgan CW motorlar ustunlik qiladi va dron tez aylanib ketadi. Kvadrokopter bunday holatda boshqariladigan qo'nish qila olmaydi. Shuning uchun odamlar ustidan uchadigan og'ir dronlarda 6 yoki 8 motor va favqulodda parashyut bo'ladi.",
    },
  };

  const HOVER_RPM = 5200;

  // Kamera ko'rinishlari: [masofa, gorizontal burchak, vertikal burchak, nishon y]
  const VIEWS = {
    iso: [11, 0.75, 0.42, 0],
    top: [9.5, 0.001, 1.45, 0.2],
    under: [9, 0.6, -0.35, -0.6],
    motor: [4.2, 0.6, 0.55, 0.4],
    fc: [4.2, 0.45, 0.85, 0.4],
    rear: [6.5, 3.1, 0.45, 0.5],
  };

  return { MOTORS, PARTS, TOUR, MANEUVERS, HOVER_RPM, VIEWS };
});
