// Kassa Nazorati: manba fayllarni bitta artifact sahifasiga yig'adi.
// Ishlatish: node build.mjs  ->  kassa-nazorati/index.html
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
const jsDir = path.join(root, 'src/js');
const js = fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).sort()
  .map(f => `/* ---- ${f} ---- */\n` + fs.readFileSync(path.join(jsDir, f), 'utf8')).join('\n');

const html = `<title>Kassa Nazorati 2</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geologica:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Onest:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
${css}
</style>
<div id="app"></div>
<div id="modal-root"></div>
<div id="toasts" aria-live="polite"></div>
<script>
(() => {
'use strict';
${js}
})();
</script>
`;
fs.mkdirSync(path.join(root, 'kassa-nazorati'), { recursive: true });
fs.writeFileSync(path.join(root, 'kassa-nazorati/index.html'), html);
console.log('kassa-nazorati/index.html', (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB');
