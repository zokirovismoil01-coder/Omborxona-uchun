// Ovozli o'qiladigan barcha matnlarni tools/ovoz/matnlar.json ga yozadi.
// Ishlatish: node tools/ovoz/matn.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const P = require(path.join(root, 'dron/js/tuzilish-data.js'));
const B = require(path.join(root, 'dron/js/darslik.js'));
const L = require(path.join(root, 'dron/js/pidlab.js'));
const O = require(path.join(root, 'dron/js/ovoz.js'));

const items = O.items(P, B, L).map(({ id, title, hash, text }) => ({ id, title, hash, text }));
fs.writeFileSync(path.join(__dirname, 'matnlar.json'), JSON.stringify(items, null, 1));
const chars = items.reduce((s, it) => s + it.text.length, 0);
console.log(`${items.length} ta matn, ${chars} belgi`);
