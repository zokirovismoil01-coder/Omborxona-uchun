#!/usr/bin/env node
// StockTill ekranlarini video uchun suratga olish.
//
//   node capture.js /yo'l/stocktill.html [chiqish-papkasi]
//
// Ilova (artifact HTML) repozitoriyga qo'shilmaydi: yo'li argument sifatida beriladi.
// Ilova bulut rejimida ochiladi (vendor/ ichidagi soxta Firebase, hammasi brauzer xotirasida),
// namunaviy ma'lumotlar seed.js dan olinadi, soat 2026-10-02 17:40 (Toshkent) ga qotiriladi.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const { build } = require('./seed.js');

function loadPlaywright() {
  try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
}

const APP = process.argv[2];
const OUT = path.resolve(process.argv[3] || path.join(__dirname, '..', 'shots'));
if (!APP || !fs.existsSync(APP)) { console.error('StockTill HTML fayli topilmadi:', APP); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Video sahnalarida ajratib ko'rsatiladigan elementlar (ekran koordinatalari rects.json ga yoziladi)
const RECT_SELECTORS = {
  lock: ['.lockbox', '.lk-logo', '#lk_pin', '#lk_ok', '#lk_who'],
  dash_top: ['.kpi', '.card.fc', '#drange'],
  dash_forecast: ['.card.fc', '.card.fc .rows', '.card.fc .rowg:not(.head)', '#fc_f', '#fc_print'],
  dash_bottom: ['.two > .card', '.bars', '.badge.low', '.badge.out', '.two .list .li'],
  pos_list: ['#sale_dl', '#sale_dlh', '#poscat .catrow', '#poscat .catrow.has', '.dptag', '#payBtn', '.pos-side', '#posmode'],
  pos_cart: ['#cart', '#cart .cline', '#extrasRows', '#extrasRows .exrow', '.grand', '#payBtn', '.carthd'],
  pos_pay: ['.mpanel', '.paytotal', '#pay_dealer', '#pay_who', '#pay_note', '#confirm'],
  pos_receipt: ['.mpanel', '.receipt', '#r_print', '#r_done'],
  ret_top: ['#rt_dealer', '#rt_who', '#rt_type', '#rtcat .catrow.has', '#rtcat .catcols'],
  ret_lists: ['.rtsec[data-sec="return"]', '.rtsec[data-sec="expired"]', '.rtsec .rthead', '.rtsec .cline'],
  ret_total: ['#rt_total', '#rt_extras', '#rt_extras .exrow', '#rt_submit', '.rtsec[data-sec="expired"]'],
  ret_confirm: ['.mpanel'],
  ret_receipt: ['.mpanel', '.receipt'],
  inv_levels: ['#llist .rowg', '#lf', '#isub'],
  inv_quick: ['.mpanel', '#q_m'],
  inv_batch: ['#bmode', '#bwho', '#bnote', '#bcat .catrow.has', '#isub', '#bhelp'],
  inv_batch_lines: ['#blines .cline', '#bsubmit'],
  inv_reorder: ['#rlist .rowg'],
  inv_history: ['#hlist .rowg', '#htools'],
  prod_list: ['#plist .rowg', '#pdl'],
  prod_dealer: ['#pdl', '#pdl button.on', '#plist .rowg', '.dpin.set', '#pdl_help'],
  sales_7: ['.kpi', '.two .card', '#srange'],
  sales_receipts: ['#rlist2 .rowg', '.tag'],
  deal_list: ['#dlist .rowg', '#dadd'],
  deal_report: ['#rp_body .rowg', '#rp_share', '#rp_print', '#rp_range'],
  deal_detail: ['.kpi', '#rp_share', '#rp_body h2'],
  set_devices: ['#s_devs .devrow', '.devsum', '#s_devs .pill', '#s_devs .btn'],
  set_cloud: ['#fb_status', '#fb_connect'],
  audit_edit: ['.mpanel', '.auitem', '.auchg'],
  audit_delete: ['.mpanel', '.auitem', '.aunote'],
  pc_dash: ['.kpi', '.card.fc', '#nav'],
};
const RECTS = {};
const FIXED = new Date('2026-10-02T12:40:00.000Z'); // 17:40 Toshkent

function serve(root) {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  const srv = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve(srv)));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stocktill-'));
  fs.copyFileSync(APP, path.join(root, 'index.html'));
  fs.mkdirSync(path.join(root, 'vendor'));
  for (const f of ['fb-app.js', 'fb-fs.js']) fs.copyFileSync(path.join(__dirname, 'vendor', f), path.join(root, 'vendor', f));
  const srv = await serve(root);
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  const data = build();
  const { chromium } = loadPlaywright();
  // To'liq Chromium va ru_RU tili: sana maydonlari telefondagidek 02.10.2026 ko'rinishida chiqadi
  const browser = await chromium.launch({
    channel: 'chromium', args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none', '--lang=ru-RU'],
    env: { ...process.env, LANG: 'ru_RU.UTF-8', LANGUAGE: 'ru:en', LC_ALL: 'ru_RU.UTF-8' },
  });

  async function open(opts) {
    const ctx = await browser.newContext({
      viewport: opts.viewport, deviceScaleFactor: opts.dpr, isMobile: !!opts.mobile, hasTouch: !!opts.mobile,
      colorScheme: 'dark', timezoneId: 'Asia/Tashkent', locale: 'ru-RU', userAgent: opts.ua, acceptDownloads: true,
    });
    await ctx.addInitScript(({ ls, fsd, devname }) => {
      if (localStorage.getItem('__seeded') === '1') return;
      for (const k in ls) localStorage.setItem(k, JSON.stringify(ls[k]));
      if (devname) localStorage.setItem('st_devname', JSON.stringify(devname));
      localStorage.setItem('fakefs', JSON.stringify(fsd));
      localStorage.setItem('__seeded', '1');
    }, { ls: data.ls, fsd: data.fs, devname: opts.devname || '' });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(FIXED);
    await page.goto(url);
    await page.waitForSelector('#lk_pin');
    return { ctx, page };
  }
  const clean = (page) => page.evaluate(() => { const t = document.getElementById('toast'); if (t) t.innerHTML = ''; });
  const shot = async (page, name, opts = {}) => {
    await sleep(opts.wait || 450);
    if (!opts.keepToast) await clean(page);
    await page.mouse.move(4, 4); // kursor hech qaysi tugma ustida qolmasin (hover)
    await sleep(60);
    const file = path.join(OUT, name + '.png');
    await page.screenshot({ path: file, fullPage: false });
    if (RECT_SELECTORS[name]) RECTS[name] = await page.evaluate((sels) => {
      const o = {};
      for (const s of sels) o[s] = [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })
        .filter((r) => r[2] > 0 && r[3] > 0 && r[1] < innerHeight && r[1] + r[3] > 0);
      return o;
    }, RECT_SELECTORS[name]);
    console.log('  ✓', name);
  };
  const scrollMain = (page, sel, off = 0) => page.evaluate(({ sel, off }) => {
    const m = document.getElementById('main'), el = sel ? document.querySelector(sel) : null;
    if (!m) return;
    m.scrollTop = el ? el.getBoundingClientRect().top - m.getBoundingClientRect().top + m.scrollTop - off : off;
  }, { sel, off });
  const nav = async (page, id) => { await page.click(`#nav button[data-t="${id}"]`); await sleep(500); };
  const setQty = async (page, scope, name, k, v) => {
    const row = page.locator(`${scope} .catrow`, { has: page.locator('.cn b', { hasText: name }) }).first();
    const inp = row.locator(`.cq[data-k="${k}"]`);
    await inp.scrollIntoViewIfNeeded();
    await inp.fill(String(v));
    await inp.evaluate((e) => e.blur());
    await sleep(80);
  };
  const choose = (page, sel, value) => page.selectOption(sel, value);

  // ================= Telefon (412×915, 3x) =================
  console.log('Telefon ekranlari…');
  const phone = await open({ viewport: { width: 412, height: 915 }, dpr: 3, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 StockTillAndroid/1.9.1' });
  const p = phone.page;
  await p.type('#lk_pin', '1234', { delay: 40 });
  await p.waitForSelector('#nav button');
  await sleep(1500);
  // Qulf ekrani ilova yuklangandan keyin (do'kon nomi bilan): "Hozir qulflash" tugmasi
  await p.click('#lockBtn');
  await p.waitForSelector('#lk_pin');
  await p.type('#lk_pin', '12', { delay: 60 });
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await shot(p, 'lock');
  await p.focus('#lk_pin');
  await p.type('#lk_pin', '34', { delay: 60 });
  await p.waitForSelector('#lockscreen', { state: 'detached' });
  await sleep(600);

  // Bosh sahifa
  await shot(p, 'dash_top', { wait: 900 });
  await scrollMain(p, '.card.fc', 8);
  await shot(p, 'dash_forecast');
  await scrollMain(p, '.two', 8);
  await shot(p, 'dash_bottom');

  // Kassa: sotuv
  await nav(p, 'pos');
  await choose(p, '#sale_dl', 'dl01');
  await sleep(300);
  await setQty(p, '#poscat', 'Qatiq 1 l', 'q', 36);
  await setQty(p, '#poscat', 'Qatiq 6 kg paqir', 'q', 3);
  await setQty(p, '#poscat', 'Smetana 20% 400 g', 'q', 12);
  await setQty(p, '#poscat', 'Sut 3,2% 1 l', 'q', 48);
  await setQty(p, '#poscat', 'Yogurt mevali 125 g', 'q', 24);
  await p.evaluate(() => {
    const b = document.querySelector('#poscat .catbody'); if (!b) return;
    const r = [...b.querySelectorAll('.catrow')].find((x) => x.querySelector('.cn b').textContent === 'Qatiq 0,5 l');
    b.scrollTop = r ? r.offsetTop - b.offsetTop : 0;
  });
  await scrollMain(p, null, 0);
  await shot(p, 'pos_list');
  await p.evaluate(() => { const d = document.getElementById('opt'); if (d) d.open = true; });
  await p.fill('[data-exq="1"]', '6');
  await p.evaluate(() => document.querySelector('[data-exq="1"]').dispatchEvent(new Event('input', { bubbles: true })));
  await scrollMain(p, '.carthd', 6);
  await shot(p, 'pos_cart');
  await p.click('#payBtn');
  await sleep(400);
  await choose(p, '#pay_who [data-who]', 'pp01');
  await p.fill('#pay_note', 'Mashina 01 A 777 AA');
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await shot(p, 'pos_pay');
  await p.click('#confirm');
  await sleep(600);
  await shot(p, 'pos_receipt');
  await p.click('#r_done');
  await sleep(300);

  // Kassa: qaytarish / muddati o'tgan
  await p.click('#posmode button[data-m="ret"]');
  await sleep(400);
  await choose(p, '#rt_dealer', 'dl05');
  await sleep(200);
  await choose(p, '#rt_who [data-who]', 'pp02');
  await setQty(p, '#rtcat', 'Qatiq 0,5 l', 'return', 8);
  await setQty(p, '#rtcat', 'Yogurt mevali 125 g', 'return', 10);
  await setQty(p, '#rtcat', 'Smetana 20% 400 g', 'expired', 3);
  await setQty(p, '#rtcat', 'Kefir 1 l', 'expired', 2);
  await p.evaluate(() => { const b = document.querySelector('#rtcat .catbody'); if (b) b.scrollTop = 0; });
  await scrollMain(p, null, 0);
  await shot(p, 'ret_top');
  await p.fill('#rt_extras [data-exq="1"]', '4');
  await p.evaluate(() => document.querySelector('#rt_extras [data-exq="1"]').dispatchEvent(new Event('input', { bubbles: true })));
  await scrollMain(p, '.rtsec[data-sec="return"]', 6);
  await shot(p, 'ret_lists');
  await scrollMain(p, '#rt_total', 120);
  await shot(p, 'ret_total');
  await p.click('#rt_submit');
  await sleep(400);
  await shot(p, 'ret_confirm');
  await p.click('#c_ok');
  await sleep(700);
  await shot(p, 'ret_receipt');
  await p.click('#r_done');
  await p.click('#posmode button[data-m="sale"]');
  await sleep(300);

  // Ombor
  await nav(p, 'inv');
  await p.click('#isub button[data-s="levels"]');
  await sleep(300);
  await p.click('#isort');
  await sleep(250);
  await p.click('.sortmenu [data-s="urgent"]');
  await shot(p, 'inv_levels');
  await p.click('#llist [data-pid]');
  await sleep(350);
  await shot(p, 'inv_quick');
  await p.keyboard.press('Escape');
  await p.click('#isub button[data-s="batch"]');
  await sleep(400);
  await choose(p, '#bwho [data-who]', 'pp01');
  await p.fill('#bnote', 'Zavoddan · 01 B 345 CA');
  await setQty(p, '#bcat', 'Kefir 1 l', 'q', 110);
  await setQty(p, '#bcat', 'Kurt 100 g', 'q', 40);
  await setQty(p, '#bcat', 'Qaymoq 200 g', 'q', 45);
  await setQty(p, '#bcat', 'Pishloq Gollandskiy', 'q', 12);
  await p.evaluate(() => { const b = document.querySelector('#bcat .catbody'); if (b) b.scrollTop = 0; });
  await scrollMain(p, null, 0);
  await shot(p, 'inv_batch');
  await scrollMain(p, '#blines', 10);
  await shot(p, 'inv_batch_lines');
  await p.click('#bclear');
  await p.click('#isub button[data-s="reorder"]');
  await shot(p, 'inv_reorder');
  await p.click('#isub button[data-s="history"]');
  await shot(p, 'inv_history');

  // Mahsulotlar va diler narxlari
  await nav(p, 'prod');
  await shot(p, 'prod_list');
  await p.click('#pdl button[data-d="dl01"]');
  await shot(p, 'prod_dealer');

  // Savdo
  await nav(p, 'sales');
  await p.click('#srange button[data-r="7"]');
  await sleep(700);
  await shot(p, 'sales_7');
  await scrollMain(p, '#rlist2', 50);
  await shot(p, 'sales_receipts');

  // Diler hisoboti
  await nav(p, 'deal');
  await p.click('#dsub button[data-s="list"]');
  await shot(p, 'deal_list');
  await p.click('#dsub button[data-s="report"]');
  await sleep(300);
  await p.click('#rp_range button[data-r="7"]');
  await sleep(800);
  await shot(p, 'deal_report');
  await p.click('#rp_body [data-dl="dl01"]');
  await sleep(500);
  await shot(p, 'deal_detail');
  try {
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 6000 }), p.click('#rp_share')]);
    await dl.saveAs(path.join(OUT, 'report_sheet.png'));
    console.log('  ✓ report_sheet (rasm)');
  } catch (e) { console.log('  ! hisobot rasmi olinmadi:', e.message); }
  await sleep(500);

  // Sozlamalar
  await nav(p, 'set');
  await sleep(600);
  await scrollMain(p, '#s_devs', 70);
  await shot(p, 'set_devices', { wait: 800 });
  await scrollMain(p, '#fb_status', 90);
  await shot(p, 'set_cloud');
  await scrollMain(p, '#s_aud_e', 140);
  await p.click('#s_aud_e');
  await sleep(400);
  await shot(p, 'audit_edit');
  await p.click('#au_tab button[data-a="delete"]');
  await shot(p, 'audit_delete');
  await p.click('#au_close');
  await nav(p, 'dash');
  await phone.ctx.close();

  // ================= Kompyuter (1440×900, 2x) =================
  console.log('Kompyuter ekranlari…');
  const pc = await open({ viewport: { width: 1440, height: 900 }, dpr: 2, devname: 'Ombor kompyuteri', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) StockTill/1.9.1 Chrome/141.0 Electron/38.0 Safari/537.36' });
  const d = pc.page;
  await d.type('#lk_pin', '1234', { delay: 40 });
  await d.waitForSelector('#nav button');
  await sleep(1500);
  await shot(d, 'pc_dash', { wait: 900 });
  await nav(d, 'sales');
  await d.click('#srange button[data-r="7"]');
  await sleep(700);
  await shot(d, 'pc_sales');
  await nav(d, 'deal');
  await d.click('#dsub button[data-s="report"]');
  await sleep(300);
  await d.click('#rp_range button[data-r="7"]');
  await sleep(800);
  await shot(d, 'pc_dealers');
  await nav(d, 'inv');
  await d.click('#isub button[data-s="levels"]');
  await shot(d, 'pc_inv');
  await pc.ctx.close();

  await browser.close();
  srv.close();
  // video.html file:// orqali ochiladi, shuning uchun koordinatalar JS fayl sifatida yoziladi
  fs.writeFileSync(path.join(OUT, 'rects.js'), '// capture.js yozgan: ekran elementlarining joylashuvi (412x915 CSS px)\nwindow.RECTS = ' + JSON.stringify(RECTS) + ';\n');
  fs.rmSync(root, { recursive: true, force: true });
  console.log('Tayyor:', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
