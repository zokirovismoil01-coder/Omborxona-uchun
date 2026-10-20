/*
 * O'zbekcha ovozli o'qish.
 * 1) Matnlarni ovoz uchun tayyorlash (HTML → oddiy matn, qisqartmalar va o'lchov birliklari so'z bilan).
 *    Bu qism Node.js'da ham ishlaydi: tools/ovoz/matn.js shu yerdan foydalanib ovozli fayllar yaratadi.
 * 2) Pleyer: avval oldindan yozib olingan MP3 (dron/audio), bo'lmasa qurilmadagi o'zbekcha ovoz
 *    (brauzerning speechSynthesis xizmati, masalan Microsoft Edge'dagi Madina va Sardor).
 * Brauzerda window.DronOvoz, Node.js'da module.exports.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DronOvoz = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Matnni ovoz uchun tayyorlash ----------

  function decode(s) {
    return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }

  function strip(s) {
    return decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  }

  // Jadvalni gaplarga aylantiramiz: «ustun: qiymat; ustun: qiymat.»
  function tableToText(table) {
    const rows = table.match(/<tr[\s\S]*?<\/tr>/g) || [];
    let head = [];
    const out = [];
    rows.forEach((r) => {
      const ths = (r.match(/<th[\s\S]*?<\/th>/g) || []).map(strip);
      if (ths.length) { head = ths; return; }
      const tds = (r.match(/<td[\s\S]*?<\/td>/g) || []).map(strip);
      if (!tds.length) return;
      const parts = tds.map((c, i) => (i === 0 ? c : (head[i] ? head[i] + ': ' : '') + c));
      out.push(parts.join('; ') + '.');
    });
    return ' ' + out.join(' ') + ' ';
  }

  function htmlToText(html) {
    let s = String(html || '');
    s = s.replace(/<figure[\s\S]*?<figcaption>([\s\S]*?)<\/figcaption>\s*<\/figure>/g, (m, cap) => ` Rasmda: ${strip(cap)}. `);
    s = s.replace(/<svg[\s\S]*?<\/svg>/g, ' ');
    s = s.replace(/<pre[\s\S]*?<\/pre>/g, ' ');
    s = s.replace(/<table[\s\S]*?<\/table>/g, (t) => tableToText(t));
    s = s.replace(/<br\s*\/?>/g, ' ');
    s = s.replace(/<\/(p|li|h3|h4|dt|dd|figcaption)>/g, '. ');
    s = strip(s);
    return s;
  }

  // Tartib muhim: uzunroq birikmalar avval
  const REPLACE = [
    [/\s*\((?:CW|CCW)\)/g, ''],
    [/\bCCW\b/g, 'soat miliga teskari'],
    [/\bCW\b/g, 'soat mili bo\'yicha'],
    [/(\d+)N(\d+)P\b/g, '$1 en $2 pi'],
    [/(\d)S(\d)P\b/g, '$1 es $2 pi'],
    [/(\d)S\b/g, '$1 es'],
    [/(\d)C\b/g, '$1 si'],
    [/\b4G\b/g, '4 ji'],
    [/\bGNSS\b/g, 'ji-en-es-es'],
    [/\bGPS\b/g, 'ji-pi-es'],
    [/\bIMU\b/g, 'ay-em-yu'],
    [/\bESC\b/g, 'i-es-si'],
    [/\bPID\b/g, 'pi-ay-di'],
    [/\bPDB\b/g, 'pi-di-bi'],
    [/\bBEC\b/g, 'bek'],
    [/\bBLDC\b/g, 'bi-el-di-si'],
    [/\bKV\b/g, 'key-vi'],
    [/\bLiPo\b/g, 'lipo'],
    [/\bLi-ion\b/g, 'litiy-ion'],
    [/\bLiFePO4\b/g, 'litiy-temir-fosfat'],
    [/\bRTL\b/g, 'ar-ti-el'],
    [/\bRTK\b/g, 'ar-ti-key'],
    [/\bEKF\b/g, 'i-key-ef'],
    [/\bMEMS\b/g, 'mems'],
    [/\bUAV\b/g, 'yu-ey-vi'],
    [/\bUAS\b/g, 'yu-ey-es'],
    [/\bUUA\b/g, 'u-u-a'],
    [/\bBVLOS\b/g, 'bi-vi-los'],
    [/\bVLOS\b/g, 'vi-los'],
    [/\bVTOL\b/g, 'vitol'],
    [/\bFPV\b/g, 'ef-pi-vi'],
    [/\bFOC\b/g, 'ef-o-si'],
    [/\bPWM\b/g, 'pi-dabl-yu-em'],
    [/\bDShot(\d*)/g, 'di-shot $1'],
    [/\bCRSF\b/g, 'si-ar-es-ef'],
    [/\bSBUS\b/g, 'es-bas'],
    [/\bMAVLink\b/g, 'mav-link'],
    [/\bMAVSDK\b/g, 'mav-es-di-key'],
    [/\bSITL\b/g, 'sitl'],
    [/\bQGroundControl\b/g, 'kyu-graund-kontrol'],
    [/\bPX4\b/g, 'pi-eks-to\'rt'],
    [/\bSTM32H7\b/g, 'es-ti-em 32 eych 7'],
    [/\bSTM32\b/g, 'es-ti-em 32'],
    [/\bMOSFET\b/g, 'mosfet'],
    [/\bMCU\b/g, 'mikrokontroller'],
    [/\bLTE\b/g, 'el-ti-i'],
    [/\bRX\b/g, 'qabul qilgich'],
    [/\bRC\b/g, 'pult'],
    [/\bQVP\b/g, 'qishloq vrachlik punkti'],
    [/\bFIK\b/g, 'ef-i-ka'],
    [/\bSLA\b/g, 'es-el-ey'],
    [/\bUTM\b/g, 'yu-ti-em'],
    [/\bXT(\d+)\b/g, 'iks-ti $1'],
    [/\bM([1-4])\b/g, 'M $1'],
    // Raqamlar orasidagi bo'shliqlar (8 900) — bitta son
    [/(\d)[   ](?=\d{3}\b)/g, '$1'],
    [/(\d)\s?%\s(ini|ga|da|dan|ni|i|gacha)\b/g, '$1 foiz$2'],
    // O'lchov birliklari
    [/kVt·soat/g, 'kilovatt-soat'],
    [/(\d)\s?ayl\/daq/g, '$1 aylanish daqiqasiga'],
    [/\bayl\/daq/g, 'aylanish daqiqasiga'],
    [/(\d)\s?Wh\/kg/g, '$1 vatt-soat kilogrammga'],
    [/(\d)\s?g\/Vt/g, '$1 gramm vattga'],
    [/\bg\/Vt\b/g, 'gramm vattga'],
    [/(\d)\s?m\/s\b/g, '$1 metr sekundiga'],
    [/\bm\/s\b/g, 'metr sekundiga'],
    [/(\d)\s?km\/soat/g, '$1 kilometr soatiga'],
    [/(\d)\s?mAh\b/g, '$1 milliamper-soat'],
    [/(\d)\s?Ah\b/g, '$1 amper-soat'],
    [/(\d)\s?Wh\b/g, '$1 vatt-soat'],
    [/\bWh\b/g, 'vatt-soat'],
    [/(\d)\s?kVt\b/g, '$1 kilovatt'],
    [/(\d)\s?Vt\b/g, '$1 vatt'],
    [/(\d)\s?GHz\b/g, '$1 gigagers'],
    [/(\d)\s?MHz\b/g, '$1 megagers'],
    [/(\d)\s?Hz\b/g, '$1 gers'],
    [/(\d)\s?mks\b/g, '$1 mikrosekund'],
    [/(\d)\s?ms\b/g, '$1 millisekund'],
    [/(\d)\s?mm\b/g, '$1 millimetr'],
    [/(\d)\s?sm\b/g, '$1 santimetr'],
    [/(\d)\s?km\b/g, '$1 kilometr'],
    [/(\d)\s?kg\b/g, '$1 kilogramm'],
    [/(\d)\s?Pa\b/g, '$1 paskal'],
    [/(\d)\s?daq\b/g, '$1 daqiqa'],
    [/(\d)\s?g\b/g, '$1 gramm'],
    [/(\d)\s?m\b/g, '$1 metr'],
    [/(\d)\s?s\b/g, '$1 sekund'],
    [/(\d)\s?V\b/g, '$1 volt'],
    [/(\d)\s?A\b/g, '$1 amper'],
    [/(\d)\s?N\b/g, '$1 nyuton'],
    [/\bmAh\b/g, 'milliamper-soat'],
    [/\(V\)/g, '(volt)'],
    [/\(Ah\)/g, '(amper-soat)'],
    // Oraliqlar: 80–90 → 80 dan 90 gacha (birliklardan keyin, raqamlar to'liq olinadi)
    [/(\d+(?:,\d+)?)\s?[–-]\s?(\d+(?:,\d+)?)/g, '$1 dan $2 gacha'],
    // Belgilar
    [/(\d)×(\d)/g, '$1 ga $2'],
    [/\s×\s/g, ' ko\'paytirish '],
    [/×/g, ' ko\'paytirish '],
    [/÷/g, ' bo\'lingan '],
    [/≈|~/g, ' taxminan '],
    [/\s=\s/g, ' teng '],
    [/\s\+\s/g, ' plyus '],
    [/^\+$|(?<=[\s;:])\+(?=[\s;.])/g, 'plyus'],
    [/(?<=[\s;:])−(?=[\s;.])/g, 'minus'],
    [/−/g, 'minus '],
    [/[→←]/g, ', '],
    [/·/g, ' '],
    [/²/g, ' kvadrat'],
    [/³/g, ' kub'],
    [/√/g, ' ildiz '],
    [/(\d)\s?°C/g, '$1 gradus'],
    [/°/g, ' gradus'],
    [/%/g, ' foiz'],
    [/″/g, ' dyuym'],
    [/[«»"]/g, ''],
    [/\s—\s/g, ', '],
    [/—/g, ', '],
    [/…/g, '.'],
  ];

  function normalize(text) {
    let s = ' ' + String(text || '') + ' ';
    REPLACE.forEach(([re, to]) => { s = s.replace(re, to); });
    // O'zbek lotin yozuvi: oʻ, gʻ va tutuq belgisi
    s = s.replace(/([oOgG])'/g, '$1ʻ').replace(/'/g, '’');
    s = s.replace(/(\S+) \(\1\)/g, '$1');
    s = s.replace(/\s+([.,;:!?])/g, '$1').replace(/([.!?])\s*\./g, '$1').replace(/,\s*,/g, ',').replace(/\s+/g, ' ');
    return s.trim();
  }

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  // Ovozli o'qiladigan barcha matnlar ro'yxati
  function items(P, B, L) {
    const list = [];
    P.TOUR.forEach((s, i) => list.push({ id: 'sayohat-' + (i + 1), title: s.title, raw: s.title + '. ' + htmlToText(s.text) }));
    P.PARTS.forEach((p) => list.push({
      id: 'qism-' + p.id, title: p.name,
      raw: [p.name + '.', p.short, 'Vazifasi.', p.what, 'Qanday ishlaydi.', p.how,
        "Asosiy ko'rsatkichlar.", ...p.specs.map(([k, v]) => k + ': ' + v + '.'),
        'Ishdan chiqsa.', p.fail, 'Maslahat.', p.tip].join(' '),
    }));
    Object.entries(P.MANEUVERS).forEach(([k, m]) => list.push({ id: 'harakat-' + k, title: m.name, raw: m.name + '. ' + m.text }));
    B.CHAPTERS.forEach((c, i) => list.push({
      id: 'bob-' + c.id, title: c.title,
      raw: `${i + 1}-bob. ${c.title}. ${htmlToText(c.html)} Esda tuting. ${c.summary.join(' ')}`,
    }));
    if (L) Object.entries(L.PRESETS).forEach(([k, pr]) => list.push({ id: 'lab-' + k, title: pr.name, raw: pr.name + '. ' + pr.text }));
    return list.map((it) => {
      const text = normalize(it.raw);
      return { id: it.id, title: it.title, text, hash: hash(text) };
    });
  }

  // ---------- Pleyer (faqat brauzerda) ----------

  function splitSentences(text, max) {
    const out = [];
    const parts = text.match(/[^.!?]+[.!?]*/g) || [text];
    let cur = '';
    parts.forEach((p) => {
      if ((cur + p).length > max && cur) { out.push(cur.trim()); cur = ''; }
      cur += p;
    });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  class Player {
    constructor(base) {
      this.base = base || 'audio/';
      this.manifest = {};
      this.voice = null;
      this.item = null;
      this.playing = false;
      this.rate = 1;
      this.listeners = [];
      this.onEnd = null;
      this.audio = typeof Audio !== 'undefined' ? new Audio() : null;
      this.tts = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
      this.queue = [];
      this.qIndex = 0;
      this.token = 0; // eski gaplarning kechikkan hodisalarini e'tiborsiz qoldirish uchun
      this.mode = null;
      if (this.audio) {
        this.audio.preload = 'auto';
        this.audio.addEventListener('timeupdate', () => this.emit());
        this.audio.addEventListener('ended', () => this.finish());
        this.audio.addEventListener('error', () => {
          // Fayl yuklanmadi — qurilma ovoziga o'tamiz
          if (this.mode === 'file' && this.item) this.startTts(this.item);
        });
      }
    }

    async load() {
      try {
        const r = await fetch(this.base + 'manifest.json', { cache: 'no-cache' });
        if (r.ok) this.manifest = await r.json();
      } catch (e) { /* fayllar yo'q — qurilma ovozi ishlatiladi */ }
      this.findVoice();
      if (this.tts && 'onvoiceschanged' in this.tts) {
        this.tts.addEventListener('voiceschanged', () => { this.findVoice(); this.emit(); });
      }
      this.emit();
    }

    findVoice() {
      if (!this.tts) return;
      const voices = this.tts.getVoices() || [];
      const uz = voices.filter((v) => /^uz/i.test(v.lang) || /uzbek|o'zbek|oʻzbek/i.test(v.name));
      // Tabiiy (neyron) ovozlarni afzal ko'ramiz
      uz.sort((a, b) => /natural|neural/i.test(b.name) - /natural|neural/i.test(a.name));
      this.voice = uz[0] || null;
    }

    get filesCount() {
      return Object.keys(this.manifest).length;
    }

    source(item) {
      const m = this.manifest[item.id];
      if (m && m.hash === item.hash) return 'file';
      if (this.voice) return 'tts';
      if (m) return 'file'; // matn biroz o'zgargan bo'lsa ham eski yozuv bor
      return null;
    }

    status() {
      if (this.filesCount) return { kind: 'file', text: `Ovoz: ${this.manifest._voice || 'Madina'} (yozib olingan, internetsiz ham ishlaydi)` };
      if (this.voice) return { kind: 'tts', text: `Ovoz: qurilmangizdagi «${this.voice.name}»` };
      return { kind: 'none', text: "O'zbekcha ovoz hali tayyor emas. Microsoft Edge brauzerida ochsangiz, undagi bepul o'zbekcha ovoz (Madina yoki Sardor) ishlaydi." };
    }

    on(fn) {
      this.listeners.push(fn);
    }

    emit() {
      const st = this.state();
      this.listeners.forEach((fn) => fn(st));
    }

    state() {
      let progress = 0;
      if (this.mode === 'file' && this.audio && this.audio.duration) progress = this.audio.currentTime / this.audio.duration;
      if (this.mode === 'tts' && this.queue.length) progress = this.qIndex / this.queue.length;
      return { item: this.item, playing: this.playing, progress, mode: this.mode, rate: this.rate };
    }

    play(item, onEnd) {
      this.stop(true);
      this.item = item;
      this.onEnd = onEnd || null;
      const src = this.source(item);
      if (src === 'file') {
        this.mode = 'file';
        this.audio.src = this.base + item.id + '.mp3?v=' + (this.manifest[item.id].hash || '');
        this.audio.playbackRate = this.rate;
        this.playing = true;
        const p = this.audio.play();
        if (p && p.catch) p.catch(() => { this.playing = false; this.emit(); });
      } else if (src === 'tts') {
        this.startTts(item);
      } else {
        this.mode = null;
        this.playing = false;
      }
      this.emit();
      return src;
    }

    startTts(item) {
      if (!this.voice) { this.playing = false; this.mode = null; this.emit(); return; }
      this.mode = 'tts';
      this.token++;
      this.tts.cancel();
      this.queue = splitSentences(item.text, 180);
      this.qIndex = 0;
      this.playing = true;
      this.speakNext();
    }

    speakNext() {
      if (this.qIndex >= this.queue.length) { this.finish(); return; }
      const u = new SpeechSynthesisUtterance(this.queue[this.qIndex]);
      u.voice = this.voice;
      u.lang = this.voice.lang;
      u.rate = this.rate;
      const tok = this.token;
      u.onend = () => {
        if (tok !== this.token || !this.playing || this.mode !== 'tts') return;
        this.qIndex++;
        this.emit();
        this.speakNext();
      };
      this.tts.speak(u);
    }

    toggle() {
      if (!this.item) return;
      if (this.mode === 'file') {
        if (this.audio.paused) { this.audio.play(); this.playing = true; } else { this.audio.pause(); this.playing = false; }
      } else if (this.mode === 'tts') {
        if (this.playing) { this.tts.pause(); this.playing = false; } else { this.tts.resume(); this.playing = true; }
      }
      this.emit();
    }

    setRate(r) {
      this.rate = r;
      if (this.audio) this.audio.playbackRate = r;
      if (this.mode === 'tts' && this.playing) {
        // Joriy gap yangi tezlikda qaytadan o'qiladi
        this.token++;
        this.tts.cancel();
        this.speakNext();
      }
      this.emit();
    }

    finish() {
      this.playing = false;
      const cb = this.onEnd;
      this.onEnd = null;
      this.emit();
      if (cb) cb();
    }

    stop(silent) {
      this.playing = false;
      this.onEnd = null;
      if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); }
      this.token++;
      if (this.tts) this.tts.cancel();
      this.mode = null;
      if (!silent) { this.item = null; this.emit(); }
    }
  }

  return { htmlToText, normalize, hash, items, splitSentences, Player };
});
