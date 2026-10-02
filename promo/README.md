# 🎬 Reklama videosi

Ilovaning 26 soniyalik reklama videosi, ikki formatda:

- `kundalik-promo.mp4` — 1920×1080, YouTube, Telegram va sayt uchun;
- `kundalik-promo-vertical.mp4` — 1080×1920, Instagram Reels, TikTok va YouTube Shorts uchun.

Video kamera yoki montaj dasturisiz, to'liq kod bilan yasalgan:

| Fayl | Vazifasi |
|---|---|
| `video.html` | Barcha sahnalar (HTML/CSS animatsiya). Har bir kadr `VIDEO.seek(t)` orqali aniq chiziladi |
| `audio.js` | Fon musiqasi va ovoz effektlarini sintez qiladi. Tashqi musiqa ishlatilmagan, shuning uchun mualliflik huquqi muammosi yo'q |
| `render.js` | Chromium'da kadrlarni birma-bir suratga oladi va ffmpeg bilan MP4 yig'adi |
| `fonts/` | Inter shrifti (SIL OFL litsenziyasi) |

## Sahnalar

| Vaqt | Sahna |
|---|---|
| 0–3 s | Logo |
| 3–7 s | Telefon: mikrofon bosiladi, aytilgan gap yoziladi |
| 7–10 s | Gap tahlili: sana, vaqt va vazifa ajratiladi, so'ng vazifa kartochkasi paydo bo'ladi |
| 10–13 s | Xarajatlar: «yigirma besh ming so'm» 25 000 so'mga aylanadi |
| 13–16 s | Oylik hisobot |
| 16–20 s | «Gapiring — yozib oladi, vaqti kelganda eslatadi» |
| 20–22 s | Eslatma bildirishnomasi |
| 22–26 s | Yakuniy logo va shior |

## Qayta yig'ish

Kerak: Node.js 18+ va ffmpeg.

```bash
cd promo
npm install                     # Playwright
npx playwright install chromium # agar Chromium o'rnatilmagan bo'lsa
npm run render                  # → kundalik-promo.mp4
npm run render:vertical         # → kundalik-promo-vertical.mp4
node render.js --stills 8.4,21  # tanlangan soniyalardagi kadrlarni PNG qilib ko'rish (stills/)
```

Brauzerda ko'rish uchun papkani lokal server orqali oching (`npx serve` yoki `python3 -m http.server`),
keyin `video.html` ni oching — animatsiya aylanib turadi. `video.html?format=vertical` vertikal
formatni, `video.html?t=8.4` esa aynan shu soniyadagi kadrni ko'rsatadi.

## O'zgartirish

- **Matnlar** — `video.html` ichida (masalan, yakuniy shior `#fTag` elementida).
- **Vaqtlar** — `scenes` ro'yxati va har bir sahnaning `upd...` funksiyasi.
- **Ovoz effektlari** — `video.html` dagi `CUES` ro'yxati (qaysi soniyada qanday ovoz) va `audio.js`.
- **Ranglar** — `video.html` boshidagi `:root` CSS o'zgaruvchilari.

## Boshqa videolar

- [`stocktill/`](stocktill/README.md) — StockTill (ombor va savdo nazorati) uchun 1:20 lik vertikal reklama videosi.
