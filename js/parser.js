/*
 * O'zbekcha ovozli buyruqlarni tahlil qiluvchi modul.
 * Matndan vazifa, xarajat (summa, toifa) yoki "bajarildi" buyrug'ini ajratadi.
 * Brauzerda window.UzParser, Node.js'da module.exports sifatida ishlaydi.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.UzParser = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Umumiy yordamchilar ----------

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[ʻʼ‘’`´]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenize(text) {
    return normalize(text)
      .replace(/(\d)[.,](?=\d{3}(?!\d))/g, '$1') // 5.000 / 1,500,000 -> 5000
      .replace(/(\d) (?=\d{3}(?!\d))/g, '$1') // "25 000" -> 25000
      .replace(/(\d)([^\d\s.,:])/gu, '$1 $2') // "5000so'm" -> "5000 so'm"
      .replace(/([^\d\s.,:])(\d)/gu, '$1 $2')
      .replace(/[^\p{L}\p{N}'.,:\s]/gu, ' ')
      .split(' ')
      .map((t) => t.replace(/^[.,:']+|[.,:']+$/g, ''))
      .filter(Boolean);
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function dateKey(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function addDays(d, n) {
    const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    r.setDate(r.getDate() + n);
    return r;
  }

  // ---------- Sonlar ----------

  const UNITS = {
    nol: 0, bir: 1, ikki: 2, uch: 3, "to'rt": 4, tort: 4, besh: 5, olti: 6,
    yetti: 7, sakkiz: 8, "to'qqiz": 9, toqqiz: 9, "o'n": 10, on: 10,
    yigirma: 20, "o'ttiz": 30, ottiz: 30, qirq: 40, ellik: 50, oltmish: 60,
    yetmish: 70, sakson: 80, "to'qson": 90, toqson: 90,
  };
  const MULTS = {
    yuz: 100, ming: 1000, million: 1e6, mln: 1e6, milyon: 1e6, millon: 1e6,
    milliard: 1e9, mlrd: 1e9,
  };
  // Songa qo'shiladigan qo'shimchalar (uzunlari oldin)
  const NUM_SUFFIXES = ['gacha', 'lab', 'dan', 'lik', 'ning', 'ga', 'ta', 'da', 'ni', 'chi', 'nchi'];
  const COUNT_SUFFIXES = new Set(['ta', 'lab', 'chi', 'nchi']);
  // Pul emas, miqdor bildiruvchi so'zlar
  const COUNT_WORDS = new Set([
    'ta', 'dona', 'kilo', 'kg', 'kilogramm', 'kilogram', 'gramm', 'gr', 'litr',
    'l', 'metr', 'm', 'marta', 'kun', 'kunlik', 'soat', 'daqiqa', 'minut', 'hafta',
    'oy', 'yil', 'qop', 'quti', 'paket', 'shtuk', 'kishi', 'nafar', 'foiz',
  ]);

  function isCurrency(tok) {
    return /^(so'm|som|sum|so'mm)/.test(tok) || tok === 'swm';
  }

  // So'z sonmi? {kind: 'unit'|'mult'|'digit'|'half', value, suffix}
  function numberToken(tok) {
    if (/^\d+([.,]\d+)?$/.test(tok)) {
      return { kind: 'digit', value: parseFloat(tok.replace(',', '.')), suffix: '' };
    }
    if (tok === 'yarim') return { kind: 'half', value: 0.5, suffix: '' };
    const direct = lookupWord(tok);
    if (direct) return Object.assign(direct, { suffix: '' });
    for (const suf of NUM_SUFFIXES) {
      if (tok.length > suf.length + 1 && tok.endsWith(suf)) {
        let base = tok.slice(0, -suf.length);
        let w = lookupWord(base);
        // "o'nta" -> "o'n", "mingga" -> "ming", "beshinchi" -> "besh"
        if (!w && suf === 'nchi') w = lookupWord(base.replace(/i$/, ''));
        if (!w && base.endsWith('g') && suf === 'ga') w = lookupWord(base.slice(0, -1));
        if (w) return Object.assign(w, { suffix: suf });
      }
    }
    return null;
  }

  function lookupWord(w) {
    if (Object.prototype.hasOwnProperty.call(UNITS, w)) return { kind: 'unit', value: UNITS[w] };
    if (Object.prototype.hasOwnProperty.call(MULTS, w)) return { kind: 'mult', value: MULTS[w] };
    return null;
  }

  const SUFFIX_TOKENS = new Set(['ga', 'ta', 'da', 'dan', 'ni', 'lik', 'gacha', 'ning']);

  // tokens[i] dan boshlab ketma-ket son so'zlarini o'qiydi
  function readNumberRun(tokens, i) {
    let total = 0;
    let current = 0;
    let j = i;
    let used = 0;
    let suffix = '';
    while (j < tokens.length) {
      const nt = numberToken(tokens[j]);
      if (!nt) break;
      if (nt.kind === 'half') {
        if (!used) break;
        current += 0.5;
      } else if (nt.kind === 'digit' || nt.kind === 'unit') {
        current += nt.value;
      } else if (nt.kind === 'mult') {
        if (nt.value === 100) current = (current || 1) * 100;
        else {
          total += (current || 1) * nt.value;
          current = 0;
        }
      }
      used++;
      j++;
      if (nt.suffix) {
        suffix = nt.suffix;
        break;
      }
    }
    if (!used) return null;
    // "5000 ga", "3 ta" kabi alohida qo'shimcha
    if (!suffix && j < tokens.length && SUFFIX_TOKENS.has(tokens[j])) {
      suffix = tokens[j];
      j++;
    }
    return { start: i, end: j, value: total + current, suffix };
  }

  function findNumberRuns(tokens) {
    const runs = [];
    let i = 0;
    while (i < tokens.length) {
      const run = readNumberRun(tokens, i);
      if (run) {
        runs.push(run);
        i = run.end;
      } else i++;
    }
    return runs;
  }

  // ---------- Toifalar ----------

  const CATEGORIES = [
    { name: 'Transport', icon: '🚕', stems: ['taksi', 'taxi', 'yandex', 'avtobus', 'metro', 'marshrut', 'benzin', "yoqilg'i", 'yoqilgi', 'metan', 'propan', 'parkovka', "yo'lkira", "yo'l kira", 'poyezd', 'poezd', 'samolyot', 'avia', 'moyka', 'avtomoyka', 'shina', 'ehtiyot qism', 'zapravka', 'mashina', 'moy', 'avto'] },
    { name: "Oziq-ovqat", icon: '🍞', stems: ['non', "go'sht", 'gosht', 'sut', 'qatiq', 'tuxum', 'guruch', "yog'", 'shakar', 'choy', 'meva', 'sabzavot', 'kartoshka', 'piyoz', 'sabzi', 'bozor', 'market', 'magazin', 'supermarket', 'ovqat', 'tushlik', 'nonushta', 'kechki ovqat', 'kafe', 'restoran', 'osh', 'somsa', "lag'mon", 'lagmon', 'shashlik', 'pishloq', 'kolbasa', 'olma', 'banan', 'tovuq', 'baliq', 'pitsa', 'pizza', 'burger', 'lavash', 'shirinlik', 'tort', 'konfet', 'qahva', 'kofe', 'ichimlik', 'mineral', 'oziq', 'shokolad', 'muzqaymoq', 'oshxona', 'fastfud', 'hot-dog', 'xotdog'], exact: ['un', 'suv'] },
    { name: 'Kommunal', icon: '💡', stems: ['svet', 'elektr', 'gaz', 'kommunal', 'internet', 'telefon', 'mobil', 'paynet', 'payme', 'click', 'ijara', 'kvartira', 'musor', 'chiqindi', 'wifi', 'tarif', 'balans'] },
    { name: "Sog'liq", icon: '💊', stems: ['dori', 'apteka', 'shifokor', 'doktor', 'vrach', 'kasalxona', 'klinika', 'tish', 'analiz', 'poliklinika', 'massaj', 'vitamin'] },
    { name: 'Kiyim', icon: '👕', stems: ['kiyim', "ko'ylak", 'koylak', 'shim', 'poyabzal', 'krossovka', 'kurtka', 'palto', 'futbolka', 'etik', 'tufli', 'paypoq', 'kostyum', 'sumka', "do'ppi", 'shapka', 'sharf'] },
    { name: "Ta'lim", icon: '📚', stems: ['kitob', 'kurs', "o'qish", 'oqish', 'daftar', 'ruchka', 'maktab', 'universitet', 'kontrakt', 'repetitor', 'dars', "bog'cha", 'bogcha', 'kanselyariya'] },
    { name: "Uy-ro'zg'or", icon: '🏠', stems: ['sovun', 'poroshok', 'shampun', 'idish', 'gigiyena', "xo'jalik", 'tozalash', 'mebel', 'jihoz', 'lampochka', 'tamirlash', "ta'mir", 'remont', 'salfetka', 'tualet', 'pasta', 'ustara'] },
    { name: "Ko'ngilochar", icon: '🎉', stems: ['kino', 'teatr', "o'yin", 'oyin', 'sayohat', 'dam olish', 'park', 'konsert', 'obuna', 'netflix', 'youtube', 'spotify', 'sport', 'fitnes', 'zal', 'basseyn'] },
    { name: "Sovg'a va xayriya", icon: '🎁', stems: ["sovg'a", 'sovga', 'xayriya', 'sadaqa', "to'y", 'toy', "tug'ilgan", 'tugilgan', 'hadya', 'gul'] },
    { name: 'Boshqa', icon: '📦', stems: [] },
  ];

  function detectCategory(text) {
    const norm = ' ' + normalize(text).replace(/[^\p{L}\p{N}'\s-]/gu, ' ') + ' ';
    const tokens = norm.trim().split(/\s+/);
    for (const cat of CATEGORIES) {
      for (const stem of cat.stems) {
        if (stem.includes(' ')) {
          if (norm.includes(' ' + stem)) return cat.name;
        } else if (tokens.some((t) => t.startsWith(stem))) return cat.name;
      }
      if (cat.exact && tokens.some((t) => cat.exact.includes(t))) return cat.name;
    }
    return 'Boshqa';
  }

  // ---------- Kalit so'zlar ----------

  const EXPENSE_STEMS = ['sarf', 'xarajat', 'harajat', 'xarid', "to'la", 'tola'];
  const EXPENSE_WORDS = new Set(['ketdi', 'berdim', 'oldim', 'sotib', 'ishlatdim', 'sarfladim', 'chiqdi', 'chiqim', 'pul', 'puli', 'pulga', 'uchun', 'narxi', 'turadi', 'bo\'ldi', 'boldi']);
  const EXPENSE_MARKERS = ['sarf', 'xarajat', 'harajat', 'xarid', "to'la", 'tola', 'ketdi', 'berdim', 'oldim', 'sotib', 'ishlatdim', 'chiqim'];
  const TASK_MARKERS = ['kerak', 'eslat', 'vazifa', 'unutma', 'rejam', 'reja', 'qilishim', 'borishim', 'qilish', 'lozim', 'shart'];
  const DONE_WORDS = new Set(['bajarildi', 'bajardim', 'bajarib', 'tugatdim', 'tugadi', 'tayyor', "bo'ldim", 'boldim', 'qildim']);
  const DONE_STRONG = new Set(['bajarildi', 'bajardim', 'tugatdim']);

  const WEEKDAYS = [
    ['yakshanba', 0], ['dushanba', 1], ['seshanba', 2], ['chorshanba', 3],
    ['payshanba', 4], ['juma', 5], ['shanba', 6],
  ];

  // Sana so'zlari: {offset | weekday}
  function dateWord(tok) {
    if (tok.startsWith('bugun')) return { offset: 0 };
    if (tok.startsWith('ertaga')) return { offset: 1 };
    if (tok.startsWith('indin')) return { offset: 2 };
    if (tok === 'kecha' || tok === 'kechagi') return { offset: -1 };
    for (const [name, dow] of WEEKDAYS) {
      if (tok.startsWith(name)) return { weekday: dow };
    }
    return null;
  }

  function resolveDate(dw, today) {
    if (dw.offset !== undefined) return dateKey(addDays(today, dw.offset));
    let diff = (dw.weekday - today.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    return dateKey(addDays(today, diff));
  }

  const PM_WORDS = ['kechqurun', 'kechki', 'kechasi', 'oqshom', 'kunduzi', 'tushdan'];
  const AM_WORDS = ['ertalab', 'tongda', 'tong', 'erta'];

  // "soat 10 da", "soat o'nda", "soat 3 yarimda", "14:30"
  function extractTime(tokens, remove) {
    let hour = null;
    let minute = 0;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const hm = /^(\d{1,2})[:.](\d{2})$/.exec(t);
      if (hm && +hm[1] < 24 && +hm[2] < 60) {
        hour = +hm[1];
        minute = +hm[2];
        remove.add(i);
        if (i > 0 && /^soat/.test(tokens[i - 1])) remove.add(i - 1);
        if (tokens[i + 1] === 'da' || tokens[i + 1] === 'gacha') remove.add(i + 1);
        break;
      }
      if (/^soat/.test(t) && i + 1 < tokens.length) {
        const nt = numberToken(tokens[i + 1]);
        if (nt && (nt.kind === 'digit' || nt.kind === 'unit')) {
          let h = nt.value;
          let j = i + 2;
          // "soat o'n ikki" / "soat 10 30"
          if (!nt.suffix && j < tokens.length) {
            const nt2 = numberToken(tokens[j]);
            if (nt2 && (nt2.kind === 'unit' || nt2.kind === 'digit')) {
              if (nt.kind === 'unit' && nt2.kind === 'unit' && h === 10 && nt2.value < 10) {
                h += nt2.value;
                j++;
              } else if (nt2.value < 60 && nt2.value >= 10) {
                minute = nt2.value;
                j++;
              }
            }
          }
          if (h < 24) {
            hour = Math.floor(h);
            remove.add(i);
            for (let k = i + 1; k < j; k++) remove.add(k);
            if (tokens[j] && /^yarim/.test(tokens[j])) {
              minute = 30;
              remove.add(j);
              j++;
            }
            if (tokens[j] && SUFFIX_TOKENS.has(tokens[j])) remove.add(j);
            break;
          }
        }
      }
    }
    if (hour === null) return null;

    let pm = false;
    let am = false;
    tokens.forEach((t, i) => {
      if (PM_WORDS.some((w) => t.startsWith(w))) {
        pm = true;
        remove.add(i);
        if (t === 'tushdan' && tokens[i + 1] === 'keyin') remove.add(i + 1);
      }
      if (AM_WORDS.includes(t) || t === 'ertalab') {
        am = true;
        remove.add(i);
      }
    });
    if (pm && hour < 12 && !(hour <= 4 && tokens.some((t) => t.startsWith('kechasi')))) hour += 12;
    else if (!pm && !am && hour >= 1 && hour <= 5) hour += 12; // "soat 3 da" odatda 15:00
    return pad(hour) + ':' + pad(minute);
  }

  // "5 daqiqadan keyin", "yarim soatdan so'ng", "2 kundan keyin"
  const RELATIVE_UNIT = /^(daqiqa|minut|soat|kun|hafta)(dan|da|ga)?$/;
  const AFTER_WORDS = new Set(['keyin', "so'ng", 'song', "o'tib", 'otib', "o'tgach", 'otgach']);
  const UNIT_MINUTES = { daqiqa: 1, minut: 1, soat: 60, kun: 1440, hafta: 10080 };

  function hasRelative(tokens) {
    return tokens.some((t, i) => RELATIVE_UNIT.test(t) && AFTER_WORDS.has(tokens[i + 1]));
  }

  // Topilsa: {date, time, at} — at: eslatmaning aniq vaqti (ms)
  function extractRelative(tokens, remove, now) {
    for (let i = 0; i < tokens.length; i++) {
      const run = tokens[i] === 'yarim'
        ? { start: i, end: i + 1, value: 0.5, suffix: '' }
        : readNumberRun(tokens, i);
      if (!run || run.suffix) continue;
      const unit = RELATIVE_UNIT.exec(tokens[run.end] || '');
      if (!unit || !AFTER_WORDS.has(tokens[run.end + 1])) continue;
      for (let k = run.start; k <= run.end + 1; k++) remove.add(k);
      const minutes = run.value * UNIT_MINUTES[unit[1]];
      if (minutes >= 1440) {
        // Kunlar/haftalar: faqat sana o'zgaradi
        return { date: dateKey(addDays(now, Math.round(minutes / 1440))), time: null, at: null };
      }
      const at = new Date(now.getTime() + Math.round(minutes * 60000));
      return { date: dateKey(at), time: pad(at.getHours()) + ':' + pad(at.getMinutes()), at: at.getTime() };
    }
    return null;
  }

  // ---------- Asosiy tahlil ----------

  function classify(tokens, runs) {
    if (!tokens.length) return 'empty';
    if (tokens.some((t) => DONE_STRONG.has(t))) return 'done';
    const hasTaskMarker = tokens.some((t) => TASK_MARKERS.some((m) => t.startsWith(m)));
    const hasCurrency = tokens.some(isCurrency);
    const hasExpenseMarker = tokens.some((t) => EXPENSE_MARKERS.some((m) => t.startsWith(m)));
    const moneyRuns = runs.filter((r) => isMoneyRun(tokens, r));
    const hasWeakDone = tokens.some((t) => DONE_WORDS.has(t));
    const needsDoing = tokens.some((t) => /^(kerak|eslat|lozim|shart|unutma)/.test(t));
    if (hasWeakDone && !moneyRuns.length && !needsDoing) return 'done';
    if (hasTaskMarker || hasRelative(tokens)) return 'task';
    if (!moneyRuns.length) return 'task';
    if (hasCurrency) return 'expense';
    if (hasExpenseMarker && moneyRuns.some((r) => r.value >= 100)) return 'expense';
    // "sut uchun o'n ikki ming" — 1000 dan katta summa odatda xarajat
    if (moneyRuns.some((r) => r.value >= 1000)) return 'expense';
    return 'task';
  }

  function isMoneyRun(tokens, r) {
    if (COUNT_SUFFIXES.has(r.suffix)) return false;
    const next = tokens[r.end];
    if (next && (COUNT_WORDS.has(next) || RELATIVE_UNIT.test(next))) return false;
    const prev = tokens[r.start - 1];
    if (prev && /^soat/.test(prev)) return false;
    if (/^\d{1,2}[:.]\d{2}$/.test(tokens[r.start])) return false;
    return r.value > 0;
  }

  function parseExpense(tokens, runs, ctx) {
    const moneyRuns = runs.filter((r) => isMoneyRun(tokens, r));
    const remove = new Set();
    let chosen = moneyRuns.find((r) => tokens[r.end] && isCurrency(tokens[r.end]));
    if (!chosen && moneyRuns.length) {
      chosen = moneyRuns.reduce((a, b) => (b.value > a.value ? b : a));
    }
    let amount = null;
    if (chosen) {
      amount = Math.round(chosen.value);
      for (let k = chosen.start; k < chosen.end; k++) remove.add(k);
    }
    let date = ctx.defaultDate;
    tokens.forEach((t, i) => {
      if (isCurrency(t)) remove.add(i);
      if (EXPENSE_WORDS.has(t) || EXPENSE_STEMS.some((s) => t.startsWith(s))) remove.add(i);
      const dw = dateWord(t);
      if (dw && dw.offset !== undefined && dw.offset <= 0) {
        date = resolveDate(dw, ctx.today);
        remove.add(i);
      }
      if (t === 'xarajatga' || t === 'yoz' || t === 'yozib' || t === "qo'y" || t === 'qoy') remove.add(i);
    });
    const rest = tokens.filter((_, i) => !remove.has(i));
    // Ortiqcha qo'shimchalarni tozalash
    while (rest.length && SUFFIX_TOKENS.has(rest[rest.length - 1])) rest.pop();
    while (rest.length && SUFFIX_TOKENS.has(rest[0])) rest.shift();
    const description = capitalize(rest.join(' ')) || 'Xarajat';
    return {
      type: 'expense',
      amount,
      description,
      category: detectCategory(tokens.join(' ')),
      date,
    };
  }

  function parseTask(tokens, ctx) {
    const remove = new Set();
    let date = ctx.defaultDate;
    tokens.forEach((t, i) => {
      const dw = dateWord(t);
      if (dw && !(dw.offset < 0)) {
        date = resolveDate(dw, ctx.today);
        remove.add(i);
        if (tokens[i + 1] === 'kuni' || tokens[i + 1] === 'kunga') remove.add(i + 1);
      }
    });
    const rel = extractRelative(tokens, remove, ctx.today);
    if (rel) date = rel.date;
    const time = extractTime(tokens, remove) || (rel && rel.time);
    const at = rel && rel.time === time ? rel.at : null;
    // Buyruq so'zlarini boshidan olib tashlash
    let rest = tokens.filter((_, i) => !remove.has(i));
    while (rest.length && /^(vazifa|eslatma|eslat|yangi|qo'sh|qosh|yoz)$/.test(rest[0])) rest.shift();
    while (rest.length && SUFFIX_TOKENS.has(rest[0])) rest.shift();
    return {
      type: 'task',
      text: capitalize(rest.join(' ')) || capitalize(tokens.join(' ')),
      date,
      time,
      at,
    };
  }

  function parseDone(tokens) {
    const query = tokens.filter((t) => !DONE_WORDS.has(t) && !['vazifa', 'ish', 'bu'].includes(t));
    return { type: 'done', query: query.join(' ') };
  }

  /**
   * @param {string} text   Ovozdan olingan matn
   * @param {object} opts   { mode: 'auto'|'task'|'expense', today: Date, defaultDate: 'YYYY-MM-DD' }
   */
  function parse(text, opts) {
    opts = opts || {};
    const today = opts.today || new Date();
    const ctx = { today, defaultDate: opts.defaultDate || dateKey(today) };
    const tokens = tokenize(text);
    const runs = findNumberRuns(tokens);
    let type = opts.mode && opts.mode !== 'auto' ? opts.mode : classify(tokens, runs);
    if (!tokens.length) type = 'empty';
    if (type === 'expense') return parseExpense(tokens, runs, ctx);
    if (type === 'task') return parseTask(tokens, ctx);
    if (type === 'done') return parseDone(tokens);
    return { type: 'empty' };
  }

  /** Bir gapda bir nechta xarajat: "non 5000 so'm, sut 12 ming so'm" */
  function parseMany(text, opts) {
    const first = parse(text, opts);
    if (first.type !== 'expense') return [first];
    const parts = normalize(text)
      .split(/\s*[,;]\s*|\s+va\s+|\s+keyin\s+/)
      .filter((p) => p.trim());
    if (parts.length < 2) return [first];
    const items = parts.map((p) => parse(p, Object.assign({}, opts, { mode: 'expense' })));
    if (items.every((it) => it.amount)) return items;
    return [first];
  }

  /** Vazifalar ro'yxatidan so'rovga eng mos keladiganini topadi */
  function matchTask(query, tasks) {
    const q = tokenize(query).filter((t) => t.length > 1);
    if (!q.length) return null;
    const stem = (w) => w.slice(0, Math.max(3, Math.min(w.length, 5)));
    let best = null;
    let bestScore = 0;
    for (const task of tasks) {
      const words = tokenize(task.text);
      let score = 0;
      for (const w of q) {
        if (words.some((tw) => tw === w)) score += 2;
        else if (words.some((tw) => stem(tw) === stem(w))) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = task;
      }
    }
    return bestScore > 0 ? best : null;
  }

  function formatMoney(n) {
    return Math.round(n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
  }

  return {
    parse,
    parseMany,
    matchTask,
    detectCategory,
    formatMoney,
    dateKey,
    addDays,
    normalize,
    tokenize,
    CATEGORIES,
  };
});
