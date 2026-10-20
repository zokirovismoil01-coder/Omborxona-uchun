# Dron Logistika Lab

Dronlar bilan yetkazib berishni (dron logistikasini) o'rganish va tajriba qilish uchun ilova.
Haqiqiy dron kerak emas: hammasi brauzerda, telefon yoki kompyuterda ishlaydi.

## Bo'limlar

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
dron/js/app.js         — interfeys: xarita, tajriba, hisoblash, darslar
dron/sw.js             — oflayn ishlash
tests/dron.test.js     — model va simulyator testlari (npm test)
```
