/* Word (.docx) to PDF — runs entirely in the browser.
 *
 * Pipeline
 *   1. docx-preview parses the file and renders each Word section as one long
 *      <section> (it does not paginate; it only splits at hard page breaks
 *      and section breaks).
 *   2. That output is placed in an isolated iframe, so the site stylesheet
 *      (which styles bare footer/table/h1/a/img/*) cannot touch the page.
 *   3. paginate() walks the body of every section and moves blocks onto real
 *      pages of the section's page height. Paragraphs taller than the space
 *      left are split by line; tables are split by row and the header row
 *      (w:tblHeader) is repeated. Headers/footers are cloned per page and
 *      PAGE / NUMPAGES fields are filled in.
 *   4. Each page is drawn with html2canvas and embedded in a pdf-lib PDF at
 *      the page's real size in points. An invisible text layer (one run per
 *      line box, measured from the DOM) makes the PDF searchable.
 */
(function () {
  'use strict';

  var PT_PER_PX = 0.75;                 // CSS: 1px = 0.75pt
  var MAX_PAGES = 400;                  // guard against runaway layouts
  var FONT_MAP = {                      // metric-compatible free fonts
    'calibri': 'Carlito', 'cambria': 'Caladea', 'arial': 'Arimo',
    'helvetica': 'Arimo', 'times new roman': 'Tinos', 'times': 'Tinos',
    'courier new': 'Cousine', 'courier': 'Cousine'
  };
  var PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792] };

  var state = { file: null, buf: null, pdfUrl: null, busy: false };
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- UI ---------- */

  function setStatus(msg) { $('w2pStatus').textContent = msg || ''; }
  function setProgress(frac) {
    var bar = $('w2pBar');
    if (frac == null) { bar.style.display = 'none'; return; }
    bar.style.display = 'block';
    bar.firstElementChild.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%';
  }
  function addNote(msg, warn) {
    var li = document.createElement('li');
    if (warn) li.className = 'warn';
    li.textContent = msg;
    $('w2pNotes').appendChild(li);
  }
  function clearOutput() {
    $('w2pNotes').innerHTML = '';
    $('result').innerHTML = '';
    $('w2pThumbs').innerHTML = '';
    if (state.pdfUrl) { URL.revokeObjectURL(state.pdfUrl); state.pdfUrl = null; }
  }
  function outName(name) {
    return (name || 'document').replace(/\.(docx|docm|dotx)$/i, '') + '.pdf';
  }

  function isZip(buf) {
    var b = new Uint8Array(buf, 0, 4);
    return b.length === 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
  }
  function isOle(buf) { // legacy .doc (Word 97-2003) compound file
    var b = new Uint8Array(buf, 0, 8), sig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    for (var i = 0; i < 8; i++) if (b[i] !== sig[i]) return false;
    return true;
  }

  async function takeFile(list) {
    if (state.busy || !list || !list.length) return;
    var f = list[0];
    clearOutput();
    $('goBtn').disabled = true;
    state.file = null; state.buf = null;
    $('w2pFile').style.display = 'none';
    $('w2pFile').innerHTML = '';
    if (list.length > 1) notify('Only the first file is converted: ' + f.name, 'warn');
    var buf;
    try { buf = await f.arrayBuffer(); } catch (e) { notify('That file could not be read.', 'error'); return; }
    if (isOle(buf) || /\.doc$/i.test(f.name) && !isZip(buf)) {
      notify('This is an old .doc file (Word 97–2003). Open it in Word, Google Docs or LibreOffice and save it as .docx first.', 'error');
      setStatus('Old .doc format is not supported — save it as .docx.');
      return;
    }
    if (!isZip(buf)) {
      notify('That is not a Word .docx file.', 'error');
      setStatus('Choose a .docx file.');
      return;
    }
    var info;
    try { info = await inspect(buf); } catch (e) {
      notify('This file is not a readable Word document.', 'error');
      setStatus(e && e.message === 'notdocx' ? 'This ZIP file is not a Word document.' : 'The document could not be opened — it may be damaged.');
      return;
    }
    state.file = f; state.buf = buf;
    var box = $('w2pFile');
    box.innerHTML = '';
    var name = document.createElement('strong'); name.textContent = '📝 ' + f.name;
    var meta = document.createElement('span'); meta.className = 'meta';
    meta.textContent = formatSize(f.size) + (info.pages ? ' · about ' + info.pages + ' page' + (info.pages > 1 ? 's' : '') + ' in Word' : '') + (info.size ? ' · ' + info.size : '');
    box.appendChild(name); box.appendChild(meta);
    box.style.display = 'flex';
    $('goBtn').disabled = false;
    setStatus('Ready. Press Convert to PDF.');
  }

  /* Read page size and Word's own page count before converting. */
  async function inspect(buf) {
    var zip = await JSZip.loadAsync(buf);
    var doc = zip.file('word/document.xml');
    if (!doc) throw new Error('notdocx');
    var info = {};
    var app = zip.file('docProps/app.xml');
    if (app) {
      var m = /<Pages>(\d+)<\/Pages>/.exec(await app.async('string'));
      if (m && +m[1] > 0) info.pages = +m[1];
    }
    var x = await doc.async('string');
    var all = x.match(/<w:pgSz\b[^>]*>/g);
    var sz = all && all[all.length - 1];
    if (sz) {
      var w = +(/w:w="(\d+)"/.exec(sz) || [])[1], h = +(/w:h="(\d+)"/.exec(sz) || [])[1];
      if (w && h) info.size = sizeName(w / 20, h / 20);
    }
    return info;
  }
  function sizeName(wpt, hpt) {
    var a = Math.min(wpt, hpt), b = Math.max(wpt, hpt), land = wpt > hpt ? ' landscape' : '';
    if (Math.abs(a - 595.3) < 3 && Math.abs(b - 841.9) < 3) return 'A4' + land;
    if (Math.abs(a - 612) < 3 && Math.abs(b - 792) < 3) return 'Letter' + land;
    if (Math.abs(a - 612) < 3 && Math.abs(b - 1008) < 3) return 'Legal' + land;
    return Math.round(wpt / 72 * 25.4) + ' × ' + Math.round(hpt / 72 * 25.4) + ' mm';
  }

  /* ---------- isolated render frame ---------- */

  function makeFrame() {
    var old = $('w2pFrame');
    if (old) old.remove();
    var fr = document.createElement('iframe');
    fr.id = 'w2pFrame';
    fr.setAttribute('aria-hidden', 'true');
    fr.setAttribute('tabindex', '-1');
    fr.title = 'Word to PDF render area';
    fr.style.cssText = 'position:absolute;left:-100000px;top:0;width:2000px;height:2000px;border:0;visibility:hidden';
    $('w2pStage').appendChild(fr);
    var d = fr.contentDocument;
    d.open();
    d.write('<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Carlito:ital,wght@0,400;0,700;1,400;1,700&family=Caladea:ital,wght@0,400;0,700;1,400;1,700&family=Arimo:ital,wght@0,400;0,700;1,400;1,700&family=Tinos:ital,wght@0,400;0,700;1,400;1,700&family=Cousine:ital,wght@0,400;0,700;1,400;1,700&family=Noto+Sans+Devanagari:wght@400;700&display=block">' +
      '<style>html,body{margin:0;padding:0;background:#fff}' +
      '.pages{display:flex;flex-direction:column;align-items:flex-start;gap:20px;padding:0}' +
      '.w2p-page{background:#fff;color:#000;box-sizing:border-box;position:relative;overflow:hidden;display:flex;flex-direction:column}' +
      '.w2p-page>header,.w2p-page>footer{flex:none;position:relative}' +
      '.w2p-page>.w2p-body{flex:1 1 auto;position:relative;overflow:hidden}' +
      '.w2p-page>.w2p-body>article{overflow:visible}' +
      '.docx-wrapper{background:none!important;padding:0!important;display:block!important}' +
      'section.docx{box-shadow:none!important;margin:0!important}' +
      '</style>' +
      '</head><body><div id="src"></div><div class="pages" id="pages"></div></body></html>');
    d.close();
    // html2canvas must run in this document: a canvas draws text with the
    // fonts of the document that owns it, and Carlito/Devanagari load here
    var s = d.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.integrity = 'sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H';
    s.crossOrigin = 'anonymous';
    d.head.appendChild(s);
    return fr;
  }

  /* Word fonts are not installed on most phones and Linux machines; map them
     onto free fonts with the same character widths so line breaks match. */
  function fontFallbacks(doc) {
    var st = doc.createElement('style');
    st.textContent = 'section.docx{font-family:Carlito,Calibri,Arimo,Arial,"Noto Sans Devanagari",sans-serif}';
    doc.head.appendChild(st);
  }
  var PUA_BULLETS = { '\uf0b7': '\u2022', '\uf0a7': '\u25aa', '\uf0d8': '\u27a2', '\uf076': '\u2756',
    '\uf0fc': '\u2713', '\uf0a8': '\u25e6', '\uf06e': '\u25a0', '\uf0e8': '\u2794', '\uf02d': '\u2013' };
  function fixBullets(css) {
    return css.replace(/[\uf000-\uf0ff]/g, function (ch) { return PUA_BULLETS[ch] || '\u2022'; })
      .replace(/font-family:\s*(Symbol|Wingdings[^;}]*)/gi, 'font-family: Arimo, Arial, sans-serif');
  }
  function rewriteFonts(root) {
    // Rewrite each font-family so the metric-compatible font is tried right
    // after the original, and Devanagari has a font everywhere.
    var sheets = root.ownerDocument.querySelectorAll('style');
    sheets.forEach(function (s) {
      s.textContent = fixBullets(s.textContent).replace(/font-family:\s*([^;}]+)/g, function (m, fam) {
        return 'font-family: ' + withFallback(fam);
      }).replace(/(--docx-[a-zA-Z]+-font:\s*)([^;}]+)/g, function (m, p, fam) {
        return p + withFallback(fam);
      });
    });
    rewriteInline(root);
  }
  function rewriteInline(root) {
    root.querySelectorAll('[style*="font-family"]').forEach(function (el) {
      el.style.fontFamily = withFallback(el.style.fontFamily);
    });
  }
  function withFallback(fam) {
    if (/Noto Sans Devanagari/.test(fam)) return fam;
    var first = fam.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
    var mapped = FONT_MAP[first.toLowerCase()];
    var extra = mapped ? ', ' + mapped : '';
    var generic = /cambria|times|georgia|garamond|serif/i.test(first) && !/sans/i.test(first) ? 'serif' : 'sans-serif';
    return fam.trim() + extra + ', "Noto Sans Devanagari", ' + generic;
  }

  /* fonts.ready resolves as soon as nothing is *pending*, and a web font is
     not requested until something on screen uses it — so on the first run the
     layout would be measured with the system fallback font and every page
     break would be wrong. Ask for every face the document can use, first. */
  async function loadFonts(doc, root) {
    var link = doc.querySelector('link[rel=stylesheet]');
    if (link && !link.sheet) await new Promise(function (r) { link.onload = link.onerror = r; setTimeout(r, 8000); });
    var css = Array.prototype.map.call(doc.querySelectorAll('style'), function (s) { return s.textContent; }).join(' ')
      + ' ' + Array.prototype.map.call(root.querySelectorAll('[style*="font-family"]'), function (e) { return e.style.fontFamily; }).join(' ');
    var fams = ['Carlito'];
    Object.keys(FONT_MAP).forEach(function (k) { var f = FONT_MAP[k]; if (css.indexOf(f) >= 0 && fams.indexOf(f) < 0) fams.push(f); });
    var jobs = [];
    fams.forEach(function (f) {
      ['400 ', '700 ', 'italic 400 ', 'italic 700 '].forEach(function (v) { jobs.push(doc.fonts.load(v + '16px "' + f + '"', 'Ab')); });
    });
    if (/[\u0900-\u097f]/.test(root.textContent)) {
      jobs.push(doc.fonts.load('400 16px "Noto Sans Devanagari"', '\u0915'), doc.fonts.load('700 16px "Noto Sans Devanagari"', '\u0915'));
    }
    await Promise.race([Promise.all(jobs.map(function (j) { return j.catch(function () {}); })), new Promise(function (r) { setTimeout(r, 15000); })]);
    try { await doc.fonts.ready; } catch (e) {}
  }

  /* ---------- pagination ---------- */

  function px(v) { return parseFloat(v) || 0; }

  /* Split a paragraph at the last line that fits in `avail` px. Returns the
     remainder (a clone holding the rest of the text) or null if no split. */
  function splitParagraph(p, avail) {
    var doc = p.ownerDocument, top = p.getBoundingClientRect().top;
    var cs = doc.defaultView.getComputedStyle(p);
    var limit = top + avail - px(cs.marginTop) - px(cs.paddingBottom);
    // find the last text position whose line bottom is within the limit
    var walker = doc.createTreeWalker(p, NodeFilter.SHOW_TEXT, null);
    var range = doc.createRange(), node, cut = null, lineTop = null;
    while ((node = walker.nextNode())) {
      for (var i = 0; i < node.length; i++) {
        range.setStart(node, i); range.setEnd(node, i + 1);
        var rects = range.getClientRects();
        if (!rects.length) continue;
        var rr = rects[rects.length - 1];
        if (rr.bottom > limit + 0.5) {
          // first character on a line that does not fit: cut before its line
          if (lineTop === null || rr.top > lineTop + 1) { cut = { node: node, offset: i }; break; }
        }
        lineTop = rr.top;
      }
      if (cut) break;
    }
    if (!cut) return null;
    // move back to the start of that line
    var lineStartTop = null;
    range.setStart(cut.node, cut.offset); range.setEnd(cut.node, Math.min(cut.offset + 1, cut.node.length));
    lineStartTop = range.getClientRects()[0].top;
    // walk backwards over characters on the same visual line
    var w2 = doc.createTreeWalker(p, NodeFilter.SHOW_TEXT, null), nodes = [];
    while ((node = w2.nextNode())) nodes.push(node);
    var ni = nodes.indexOf(cut.node), off = cut.offset;
    outer: while (ni >= 0) {
      var n = nodes[ni];
      for (var j = (n === cut.node ? off : n.length) - 1; j >= 0; j--) {
        range.setStart(n, j); range.setEnd(n, j + 1);
        var rc = range.getClientRects();
        if (rc.length && rc[0].top < lineStartTop - 1) { cut = { node: n, offset: j + 1 }; break outer; }
      }
      ni--;
      if (ni < 0) { cut = { node: nodes[0], offset: 0 }; }
    }
    if (cut.node === nodes[0] && cut.offset === 0) return null; // nothing fits
    // split the DOM at the cut: everything after goes into a clone
    var r2 = doc.createRange();
    r2.setStart(cut.node, cut.offset);
    r2.setEndAfter(p.lastChild);
    var frag = r2.extractContents();
    var rest = p.cloneNode(false);
    rest.appendChild(frag);
    // the continuation is not a new list item and has no first-line indent
    rest.style.textIndent = '0';
    rest.setAttribute('data-w2p-cont', '1');
    rest.className = rest.className.replace(/\bdocx-num-\S+/g, '').trim();
    var mi = parseFloat(doc.defaultView.getComputedStyle(p).marginInlineStart) || 0;
    if (mi) rest.style.marginInlineStart = mi + 'px';
    p.style.marginBottom = '0';
    rest.style.marginTop = '0';
    return rest;
  }

  /* Split a table between rows so that rows that fit stay. Repeats rows
     marked as header rows. Returns remainder table or null. */
  function splitTable(tbl, avail) {
    var top = tbl.getBoundingClientRect().top, rows = Array.prototype.slice.call(tbl.rows);
    if (rows.length < 2) return null;
    var headers = [];
    for (var i = 0; i < rows.length && rows[i].getAttribute('data-w2p-header') === '1'; i++) headers.push(rows[i]);
    var cutIdx = -1;
    for (var k = headers.length; k < rows.length; k++) {
      if (rows[k].getBoundingClientRect().bottom - top > avail) { cutIdx = k; break; }
    }
    if (cutIdx <= headers.length) return null;   // not even one body row fits
    var rest = tbl.cloneNode(false);
    Array.prototype.forEach.call(tbl.children, function (ch) {
      if (ch.tagName === 'COLGROUP') rest.appendChild(ch.cloneNode(true));
    });
    var body = tbl.ownerDocument.createElement('tbody');
    rest.appendChild(body);
    headers.forEach(function (h) { body.appendChild(h.cloneNode(true)); });
    for (var m = cutIdx; m < rows.length; m++) body.appendChild(rows[m]);
    // empty row groups left behind are harmless
    return rest;
  }

  /* Header rows ("Repeat as header row", <w:tblHeader/>) read straight from
     document.xml: docx-preview reads a bare <w:tblHeader/> as false. Rows are
     listed in document order, the same order as the rendered <tr>s. Rows of
     nested tables are included, so the count lines up. */
  function headerRowFlags(xml) {
    var flags = [], re = /<w:tr[\s>][\s\S]*?(?=<w:tc[\s>]|<\/w:tr>)/g, m;
    while ((m = re.exec(xml))) {
      var hm = /<w:tblHeader(?:\s+w:val="([^"]*)")?\s*\/>/.exec(m[0]);
      flags.push(!!hm && !/^(0|false|off)$/i.test(hm[1] || ''));
    }
    return flags;
  }
  function markHeaderRows(root, flags) {
    var trs = root.querySelectorAll('article tr');
    if (trs.length !== flags.length) return;   // structure differs: skip safely
    for (var i = 0; i < trs.length; i++) if (flags[i]) trs[i].setAttribute('data-w2p-header', '1');
  }

  /* Build pages from one rendered <section>. */
  function paginateSection(sec, pagesEl, opts, sink, alt) {
    var doc = sec.ownerDocument, win = doc.defaultView;
    var cs = win.getComputedStyle(sec);
    // docx-preview writes sizes in pt; the computed style is in px
    var W = px(cs.width) || sec.getBoundingClientRect().width;
    var H = px(cs.minHeight) || W * 1.414;
    var padT = px(cs.paddingTop), padB = px(cs.paddingBottom), padL = px(cs.paddingLeft), padR = px(cs.paddingRight);
    var header = sec.querySelector(':scope>header'), footer = sec.querySelector(':scope>footer');
    var articles = Array.prototype.slice.call(sec.querySelectorAll(':scope>article'));
    var blocks = [];
    articles.forEach(function (a) { Array.prototype.forEach.call(a.children, function (c) { blocks.push(c); }); });
    var art0 = articles[0];

    // A section set to "Different first page" gets its first-page header on
    // page one only; later pages use the default one (rendered separately).
    var later = { header: alt && alt.header !== undefined ? alt.header : header, footer: alt && alt.footer !== undefined ? alt.footer : footer };
    var first = true;
    function newPage() {
      var hdr = first ? header : later.header, ftr = first ? footer : later.footer;
      first = false;
      var pg = doc.createElement('div');
      pg.className = 'w2p-page ' + sec.className;
      pg.style.cssText = sec.getAttribute('style') || '';
      pg.style.width = W + 'px'; pg.style.height = H + 'px'; pg.style.minHeight = H + 'px';
      pg.style.paddingTop = padT + 'px'; pg.style.paddingBottom = padB + 'px';
      pg.style.paddingLeft = padL + 'px'; pg.style.paddingRight = padR + 'px';
      if (opts.hf && hdr) pg.appendChild(doc.importNode(hdr, true));
      var body = doc.createElement('div'); body.className = 'w2p-body';
      var art = doc.createElement('article');
      if (art0) art.style.cssText = art0.getAttribute('style') || '';
      body.appendChild(art); pg.appendChild(body);
      if (opts.hf && ftr) pg.appendChild(doc.importNode(ftr, true));
      pagesEl.appendChild(pg);
      sink.push(pg);
      return { page: pg, body: body, art: art };
    }

    var cur = newPage();
    var queue = blocks.slice();
    while (queue.length) {
      if (sink.length > MAX_PAGES) throw new Error('toolong');
      var b = queue.shift();
      cur.art.appendChild(b);
      var limit = cur.body.getBoundingClientRect().height;
      // measure the block's bottom edge against the page body
      var bb = b.getBoundingClientRect().bottom - cur.body.getBoundingClientRect().top;
      if (bb <= limit + 0.5) continue;
      // does not fit
      var avail = limit - (b.getBoundingClientRect().top - cur.body.getBoundingClientRect().top);
      var rest = null;
      if (b.tagName === 'P' && avail > 0) rest = splitParagraph(b, avail);
      else if (b.tagName === 'TABLE' && avail > 0) rest = splitTable(b, avail);
      if (rest) {
        queue.unshift(rest);
        cur = newPage();
        continue;
      }
      if (cur.art.children.length === 1) {
        // a single block taller than a whole page (big image, giant table row):
        // leave it clipped on its own page rather than loop forever
        sink.clipped = true;
        if (queue.length) cur = newPage();
        continue;
      }
      cur.art.removeChild(b);
      queue.unshift(b);
      cur = newPage();
    }
    return { W: W, H: H };
  }

  /* PAGE / NUMPAGES fields: docx-preview renders the cached result text that
     Word stored (often "1" on every page). Find text between the field's
     separate and end markers, by matching the run structure, and replace it. */
  function fillPageFields(pages, total) {
    pages.forEach(function (pg, i) {
      pg.querySelectorAll('[data-w2p-field]').forEach(function (el) {
        var kind = el.getAttribute('data-w2p-field');
        el.textContent = kind === 'NUMPAGES' || kind === 'SECTIONPAGES' ? String(total) : String(i + 1);
      });
    });
  }

  /* Tag the rendered result span of PAGE / NUMPAGES fields in headers and
     footers so we can fill them per page. Uses the parsed tree: within a
     paragraph, runs between fldChar begin..separate hold the instruction and
     runs between separate..end hold the displayed text. */
  function tagFieldRuns(parsed, root) {
    var targets = [];
    (parsed.parts || []).forEach(function (part) {
      if (!/\/(header|footer)\d*\.xml$/.test(part.path || '')) return;
      walkParas(part.rootElement, function (para) {
        var fld = 0, instr = '', hits = [];
        (para.children || []).forEach(function (run) {
          (run.children || []).forEach(function (c) {
            if (c.type === 'complexField') {
              if (c.charType === 'begin') { fld = 1; instr = ''; }
              else if (c.charType === 'separate') fld = 2;
              else if (c.charType === 'end') fld = 0;
            } else if (c.type === 'instruction' && fld === 1) instr += c.text || '';
            else if (c.type === 'simpleField') {
              var k0 = fieldKind(c.instruction);
              if (k0) hits.push({ text: null, kind: k0, simple: true });
            } else if (c.type === 'text') {
              if (fld === 2) { var k = fieldKind(instr); if (k) hits.push({ text: c.text, kind: k }); }
            }
          });
        });
        if (hits.length) targets.push(hits);
      });
    });
    if (!targets.length) return 0;
    // mark matching spans in rendered headers/footers: same text, inside a
    // header or footer, in order
    var tagged = 0;
    root.querySelectorAll('header, footer').forEach(function (hf) {
      var spans = Array.prototype.slice.call(hf.querySelectorAll('span'));
      targets.forEach(function (hits) {
        hits.forEach(function (h) {
          if (h.text == null) return;
          for (var s = 0; s < spans.length; s++) {
            var sp = spans[s];
            if (!sp.hasAttribute('data-w2p-field') && sp.children.length === 0 && sp.textContent === h.text) {
              sp.setAttribute('data-w2p-field', h.kind); tagged++; break;
            }
          }
        });
      });
    });
    return tagged;
  }
  function sectionProps(parsed) {
    var out = [], seen = [];
    (function walk(o, depth) {
      if (!o || typeof o !== 'object' || depth > 8 || seen.indexOf(o) >= 0) return;
      seen.push(o);
      if (o.sectionProps) out.push(o.sectionProps);
      if (o.props && o.props.pageSize) out.push(o.props);
      if (o.children) o.children.forEach(function (ch) { walk(ch, depth + 1); });
    })(parsed.documentPart && parsed.documentPart.body, 0);
    return out;
  }
  function fieldKind(instr) {
    var m = /^\s*(PAGE|NUMPAGES|SECTIONPAGES)\b/i.exec(instr || '');
    return m ? m[1].toUpperCase() : null;
  }
  function walkParas(node, cb) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'paragraph') { cb(node); return; }
    (node.children || []).forEach(function (c) { walkParas(c, cb); });
  }

  /* ---------- text layer ---------- */

  /* One entry per line fragment: text, its box relative to the page, and
     font size, so it can be laid invisibly over the page image. */
  function textRuns(pg) {
    var doc = pg.ownerDocument, origin = pg.getBoundingClientRect(), out = [];
    var walker = doc.createTreeWalker(pg, NodeFilter.SHOW_TEXT, null), node;
    var range = doc.createRange();
    while ((node = walker.nextNode())) {
      var t = node.nodeValue;
      if (!t || !t.trim()) continue;
      var el = node.parentElement, cs = doc.defaultView.getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      var fs = px(cs.fontSize) || 12;
      // group consecutive characters that sit on the same line
      var start = 0, lineTop = null, lineBox = null;
      for (var i = 0; i <= t.length; i++) {
        var rect = null;
        if (i < t.length) {
          range.setStart(node, i); range.setEnd(node, i + 1);
          var rs = range.getClientRects(); rect = rs.length ? rs[0] : null;
        }
        var newLine = i === t.length || (rect && lineTop !== null && Math.abs(rect.top - lineTop) > fs * 0.5);
        if (newLine && lineBox && i > start) {
          var s = t.slice(start, i);
          if (s.trim()) out.push({ s: s, x: lineBox.left - origin.left, y: lineBox.bottom - origin.top, w: lineBox.right - lineBox.left, h: lineBox.bottom - lineBox.top, fs: fs });
          start = i; lineBox = null;
        }
        if (rect && rect.width + rect.height > 0) {
          if (!lineBox) { lineBox = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }; lineTop = rect.top; }
          else { lineBox.right = Math.max(lineBox.right, rect.right); lineBox.bottom = Math.max(lineBox.bottom, rect.bottom); }
        }
      }
    }
    return out;
  }

  // Standard PDF fonts only cover WinAnsi; anything else (Devanagari, emoji)
  // is skipped in the text layer — it is still visible in the page image.
  function winAnsiSafe(s) {
    return s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2026/g, '...').replace(/[\u00a0\u2002-\u200b]/g, ' ').replace(/\t/g, ' ')
      .replace(/[^\x20-\x7e\u00a1-\u00ff]/g, '');
  }

  /* ---------- main ---------- */

  async function convert() {
    if (state.busy || !state.buf) return;
    if (typeof docx === 'undefined' || typeof PDFLib === 'undefined') {
      notify('The converter could not load. Check your internet connection and reload the page.', 'error');
      return;
    }
    state.busy = true;
    clearOutput();
    $('goBtn').disabled = true;
    var t0 = performance.now();
    var scale = +$('w2pQuality').value || 1.5;
    var pageOpt = $('w2pPage').value, withText = $('w2pText').checked;
    var opts = { hf: $('w2pHF').checked };
    var fr = null;
    try {
      setProgress(0.02); setStatus('Reading the document…');
      fr = makeFrame();
      var fdoc = fr.contentDocument;
      await new Promise(function (r) {
        var t = Date.now();
        (function wait() { if (fr.contentWindow.html2canvas || Date.now() - t > 20000) r(); else setTimeout(wait, 50); })();
      });
      var h2c = fr.contentWindow.html2canvas;
      if (!h2c) throw new Error('nolib');
      state.h2c = h2c;
      fontFallbacks(fdoc);

      var renderOpts = {
        className: 'docx', inWrapper: true, breakPages: true, ignoreLastRenderedPageBreak: true,
        useBase64URL: true, renderAltChunks: false, renderComments: false, renderChanges: false,
        renderHeaders: opts.hf, renderFooters: opts.hf, renderFootnotes: true, renderEndnotes: true,
        experimental: true
      };
      var parsed = await docx.parseAsync(state.buf, renderOpts);
      var nodes = await docx.renderDocument(parsed, renderOpts);
      var src = fdoc.getElementById('src');
      nodes.forEach(function (n) { (n.nodeName === 'STYLE' ? fdoc.head : src).appendChild(fdoc.importNode(n, true)); });
      var altSecs = null, altBox = null;
      if (opts.hf) {
        var sps = sectionProps(parsed);
        if (sps.some(function (s) { return s.titlePage; })) {
          sps.forEach(function (s) { s.titlePage = false; });
          var altNodes = await docx.renderDocument(parsed, renderOpts);
          altBox = fdoc.createElement('div');
          altNodes.forEach(function (n) { if (n.nodeName !== 'STYLE') altBox.appendChild(fdoc.importNode(n, true)); });
          altSecs = Array.prototype.slice.call(altBox.querySelectorAll('section.docx'));
        }
      }
      rewriteFonts(src);

      // page size override
      if (pageOpt !== 'doc') {
        var ps = PAGE_SIZES[pageOpt];
        src.querySelectorAll('section.docx').forEach(function (s) {
          var scs = fdoc.defaultView.getComputedStyle(s), land = px(scs.width) > px(scs.minHeight);
          s.style.width = (land ? ps[1] : ps[0]) + 'pt';
          s.style.minHeight = (land ? ps[0] : ps[1]) + 'pt';
        });
        addNote('Page size changed to ' + (pageOpt === 'a4' ? 'A4' : 'US Letter') + '; text is reflowed to fit, so page breaks can differ from Word.');
      }

      // table header rows
      var docXml = await (await JSZip.loadAsync(state.buf)).file('word/document.xml').async('string');
      markHeaderRows(src, headerRowFlags(docXml));
      if (opts.hf) tagFieldRuns(parsed, src);
      if (altBox) { tagFieldRuns(parsed, altBox); rewriteInline(altBox); }

      setStatus('Loading fonts and images…'); setProgress(0.08);
      await loadFonts(fdoc, src);
      await Promise.all(Array.prototype.map.call(src.querySelectorAll('img'), function (im) {
        return im.complete ? null : new Promise(function (r) { im.onload = im.onerror = r; setTimeout(r, 8000); });
      }));
      await new Promise(function (r) { setTimeout(r, 650); }); // docx-preview tab stops run after 500 ms

      setStatus('Laying out pages…'); setProgress(0.12);
      var pagesEl = fdoc.getElementById('pages'), pages = [], dims = [];
      var sections = Array.prototype.slice.call(src.querySelectorAll('section.docx'));
      if (!sections.length) throw new Error('empty');
      sections.forEach(function (sec, si) {
        var before = pages.length, alt = null, as = altSecs && altSecs[si];
        if (as) alt = { header: as.querySelector(':scope>header'), footer: as.querySelector(':scope>footer') };
        var d = paginateSection(sec, pagesEl, opts, pages, alt);
        for (var i = before; i < pages.length; i++) dims.push(d);
      });
      src.remove();
      if (pages.clipped) addNote('One item (a large image or table row) is taller than a page and was cut at the page edge.', true);
      if (opts.hf) fillPageFields(pages, pages.length);

      // what the converter could not reproduce
      var xml = docXml;
      if (/<c:chart\b|\/charts\/|<w:drawing>[\s\S]*?graphicData uri="http:\/\/schemas\.openxmlformats\.org\/drawingml\/2006\/chart"/.test(xml)) addNote('This document has a chart. Charts are not drawn — paste the chart as a picture in Word if it must appear.', true);
      if (/<dgm:|drawingml\/2006\/diagram/.test(xml)) addNote('SmartArt diagrams are not drawn.', true);
      if (/<w:ins\b|<w:del\b/.test(xml)) addNote('The document has tracked changes; the PDF shows it with all changes accepted.');
      if (/<w:fldChar[^>]*fldCharType="begin"[\s\S]{0,400}?\bTOC\b/.test(xml)) addNote('The table of contents shows the page numbers Word last saved; they can differ slightly from this PDF.');
      if (/\.(emf|wmf)"/i.test(xml) || /image\d*\.(emf|wmf)/i.test(Object.keys((await JSZip.loadAsync(state.buf)).files).join(' '))) addNote('Some images are in the old EMF/WMF format, which browsers cannot draw.', true);
      if (/<w:txbxContent\b/.test(xml)) addNote('Text boxes and shapes are placed approximately.');

      var pdf = await PDFLib.PDFDocument.create();
      var font = withText ? await pdf.embedFont(PDFLib.StandardFonts.Helvetica) : null;
      // html2canvas clones the whole document for every capture, so keep only
      // the page being drawn in it (otherwise time grows with pages squared)
      var parked = fdoc.createDocumentFragment();
      pages.forEach(function (pg) { parked.appendChild(pg); });
      for (var i = 0; i < pages.length; i++) {
        setStatus('Drawing page ' + (i + 1) + ' of ' + pages.length + '…');
        setProgress(0.15 + 0.8 * i / pages.length);
        var pg = pages[i], d = dims[i];
        pagesEl.appendChild(pg);
        var canvas = await state.h2c(pg, { scale: scale, backgroundColor: '#ffffff', logging: false, useCORS: true, windowWidth: 2000 });
        var jpeg = await new Promise(function (r) { canvas.toBlob(r, 'image/jpeg', scale >= 3 ? 0.85 : 0.75); });
        var img = await pdf.embedJpg(await jpeg.arrayBuffer());
        var wpt = d.W * PT_PER_PX, hpt = d.H * PT_PER_PX;
        var page = pdf.addPage([wpt, hpt]);
        page.drawImage(img, { x: 0, y: 0, width: wpt, height: hpt });
        if (font) {
          // Invisible text (render mode 3) over the image: selectable and
          // searchable, never drawn. Each line is squeezed horizontally to
          // the width it has on the page so selections line up with words.
          var fontKey = page.node.newFontDictionary(font.name, font.ref);
          var ops = [PDFLib.beginText(), PDFLib.setTextRenderingMode(PDFLib.TextRenderingMode.Invisible)];
          textRuns(pg).forEach(function (r) {
            var s = winAnsiSafe(r.s);
            if (!s.trim()) return;
            var size = r.fs * PT_PER_PX, w = font.widthOfTextAtSize(s, size);
            if (!(w > 0)) return;
            var squeeze = Math.max(10, Math.min(400, (r.w * PT_PER_PX) / w * 100));
            // baseline sits about 22% of the line box above its bottom
            var y = hpt - r.y * PT_PER_PX + (r.h * PT_PER_PX) * 0.22;
            ops.push(PDFLib.setFontAndSize(fontKey, size), PDFLib.setCharacterSqueeze(squeeze),
              PDFLib.setTextMatrix(1, 0, 0, 1, r.x * PT_PER_PX, y), PDFLib.showText(font.encodeText(s)));
          });
          ops.push(PDFLib.endText());
          if (ops.length > 3) page.pushOperators.apply(page, ops);
        }
        canvas.width = canvas.height = 0;
        if (i < 12) {
          var th = await thumb(pg, i);
          if (th) $('w2pThumbs').appendChild(th);
        }
        pg.remove();
        await new Promise(function (r) { setTimeout(r, 0); });
      }
      pdf.setTitle(state.file.name.replace(/\.[^.]+$/, ''));
      pdf.setProducer('FreeToolHubs Word to PDF');
      pdf.setCreator('FreeToolHubs');
      var bytes = await pdf.save();
      var blob = new Blob([bytes], { type: 'application/pdf' });
      state.pdfUrl = URL.createObjectURL(blob);
      setProgress(1);
      var secs = ((performance.now() - t0) / 1000).toFixed(1);
      setStatus('Done in ' + secs + ' s.');
      var res = $('result');
      var p = document.createElement('p'); p.className = 'info'; p.style.color = 'var(--ok)';
      p.textContent = '✅ ' + pages.length + ' page' + (pages.length > 1 ? 's' : '') + ' · ' + formatSize(bytes.length) + (withText ? ' · text searchable' : '');
      var a = document.createElement('a'); a.className = 'btn'; a.href = state.pdfUrl; a.download = outName(state.file.name);
      a.textContent = '⬇️ Download PDF'; a.style.display = 'inline-block'; a.style.textDecoration = 'none';
      res.appendChild(p); res.appendChild(a);
      if (pages.length > 12) addNote('Previews show the first 12 pages; the PDF has all ' + pages.length + '.');
      if (bytes.length > 10 * 1048576) addNote('The PDF is ' + formatSize(bytes.length) + ' because every page is stored as an image. For a smaller file choose Standard quality, or use the PDF Compressor.', true);
      notify('PDF ready — ' + pages.length + ' page' + (pages.length > 1 ? 's' : ''), 'ok');
    } catch (e) {
      console.error(e);
      setProgress(null);
      var msg = e && e.message === 'nolib' ? 'The page renderer could not load. Check your internet connection and try again.'
        : e && e.message === 'toolong' ? 'This document is too long to convert in the browser (over ' + MAX_PAGES + ' pages).'
        : e && e.message === 'empty' ? 'The document has no pages to convert.'
          : 'The document could not be converted. If it opens in Word, try File → Save As → .docx and convert again.';
      setStatus(msg);
      notify(msg, 'error');
    } finally {
      if (fr) fr.remove();
      state.busy = false;
      $('goBtn').disabled = !state.buf;
    }
  }

  async function thumb(pg, i) {
    try {
      var c = await state.h2c(pg, { scale: 0.25, backgroundColor: '#ffffff', logging: false });
      var fig = document.createElement('figure'), im = document.createElement('img');
      im.src = c.toDataURL('image/jpeg', 0.7); im.alt = 'Page ' + (i + 1) + ' preview';
      fig.appendChild(im);
      var cap = document.createElement('figcaption'); cap.textContent = 'Page ' + (i + 1);
      fig.appendChild(cap);
      return fig;
    } catch (e) { return null; }
  }

  window.w2pConvert = convert;
  setupDrop('drop', 'inp', takeFile);
  $('drop').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('inp').click(); }
  });
})();
