# 🎙️ Sezgir — Windows uchun oʻzbekcha ovozli yozish

Tugmani bosib turing, gapiring, qoʻyib yuboring — aytganingiz kursor turgan joyga yoziladi:
Word, Telegram, brauzer, istalgan dastur. **Lotin** yoki **kirill** alifbosida.
Hammasi **kompyuterning oʻzida** ishlaydi: ovozingiz ham, matningiz ham internetga yuborilmaydi.

Sezgir — ochiq kodli [Kotiba](https://github.com/aziznizomofficial/kotiba) dasturining
(muallif: Aziz Nizom, MIT litsenziyasi) Windows versiyasi asosida yaratilgan, oʻzbek tiliga
moslashtirilgan va xavfsizligi kuchaytirilgan klon. Kotiba muallifi bilan bogʻliq emas.

## Oʻrnatish

1. Repozitoriyaning **Releases** boʻlimida **`Sezgir 1.0.0 (Windows)`** relizini oching va
   `Sezgir-Setup-1.0.0.exe` faylini yuklab oling (≈ 0,7 GB — oʻzbekcha model ichida keladi,
   shuning uchun birinchi ishga tushishdanoq internetsiz ishlaydi).
2. Faylni oching. Windows **"Windows protected your PC"** desa: **More info → Run anyway**.
   Bu ogohlantirish dasturda biror muammo topilgani uchun emas — Microsoft'ning pullik raqamli
   imzosi yoʻqligi uchun chiqadi. Manba kodi shu yerda, oʻqib koʻrishingiz mumkin.
3. Oʻrnatish administrator huquqini soʻramaydi (faqat sizning foydalanuvchingiz uchun oʻrnatiladi).
4. Birinchi ochilishda mikrofonga ruxsat bering. Windows boshqa hech qanday ruxsat soʻramaydi.

Oʻrnatgandan keyin Sezgir fonda **rejimlar modelini** (Qwen3-1.7B, 1,28 GB) oʻzi yuklab oladi.
Model kelguncha ham diktovka ishlaydi — rejimlar faqat qoidalar bilan tozalaydi.

> ⚠️ Windows versiyasi hali haqiqiy kompyuterlarda keng sinab koʻrilmagan (avtomatik testlar va
> GitHub'ning Windows serverida sinov oʻtadi). Muammo boʻlsa, xabar bering.

## Qanday ishlatiladi

| Tugma | Natija |
|---|---|
| **Oʻng Ctrl** ni bosib turib gapiring, qoʻyib yuboring | Matn **lotin** alifbosida yoziladi |
| **Shift + oʻng Ctrl** ni bosib turib gapiring | Oʻsha gap **kirill** alifbosida yoziladi |
| Oʻng Ctrl + boshqa harf (masalan Ctrl+C) | Bu odatiy yorliq — diktovka bekor qilinadi |

- Shift'ni gapirish davomida istalgan payt bosib qoʻyish ham yetarli.
- Asosiy alifboni **Tillar → Oʻzbekcha yozuv** boʻlimida **Kirill** ga oʻzgartirsangiz,
  hammasi teskari ishlaydi: odatda kirillcha, **Shift** bilan — lotincha.
- Diktovka tugmasini **Tezkor tugma** boʻlimida boshqasiga (F13, Caps Lock, oʻng Shift…)
  almashtirish mumkin.

Misol: *«Ertaga soat oʻnda bankka boraman»* →
lotincha: `Ertaga soat oʻnda bankka boraman.` · kirillcha: `Эртага соат ўнда банкка бораман.`

### Rejimlar

| Rejim | Nima qiladi |
|---|---|
| **Super** | Soʻzlaringizni saqlaydi, faqat aniq xatolarni (takrorlar, «ee», «mm», tinish belgilari) tuzatadi |
| **Xabar** | Gapingizni chat xabariga aylantiradi |
| **Qayd** | Qisqa Markdown qayd tuzadi |
| **Soʻzma-soʻz** | Aynan aytilgan narsa |

Rejimlar kompyuterdagi kichik AI model bilan ishlaydi; parol menejerlari (1Password, Bitwarden,
KeePass…) oldida turganda Sezgir avtomatik **Soʻzma-soʻz** rejimga oʻtadi va hech qanday model ishlatmaydi.

### Boshqa tillar

Sezgir oʻzbek tili uchun sozlangan va boshqa hech narsa yuklamaydi. Kerak boʻlsa,
**Tillar** boʻlimida ingliz, rus, turk yoki arab tilini yoqish mumkin — shunda ularning
modeli yuklab olinadi.

## Maʼlumotlar xavfsizligi

| | |
|---|---|
| 🎤 **Ovoz** | Faqat tugma bosib turilganda yoziladi va diskka saqlanmaydi. Tanish kompyuterda (whisper.cpp) bajariladi. |
| 🌐 **Internet** | Faqat modellarni yuklash uchun (Hugging Face va Kotiba relizi). Har bir fayl oldindan qayd qilingan **sha256** bilan tekshiriladi — oʻzgartirilgan fayl qabul qilinmaydi. Matn hech qayerga yuborilmaydi. |
| 🔐 **Tarix** | Har bir yozuv **AES-256-GCM** bilan shifrlanadi, kalitning oʻzi esa **Windows DPAPI** bilan himoyalanadi — fayl boshqa kompyuterga yoki boshqa foydalanuvchiga koʻchirilsa, oʻqib boʻlmaydi. Sozlamalardan tarixni oʻchirish yoki umuman saqlamaslik mumkin. |
| 📊 **Diagnostika** | Faqat vaqt oʻlchovlari va natija (muvaffaqiyatli/xato) saqlanadi — aytilgan soʻzlar emas, faqat ularning **soni**. |
| 📋 **Clipboard** | Odatda matn toʻgʻridan-toʻgʻri yoziladi, clipboard ishlatilmaydi. Zaxira yoʻlda ishlatilsa, matn **Win+V tarixiga va bulutli clipboard'ga tushmaydigan** qilib belgilanadi va eski clipboard tiklanadi. |
| 🔑 **API kalitlar** | Yoʻq. Sezgir hech qanday bulut xizmatiga ulanmaydi va kalit saqlamaydi. |
| 🛡️ **Dastur** | Oynalar faqat oʻz sahifalarini koʻrsatadi (CSP, navigatsiya va yangi oyna ochish taqiqlangan); ichki xabarlar faqat Sezgir'ning oʻz oynalaridan qabul qilinadi; Electron "fuse"lari bilan `NODE_OPTIONS` va debugger ulash oʻchirilgan. |

Fayllar qayerda:

```
%APPDATA%\Sezgir\settings.v1.json      sozlamalar (kalit yoki parol yoʻq)
%APPDATA%\Sezgir\models\               yuklab olingan modellar
%LOCALAPPDATA%\Sezgir\history.jsonl     tarix — shifrlangan
%LOCALAPPDATA%\Sezgir\history.key       tarix kaliti — Windows DPAPI bilan muhrlangan
%LOCALAPPDATA%\Sezgir\diagnostics.jsonl diagnostika — soʻzlarsiz
```

## Manba koddan yigʻish (dasturchilar uchun)

Oʻrnatuvchi har safar `sezgir/` oʻzgarganda GitHub Actions'da avtomatik yigʻiladi
(`.github/workflows/sezgir-windows.yml`): Linux'da tekshiruv, keyin Windows'da whisper.cpp va
uchta C++ yordamchi (MSVC), modellar sha256 bilan, `electron-builder`, oʻrnatuvchi tarkibini
tekshirish va tayyor `Sezgir.exe --check` bilan sinov.

Mahalliy tekshiruv (Node.js 22):

```bash
bash sezgir/scripts/gate.sh     # tuzilma qoidasi, TypeScript, ESLint, 4500+ test
```

Tuzilishi:

```
src/contracts/   umumiy turlar va interfeyslar — mantiq yoʻq
src/core/        sof funksiyalar: til tanlash, matn (lotin → kirill: core/text/cyrillic.ts), rejimlar
src/engines/     modellar, whisper.cpp xosti, Parakeet (ONNX)
src/polish/      rejimlarning model qismi (Qwen3-1.7B, node-llama-cpp)
src/audio/       mikrofon, 16 kHz
src/platform/    tugma, yozish, tarix (shifrlangan: platform/history-cipher.ts), diagnostika
src/session/     diktovka holat mashinasi
src/main/        Electron main, tray, IPC, --check
src/renderer/    oyna va «pill» indikatori
native/          sezgir-stt (whisper.cpp), sezgir-hook (tugma), sezgir-input (yozish)
```

Kotiba'dan farqlari: oʻzbek tili standart yagona til; kirill alifbosida yozish (sozlama va
Shift); tarix shifrlangan; diagnostikada matn yoʻq; bulut kaliti va Credential Manager yoʻq;
clipboard maxfiy belgilanadi; IPC joʻnatuvchisi tekshiriladi; Electron fuse'lari; yangi nom,
belgi va rang.

## Litsenziya va mualliflar

Kod — [MIT](LICENSE): © 2026 Aziz Nizom (Kotiba) va Sezgir hissachilari. Modellar va kutubxonalar
oʻz litsenziyalarida qoladi — [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Oʻzbekcha model:
[`Kotib/uzbek_stt_v1`](https://huggingface.co/Kotib/uzbek_stt_v1) (Kotibai & Rubai jamoasi,
Apache-2.0). Sezgir KotibAI (kotib.ai) bilan bogʻliq emas.
