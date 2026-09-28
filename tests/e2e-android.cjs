/* Android ilovasi (APK) sinovi: window.KassaNative ko'prigining soxta nusxasi bilan Chromium'da.
   Tekshiriladi: telefon bazasi (SQLite), ekran o'chmasligi, chop etish, fayl ulashish,
   zaxira nusxa va tiklash, "Orqaga" tugmasi, xotira to'lganda yozuvlar yo'qolmasligi. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Env, H, ok, eq, summary } = require('./harness.cjs');

const ONLINE_URL = 'https://claude.ai/artifact/LKxLGRcbmwhYNs2KrGmduG';
const PHONE = { width: 412, height: 915 };
const log = m => console.log(`\n[${new Date().toISOString().slice(11, 19)}] ${m}`);
const kn = (d, fn, arg) => d.page.evaluate(fn, arg);
const natLog = d => kn(d, () => window.__nat);
const sqlite = d => kn(d, () => JSON.parse(localStorage.getItem('__sqlite__') || '{}'));

/* MainActivity.Bridge o'rnida: metodlar sinxron, "SQLite" sahifa xotirasidagi alohida kalitda.
   Qaytariladigan qiymatlar Java'dagidek: dbPut/share/print/openUrl -> boolean, dbDel/keepScreenOn -> undefined. */
const BRIDGE = `(() => {
  const K = '__sqlite__';
  const load = () => { try { return JSON.parse(localStorage.getItem(K) || '{}'); } catch (e) { return {}; } };
  const save = m => localStorage.setItem(K, JSON.stringify(m));
  const n = window.__nat = { loads: 0, shares: [], prints: [], kso: [], urls: [] };
  window.KassaNative = {
    dbLoadAll: () => { n.loads++; return JSON.stringify(load()); },
    dbPut: (p, j) => { if (window.__natFull) return false; const m = load(); m[p] = j; save(m); return true; },
    dbDel: p => { const m = load(); delete m[p]; save(m); },
    share: (name, mime, data) => { n.shares.push({ name, mime, data }); return true; },
    print: (html, title) => { n.prints.push({ html, title }); return true; },
    keepScreenOn: on => { n.kso.push(on); },
    openUrl: u => { n.urls.push(u); return true; },
    appVersion: () => '2.0.0'
  };
})();`;

async function go(d, v) {
  const direct = `.bnav [data-a="go"][data-v="${v}"]`;
  if (await d.page.isVisible(direct)) return H.click(d, direct);
  await H.click(d, '.bnav [data-a="more"]');
  await H.click(d, `.more [data-a="go"][data-v="${v}"]`);
}
async function login(d, userId, pin) {
  await H.wait(d, `[data-a="who"][data-id="${userId}"]`);
  await H.click(d, `[data-a="who"][data-id="${userId}"]`);
  await H.type(d, pin);
  if (pin.length < 6) await d.page.keyboard.press('Enter');
  await H.wait(d, '.shell');
}
async function sell(d, pid) {
  await H.click(d, `.tile[data-id="${pid}"]`);
  await H.click(d, '#cartbar');
  await H.wait(d, '.cart.open');
  await H.click(d, '.cart.open [data-a="pay"]');
  await H.a(d, 'payOk');
  await H.wait(d, '#newRec');
}
const back = d => kn(d, () => window.__knBack());
const lastKso = async d => { const k = (await natLog(d)).kso; return k[k.length - 1]; };

/* APK ichidagi sahifaning o'zi (android/build/assets/www): shriftlar, internetsiz ishlash, eski WebView */
async function apkPage(env) {
  const www = path.join(__dirname, '..', 'android', 'build', 'assets', 'www');
  if (!fs.existsSync(path.join(www, 'index.html'))) { console.log('\n  (APK sahifasi hali yig‘ilmagan: node android/build-apk.mjs)'); return; }
  log('9. APK ichidagi sahifa: shriftlar va eski WebView');
  const TYPES = { '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2' };
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(www, u === '/' ? 'index.html' : u);
    if (!f.startsWith(www + path.sep) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  try {
    const ctx = await env.browser.newContext({ viewport: PHONE });
    await ctx.addInitScript({ content: BRIDGE });
    const page = await ctx.newPage();
    const errs = [], ext = [], fonts = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith('http://127.0.0.1')) ext.push(r.url()); });
    page.on('response', r => { if (r.url().endsWith('.woff2')) fonts.push(r.status()); });
    await page.goto(url);
    await page.waitForSelector('[data-a="onbReal"]', { timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() => [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replace(/"/g, '')))].sort());
    ok(fonts.length > 0 && fonts.every(st => st === 200) && loaded.includes('Onest') && loaded.includes('Geologica'), 'shriftlar ilova ichidan yuklandi', { fonts, loaded });
    eq(ext, [], 'internetga birorta so‘rov yuborilmadi');
    eq(errs, [], 'APK sahifasida xato yo‘q');
    ok(!(await page.isVisible('.oldwv')), 'yangi WebView’da ogohlantirish chiqmaydi');
    await ctx.close();
    const old = await env.browser.newContext({ viewport: PHONE });
    await old.addInitScript({ content: BRIDGE + ';delete String.prototype.padStart;' });
    const p2 = await old.newPage();
    await p2.goto(url);
    await p2.waitForSelector('.oldwv', { timeout: 10000 });
    await p2.click('.oldwv button');
    eq(await p2.evaluate(() => window.__nat.urls), ['market://details?id=com.google.android.webview'], 'eski WebView: yangilash uchun Play Market ochiladi');
    await old.close();
  } finally { srv.close(); }
}

async function main() {
  const env = new Env(); await env.start();
  try {
    log('1. Birinchi ishga tushirish: ma’lumotlar telefon bazasida');
    const ph = await env.device('telefon', { mock: false, init: [BRIDGE], viewport: PHONE });
    await H.wait(ph, '[data-a="onbReal"]', { timeout: 20000 });
    ok((await H.text(ph, '.infobox')).includes('telefon xotirasida'), 'birinchi oynada telefon xotirasi haqida yozuv');
    ok(await ph.page.isVisible('.choice [data-a="restorePick"]'), 'birinchi oynada "Zaxiradan tiklash" bor');
    eq(await kn(ph, () => [window.__kn.S.mode, window.__kn.S.db.nat]), ['local', true], 'mahalliy rejim, telefon bazasi ulangan');
    eq(await back(ph), false, '"Orqaga": birinchi oynada ilova yig‘iladi');
    await H.a(ph, 'onbReal');
    eq(await back(ph), true, '"Orqaga": sozlash formasidan tanlovga qaytadi');
    await H.wait(ph, '[data-a="onbReal"]'); await H.a(ph, 'onbReal');
    await H.fill(ph, '#o_shop', 'Baraka market'); await H.fill(ph, '#o_owner', 'Aziz'); await H.fill(ph, '#o_pin', '135790'); await H.fill(ph, '#o_pin2', '135790');
    await H.click(ph, '[data-a="onbType"][data-k="cashier"]');
    await H.a(ph, 'onbGo'); await H.wait(ph, '.shell');
    const ownerId = await kn(ph, () => window.__kn.S.cfg.staff[0].id);
    eq(await lastKso(ph), true, 'kassada xodim kirganda ekran o‘chmaydi');

    log('2. Savdo va chop etish');
    await H.fill(ph, '#ocash', '100000'); await H.a(ph, 'openShift'); await H.wait(ph, '.tile');
    await sell(ph, 'p01');
    ok(await ph.page.isVisible('.mf [data-a="printRec"]'), 'chek oynasida "Chop etish" tugmasi');
    await H.click(ph, '.mf [data-a="printRec"]');
    let pr = (await natLog(ph)).prints;
    const recNo = await kn(ph, () => [...window.__kn.model().receipts.values()][0].no);
    ok(pr.length === 1 && pr[0].title === 'Chek ' + recNo && pr[0].html.includes(recNo) && pr[0].html.includes('width:72mm') && pr[0].html.includes('Patir non'),
      'chek printerga yuborildi (80 mm qog‘oz)', pr.map(p => p.title));
    eq(await back(ph), true, '"Orqaga": ochiq oyna yopiladi');
    await ph.page.waitForSelector('.overlay', { state: 'detached' });
    ok(true, 'chek oynasi yopildi');
    await H.until(() => kn(ph, () => window.__kn.pendingCount() === 0));
    const db1 = await sqlite(ph);
    const dev = await kn(ph, () => window.__kn.S.dev.id);
    ok(['cfg/main', 'cfg/staff', 'sec/pins', 'dev/' + dev].every(k => db1[k]) && Object.keys(db1).some(k => k.startsWith('ev/' + dev + '~')),
      'sozlamalar, xodimlar, PIN va cheklar telefon bazasida', Object.keys(db1));
    eq(await kn(ph, () => Object.keys(localStorage).filter(k => k.startsWith('kn2.db:')).length), 0, 'brauzer xotirasiga hujjat yozilmadi');

    log('3. Sozlamalar: qog‘oz eni, onlayn versiya');
    await go(ph, 'settings');
    await H.wait(ph, '#cfg_paper');
    await ph.page.selectOption('#cfg_paper', '58');
    await H.a(ph, 'saveCfg');
    await H.until(async () => { const m = JSON.parse((await sqlite(ph))['cfg/main']); return m.settings.paper === 58; });
    ok(true, 'qog‘oz eni 58 mm saqlandi');
    await H.a(ph, 'openOnline');
    eq((await natLog(ph)).urls, [ONLINE_URL], 'onlayn versiya brauzerda ochiladi');
    eq(await back(ph), true, '"Orqaga": bo‘limdan kassaga qaytadi');
    eq(await kn(ph, () => window.__kn.S.view), 'pos', 'kassa ekrani ochildi');
    eq(await back(ph), false, '"Orqaga": kassa ekranida ilova yig‘iladi');
    await sell(ph, 'p02');
    await H.click(ph, '.mf [data-a="printRec"]');
    pr = (await natLog(ph)).prints;
    ok(pr.length === 2 && pr[1].html.includes('width:48mm'), 'ikkinchi chek 58 mm qog‘ozga', pr.length);
    await H.click(ph, '.mf [data-a="closeModal"]');

    log('4. Smenani yopish va Z hisobot');
    await H.click(ph, '[data-a="go"][data-v="close"]');
    await H.click(ph, '[data-a="cmode"][data-k="sum"]');
    await H.fill(ph, '#ctotal', '109000');
    await H.a(ph, 'closeShift');
    await H.wait(ph, '.zr');
    await H.click(ph, '.mf [data-a="printZ"]');
    pr = (await natLog(ph)).prints;
    ok(pr.length === 3 && pr[2].title === 'Smena hisoboti' && pr[2].html.replace(/\u00a0|&nbsp;/g, ' ').includes('109 000'), 'Z hisobot printerga yuborildi', pr.length);
    await H.click(ph, '.mf [data-a="closeModal"]');

    log('5. Fayllarni ulashish: CSV va zaxira nusxa');
    await go(ph, 'reports');
    await H.click(ph, '[data-a="rep"][data-k="days"]');
    await H.a(ph, 'csv');
    let sh = (await natLog(ph)).shares;
    ok(sh.length === 1 && sh[0].mime === 'text/csv' && /^kunlar_.*\.csv$/.test(sh[0].name) && sh[0].data.startsWith('﻿Sana;'), 'CSV hisobot ulashish oynasiga berildi', sh.map(s => s.name));
    await go(ph, 'settings');
    await H.a(ph, 'backupNow');
    await H.until(async () => (await natLog(ph)).shares.length === 2);
    sh = (await natLog(ph)).shares;
    const today = await kn(ph, () => window.__kn.S.ui.day);
    const backup = sh[1];
    const bj = JSON.parse(backup.data);
    ok(backup.name === `kassa-zaxira-${today}.json` && backup.mime === 'application/json', 'zaxira fayli nomi va turi', [backup.name, backup.mime]);
    const nDocs = Object.keys(await sqlite(ph)).length;
    ok(bj.app === 'kassa-nazorati' && bj.shop === 'Baraka market' && Object.keys(bj.docs).length === nDocs && bj.docs['cfg/main'].settings.paper === 58,
      'zaxirada telefon bazasidagi barcha hujjatlar', [Object.keys(bj.docs).length, nDocs]);

    log('6. Qulflash va qayta ochish');
    await kn(ph, () => document.querySelector('.top [data-a="lock"]').click());
    await H.wait(ph, '[data-a="who"]');
    eq(await lastKso(ph), false, 'qulflanganda ekran odatdagidek o‘chadi');
    await ph.page.reload();
    eq((await natLog(ph)).loads, 1, 'qayta ochilganda baza telefondan o‘qildi');
    await login(ph, ownerId, '135790');
    const n1 = await kn(ph, () => window.__kn.periodData(window.__kn.S.ui.day, window.__kn.S.ui.day, 'all').days.get(window.__kn.S.ui.day).n);
    eq(n1, 2, 'ikkala chek joyida');

    log('7. Xotira to‘lsa, chek yo‘qolmaydi');
    await H.fill(ph, '#ocash', '50000'); await H.a(ph, 'openShift'); await H.wait(ph, '.tile');
    await kn(ph, () => { window.__natFull = true; });
    await sell(ph, 'p03');
    await H.click(ph, '.mf [data-a="closeModal"]');
    await H.until(() => kn(ph, () => window.__kn.S.quota === true));
    ok((await H.text(ph, '#banners')).includes('Qurilma xotirasi to‘lgan'), 'xotira to‘lgani haqida ogohlantirish');
    ok(await kn(ph, () => window.__kn.pendingCount() > 0), 'yozuvlar navbatda saqlanib turibdi');
    await kn(ph, () => { window.__natFull = false; });
    await H.until(() => kn(ph, () => { window.__kn.S.quota && window.dispatchEvent(new Event('online')); return window.__kn.pendingCount() === 0; }), 90000, 500);
    ok(await kn(ph, () => !window.__kn.S.quota), 'joy bo‘shagach navbat bazaga yozildi');

    log('8. Yangi telefon: zaxiradan tiklash');
    const ph2 = await env.device('yangi-telefon', { mock: false, init: [BRIDGE], viewport: PHONE });
    await H.wait(ph2, '.choice [data-a="restorePick"]', { timeout: 20000 });
    let [fc] = await Promise.all([ph2.page.waitForEvent('filechooser'), H.click(ph2, '.choice [data-a="restorePick"]')]);
    await fc.setFiles({ name: 'boshqa.json', mimeType: 'application/json', buffer: Buffer.from('{"a":1}') });
    await H.until(async () => (await H.text(ph2, '#toasts')).includes('zaxira fayli emas'));
    ok(true, 'boshqa fayl rad etildi');
    [fc] = await Promise.all([ph2.page.waitForEvent('filechooser'), H.click(ph2, '.choice [data-a="restorePick"]')]);
    await fc.setFiles({ name: backup.name, mimeType: 'application/json', buffer: Buffer.from(backup.data) });
    await H.wait(ph2, '.modal [data-a="confirmOk"]');
    ok((await H.text(ph2, '.modal')).includes('Baraka market'), 'tiklashdan oldin tasdiqlash so‘raladi');
    await Promise.all([ph2.page.waitForNavigation(), H.a(ph2, 'confirmOk')]);
    await H.wait(ph2, `[data-a="connWho"][data-id="${ownerId}"]`, { timeout: 20000 });
    ok(true, 'tiklangandan keyin qurilmani ulash oynasi');
    eq(Object.keys(await sqlite(ph2)).length, Object.keys(bj.docs).length, 'barcha hujjatlar yangi telefon bazasida');
    await H.click(ph2, `[data-a="connWho"][data-id="${ownerId}"]`); await H.type(ph2, '135790');
    await login(ph2, ownerId, '135790');
    await H.until(() => kn(ph2, d => { const P = window.__kn.periodData(d, d, 'all'); return !P.loading && P.days.get(d) && P.days.get(d).n === 2; }, today));
    ok(true, 'yangi telefonda eski cheklar va hisobot');
    const paper = await kn(ph2, () => window.__kn.S.cfg.main.settings.paper);
    eq(paper, 58, 'sozlamalar ham tiklandi');
    await apkPage(env);

    log('10. Telefon bazasini o‘qib bo‘lmasa');
    const broken = await env.device('buzuq-baza', { mock: false, viewport: PHONE,
      init: [BRIDGE + ';window.KassaNative.dbLoadAll = () => { throw new Error("Java exception was raised during method invocation"); };'] });
    await H.wait(broken, '[data-a="reloadApp"]', { timeout: 20000 });
    ok((await H.text(broken, '#app')).includes('Telefon bazasini o‘qib bo‘lmadi') && !(await broken.page.isVisible('[data-a="onbReal"]')),
      'xato oynasi chiqadi, yangi sozlash taklif qilinmaydi');
    await H.sleep(1500);
    eq(await sqlite(broken), {}, 'telefon bazasiga hech narsa yozilmadi');
  } catch (e) {
    ok(false, 'kutilmagan xato: ' + (e && e.stack || e));
  } finally {
    if (env.errors.length) ok(false, 'sahifa xatolari', env.errors.slice(0, 10));
    await env.stop();
  }
  const s = summary();
  console.log(`\nNatija: ${s.passed} ta o‘tdi, ${s.failed} ta xato`);
  process.exit(s.failed ? 1 : 0);
}
main();
