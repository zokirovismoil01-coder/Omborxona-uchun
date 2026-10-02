# 🎙️ Kundalik yordamchi

O'zbek tilida ovoz bilan boshqariladigan kundalik: **bugun nima qilish kerak** va **qancha pul sarflandi** — ikkalasini ham gapirib yozasiz.

## Nimalar qila oladi

- 🎤 **Ovozli kiritish (o'zbekcha).** Tugmani bosib gapirasiz, dastur aytganingizni yozib, o'zi ajratadi: bu vazifami yoki xarajatmi.
- ✅ **Vazifalar.** Sana va vaqtni gapdan o'zi oladi («ertaga», «juma kuni», «soat 10 da», «kechqurun soat yettida»). Bajarilganini belgilaysiz, qolib ketgan ishlarni bugunga ko'chirasiz.
- ⏰ **Eslatmalar.** Vaqti kelganda bildirishnoma chiqaradi (🔔 tugmasi orqali yoqiladi).
- 💰 **Xarajatlar.** Summani raqam bilan ham («5000», «25 000»), so'z bilan ham («yigirma besh ming», «bir yarim million») tushunadi. Toifani o'zi aniqlaydi: oziq-ovqat, transport, kommunal, sog'liq va boshqalar.
- 📊 **Hisobot.** Kunlik va oylik jami, toifalar bo'yicha taqsimot, kunlik o'rtacha xarajat.
- 📄 **Eksport.** Xarajatlarni Excel'da ochiladigan CSV faylga yuklab olish, zaxira nusxa olish va tiklash.
- 📱 **Telefonga o'rnatish.** Ilova (PWA) sifatida o'rnatiladi va internetsiz ham ochiladi.

## Qanday gapirish kerak

| Aytasiz | Natija |
|---|---|
| «Onamga qo'ng'iroq qilish» | 📝 Bugungi vazifa |
| «Ertaga soat 10 da bankka borishim kerak» | 📝 Ertangi vazifa, 10:00 |
| «Juma kuni hisobot topshirish» | 📝 Juma kungi vazifa |
| «5 daqiqadan keyin uchrashuv» | ⏰ Aynan 5 daqiqadan keyin eslatma |
| «Yarim soatdan keyin dori ichish» | ⏰ 30 daqiqadan keyin eslatma |
| «Non uchun 5000 so'm sarfladim» | 💰 Non — 5 000 so'm (Oziq-ovqat) |
| «Taksiga yigirma besh ming so'm berdim» | 💰 Taksiga — 25 000 so'm (Transport) |
| «Non 5000 so'm va sut 12 ming so'm» | 💰 Ikkita alohida xarajat |
| «Kecha kafeda 60 ming so'm sarfladim» | 💰 Kechagi kunga yoziladi |
| «Onamga qo'ng'iroq bajarildi» | ✅ Vazifa bajarilgan deb belgilanadi |

Dastur noto'g'ri tushunsa:
- yuqoridagi **Vazifa** yoki **Xarajat** rejimini tanlang;
- yozuv ustiga bosib, uni tahrirlang yoki o'chiring;
- qo'shilgandan keyin chiqqan xabardagi **«Bekor qilish»** tugmasini bosing.

## 📱 Android ilova (APK)

Eng oson yo'li — tayyor APK'ni o'rnatish:

1. Telefonda shu havolani oching va faylni yuklab oling:
   **https://github.com/zokirovismoil01-coder/Omborxona-uchun/releases/latest/download/kundalik-yordamchi.apk**
2. Yuklangan `kundalik-yordamchi.apk` faylini oching.
3. Telefon so'rasa, **«Noma'lum ilovalarni o'rnatish»** (Install unknown apps) ga ruxsat bering.
   Play Protect ogohlantirsa, **«Baribir o'rnatish»** ni bosing.

APK ichida:
- ovozni telefonning o'zidagi **Google ovoz tanish xizmati** o'zbek tilida taniydi (internet kerak);
- eslatmalar **ilova yopiq bo'lsa ham** vaqtida keladi, telefon qayta yoqilganda ham saqlanadi;
- zaxira nusxa va CSV fayllarni o'zingiz tanlagan papkaga saqlaysiz.

APK har safar kod yangilanganda GitHub Actions orqali avtomatik yig'iladi
(`.github/workflows/android.yml`) va **Releases** bo'limiga qo'yiladi. Yangi versiya
eskisining ustidan o'rnatiladi, ma'lumotlar o'chmaydi.

> APK imzo kaliti (`android/app/kundalik-release.jks`) qulaylik uchun repozitoriyada turibdi.
> Bu shaxsiy foydalanish uchun yetarli. Ilovani Play Market'ga chiqarmoqchi bo'lsangiz,
> yangi maxfiy kalit yarating va uni GitHub Secrets'da saqlang.

## Brauzerda ishga tushirish

Mikrofon faqat **https://** manzilda (yoki `localhost`da) ishlaydi.

### 1-usul: GitHub Pages

1. GitHub'da repozitoriyani oching, keyin **Settings → Pages** bo'limiga kiring.
2. **Source: Deploy from a branch** ni tanlang, so'ng branch va `/ (root)` papkasini belgilang.
3. Bir-ikki daqiqadan keyin `https://<username>.github.io/<repo-nomi>/` manzilida ilova ochiladi.
4. Telefonda shu manzilni **Google Chrome**'da oching, keyin **⋮ → Bosh ekranga qo'shish** (Add to Home screen) ni bosing.

### 2-usul: Kompyuterda

```bash
python3 -m http.server 8080
# brauzerda http://localhost:8080 ni oching
```

## Muhim eslatmalar

- **Brauzer.** Ovozni tanish Android va kompyuterdagi **Google Chrome**'da (yoki Edge'da) ishlaydi. Ovozni Google xizmati taniydi, shuning uchun gapirish paytida internet kerak.
- **iPhone / Safari.** O'zbek tilida ovoz tanish yo'q bo'lishi mumkin. Unda matn maydoniga bosing va klaviaturadagi 🎤 tugmasi orqali gapiring (Gboard yoki o'zbekcha klaviatura). Dastur yozilgan matnni xuddi shunday tahlil qiladi.
- **Ma'lumotlar.** Hammasi faqat sizning qurilmangizda (brauzer xotirasida) saqlanadi, hech qayerga yuborilmaydi. Brauzer ma'lumotlarini tozalasangiz yo'qolishi mumkin, shuning uchun **Hisobot → Zaxira nusxa olish** dan foydalanib turing.
- **Eslatmalar.** Brauzer versiyasida ilova ochiq (yoki fonda) turganda ishlaydi. APK'da esa ilova yopiq bo'lsa ham keladi.

## Loyiha tuzilishi

```
index.html            — asosiy sahifa
css/style.css         — dizayn (kunduzgi va tungi rejim)
js/parser.js          — o'zbekcha gapni tahlil qilish (summa, sana, vaqt, toifa)
js/app.js             — ilova mantig'i, ovozni tanish, saqlash, eslatmalar
sw.js                 — oflayn ishlash va bildirishnomalar
manifest.webmanifest  — telefonga o'rnatish sozlamalari
tests/                — tahlilchi testlari
android/              — Android ilova (WebView + ovoz tanish, eslatmalar)
.github/workflows/    — APK'ni avtomatik yig'ish
promo/                — reklama videosi (kod bilan yasalgan, promo/README.md ga qarang)
```

APK'ni kompyuterda yig'ish (JDK 17 va Android SDK kerak):

```bash
cd android
./gradlew assembleRelease
# natija: android/app/build/outputs/apk/release/app-release.apk
```

Testlarni ishga tushirish (Node.js 18+):

```bash
npm test
```
