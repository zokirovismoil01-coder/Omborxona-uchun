/*
 * Kichik XLSX (Excel) yozuvchi: tashqi kutubxonasiz, internetsiz ishlaydi.
 * Qiymatlar, uslublar (sarlavha, pul formati, JAMI qatori), ustun kengligi, muzlatilgan
 * sarlavha va chop etish sozlamalarini qo'llab-quvvatlaydi. Fayl ZIP (siqilmagan) ko'rinishida.
 * Brauzerda window.OylikXlsx, Node.js'da module.exports sifatida ishlaydi.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OylikXlsx = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- ZIP ----------

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  const utf8 = (s) => new TextEncoder().encode(s);

  /** files: [{ name, data: Uint8Array }] → ZIP (STORE usuli) */
  function zip(files) {
    const parts = [];
    const central = [];
    let offset = 0;
    // 1980-01-01 00:00 — ZIP sanasi (ahamiyatsiz, lekin barqaror)
    const DOS_TIME = 0;
    const DOS_DATE = (0 << 9) | (1 << 5) | 1;
    for (const f of files) {
      const name = utf8(f.name);
      const crc = crc32(f.data);
      const size = f.data.length;
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true); // UTF-8 nomlar
      local.setUint16(8, 0, true); // STORE
      local.setUint16(10, DOS_TIME, true);
      local.setUint16(12, DOS_DATE, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, size, true);
      local.setUint32(22, size, true);
      local.setUint16(26, name.length, true);
      local.setUint16(28, 0, true);
      parts.push(new Uint8Array(local.buffer), name, f.data);

      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true);
      cen.setUint16(4, 20, true);
      cen.setUint16(6, 20, true);
      cen.setUint16(8, 0x0800, true);
      cen.setUint16(10, 0, true);
      cen.setUint16(12, DOS_TIME, true);
      cen.setUint16(14, DOS_DATE, true);
      cen.setUint32(16, crc, true);
      cen.setUint32(20, size, true);
      cen.setUint32(24, size, true);
      cen.setUint16(28, name.length, true);
      cen.setUint32(42, offset, true);
      central.push(new Uint8Array(cen.buffer), name);
      offset += 30 + name.length + size;
    }
    const cenSize = central.reduce((a, p) => a + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, cenSize, true);
    end.setUint32(16, offset, true);
    const all = parts.concat(central, [new Uint8Array(end.buffer)]);
    const out = new Uint8Array(all.reduce((a, p) => a + p.length, 0));
    let pos = 0;
    for (const p of all) {
      out.set(p, pos);
      pos += p.length;
    }
    return out;
  }

  // ---------- Uslublar ----------

  const NAVY = 'FF1F4E78';
  const LIGHT = 'FFDDEBF7';
  const FONT = '<name val="Arial"/><family val="2"/>';
  const MONEY_FMT = '#,##0;[Red]\\-#,##0;"-"';

  // [nom, shrift, fon, chegara, format, tekislash]
  const FONTS = [
    `<font><sz val="10"/>${FONT}</font>`, // 0 oddiy
    `<font><b/><sz val="10"/>${FONT}</font>`, // 1 qalin
    `<font><b/><sz val="10"/><color rgb="FFFFFFFF"/>${FONT}</font>`, // 2 sarlavha
    `<font><b/><sz val="14"/><color rgb="${NAVY}"/>${FONT}</font>`, // 3 nom
    `<font><i/><sz val="9"/><color rgb="FF595959"/>${FONT}</font>`, // 4 izoh
    `<font><sz val="10"/><color rgb="FF9C0006"/>${FONT}</font>`, // 5 qizil
    `<font><sz val="10"/><color rgb="FF006100"/>${FONT}</font>`, // 6 yashil
  ];
  const FILLS = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
    `<fill><patternFill patternType="solid"><fgColor rgb="${NAVY}"/><bgColor indexed="64"/></patternFill></fill>`,
    `<fill><patternFill patternType="solid"><fgColor rgb="${LIGHT}"/><bgColor indexed="64"/></patternFill></fill>`,
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFFC7CE"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/><bgColor indexed="64"/></patternFill></fill>',
  ];
  const BORDERS = [
    '<border><left/><right/><top/><bottom/><diagonal/></border>',
    '<border><left/><right/><top style="thin"><color rgb="FF9BC2E6"/></top>' +
      '<bottom style="thin"><color rgb="FF9BC2E6"/></bottom><diagonal/></border>',
    '<border><left/><right/><top/><bottom style="hair"><color rgb="FFBFBFBF"/></bottom><diagonal/></border>',
  ];
  const NUMFMTS = { money: 164, date: 165, int: 166 };
  const NUMFMT_XML = [
    `<numFmt numFmtId="164" formatCode="${MONEY_FMT.replace(/"/g, '&quot;')}"/>`,
    '<numFmt numFmtId="165" formatCode="dd\\.mm\\.yyyy"/>',
    '<numFmt numFmtId="166" formatCode="0;[Red]\\-0;&quot;-&quot;"/>',
  ];

  // Uslub nomi → [shrift, fon, chegara, numFmtId, gorizontal tekislash, qatorga o'rash]
  const STYLE_DEFS = {
    text: [0, 0, 2, 0, null, false],
    title: [3, 0, 0, 0, null, false],
    note: [4, 0, 0, 0, null, false],
    header: [2, 2, 0, 0, 'center', true],
    section: [2, 2, 0, 0, null, false],
    money: [0, 0, 2, NUMFMTS.money, null, false],
    int: [0, 0, 2, NUMFMTS.int, 'center', false],
    center: [0, 0, 2, 0, 'center', false],
    date: [0, 0, 2, NUMFMTS.date, 'center', false],
    bold: [1, 0, 0, 0, null, false],
    boldMoney: [1, 0, 0, NUMFMTS.money, null, false],
    totalText: [1, 3, 1, 0, null, false],
    totalMoney: [1, 3, 1, NUMFMTS.money, null, false],
    totalInt: [1, 3, 1, NUMFMTS.int, 'center', false],
    bad: [5, 4, 2, 0, 'center', false],
    good: [6, 5, 2, 0, 'center', false],
    wrap: [0, 0, 2, 0, null, true],
  };
  const STYLE_NAMES = Object.keys(STYLE_DEFS);
  const STYLE_INDEX = Object.fromEntries(STYLE_NAMES.map((n, i) => [n, i + 1]));

  function stylesXml() {
    const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
    for (const n of STYLE_NAMES) {
      const [font, fill, border, fmt, align, wrap] = STYLE_DEFS[n];
      const a = '<alignment' + (align ? ` horizontal="${align}"` : '') + ' vertical="center"' +
        (wrap ? ' wrapText="1"' : '') + '/>';
      xfs.push(`<xf numFmtId="${fmt}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0"` +
        (fmt ? ' applyNumberFormat="1"' : '') + ' applyFont="1" applyFill="1" applyBorder="1"' +
        ` applyAlignment="1">${a}</xf>`);
    }
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      `<numFmts count="${NUMFMT_XML.length}">${NUMFMT_XML.join('')}</numFmts>` +
      `<fonts count="${FONTS.length}">${FONTS.join('')}</fonts>` +
      `<fills count="${FILLS.length}">${FILLS.join('')}</fills>` +
      `<borders count="${BORDERS.length}">${BORDERS.join('')}</borders>` +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '</styleSheet>';
  }

  // ---------- Varaq ----------

  function escXml(s) {
    return String(s)
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function colName(i) {
    let s = '';
    i += 1;
    while (i) {
      const r = (i - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  }

  /** "2026-10-05" → Excel sana raqami */
  function dateSerial(key) {
    const [y, m, d] = key.split('-').map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
  }

  function safeSheetName(name, used) {
    let base = String(name).replace(/[\\/?*[\]:]/g, ' ').replace(/^'+|'+$/g, '').trim() || 'Varaq';
    base = base.slice(0, 31);
    let n = base;
    for (let i = 2; used.has(n.toLowerCase()); i++) n = base.slice(0, 28) + ' ' + i;
    used.add(n.toLowerCase());
    return n;
  }

  class Sheet {
    constructor(name, opts) {
      this.name = name;
      this.rows = [];
      this.widths = (opts && opts.widths) || [];
      this.freezeRow = (opts && opts.freezeRow) || 0;
      this.freezeCol = (opts && opts.freezeCol) || 0;
      this.landscape = !!(opts && opts.landscape);
      this.printTitleRow = (opts && opts.printTitleRow) || 0;
    }

    /** Qator qo'shadi. cells: qiymat yoki { v, s } (s — uslub nomi). Qaytaradi: qator raqami. */
    addRow(cells, style) {
      this.rows.push({ cells: cells || [], style: style || null });
      return this.rows.length;
    }

    blank() {
      return this.addRow([]);
    }

    toXml() {
      const out = [];
      out.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">');
      out.push('<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
      out.push('<sheetViews><sheetView workbookViewId="0">');
      if (this.freezeRow || this.freezeCol) {
        const tl = colName(this.freezeCol) + (this.freezeRow + 1);
        const pane = this.freezeRow && this.freezeCol ? 'bottomRight'
          : this.freezeRow ? 'bottomLeft' : 'topRight';
        out.push('<pane' + (this.freezeCol ? ` xSplit="${this.freezeCol}"` : '') +
          (this.freezeRow ? ` ySplit="${this.freezeRow}"` : '') +
          ` topLeftCell="${tl}" activePane="${pane}" state="frozen"/>`);
      }
      out.push('</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>');
      if (this.widths.length) {
        out.push('<cols>');
        this.widths.forEach((w, i) => {
          if (w) out.push(`<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`);
        });
        out.push('</cols>');
      }
      out.push('<sheetData>');
      this.rows.forEach((row, ri) => {
        const r = ri + 1;
        const cells = [];
        row.cells.forEach((cell, ci) => {
          let v = cell;
          let s = row.style;
          if (cell !== null && typeof cell === 'object') {
            v = cell.v;
            s = cell.s || s;
          }
          if ((v === null || v === undefined || v === '') && !s) return;
          const ref = colName(ci) + r;
          const sAttr = s && STYLE_INDEX[s] ? ` s="${STYLE_INDEX[s]}"` : '';
          if (v === null || v === undefined || v === '') {
            if (sAttr) cells.push(`<c r="${ref}"${sAttr}/>`);
          } else if (typeof v === 'number' && Number.isFinite(v)) {
            cells.push(`<c r="${ref}"${sAttr}><v>${v}</v></c>`);
          } else {
            cells.push(`<c r="${ref}"${sAttr} t="inlineStr"><is><t xml:space="preserve">` +
              `${escXml(v)}</t></is></c>`);
          }
        });
        if (cells.length) out.push(`<row r="${r}">${cells.join('')}</row>`);
      });
      out.push('</sheetData>');
      out.push('<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>');
      out.push(`<pageSetup paperSize="9" orientation="${this.landscape ? 'landscape' : 'portrait'}"` +
        ' fitToWidth="1" fitToHeight="0"/>');
      out.push('</worksheet>');
      return out.join('');
    }
  }

  class Workbook {
    constructor() {
      this.sheets = [];
      this.used = new Set();
    }

    addSheet(name, opts) {
      const s = new Sheet(safeSheetName(name, this.used), opts);
      this.sheets.push(s);
      return s;
    }

    toBytes() {
      if (!this.sheets.length) this.addSheet('Varaq');
      const files = [];
      const add = (name, text) => files.push({ name, data: utf8(text) });
      const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
      add('[Content_Types].xml', head +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        this.sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ` +
          'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') +
        '</Types>');
      add('_rels/.rels', head +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>');
      const titles = [];
      this.sheets.forEach((s, i) => {
        if (s.printTitleRow) {
          titles.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">` +
            `'${escXml(s.name.replace(/'/g, "''"))}'!$${s.printTitleRow}:$${s.printTitleRow}</definedName>`);
        }
      });
      add('xl/workbook.xml', head +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<bookViews><workbookView activeTab="0"/></bookViews><sheets>' +
        this.sheets.map((s, i) => `<sheet name="${escXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
        '</sheets>' + (titles.length ? `<definedNames>${titles.join('')}</definedNames>` : '') +
        '</workbook>');
      add('xl/_rels/workbook.xml.rels', head +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        this.sheets.map((_, i) => `<Relationship Id="rId${i + 1}" ` +
          'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" ' +
          `Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
        `<Relationship Id="rId${this.sheets.length + 1}" ` +
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>');
      add('xl/styles.xml', stylesXml());
      this.sheets.forEach((s, i) => add(`xl/worksheets/sheet${i + 1}.xml`, s.toXml()));
      return zip(files);
    }
  }

  return { Workbook, zip, crc32, dateSerial, colName, MIME:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
});
