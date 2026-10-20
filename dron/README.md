# Dron Logistika Lab

Dronlar bilan yetkazib berishni (dron logistikasini) o'rganish va tajriba qilish uchun ilova.
Haqiqiy dron kerak emas: hammasi brauzerda, telefon yoki kompyuterda ishlaydi.

## Bo'limlar

### Tuzilishi — dron qanday tuzilgan va qanday ishlaydi
- **3D model.** Yetkazish kvadrokopteri (650 mm, 15″ vintlar, 6S batareya) 15 ta qismdan yasalgan:
  rama, motorlar, vintlar, ESC, quvvat platasi, parvoz kontrolleri, IMU, barometr, GPS va kompas,
  radio, telemetriya, batareya, kamera, lebyodka, oyoqlar. Barmoq bilan aylantirasiz, qismga bosasiz —
  vazifasi, ishlash tamoyili, ko'rsatkichlari va buzilsa nima bo'lishi yozma ko'rinishda chiqadi.
  «Qismlarga ajratish» tugmasi dronni qavatlarga bo'lib ko'rsatadi.
- **Qanday uchadi.** Pult dastalarini (Mode 2) bosasiz: ko'tarilish, oldinga, yonga, burilish yoki
  bitta motor to'xtashi. Har bir harakatda qaysi motor tezlashgani, tortish kuchi strelkalari va
  vint ostidagi havo oqimi ko'rinadi.
- **Sayohat.** 17 qadamli yozma ekskursiya: har bir qism tartib bilan, energiya yo'li
  (batareya → plata → ESC → motor) va signal yo'li (radio → kontroller → ESC → motor).
- **Darslik.** 14 bob: dron turlari, uchish fizikasi, rama, cho'tkasiz motorlar, vintlar, ESC,
  batareya, parvoz kontrolleri, sensorlar, PID, aloqa, parvoz rejimlari, dron loyihalash, xavfsizlik.
  Har bobda sxemalar, jadvallar, «Esda tuting» xulosasi va o'zini tekshirish savollari bor.
- **Parvoz laboratoriyasi.** Dronning bitta o'qi bo'yicha muvozanat simulyatori: P, I va D ni
  o'zingiz burasiz, shamol zarbasi, doimiy shamol, zaif motor va shovqinli sensorni yoqasiz va
  grafikda dron qanday javob berishini ko'rasiz.

### Ovozli o'qish (o'zbekcha)
Sayohat qadamlari, qismlar, parvoz harakatlari, darslik boblari va laboratoriya holatlarini
o'zbekcha ovoz bilan tinglash mumkin. «Ovozli sayohatni boshlash» tugmasi sayohatni videodek
o'zi o'qib, qadamma-qadam o'tkazadi. Tezlikni 0,85× dan 1,5× gacha o'zgartirsa bo'ladi.

- Ovozli fayllar (`dron/audio/*.mp3`) GitHub Actions'da avtomatik yaratiladi
  (`.github/workflows/ovoz.yml`): matn o'zgarsa, faqat o'sha fayl qayta yoziladi.
  Ovoz — Microsoft Edge'ning bepul o'qish xizmatidagi «Madina» (uz-UZ-MadinaNeural).
  Bu rasmiy pullik API emas; tijorat loyihasida Azure Speech (oyiga 0,5 mln belgigacha bepul)
  yoki boshqa litsenziyali xizmatga o'tish kerak.
- Erkak ovozi kerak bo'lsa: GitHub → Actions → «O'zbekcha ovoz» → Run workflow →
  `uz-UZ-SardorNeural`.
- Fayllar hali tayyor bo'lmasa, ilova qurilmadagi o'zbekcha ovozdan foydalanadi
  (masalan, Microsoft Edge brauzerida Madina va Sardor bor).

Kompyuterda o'zingiz yaratish (internet kerak):

```bash
node tools/ovoz/matn.js
pip install edge-tts
python tools/ovoz/yarat.py
```

### Simulyator
Shahar xaritasida ombor, dronlar va buyurtmalar. Buyurtmalar tasodifiy tushadi, dispetcher
ularni dronlarga taqsimlaydi, dronlar taqiqlangan zonalarni aylanib uchadi, batareya sarflaydi
va omborda zaryadlanadi yoki batareyani almashtiradi.

- 6 ta ssenariy: shahar, tushlikdagi tiqilinch, shamolli kun, qishloq poliklinikalariga tibbiy
  yetkazish, ikki omborli tarmoq, og'ir yuk. Har birida bajarish kerak bo'lgan vazifa bor.
- Xaritaga o'zingiz buyurtma, taqiqlangan zona yoki yangi ombor qo'yasiz.
- Parvoz paytida shamol, harorat, dronlar soni, dispetcher strategiyasini o'zgartirasiz.
- Ko'rsatkichlar: o'z vaqtida yetkazish ulushi, o'rtacha vaqt, navbat, bandlik,
  bir yetkazish narxi, tejalgan CO₂.

### Tajriba
Bitta parametrni (dronlar soni, buyurtmalar oqimi, shamol, harorat, strategiya, energiya rejimi,
model) o'zgartirib, butun ish kunini bir zumda simulyatsiya qiladi va natijalarni jadval va
grafikda solishtiradi. 90% maqsadga yetgan eng arzon variantni o'zi topadi.

### Hisoblash
Dron parametrlaridan (massa, batareya, vintlar, tezlik) muallaq turish va uchish quvvati,
parvoz vaqti, yetkazish radiusi, eng tejamkor tezlik va bir yetkazish narxini hisoblaydi,
avtomobil-kuryer bilan solishtiradi. Yasagan droningizni bir tugma bilan simulyatorga qo'yasiz.

### O'rganish
Yo'l xaritasi (7 bosqich), 9 ta dars (dron turlari, qismlari, fizika, batareya, logistika
modellari, marshrut algoritmlari, KPI va iqtisodiyot, xavfsizlik, PX4/MAVSDK bilan dasturlash),
13 savollik test, lug'at, O'zbekistondagi huquqiy holat va foydali manbalar.

## Ishga tushirish

GitHub Pages yoqilgan bo'lsa: `https://<username>.github.io/<repo-nomi>/dron/`

Kompyuterda:

```bash
python3 -m http.server 8080
# brauzerda http://localhost:8080/dron/ ni oching
```

Telefonda Chrome orqali ochib, **⋮ → Bosh ekranga qo'shish** ni bossangiz, ilova sifatida
o'rnatiladi va internetsiz ham ochiladi.

## Model haqida

Hisob-kitoblar soddalashtirilgan, lekin real fizikaga asoslangan:

- muallaq turish: impuls nazariyasi, P = (m·g)^1,5 / √(2ρA) / (FM·η);
- multikopter uchganda: Glauert induktiv quvvati + vint profil quvvati + havo qarshiligi ½ρ·CdA·v³;
- qanotli dron: qarshilik qutbi Cd₀ + C_L²/(π·e·AR);
- havo zichligi harorat va balandlikka, batareya sig'imi sovuqqa bog'liq;
- shamol: yonlama shamolga qarshi burilib, yerga nisbatan tezlik hisoblanadi;
- marshrut: taqiqlangan zonalar atrofida ko'rinish grafi + A*; bir nechta buyurtma uchun
  eng yaqin qo'shni + 2-opt.

Narxlar (dron, batareya, elektr, benzin, maosh) taxminiy — «Hisoblash» bo'limida o'zgartiring.

## Fayllar

```
dron/index.html        — sahifa
dron/css/dron.css      — dizayn (kunduzgi va tungi rejim)
dron/js/model.js       — fizika va iqtisodiyot formulalari
dron/js/sim.js         — simulyator: buyurtmalar, dispetcher, marshrut, batareya
dron/js/content.js     — ssenariylar, darslar, test, lug'at
dron/js/tuzilish-data.js — dron qismlari, sayohat qadamlari, parvoz harakatlari
dron/js/darslik.js     — darslikning 14 bobi va sxemalari
dron/js/pidlab.js      — parvoz laboratoriyasi (PID) hisob-kitobi
dron/js/drone3d.js     — 3D dron modeli (three.js)
dron/js/tuzilish.js    — «Tuzilishi» bo'limi interfeysi
dron/js/ovoz.js        — ovoz uchun matn tayyorlash va pleyer
dron/audio/            — o'zbekcha ovozli fayllar (GitHub Actions yaratadi)
tools/ovoz/            — ovozli fayllarni yaratish skriptlari
dron/js/app.js         — interfeys: xarita, tajriba, hisoblash, darslar
dron/vendor/           — three.js r128 (MIT litsenziyasi), internetsiz ishlashi uchun
dron/sw.js             — oflayn ishlash
tests/dron.test.js     — model va simulyator testlari (npm test)
tests/tuzilish.test.js — darslik, sayohat, mikser va PID testlari
```
