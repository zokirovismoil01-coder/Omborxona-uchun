/* Sinov muhiti: sahifani skelet bilan xizmat qiladi, har bir "qurilma" alohida brauzer konteksti. */
const http = require('http');
const fs = require('fs');
const path = require('path');
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const { MockDB } = require('./mockdb.cjs');

const ROOT = path.join(__dirname, '..');
const RULES = [{ path: 'cfg', read: 'view', write: 'owner' }, { path: 'sec', read: 'interact', write: 'owner' }];
const SKELETON = body => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${body}</body></html>`;

async function startServer() {
  const page = fs.readFileSync(path.join(ROOT, 'kassa-nazorati/index.html'), 'utf8')
    .replace(/<link[^>]+fonts\.(googleapis|gstatic)[^>]*>/g, '');
  const html = SKELETON(page);
  const srv = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return { srv, url: `http://127.0.0.1:${srv.address().port}/` };
}

class Env {
  constructor() { this.db = new MockDB(RULES); this.n = 0; this.devices = []; this.errors = []; }
  async start() {
    this.server = await startServer();
    this.browser = await playwright.chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined });
  }
  async device(name, { level = 'owner', mock = true, viewport = { width: 1280, height: 860 }, ctxOpts = {}, init = [] } = {}) {
    const ctx = await this.browser.newContext(Object.assign({ viewport }, ctxOpts));
    for (const content of init) await ctx.addInitScript({ content });
    const id = name + '#' + (++this.n);
    const d = { name, id, ctx, level, page: null };
    if (mock) {
      this.db.client(id, level, (subId, payload) => {
        if (!d.page || d.page.isClosed()) return;
        d.page.evaluate(([i, p]) => window.__dbPush && window.__dbPush(i, p), [subId, payload]).catch(() => { });
      });
      await ctx.exposeBinding('__db', async (src, arg) => JSON.stringify(await this.db.op(id, JSON.parse(arg))));
      await ctx.exposeBinding('__dbSub', (src, arg) => { this.db.subscribe(id, JSON.parse(arg)); });
      await ctx.exposeBinding('__dbUnsub', (src, subId) => { this.db.unsubscribe(id, subId); });
      await ctx.addInitScript({ content: `window.__MOCK_LEVEL__=${JSON.stringify(level)};window.__KN_TEST__=1;` });
      await ctx.addInitScript({ path: path.join(__dirname, 'mock-claude.js') });
    } else {
      await ctx.addInitScript({ content: 'window.__KN_TEST__=1;' });
    }
    d.page = await ctx.newPage();
    d.page.on('pageerror', e => this.errors.push(`[${name}] pageerror: ${e.message}`));
    d.page.on('console', m => { if (m.type() === 'error') this.errors.push(`[${name}] console: ${m.text()}`); });
    await d.page.goto(this.server.url);
    this.devices.push(d);
    return d;
  }
  async reload(d) {
    for (const k of [...this.db.subs.keys()]) if (k.startsWith(d.id + ':')) this.db.subs.delete(k);
    await d.page.reload();
  }
  offline(d, v) { this.db.setOffline(d.id, v); return d.ctx.setOffline(v); }
  async stop() { for (const d of this.devices) await d.ctx.close().catch(() => { }); await this.browser.close(); this.server.srv.close(); }
}

/* sahifa yordamchilari */
const H = {
  st: (d, fn, arg) => d.page.evaluate(fn, arg),
  click: (d, sel) => d.page.click(sel),
  a: (d, action, extra = '') => d.page.click(`[data-a="${action}"]${extra}`),
  wait: (d, sel, opts) => d.page.waitForSelector(sel, Object.assign({ timeout: 15000 }, opts || {})),
  text: (d, sel) => d.page.textContent(sel),
  sleep: ms => new Promise(r => setTimeout(r, ms)),
  async until(fn, ms = 15000, step = 100) { const t = Date.now(); let last; while (Date.now() - t < ms) { try { last = await fn(); if (last) return last; } catch (e) { last = e; } await H.sleep(step); } throw new Error('until timeout; last=' + (last && last.message ? last.message : JSON.stringify(last))); },
  fill: (d, sel, v) => d.page.fill(sel, String(v)),
  type: (d, txt) => d.page.keyboard.type(String(txt), { delay: 15 })
};

let passed = 0, failed = 0;
const results = [];
function ok(cond, msg, extra) {
  if (cond) { passed++; results.push('  ✓ ' + msg); }
  else { failed++; results.push('  ✗ ' + msg + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
  console.log(results[results.length - 1]);
}
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), msg + ` (kutilgan ${JSON.stringify(b)}, chiqdi ${JSON.stringify(a)})`); }
const summary = () => ({ passed, failed });

module.exports = { Env, H, ok, eq, summary };
