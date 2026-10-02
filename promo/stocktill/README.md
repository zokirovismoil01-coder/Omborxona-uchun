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
