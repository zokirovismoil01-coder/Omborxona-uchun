// Kassa Nazorati: Android ilovasini (APK) yig'adi.
// Ishlatish: node android/build-apk.mjs
// Kerak: JDK 17+, curl. Vositalar Maven Central va platforma jar'idan avtomatik yuklanadi.
// Imzo kaliti: KASSA_KEYSTORE (PKCS12) va KASSA_KEYSTORE_PASS; bo'lmasa ~/.kassa-apk ichida yaratiladi.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const VERSION_NAME = '2.0.0';
const VERSION_CODE = '1';
const MIN_SDK = '24', TARGET_SDK = '33';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const AND = path.join(ROOT, 'android');
const OUT = path.join(AND, 'build');
const DIST = path.join(ROOT, 'dist');
const TOOLS = process.env.KASSA_TOOLS || path.join(os.homedir(), '.cache', 'kassa-apk');
const KEYDIR = path.join(os.homedir(), '.kassa-apk');

function run(cmd, args, opts = {}) {
  try { return execFileSync(cmd, args, Object.assign({ stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 }, opts)).toString(); }
  catch (e) {
    const err = String(e.stderr || '').split('\n').filter(l => !l.startsWith('Picked up JAVA_TOOL_OPTIONS')).join('\n');
    throw new Error(`${path.basename(cmd)} xato bilan tugadi:\n${err}\n${String(e.stdout || '')}`);
  }
}
const step = m => console.log('\n== ' + m);
/* zipalign -c o'rnida: siqilmagan har bir yozuvning ma'lumoti 4 baytga tekislanganmi.
   Android 11+ resources.arsc siqilgan yoki tekislanmagan bo'lsa ilovani o'rnatmaydi. */
function checkAlign(file) {
  const b = fs.readFileSync(file);
  let eocd = b.length - 22;
  while (eocd >= 0 && b.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error('ZIP oxiri topilmadi: ' + file);
  const count = b.readUInt16LE(eocd + 10), bad = [];
  let p = b.readUInt32LE(eocd + 16), stored = 0, arsc = false;
  for (let i = 0; i < count; i++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error('Markaziy katalog buzuq: ' + file);
    const method = b.readUInt16LE(p + 10), nl = b.readUInt16LE(p + 28), lho = b.readUInt32LE(p + 42);
    const name = b.toString('utf8', p + 46, p + 46 + nl);
    const data = lho + 30 + b.readUInt16LE(lho + 26) + b.readUInt16LE(lho + 28);
    if (method === 0) { stored++; if (data % 4) bad.push(`${name} (siljish ${data})`); }
    if (name === 'resources.arsc') { arsc = true; if (method !== 0) bad.push('resources.arsc siqilgan'); }
    p += 46 + nl + b.readUInt16LE(p + 30) + b.readUInt16LE(p + 32);
  }
  if (!arsc) bad.push('resources.arsc yo‘q');
  return { count, stored, bad };
}
function fetchTo(url, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 0) return file;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  for (let i = 1; i <= 5; i++) {
    try { run('curl', ['-sS', '-L', '--fail', '-m', '600', '-o', file + '.part', url]); fs.renameSync(file + '.part', file); return file; }
    catch (e) { if (i === 5) throw new Error('Yuklab bo‘lmadi: ' + url + '\n' + e.stderr); execFileSync('sleep', [String(i * 3)]); }
  }
}

/* ---------- 1. Vositalar ---------- */
step('Vositalar');
const MC = 'https://repo1.maven.org/maven2';
const apktoolJar = fetchTo(`${MC}/org/apktool/apktool-lib/3.0.3/apktool-lib-3.0.3.jar`, path.join(TOOLS, 'apktool-lib-3.0.3.jar'));
const dxJar = fetchTo(`${MC}/com/jakewharton/android/repackaged/dalvik-dx/16.0.1/dalvik-dx-16.0.1.jar`, path.join(TOOLS, 'dalvik-dx-16.0.1.jar'));
const apksigJar = fetchTo(`${MC}/com/android/tools/build/apksig/2.3.0/apksig-2.3.0.jar`, path.join(TOOLS, 'apksig-2.3.0.jar'));
const androidJar = fetchTo('https://raw.githubusercontent.com/Sable/android-platforms/master/android-33/android.jar', path.join(TOOLS, 'android-33.jar'));
const aapt2 = path.join(TOOLS, 'aapt2');
if (!fs.existsSync(aapt2)) {
  run('unzip', ['-o', '-q', '-j', apktoolJar, 'prebuilt/linux/aapt2', '-d', TOOLS]);
  fs.chmodSync(aapt2, 0o755);
}
console.log(String(spawnSync(aapt2, ['version']).stderr || '').trim() || 'aapt2 tayyor');

/* ---------- 2. Veb ilova ---------- */
step('Veb ilova');
console.log(run('node', [path.join(ROOT, 'build.mjs')]).trim());
fs.rmSync(OUT, { recursive: true, force: true });
const www = path.join(OUT, 'assets', 'www');
fs.mkdirSync(path.join(www, 'fonts'), { recursive: true });
/* shriftlar ilova ichiga joylanadi: internetsiz ham to'g'ri ko'rinsin */
const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Geologica:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Onest:wght@400;500;600;700&display=swap';
const cssFile = path.join(TOOLS, 'fonts.css');
if (!fs.existsSync(cssFile)) run('curl', ['-sS', '-L', '--fail', '-m', '60', '-A', 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36', '-o', cssFile, FONTS_URL]);
let fontCss = '';
const blocks = fs.readFileSync(cssFile, 'utf8').split('/* ').slice(1);
for (const b of blocks) {
  const subset = b.slice(0, b.indexOf(' */'));
  if (!['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'].includes(subset)) continue;
  const url = (b.match(/url\((https:[^)]+\.woff2)\)/) || [])[1];
  if (!url) continue;
  const name = crypto.createHash('sha1').update(url).digest('hex').slice(0, 12) + '.woff2';
  fetchTo(url, path.join(TOOLS, 'fonts', name));
  fs.copyFileSync(path.join(TOOLS, 'fonts', name), path.join(www, 'fonts', name));
  fontCss += b.slice(b.indexOf('@font-face')).replace(url, 'fonts/' + name);
}
const page = fs.readFileSync(path.join(ROOT, 'kassa-nazorati', 'index.html'), 'utf8').replace(/<link[^>]+fonts\.(googleapis|gstatic)\.com[^>]*>\n?/g, '');
/* Eski WebView (Chrome 58 dan past) asosiy kodni tushunmaydi: bo'sh ekran o'rniga tushunarli xabar.
   Bu qism ataylab ES5'da yozilgan. */
const OLD_WEBVIEW = `<style>.oldwv{position:fixed;top:0;right:0;bottom:0;left:0;z-index:9999;background:#EFF3F0;color:#10201A;padding:32px 22px;font:16px/1.5 sans-serif;overflow:auto}
.oldwv h2{font-size:21px;margin:0 0 12px}.oldwv button{margin-top:14px;padding:13px 18px;border:0;border-radius:10px;background:#073D30;color:#fff;font-size:16px}</style>
<script>(function () {
  var ok = true;
  try { new Function('return async function () { await 0; }'); } catch (e) { ok = false; }
  try { if (!window.crypto || !window.crypto.subtle || !String.prototype.padStart || !Object.entries) ok = false; } catch (e) { ok = false; }
  if (ok) return;
  window.__knOld = true;
  document.addEventListener('DOMContentLoaded', function () {
    var d = document.createElement('div');
    d.className = 'oldwv';
    d.innerHTML = '<h2>Telefondagi WebView eskirgan</h2><p>Kassa Nazorati ishlashi uchun Play Market’dan <b>Android System WebView</b> (yoki <b>Chrome</b>) ilovasini yangilang, keyin Kassa Nazorati’ni qayta oching.</p><button type="button">Play Market’da ochish</button>';
    d.querySelector('button').onclick = function () {
      var u = 'market://details?id=com.google.android.webview';
      try { if (window.KassaNative && window.KassaNative.openUrl) { window.KassaNative.openUrl(u); return; } } catch (e) { }
      location.href = u;
    };
    document.body.appendChild(d);
  });
})();</script>`;
const html = `<!doctype html>
<html lang="uz"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${OLD_WEBVIEW}
<style>${fontCss}</style>
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>
${page}
</body></html>
`;
fs.writeFileSync(path.join(www, 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(0) + ' KB, shriftlar: ' + fs.readdirSync(path.join(www, 'fonts')).length);

/* ---------- 3. Java -> DEX ---------- */
step('Java kodi');
const classes = path.join(OUT, 'classes');
fs.mkdirSync(classes, { recursive: true });
const javaSrc = [];
const walk = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.java')) javaSrc.push(p); } };
walk(path.join(AND, 'src'));
run('javac', ['-source', '8', '-target', '8', '-bootclasspath', androidJar, '-Xlint:-options', '-encoding', 'UTF-8', '-d', classes, ...javaSrc]);
run('java', ['-cp', dxJar, 'com.android.dx.command.Main', '--dex', '--min-sdk-version=' + MIN_SDK, '--output=' + path.join(OUT, 'classes.dex'), classes]);
console.log('classes.dex', fs.statSync(path.join(OUT, 'classes.dex')).size, 'bayt');

/* ---------- 4. Resurslar va manifest ---------- */
step('Resurslar (aapt2)');
run(aapt2, ['compile', '--dir', path.join(AND, 'res'), '-o', path.join(OUT, 'res.zip')]);
run(aapt2, ['link', '-o', path.join(OUT, 'base.apk'), '-I', androidJar, '--manifest', path.join(AND, 'AndroidManifest.xml'),
  '-A', path.join(OUT, 'assets'), '--min-sdk-version', MIN_SDK, '--target-sdk-version', TARGET_SDK,
  '--version-code', VERSION_CODE, '--version-name', VERSION_NAME, '--auto-add-overlay', path.join(OUT, 'res.zip')]);

/* ---------- 5. Imzo kaliti ---------- */
step('Imzo');
let ks = process.env.KASSA_KEYSTORE, pass = process.env.KASSA_KEYSTORE_PASS;
if (!ks) {
  ks = path.join(KEYDIR, 'kassa-nazorati-release.p12');
  const pf = path.join(KEYDIR, 'parol.txt');
  if (!fs.existsSync(ks)) {
    fs.mkdirSync(KEYDIR, { recursive: true, mode: 0o700 });
    pass = crypto.randomBytes(18).toString('base64url');
    run('keytool', ['-genkeypair', '-keystore', ks, '-storetype', 'PKCS12', '-storepass', pass, '-keypass', pass, '-alias', 'kassa',
      '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10950', '-dname', 'CN=Kassa Nazorati, O=Omborxona, C=UZ']);
    fs.writeFileSync(pf, pass + '\n', { mode: 0o600 });
    console.log('Yangi imzo kaliti yaratildi:', ks);
  }
  pass = fs.readFileSync(pf, 'utf8').trim();
}
const toolsCls = path.join(OUT, 'tools');
fs.mkdirSync(toolsCls, { recursive: true });
run('javac', ['-cp', apksigJar, '-encoding', 'UTF-8', '-d', toolsCls, path.join(AND, 'tools', 'Pack.java')]);
fs.mkdirSync(DIST, { recursive: true });
const apk = path.join(DIST, `KassaNazorati-${VERSION_NAME}.apk`);
/* apksig 2.3.0 imzolashda JDK'ning ichki X.509 sinflaridan foydalanadi */
const JDK_EXPORTS = ['sun.security.x509', 'sun.security.pkcs', 'sun.security.util'].map(p => `--add-exports=java.base/${p}=ALL-UNNAMED`);
console.log(run('java', [...JDK_EXPORTS, '-cp', apksigJar + path.delimiter + toolsCls, 'Pack', path.join(OUT, 'base.apk'), path.join(OUT, 'classes.dex'), ks, pass, 'kassa', apk]).trim());
const al = checkAlign(apk);
if (al.bad.length) throw new Error('Tekislanmagan yozuvlar:\n' + al.bad.join('\n'));
console.log(`tekislash: OK (${al.count} ta yozuv, ${al.stored} tasi siqilmagan, resources.arsc siqilmagan)`);
console.log(run(aapt2, ['dump', 'badging', apk]).split('\n').filter(l => /^(package|minSdkVersion|targetSdkVersion|application-label:|launchable-activity)/.test(l)).join('\n'));
console.log('\nTayyor:', apk, (fs.statSync(apk).size / 1024).toFixed(0) + ' KB');
console.log('SHA-256:', crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex'));
