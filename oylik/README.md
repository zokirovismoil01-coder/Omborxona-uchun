# 🐟 Baliqxona oylik

Baliqxona ishchilarining oylik hisob-kitobi: guruh fondi, davomat, avans, mukofot, jarima,
to'lovlar va oydan oyga o'tadigan qoldiq. Ikki ko'rinishda:

- **Android ilova (APK)** — telefonda, internetsiz ishlaydi;
- **Excel jadval** (`Baliqxona_oylik.xlsx`) — kompyuterda, formulalar bilan.

Ikkalasi ham bir xil qoida bilan hisoblaydi (`tools/excel_mosligi.py` buni tekshiradi).

## 📱 APK'ni o'rnatish

1. GitHub'da repozitoriyaning **Releases** bo'limini oching va eng yangi **«Baliqxona oylik 1.0.N»**
   versiyasini tanlang.
2. `baliqxona-oylik.apk` faylini telefoningizga yuklab oling va oching.
3. Telefon so'rasa, **«Noma'lum ilovalarni o'rnatish»** (Install unknown apps) ga ruxsat bering.
   Play Protect ogohlantirsa, **«Baribir o'rnatish»** ni bosing.

Yangi versiya eskisining ustidan o'rnatiladi, ma'lumotlar o'chmaydi.

## Hisob qoidasi

| Qadam | Formula |
|---|---|
| Guruh fondi | asosiy oylik × me'yoriy soni |
| 1 kishiga oylik | fond ÷ hozirgi soni, lekin **asosiy oylikdan oshmaydi**; yaxlitlash qadamigacha (1 000 so'm) pastga yaxlitlanadi |
| Asosiy (davomat bilan) | 1 kishiga oylik × ishlagan kun ÷ oyiga ish kuni |
| Jami hisoblangan | asosiy + mukofot − jarima ± o'tgan oydan qoldiq |
| Qo'lga beriladi | jami hisoblangan − avans |
| Qoldiq | qo'lga beriladi − to'langan (keyingi oyga o'tadi; manfiy bo'lsa — ishchi qarzi) |

Masalan, Moyka: fond 4 000 000 × 2 = 8 000 000. Hozir 3 kishi → 8 000 000 ÷ 3 = 2 666 666 →
**2 666 000** so'm. Qolgan 2 000 so'm «yaxlitlash qoldig'i».

Fonddan ortgan pul uch turga ajratiladi: **bo'sh o'rin tejami** (odam me'yordan kam),
**kelmagan kunlar tejami** va **yaxlitlash qoldig'i**.

## Ilova imkoniyatlari

- **Oy** — guruhlar holati, har bir ishchining hisobi, ogohlantirishlar (me'yordan ortiq odam,
  qarzdor ishchi va h.k.).
- **Ishchi varag'i** — kelmagan kunlar, avans / mukofot / jarima / to'lov, «Qoldiqni to'lash»,
  hisob varag'ini Telegram orqali ulashish.
- **Oyni yopish** — yopilgan oyning raqamlari muhrlanadi: keyin guruh oyligi o'zgarsa ham eski oy
  o'zgarmaydi. Qoldiqlar keyingi oyga avtomatik o'tadi.
- **Excel'ga yuklash** — oy hisoboti (Xulosa, Oylik hisob, Amallar, Guruhlar) va yillik hisobot.
- **Qaydnoma** — imzo ustuni bilan chop etish yoki PDF qilib saqlash.
- **Zaxira nusxa** — barcha ma'lumotni bitta faylga saqlash va boshqa telefonda tiklash.

Ma'lumotlar faqat telefonda saqlanadi (ikki joyda: WebView xotirasi va ilova fayli) va hech
qayerga yuborilmaydi. Telefonning Google zaxirasi yoqilgan bo'lsa, ilova ma'lumotlari ham
zaxiralanadi.

## Excel jadval

`Baliqxona_oylik.xlsx` — bir oy uchun ishchi kitob:

| Varaq | Nima bor |
|---|---|
| Xulosa | oy nomi, yaxlitlash qadami, umumiy natijalar va avtomatik tekshiruvlar |
| Oylik hisob | har bir ishchining hisobi (chop etish uchun qaydnoma) |
| Amallar | avans, mukofot, jarima va to'lovlar jurnali |
| Guruhlar | asosiy oylik, me'yor, ish kuni va tejam tahlili |
| Qo'llanma | foydalanish bo'yicha yo'riqnoma |

Ko'k shrift — qo'lda kiritiladigan kataklar. Jadvallar (Excel Table) o'zi kengayadi: yangi
ishchi yoki guruh qo'shish uchun jadval ostidagi bo'sh qatorga yozish kifoya.

## Loyiha tuzilishi

```
index.html, css/, js/   — veb-ilova (APK ichiga shu fayllar joylanadi)
  js/calc.js            — hisob-kitob (Excel bilan bir xil qoida)
  js/xlsx.js            — Excel fayl yozuvchi (kutubxonasiz)
  js/export.js          — oy va yil hisobotlari
  js/app.js             — interfeys
tests/                  — testlar (node --test)
tools/excel_shablon.py  — Excel jadvalni yaratadi
tools/excel_mosligi.py  — Excel va ilova natijalarini solishtiradi
android/                — Android ilova (WebView)
```

Buyruqlar:

```bash
node --test oylik/tests/*.test.js            # testlar (Node.js 18+)
python3 oylik/tools/excel_shablon.py oylik/Baliqxona_oylik.xlsx   # Excel'ni qayta yaratish
python3 oylik/tools/excel_mosligi.py 60      # Excel ↔ ilova solishtiruvi (LibreOffice kerak)
cd oylik/android && ./gradlew assembleRelease # APK (JDK 17 va Android SDK kerak)
python3 -m http.server -d oylik 8080         # brauzerda sinash: http://localhost:8080
```

APK har safar `oylik/` o'zgarganda GitHub Actions orqali avtomatik yig'iladi
(`.github/workflows/oylik-android.yml`) va **Releases** bo'limiga qo'yiladi.

> APK imzo kaliti (`android/app/oylik-release.jks`) qulaylik uchun repozitoriyada turibdi.
> Bu shaxsiy foydalanish uchun yetarli. Ilovani Play Market'ga chiqarmoqchi bo'lsangiz,
> yangi maxfiy kalit yarating va uni GitHub Secrets'da saqlang.
