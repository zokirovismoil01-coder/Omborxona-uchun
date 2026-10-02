#!/usr/bin/env node
// Reklama videosini MP4 ga yig'ish.
//
//   node render.js                         → kundalik-promo.mp4 (1920x1080)
//   node render.js --format vertical       → kundalik-promo-vertical.mp4 (1080x1920, Reels/TikTok)
//   node render.js --stills 1.5,8.4,20.6   → tanlangan soniyalardagi kadrlar (PNG), tekshirish uchun
//   node render.js --page stocktill/video.html --format vertical   → boshqa video (o'z audio.js bilan)
//
// Kerak: Node.js 18+, ffmpeg, Playwright (Chromium bilan).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { writeWav } = require('./audio.js');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const root = execSync('npm root -g').toString().trim();
    return require(path.join(root, 'playwright'));
  }
}

function parseArgs() {
  const a = { format: 'landscape', workers: Math.max(1, Math.min(4, os.cpus().length - 1)), crf: 21 };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i].replace(/^--/, '');
    const v = argv[i + 1];
    if (k === 'format') a.format = v, i++;
    else if (k === 'out') a.out = v, i++;
    else if (k === 'stills') a.stills = v.split(',').map(Number), i++;
    else if (k === 'workers') a.workers = +v, i++;
    else if (k === 'crf') a.crf = +v, i++;
    else if (k === 'from') a.from = +v, i++;
    else if (k === 'to') a.to = +v, i++;
    else if (k === 'no-audio') a.noAudio = true;
    else if (k === 'page') a.page = v, i++;
  }
  // Sahifa va uning ovozi: sahifa yonidagi audio.js (synth yoki render funksiyasi)
  a.page = path.resolve(__dirname, a.page || 'video.html');
  a.audio = path.join(path.dirname(a.page), 'audio.js');
  a.base = path.dirname(a.page) === __dirname ? 'kundalik-promo' : path.basename(path.dirname(a.page)) + '-promo';
  a.out = a.out || path.join(path.dirname(a.page), a.base + (a.format === 'vertical' ? '-vertical' : '') + '.mp4');
  return a;
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'pipe'], ...opts });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${code}\n${err.slice(-3000)}`))));
    p.on('error', reject);
    if (opts.input !== undefined) p.stdin.end(opts.input);
  });
}

async function openPage(browser, page, format, mode) {
  const W = format === 'vertical' ? 1080 : 1920;
  const H = format === 'vertical' ? 1920 : 1080;
  const pg = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await pg.goto('file://' + page + `?format=${format}&${mode}`);
  await pg.waitForFunction(() => window.VIDEO && window.VIDEO.ready === true, null, { timeout: 60000 });
  const cdp = await pg.context().newCDPSession(pg);
  const shot = async () => {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
    return Buffer.from(data, 'base64');
  };
  return { page: pg, shot, W, H };
}

async function main() {
  const args = parseArgs();
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] });
  try {
    if (args.stills) {
      const { page, shot } = await openPage(browser, args.page, args.format, 'render');
      const dir = path.join(path.dirname(args.page), 'stills');
      fs.mkdirSync(dir, { recursive: true });
      for (const t of args.stills) {
        await page.evaluate((tt) => window.VIDEO.seek(tt), t);
        const file = path.join(dir, `${args.format}-${t.toFixed(2)}.png`);
        fs.writeFileSync(file, await shot());
        console.log(file);
      }
      return;
    }

    const probe = await openPage(browser, args.page, args.format, 'render');
    const meta = await probe.page.evaluate(() => ({ fps: VIDEO.FPS, duration: VIDEO.DURATION, cues: VIDEO.CUES }));
    await probe.page.close();
    const from = Math.round((args.from || 0) * meta.fps);
    const to = Math.round((args.to || meta.duration) * meta.fps);
    const total = to - from;
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'promo-'));
    const workers = Math.max(1, Math.min(args.workers, total));
    const chunk = Math.ceil(total / workers);
    console.log(`${args.format}: ${total} kadr, ${workers} ishchi`);
    const t0 = Date.now();
    let done = 0;

    // Har bir ishchi o'z bo'lagini yo'qotishsiz (lossless) oraliq faylga yozadi
    const segs = await Promise.all([...Array(workers).keys()].map(async (k) => {
      const a = from + k * chunk;
      const b = Math.min(to, a + chunk);
      const seg = path.join(tmp, `seg${k}.mkv`);
      if (a >= b) return null;
      const { page, shot } = await openPage(browser, args.page, args.format, 'render');
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(meta.fps), '-c:v', 'png', '-i', '-',
        '-c:v', 'libx264rgb', '-qp', '0', '-preset', 'ultrafast', seg], { stdio: ['pipe', 'ignore', 'inherit'] });
      const closed = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
      for (let f = a; f < b; f++) {
        await page.evaluate((tt) => window.VIDEO.seek(tt), f / meta.fps);
        const buf = await shot();
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
        done++;
        if (done % 60 === 0) {
          const el = (Date.now() - t0) / 1000;
          console.log(`  ${done}/${total} kadr (${el.toFixed(0)} s, ~${((total - done) * el / done).toFixed(0)} s qoldi)`);
        }
      }
      ff.stdin.end();
      await closed;
      await page.close();
      return seg;
    }));

    const list = path.join(tmp, 'list.txt');
    fs.writeFileSync(list, segs.filter(Boolean).map((s) => `file '${s}'`).join('\n'));
    const inputs = ['-f', 'concat', '-safe', '0', '-i', list];
    if (!args.noAudio) {
      const wav = path.join(tmp, 'audio.wav');
      const sr = 48000;
      const mod = require(args.audio), synth = mod.synth || mod.render;
      writeWav(wav, synth(meta.cues, meta.duration, sr), sr);
      const startSec = from / meta.fps;
      inputs.push('-ss', startSec.toFixed(3), '-t', (total / meta.fps).toFixed(3), '-i', wav);
    }
    await run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs,
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(args.crf), '-profile:v', 'high', '-g', String(meta.fps * 2),
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      ...(args.noAudio ? [] : ['-c:a', 'aac', '-b:a', '192k']),
      '-movflags', '+faststart', '-shortest', args.out]);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`Tayyor: ${args.out} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
