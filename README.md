# Kassa Nazorati 2

Ilova: https://claude.ai/artifact/LKxLGRcbmwhYNs2KrGmduG

Do‘kon kassasini nazorat qilish ilovasi: smenalar, cheklar, qaytarish va bekor qilish, nasiya daftari, kassa puli, ko‘r sanash bilan smena yopish va egasi uchun jonli panel. Ilova bitta HTML sahifa bo‘lib, claude.ai Artifact sifatida ishlaydi. Ma’lumotlar Artifact’ning umumiy bazasida (`db` capability) saqlanadi.

## Tuzilish

```
src/styles.css        dizayn: ranglar, shriftlar, komponentlar (yorug‘ va qorong‘i mavzu)
src/js/00-util.js     yordamchilar: formatlash, SHA-256, PBKDF2 (PIN), CSV
src/js/10-store.js    qurilma xotirasi va mahalliy baza (umumiy baza bo‘lmaganda)
src/js/20-engine.js   yozuvlar zanjiri, navbat, bazaga yuborish, obunalar, texnik xizmat
src/js/30-model.js    hisob modeli: smenalar, cheklar, kunlik yig‘indilar, nasiya, ogohlantirishlar
src/js/40..90-*.js    interfeys: kirish, kassa, hisobotlar, sozlamalar, ishga tushirish
src/js/75-native.js   Android ilovasi bilan bog‘lanish: chop etish, zaxira nusxa, “Orqaga” tugmasi
build.mjs             hammasini bitta sahifaga yig‘adi -> kassa-nazorati/index.html
android/              Android ilovasi (APK): Java qobiq, manifest, ikonkalar, yig‘ish skripti
dist/                 tayyor APK fayl
tests/                avtomatik sinovlar (Playwright + umumiy bazaning sinov nusxasi)
```

Yig‘ish: `node build.mjs`. Sinovlar: `npm test` (Chromium kerak).

## Asosiy qarorlar

**Yozuvlar faqat qo‘shiladi.** Har bir harakat (sotuv, qaytarish, bekor qilish, pul olish, smena yopish) alohida yozuv. Hech narsa tahrirlanmaydi yoki o‘chirilmaydi; xato tuzatish ham yangi yozuv sifatida qoladi.

**Yozuvlar zanjiri.** Har bir qurilmaning yozuvlari tartib raqami (`seq`) va oldingi yozuvning xeshi (`ph`) bilan bog‘langan. Egasi paneli zanjirni tekshiradi. Yozuv o‘zgartirilsa, o‘chirilsa yoki oradan tushib qolsa, “Jurnal butunligi” ogohlantirishi chiqadi. Egasi qurilmasi har bir kassa bo‘yicha oxirgi ko‘rgan yozuvni eslab qoladi, shuning uchun oxirgi yozuvlarni o‘chirish ham aniqlanadi.

**Bazaning kirish qoidalari.** Narxlar, xodimlar va sozlamalar (`cfg/*`) faqat ilova egasining akkauntidan yoziladi (`write: owner`). PIN xeshlari (`sec/pins`) faqat ko‘rish huquqidan yuqori bo‘lganlarga ko‘rinadi. PIN kodlar PBKDF2-SHA256 bilan (120 000 takror, har bir xodimga alohida tuz) saqlanadi. Administrator va mudir PIN kodi 6 raqamli bo‘ladi.

**Hujjatlar tartibi.**
- `ev/<qurilma>~<kun>~<k>`: qurilmaning bir kunlik yozuvlari (≈190 KB gacha, keyin keyingi bo‘lak).
- `sum/<qurilma>~<kun>`: kunlik xulosa (to‘lov turlari, soatlar, top mahsulotlar, smenalar). Hisobotlar eski kunlar uchun shu kichik hujjatlarni o‘qiydi.
- `debt/<qurilma>~<oy>`: nasiya daftari yozuvlari. `cust/<id>`: mijozlar.
- `dev/<id>`: qurilmalar. `lock/*`: qisqa ijaralar (kassa raqami berish, texnik xizmat).

Egasi paneli oxirgi 3 kunni jonli kuzatadi. Eski kunlar kunlik xulosalardan olinadi, shuning uchun ilova oylar o‘tsa ham sekinlashmaydi. Batafsil yozuvlar sozlamada belgilangan muddat (90/180/365 kun) o‘tgach egasi qurilmasida tozalanadi. Tozalashdan oldin shu kunning xulosasi borligi tekshiriladi.

**Internetsiz ishlash.** Har bir yozuv avval qurilma xotirasiga (navbatga) yoziladi, keyin bazaga yuboriladi. Sahifa qayta yuklansa ham navbat saqlanadi. Xotira to‘lsa, avval keraksiz nusxalar tozalanadi. Chek raqamlari qurilmaning o‘z hisoblagichidan olinadi, shuning uchun takrorlanmaydi. Bir qurilmada kassa faqat bitta oynada ishlaydi.

**Ma’lum chegara.** Artifact bazasi 5 000 ta hujjat sig‘diradi. Kunlik xulosalar saqlanib qoladi: 1–2 kassali do‘konda bu 5–7 yilga yetadi. Keyinchalik oylik arxivga birlashtirish qo‘shish kerak bo‘ladi.

## Kassirlarni ulash

1. Ilovani o‘z akkauntingizdan oching va do‘konni sozlang (yoki namuna bilan tanishing).
2. Artifact’ni kassirlar bilan ulashing. Tashkilotingizdan tashqaridagi odamga email orqali **Editor** huquqini bering: faqat shu huquq bilan u ma’lumot yoza oladi. Tashkilot a’zolariga **Contributor** yetarli.
3. Kassadagi qurilmada havolani oching, “Kassa”ni tanlang va administrator yoki mudir PIN kodi bilan tasdiqlang.

## Android ilova (APK)

Tayyor fayl: `dist/KassaNazorati-2.0.0.apk` (Android 7.0 va yangi). Bu o‘sha ilovaning o‘zi, lekin telefon ichida mustaqil ishlaydi:

- Ma’lumotlar telefonning o‘z bazasida (SQLite) saqlanadi, internet kerak emas.
- Bir nechta qurilma bir-biri bilan **sinxron ishlamaydi**. Egasi boshqa telefondan jonli kuzatishi kerak bo‘lsa, claude.ai’dagi versiyadan foydalaning (Sozlamalar → Ma’lumotlar → “Onlayn versiyani ochish”).
- Chek va Z hisobotni chop etish: Android printer xizmati orqali (Wi-Fi printer yoki termoprinter uchun, masalan, RawBT). Qog‘oz eni 58 yoki 80 mm, Sozlamalarda tanlanadi.
- Zaxira nusxa: Sozlamalar → Ma’lumotlar → “Zaxira nusxa olish”. Fayl Telegram, Google Drive yoki boshqa ilovaga yuboriladi. Yangi telefonda birinchi oynadagi “Zaxiradan tiklash” orqali qaytariladi.
- Kassa rejimida ekran o‘chmaydi. Telefonning “Orqaga” tugmasi avval ochiq oynani yopadi, keyin asosiy bo‘limga qaytaradi.

**O‘rnatish.** APK faylni telefonga yuklab oling va oching. Telefon “Noma’lum manbalardan o‘rnatish”ga ruxsat so‘raydi: shu ilova (Telegram, Fayllar yoki brauzer) uchun ruxsat bering. Play Protect ogohlantirsa, “Baribir o‘rnatish”ni tanlang: ilova Play Market’dan emas, shuning uchun u uni tanimaydi.

**Yig‘ish.** `node android/build-apk.mjs` (JDK 17+, curl, internet). Android SDK kerak emas: aapt2, d8 o‘rnidagi dx, apksig va platforma jar’i Maven Central’dan avtomatik yuklanadi. Skript APK’ni imzolaydi, siqilmagan fayllarni 4 baytga tekislaydi va natijani tekshiradi. Brauzerdagi sinov: `node tests/e2e-android.cjs` (Android ko‘prigining soxta nusxasi bilan).

**Imzo kaliti.** Yangilanishlar faqat bir xil kalit bilan imzolansa, eski ilova ustiga o‘rnatiladi (ma’lumotlar saqlanib qoladi). Kalit `KASSA_KEYSTORE` (PKCS12 fayl) va `KASSA_KEYSTORE_PASS` muhit o‘zgaruvchilari orqali beriladi; berilmasa, `~/.kassa-apk` ichida yangisi yaratiladi. Kalitni repozitoriyga qo‘shmang va yo‘qotmang.
