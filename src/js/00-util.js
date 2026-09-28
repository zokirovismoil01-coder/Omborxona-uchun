/* ============ Yordamchi funksiyalar ============ */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = v => {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  const n = parseInt(String(v == null ? '' : v).replace(/[^\d-]/g, ''), 10);
  return isFinite(n) ? n : 0;
};
const qnum = v => { const n = parseFloat(String(v == null ? '' : v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : 0; };
const r3 = x => Math.round((+x || 0) * 1000) / 1000;
const SOM = 'so‘m';
const fmt = n => {
  n = Math.round(Number(n) || 0);
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (n < 0 ? '−' : '') + s;
};
const som = n => fmt(n) + ' ' + SOM;
const sgn = n => (Math.round(n) > 0 ? '+' : '') + som(n);
const fq = q => { q = r3(q); return Number.isInteger(q) ? String(q) : String(q).replace('.', ','); };
const pad = n => String(n).padStart(2, '0');
const dkey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const mkey = day => String(day).slice(0, 7);
const today = () => dkey(Date.now());
const k2ts = k => { const [y, m, d] = String(k).split('-').map(Number); return new Date(y, m - 1, d, 12).getTime(); };
const addD = (k, n) => { const [y, m, d] = String(k).split('-').map(Number); return dkey(new Date(y, m - 1, d + n, 12).getTime()); };
const dayDiff = (a, b) => Math.round((k2ts(b) - k2ts(a)) / 86400000);
const hm = ts => { const d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const dmy = ts => { const d = new Date(ts); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); };
const dt = ts => dmy(ts) + ', ' + hm(ts);
const DAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const DAYS_S = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const longDay = k => { const d = new Date(k2ts(k)); return d.getDate() + '-' + MONTHS[d.getMonth()]; };
const clone = o => JSON.parse(JSON.stringify(o));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ALNUM = 'abcdefghijklmnopqrstuvwxyz0123456789';
const uid = (n = 14) => { const a = new Uint8Array(n); crypto.getRandomValues(a); let s = ''; for (const b of a) s += ALNUM[b % 36]; return s; };
const randHex = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); };
const hexToBytes = h => { const a = new Uint8Array(h.length / 2); for (let i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; };
const bytesToHex = b => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
const norm = s => String(s || '').toLowerCase().replace(/[‘’ʻʼ`´]/g, "'").replace(/\s+/g, ' ').trim();
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?';
const byteLen = s => new TextEncoder().encode(s).length;
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej({ code: 'unavailable', message: 'timeout' }), ms))]);

/* ---------- SHA-256 (sinxron; yozuvlar zanjiri uchun) ---------- */
const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
const SHA_W = new Uint32Array(64);
function sha256bytes(msg) {
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const l = msg.length, nb = ((l + 9 + 63) >> 6) << 6;
  const buf = new Uint8Array(nb); buf.set(msg); buf[l] = 0x80;
  const dv = new DataView(buf.buffer);
  const bits = l * 8;
  dv.setUint32(nb - 4, bits >>> 0); dv.setUint32(nb - 8, Math.floor(bits / 4294967296));
  const W = SHA_W;
  for (let off = 0; off < nb; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const x = W[i - 15], y = W[i - 2];
      const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
      const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K256[i] + W[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  const out = new Uint8Array(32), odv = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) odv.setUint32(i * 4, H[i]);
  return out;
}
const sha256hex = s => bytesToHex(sha256bytes(new TextEncoder().encode(String(s))));

/* Kanonik JSON: kalitlar tartiblangan, undefined tashlab ketiladi */
function canon(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return isFinite(v) ? JSON.stringify(v) : 'null';
  if (typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  const keys = Object.keys(v).filter(k => v[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}

/* ---------- PIN: PBKDF2-SHA256, har bir xodimga alohida tuz ---------- */
const PIN_ITER = 120000;
function hmacSha256(key, msg) {
  if (key.length > 64) key = sha256bytes(key);
  const k = new Uint8Array(64); k.set(key);
  const ip = new Uint8Array(64 + msg.length), op = new Uint8Array(64 + 32);
  for (let i = 0; i < 64; i++) { ip[i] = k[i] ^ 0x36; op[i] = k[i] ^ 0x5c; }
  ip.set(msg, 64);
  op.set(sha256bytes(ip), 64);
  return sha256bytes(op);
}
function pbkdf2js(pass, salt, iter) {
  const s1 = new Uint8Array(salt.length + 4); s1.set(salt); s1[salt.length + 3] = 1;
  let u = hmacSha256(pass, s1); const t = u.slice();
  for (let i = 1; i < iter; i++) { u = hmacSha256(pass, u); for (let j = 0; j < 32; j++) t[j] ^= u[j]; }
  return bytesToHex(t);
}
async function pinDerive(pin, saltHex, iter) {
  const enc = new TextEncoder(), salt = hexToBytes(saltHex);
  try {
    if (window.crypto && crypto.subtle) {
      const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
      const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
      return bytesToHex(new Uint8Array(bits));
    }
  } catch (e) { /* zaxira yo'l pastda */ }
  return pbkdf2js(enc.encode(pin), salt, iter);
}
async function makePin(pin) { const s = randHex(16); return { s, i: PIN_ITER, h: await pinDerive(String(pin), s, PIN_ITER) }; }
async function checkPin(pin, rec) {
  if (!rec || !rec.h || !rec.s) return false;
  return (await pinDerive(String(pin), rec.s, num(rec.i) || PIN_ITER)) === rec.h;
}

/* EAN-13 nazorat raqami */
function ean13(d12) { let s = 0; for (let i = 0; i < 12; i++) s += (+d12[i]) * (i % 2 ? 3 : 1); return d12 + ((10 - s % 10) % 10); }

/* CSV (Excel uchun ; ajratgich va BOM) */
const csvCell = v => {
  if (typeof v === 'number') return String(v);
  v = String(v == null ? '' : v);
  if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; /* Excel formulasi sifatida bajarilmasin */
  return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
};
const toCSV = rows => '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n');
