/* ============ Android ilovasi: chop etish, zaxira nusxa, "Orqaga" tugmasi ============ */
const ONLINE_URL = 'https://claude.ai/artifact/LKxLGRcbmwhYNs2KrGmduG';
const canPrint = () => hasNat('print');

/* Chop etish: alohida hujjat Android printeriga (Wi-Fi, Bluetooth yoki termoprinter xizmati) yuboriladi */
function printDoc(title, inner, kind) {
  const w = num(CFG().paper) === 58 ? 48 : 72;
  const css = kind === 'receipt'
    ? `@page{margin:3mm}body{margin:0;width:${w}mm;font:11.5px/1.4 "IBM Plex Mono",ui-monospace,monospace;color:#000;background:#fff}.c{text-align:center}.row{display:flex;justify-content:space-between;gap:6px}.row.big{font-size:14px;font-weight:700;margin:3px 0}hr{border:0;border-top:1px dashed #000;margin:6px 0}.it{margin-bottom:3px}.rf{font-size:10.5px}.small{font-size:9.5px;margin-top:3px}.stamp{margin:8px auto 0;border:2px solid #000;font-weight:700;text-align:center;padding:3px;width:80%}`
    : `@page{margin:12mm}body{margin:0;font:12px/1.45 system-ui,sans-serif;color:#000;background:#fff}h2{font-size:18px;margin:0 0 8px}h4{margin:14px 0 6px;font-size:13px}table{width:100%;border-collapse:collapse}th,td{padding:4px 6px;border-bottom:1px solid #999;text-align:left;font-size:11.5px}.r,.kv td:last-child{text-align:right}.kv td{padding:4px 0}.badge{font-weight:700}.note,.muted{color:#444}.tw{overflow:visible}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${inner}</body></html>`;
  if (!nat('print', html, title)) toast('Chop etishni boshlab bo‘lmadi', 'bad');
}

/* Zaxira nusxa: mahalliy bazadagi barcha hujjatlar bitta JSON faylda */
function backupData() {
  const docs = {};
  for (const [k, v] of S.db.m) docs[k] = v;
  return { app: 'kassa-nazorati', v: 2, at: Date.now(), shop: S.cfg ? S.cfg.main.shop.name : '', docs };
}
const restoreInput = () => `<input type="file" id="restoreFile" accept=".json,application/json" data-ch="restoreFile" hidden>`;
const DOC_PATH = /^[A-Za-z0-9_\-.~:@+]+(\/[A-Za-z0-9_\-.~:@+]+)*$/;
function restoreFromText(text) {
  let b = null;
  try { b = JSON.parse(text); } catch (e) { b = null; }
  if (!b || b.app !== 'kassa-nazorati' || !b.docs || typeof b.docs !== 'object') return toast('Bu Kassa Nazorati zaxira fayli emas', 'bad');
  const paths = Object.keys(b.docs).filter(p => DOC_PATH.test(p) && p.split('/').length % 2 === 0 && b.docs[p] && typeof b.docs[p] === 'object');
  if (!paths.some(p => p === 'cfg/main')) return toast('Zaxira faylida do‘kon sozlamalari yo‘q', 'bad');
  pushModal({ type: 'confirm', title: 'Zaxiradan tiklash', danger: true, ok: 'Tiklash',
    text: `${b.shop ? b.shop + ', ' : ''}${dt(num(b.at))} holatidagi zaxira. Shu qurilmadagi hozirgi ma’lumotlar o‘rniga ${paths.length} ta hujjat yoziladi. Keyin qurilmani qayta ulaysiz.`,
    onOk: () => {
      for (const p of [...S.db.m.keys()]) S.db._del(p);
      let bad = 0;
      for (const p of paths) { try { S.db._put(p, b.docs[p]); } catch (e) { bad++; } }
      resetLocalDevice();
      for (const k of ['cfgc', 'pinsc', 'maint']) LS.del(k);
      if (bad) toast(`${bad} ta hujjat tiklanmadi`, 'bad');
      setTimeout(() => location.reload(), bad ? 1500 : 50);
    } });
}

function vDbErr() {
  return msg('Telefon bazasini o‘qib bo‘lmadi', 'Ma’lumotlar o‘chirilmagan. Ilovani yopib, qayta oching. Muammo takrorlansa, telefonni qayta yoqing va xotirada joy borligini tekshiring.',
    `<button class="btn pri" data-a="reloadApp" style="margin-top:14px">Qayta urinish</button>`);
}

/* Android "Orqaga" tugmasi: avval oynalar yopiladi, keyin birinchi bo'limga qaytiladi */
window.__knBack = () => {
  try {
    if (S.passive) return false;
    const m = topModal();
    if (m) { if (!m.busy) popModal(); return true; }
    if (S.ui.more) { S.ui.more = false; render(); return true; }
    if (S.ui.cartOpen) { ACT.cartClose(); return true; }
    if (S.user && !S.readOnly && S.view) { const items = navItems(); if (items.length && S.view !== items[0][0]) { ACT.go({ v: items[0][0] }); return true; } }
    if (!S.user && S.ui.who) { ACT.whoBack(); return true; }
    if (!S.dev && S.ui.conn && S.ui.conn.who) { ACT.connBack(); return true; }
    if (S.ui.onb && (S.ui.onb.step === 'form' || S.ui.onb.step === 'demo')) { ACT.onbBack(); return true; }
  } catch (e) { }
  return false;
};

Object.assign(ACT, {
  printRec: d => { const r = model().receipts.get(d.id); if (r) printDoc('Chek ' + r.no, paperHTML(r), 'receipt'); },
  printZ: d => { const sh = (S.zc && S.zc.get(d.id)) || model().shifts.get(d.id); if (sh) printDoc('Smena hisoboti', `<h2>Smena hisoboti</h2>${zHTML(sh)}`, 'report'); },
  backupNow: async () => {
    if (!S.db || !S.db.m) return;
    if (pendingCount()) await pushNow();
    await saveFile({ filename: `kassa-zaxira-${today()}.json`, data: JSON.stringify(backupData()) });
    LS.set('lastBackup', Date.now());
  },
  restorePick: () => { const el = $('#restoreFile'); if (el) { el.value = ''; el.click(); } },
  openOnline: () => { if (!nat('openUrl', ONLINE_URL)) copyText(ONLINE_URL); },
  reloadApp: () => location.reload()
});
Object.assign(CH, {
  restoreFile: (v, el) => {
    const f = el.files && el.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => restoreFromText(String(rd.result || ''));
    rd.onerror = () => toast('Faylni o‘qib bo‘lmadi', 'bad');
    rd.readAsText(f);
  },
  cfgPaper: v => { S.ui.cfg.settings.paper = num(v); }
});
