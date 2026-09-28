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
| «Non uchun 5000 so'm sarfladim» | 💰 Non — 5 000 so'm (Oziq-ovqat) |
| «Taksiga yigirma besh ming so'm berdim» | 💰 Taksiga — 25 000 so'm (Transport) |
| «Non 5000 so'm va sut 12 ming so'm» | 💰 Ikkita alohida xarajat |
| «Kecha kafeda 60 ming so'm sarfladim» | 💰 Kechagi kunga yoziladi |
| «Onamga qo'ng'iroq bajarildi» | ✅ Vazifa bajarilgan deb belgilanadi |

Dastur noto'g'ri tushunsa:
- yuqoridagi **Vazifa** yoki **Xarajat** rejimini tanlang;
- yozuv ustiga bosib, uni tahrirlang yoki o'chiring;
- qo'shilgandan keyin chiqqan xabardagi **«Bekor qilish»** tugmasini bosing.

## Ishga tushirish

Mikrofon faqat **https://** manzilda (yoki `localhost`da) ishlaydi.

### 1-usul: GitHub Pages (telefon uchun tavsiya etiladi)

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
- **Eslatmalar.** Ilova ochiq (yoki fonda) turganda ishlaydi.

## Loyiha tuzilishi

```
index.html            — asosiy sahifa
css/style.css         — dizayn (kunduzgi va tungi rejim)
js/parser.js          — o'zbekcha gapni tahlil qilish (summa, sana, vaqt, toifa)
js/app.js             — ilova mantig'i, ovozni tanish, saqlash, eslatmalar
sw.js                 — oflayn ishlash va bildirishnomalar
manifest.webmanifest  — telefonga o'rnatish sozlamalari
tests/                — tahlilchi testlari
```

Testlarni ishga tushirish (Node.js 18+):

```bash
npm test
```
