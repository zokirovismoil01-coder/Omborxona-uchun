# 🎬 StockTill — reklama videosi

`stocktill-promo-vertical.mp4` — 1 daqiqa 20 soniya, 1080×1920 (Instagram Reels, TikTok, YouTube Shorts),
musiqa va ovoz effektlari bilan.

Video ilovaning eng so'nggi versiyasi (1.9.1) ekranlaridan yasalgan. Ekranlardagi ma'lumotlar namunaviy:
"Markaziy ombor" nomli sut mahsulotlari ombori, 7 ta diler, 28 kunlik savdo tarixi (`env/seed.js`).
Haqiqiy do'kon yoki mijoz ma'lumotlari ishlatilmagan.

## Sahnalar

| Vaqt | Sahna |
|---|---|
| 0–4 s | Logo, "Yangi versiya · 1.9" |
| 4–8 s | Savollar: omborda nima qoldi, diler nima oldi va qaytardi, ertaga nima buyurtma qilinadi |
| 8–16 s | Telefon, PIN kod va rollar: Administrator, Omborxona, Kuzatuvchi |
| 16–24 s | Bosh sahifa: bugungi savdo, 7 kunlik grafik, qoldiq ogohlantirishlari |
| 24–32 s | Kassa: dilerga sotuv, diler narxi, idishlar, chek |
| 32–40 s | Qaytgan va muddati o'tgan mahsulot, qaytgan idishlar |
| 40–48 s | Ombor: kirim, sanoq, hisobdan chiqarish, tarix |
| 48–56 s | Ertangi buyurtma bashorati |
| 56–64 s | Diler hisoboti va uni rasm qilib yuborish |
| 64–68 s | Kompyuter va telefonlar sinxroni |
| 68–72 s | Qurilmalar nazorati |
| 72–76 s | Tahrirlangan va o'chirilgan operatsiyalar jurnali |
| 76–80 s | Yakun: "Omboringiz — nazoratda" |

## Fayllar

| Fayl | Vazifasi |
|---|---|
| `video.html` | Barcha sahnalar; har bir kadr `VIDEO.seek(t)` bilan chiziladi |
| `audio.js` | Musiqa (120 BPM, Am–F–C–G, eslab qolinadigan melodiya) va ovoz effektlari — hammasi kod bilan sintez qilinadi |
| `shots/` | Ilova ekranlari (WebP) va `rects.js` — ekrandagi elementlarning joylashuvi |
| `env/seed.js` | Namunaviy ma'lumotlar |
| `env/capture.js` | Ilovani Chromium'da ochib, ekranlarni suratga oladi |
| `env/vendor/` | Firebase'ning soxta nusxasi: ilova bulut rejimida ochiladi, lekin tarmoqqa hech narsa yuborilmaydi |

## Qayta yig'ish

```bash
cd promo
node render.js --page stocktill/video.html --format vertical          # → stocktill/stocktill-promo-vertical.mp4
node render.js --page stocktill/video.html --format vertical --stills 24.5,51   # alohida kadrlar
```

Ilova yangilansa, ekranlarni qayta suratga olish (ilova HTML fayli repozitoriyda saqlanmaydi):

```bash
node stocktill/env/capture.js /yo'l/StockTill.html /tmp/shots
for f in /tmp/shots/*.png; do ffmpeg -v error -y -i "$f" -c:v libwebp -quality 90 "stocktill/shots/$(basename "${f%.png}").webp"; done
cp /tmp/shots/rects.js stocktill/shots/
```

## Ovozli versiya

`stocktill-promo-vertical-ovozli.mp4` — xuddi shu video, o'zbekcha diktor ovozi bilan. Ovoz ElevenLabs'da
yaratilgan ("Bekzod" — Toshkent talaffuzidagi reklama ovozi, `eleven_v3` modeli). Diktor gapirayotganda musiqa
9 dB pasayadi, nutq chastotalari musiqada yana bo'shatiladi; umumiy balandlik −14 LUFS (ijtimoiy tarmoqlar uchun odatiy).
Tasvir o'zgarmagan — faqat ovoz yo'lagi almashtirilgan.

| Fayl | Vazifasi |
|---|---|
| `voice/narration.mp3` | Diktor yozuvi: 24 gap ketma-ket o'qilgan |
| `voice/lines.json` | Har bir gapning matni, yozuvdagi o'rni (`from`/`to`) va videodagi soniyasi (`at`) |
| `voice.js` | Gaplarni sahnalarga joylaydi, musiqani pasaytiradi, balandlikni tekislaydi va videoga qo'shadi |

```bash
cd promo
node stocktill/voice.js        # → stocktill/stocktill-promo-vertical-ovozli.mp4 (kadrlar qayta chizilmaydi, bir necha soniya)
```

Gap vaqtini o'zgartirish uchun `lines.json` dagi `at` ni tahrirlang. Matnni o'zgartirish uchun yangi yozuv yaratib,
`from`/`to` ni shu yozuvga moslang.

| Vaqt | Diktor matni |
|---|---|
| 0.6 s | Stoktil — ombor va savdo nazorati. |
| 4.1 s | Omborda nima qoldi? |
| 5.4 s | Diler nima oldi? |
| 6.8 s | Ertaga nima kerak? |
| 8.4 s | Barcha javoblar — bitta ilovada. |
| 12.2 s | Pin-kod bilan himoya. Har bir xodimga — o'z ruxsati. |
| 16.6 s | Bugungi savdo, cheklar va qaytganlar — bir qarashda. |
| 20.4 s | Haftalik grafik va tugayotgan mahsulotlar. |
| 24.4 s | Dilerni tanlaysiz — narxlar o'zi qo'yiladi. |
| 27.4 s | Sonini kiritasiz, idishlarni belgilaysiz. |
| 30.4 s | Va chek tayyor! |
| 33.4 s | Qaytgan mahsulot omborga kiradi. |
| 35.8 s | Muddati o'tgani esa — hisobdan chiqadi. |
| 38.4 s | Idishlar ham hisobda. |
| 40.2 s | Kirim, sanoq, hisobdan chiqarish — har birida mas'ul shaxs yoziladi. |
| 45.4 s | Kim, qachon, qancha — hammasi tarixda. |
| 48.6 s | Eng muhimi — ertangi buyurtmani o'zi hisoblaydi. |
| 52.1 s | Ertaga va indinga qancha kerakligini aytib beradi. |
| 56.3 s | Har bir diler bo'yicha hisobot: savdo, qaytgan, sof summa. |
| 61.0 s | Uni rasm qilib, bir tugmada yuborasiz. |
| 64.2 s | Barcha qurilmalar — bitta bazada. Internet uzilsa ham ishlaydi. |
| 69.3 s | Begona qurilmani darhol o'chirasiz. |
| 72.3 s | Har bir o'zgarish — sababi bilan saqlanadi. |
| 76.3 s | Stoktil. Omboringiz — nazoratda! |
