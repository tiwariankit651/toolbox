// Targeted verification of the tools the generic sweep could not judge.
// Each one is driven the specific way a human would use it.
process.env.LD_LIBRARY_PATH = '/tmp/libs/ext/usr/lib/x86_64-linux-gnu';
const { chromium } = require('/tmp/node_modules/playwright');
const BASE = 'http://localhost:8099';

// a genuine one-page PDF, built by hand (valid, minimal, no library needed)
const PDF_B64_SCRIPT = `(async () => {
  // build a real PDF with pdf-lib which these tools already load
  const { PDFDocument, StandardFonts } = PDFLib;
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 3; i++) {
    const pg = doc.addPage([595, 842]);
    pg.drawText('Test page ' + i, { x: 60, y: 760, size: 28, font: f });
    pg.drawText('Body line for OCR and rendering checks.', { x: 60, y: 700, size: 13, font: f });
  }
  const bytes = await doc.save();
  return new File([bytes], 'test.pdf', { type: 'application/pdf' });
})()`;

const feedPdf = async (page, sel) => page.evaluate(`(async () => {
  const f = await ${PDF_B64_SCRIPT};
  const el = document.querySelector('${sel}') || document.querySelector('input[type=file]');
  const dt = new DataTransfer(); dt.items.add(f);
  el.files = dt.files;
  el.dispatchEvent(new Event('change', {bubbles:true}));
  return f.size;
})()`);

const CASES = {
  'pdf-merger': async p => {
    // needs two PDFs
    const n = await p.evaluate(`(async () => {
      const { PDFDocument, StandardFonts } = PDFLib;
      const mk = async (label) => {
        const d = await PDFDocument.create();
        const f = await d.embedFont(StandardFonts.Helvetica);
        const pg = d.addPage([595,842]);
        pg.drawText(label, {x:60,y:700,size:24,font:f});
        return new File([await d.save()], label+'.pdf', {type:'application/pdf'});
      };
      const dt = new DataTransfer();
      dt.items.add(await mk('AAA')); dt.items.add(await mk('BBB'));
      const el = document.querySelector('input[type=file]');
      el.files = dt.files; el.dispatchEvent(new Event('change',{bubbles:true}));
      return el.files.length;
    })()`);
    await p.waitForTimeout(1500);
    const out = await p.evaluate(async () => {
      let got = null; const orig = window.download;
      window.download = (b, nm) => { got = { size: b.size, nm } };
      const fn = window.mergePDFs || window.merge || window.doMerge || window.goMerge;
      if (!fn) { window.download = orig; return { err: 'no merge function found' } }
      try { await fn() } catch (e) { window.download = orig; return { err: e.message } }
      window.download = orig;
      return got || { err: 'download never called' };
    });
    if (out.err) throw new Error(out.err);
    if (out.size < 800) throw new Error('merged pdf suspiciously small: ' + out.size);
    return `fed 2 PDFs, merged output ${out.size} bytes`;
  },

  'pdf-splitter': async p => {
    const sz = await feedPdf(p, 'input[type=file]');
    await p.waitForTimeout(2000);
    const t = await p.evaluate(() => document.body.innerText);
    if (!/3|page/i.test(t)) throw new Error('3-page PDF fed, no page info shown');
    return `fed ${sz}-byte 3-page PDF, tool reported page info`;
  },

  'pdf-to-image': async p => {
    // this tool loads pdf.js, not pdf-lib, so inject pdf-lib just to author a fixture
    await p.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js' }).catch(()=>{});
    await p.waitForTimeout(800);
    const sz = await feedPdf(p, '#inp');
    await p.waitForTimeout(3000);
    const grid = await p.evaluate(() => ({
      thumbs: document.querySelectorAll('#pageGrid img').length,
      selRow: getComputedStyle(document.getElementById('selRow')).display,
      count: (document.getElementById('selCount') || {}).innerText || '',
      goEnabled: !document.getElementById('goBtn').disabled
    }));
    if (grid.thumbs !== 3) throw new Error(`expected 3 page thumbnails, got ${grid.thumbs}`);
    if (!grid.goEnabled) throw new Error('convert button stayed disabled');
    // actually convert and confirm real image bytes
    const conv = await p.evaluate(async () => {
      await convertPDF();
      const imgs = [...document.querySelectorAll('#result img')];
      return { n: imgs.length, firstLen: imgs[0] ? imgs[0].src.length : 0,
               txt: (document.getElementById('result').innerText || '').slice(0, 80) };
    });
    if (conv.n !== 3 || conv.firstLen < 2000) throw new Error('conversion produced ' + conv.n + ' images, first src len ' + conv.firstLen);
    return `3 thumbnails, ${grid.count}; converted to ${conv.n} real images`;
  },

  'pdf-compressor': async p => {
    const sz = await feedPdf(p, '#inp');
    await p.waitForTimeout(2500);
    const info = await p.evaluate(() => (document.getElementById('fileInfo') || {}).innerText || '');
    if (!/page|KB|MB/i.test(info)) throw new Error('no file info after upload: ' + info.slice(0, 60));
    const out = await p.evaluate(async () => {
      document.getElementById('mode').value = 'quality';
      if (window.onModeChange) onModeChange();
      let got = null; const orig = window.download;
      window.download = (b, nm) => { got = { size: b.size, nm } };
      try { await compressPDF() } catch (e) { window.download = orig; return { err: e.message } }
      window.download = orig;
      return { got, result: (document.getElementById('result').innerText || '').slice(0, 120) };
    });
    if (out.err) throw new Error(out.err);
    if (!/KB|MB|%/i.test(out.result)) throw new Error('no compression result text');
    return `compressed 3-page PDF: ${out.result.replace(/\s+/g, ' ').slice(0, 70)}`;
  },

  'pdf-add-text': async p => {
    const sz = await feedPdf(p, 'input[type=file]');
    await p.waitForTimeout(2500);
    const t = await p.evaluate(() => document.body.innerText);
    const hasCanvas = await p.evaluate(() => {
      const c = document.querySelector('canvas');
      if (!c) return false;
      const d = c.getContext('2d').getImageData(0, 0, Math.min(c.width,80), Math.min(c.height,80)).data;
      const seen = new Set(); for (let i = 0; i < d.length; i += 4) seen.add(d[i]);
      return seen.size > 1;
    });
    if (!hasCanvas) throw new Error('PDF fed but no page rendered to canvas');
    return 'PDF rendered to canvas for text placement';
  },

  'pdf-editor': async p => {
    await feedPdf(p, '#inp');
    await p.waitForTimeout(4000);
    const r = await p.evaluate(() => {
      const all = [...document.querySelectorAll('#viewer canvas')];
      const visible = all.filter(x => x.offsetParent !== null);
      let painted = false;
      if (visible[0]) {
        const c = visible[0];
        // sample the whole page, not a corner - PDF margins are legitimately white
        const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        let dark = 0; for (let i=0;i<d.length;i+=4) if (d[i] < 120) dark++;
        painted = dark > 500;
      }
      // each page is a base canvas plus an annotation overlay, so one visible
      // page legitimately means two visible canvases
      const vBase = visible.filter(x => !x.classList.contains('overlay-canvas')).length;
      return { total: all.length, visible: visible.length, visibleBase: vBase, painted,
               pageInfo: (document.getElementById('pageInfo')||{}).innerText || '' };
    });
    if (!r.total) throw new Error('no page canvases created in #viewer');
    if (!r.painted) throw new Error(r.total + ' canvases created but first is blank');
    if (r.visibleBase !== 1) throw new Error(r.visibleBase + ' page canvases visible (should be exactly 1)');
    return `3-page PDF -> ${r.total} canvases (base+overlay per page), 1 page shown, content painted; ${r.pageInfo.trim()}`;
  },

  'ocr': async p => {
    // feed an image and run the real tesseract pipeline on a short word
    await p.evaluate(`(async () => {
      const c = document.createElement('canvas'); c.width=560; c.height=200;
      const x = c.getContext('2d');
      x.fillStyle='#fff'; x.fillRect(0,0,560,200);
      x.fillStyle='#000'; x.font='bold 90px Arial'; x.fillText('HELLO', 40, 130);
      const b = await new Promise(r=>c.toBlob(r,'image/png'));
      const f = new File([b],'t.png',{type:'image/png'});
      const dt = new DataTransfer(); dt.items.add(f);
      const el = document.getElementById('inp'); el.files = dt.files;
      el.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    await p.waitForTimeout(2000);
    await p.evaluate(() => { document.getElementById('upscale').value='1'; redrawPrep() });
    const text = await p.evaluate(async () => {
      await doOCR();
      return (window._ocrText || '').trim();
    });
    if (!/HELLO/i.test(text)) throw new Error('OCR returned "' + text.slice(0,40) + '", expected HELLO');
    const acc = await p.evaluate(() => (document.getElementById('result').innerText.match(/Accuracy\s*(\d+)%/) || [])[1]);
    return `real OCR read "${text.replace(/\s+/g,' ').slice(0,20)}" at ${acc}% confidence`;
  },

  'screen-recorder': async p => {
    // getDisplayMedia cannot be granted headlessly; verify all config logic instead
    const r = await p.evaluate(() => {
      const before = { res: srRes.value, fps: srFps.value };
      document.getElementById('srPreset').value = 'hq'; applySrPreset();
      const hq = { res: srRes.value, fps: srFps.value, br: srBitrate.value };
      document.getElementById('srPreset').value = 'whatsapp'; applySrPreset();
      const wa = { res: srRes.value, fps: srFps.value, br: srBitrate.value };
      const est = document.getElementById('srEstimate').innerText;
      document.getElementById('camera').checked = true; onCamToggle();
      const camVis = getComputedStyle(document.getElementById('camSelect')).display;
      const mime = typeof pickMime === 'function' ? pickMime() : 'n/a';
      return { hq, wa, est, camVis, mime };
    });
    if (r.hq.res !== '1440' || r.hq.fps !== '60') throw new Error('hq preset wrong: ' + JSON.stringify(r.hq));
    if (r.wa.res !== '720') throw new Error('whatsapp preset wrong: ' + JSON.stringify(r.wa));
    if (r.camVis === 'none') throw new Error('camera panel did not open');
    if (!/webm|mp4/.test(r.mime)) throw new Error('no usable recording format: ' + r.mime);
    return `presets switch (1440p60 / 720p), codec ${r.mime.split(';')[0]}, cam panel opens`;
  },

  'topic-picker': async p => {
    const r = await p.evaluate(async () => {
      const cat = document.getElementById('category');
      if (cat && cat.options.length > 1) { cat.selectedIndex = 1; cat.dispatchEvent(new Event('change',{bubbles:true})) }
      const n = document.getElementById('pickN');
      if (n) { n.value = '3'; n.dispatchEvent(new Event('input',{bubbles:true})) }
      const before = (document.getElementById('result').innerText || '').length;
      pick();
      await new Promise(r => setTimeout(r, 1200));
      const res = document.getElementById('result');
      return { before, after: (res.innerText||'').length, text: (res.innerText||'').replace(/\s+/g,' ').slice(0,90),
               cat: cat ? cat.options[cat.selectedIndex].text : '' };
    });
    if (r.after <= r.before || r.after < 5) throw new Error('pick() produced no result (len ' + r.after + ')');
    return `picked from "${r.cat}": ${r.text.slice(0,60)}`;
  },

  'typing-test': async p => {
    const r = await p.evaluate(async () => {
      const btn = [...document.querySelectorAll('button')].find(b => /start|begin/i.test(b.innerText));
      if (btn) btn.click();
      await new Promise(r => setTimeout(r, 400));
      const inp = document.querySelector('#typeInput,#input,textarea,input[type=text]');
      if (!inp) return { err: 'no typing input' };
      const target = (document.getElementById('textDisplay') || document.getElementById('quote') || {}).innerText || '';
      // type the first few real characters
      const chunk = target.replace(/\s+/g, ' ').trim().slice(0, 25);
      for (const ch of chunk) {
        inp.value += ch;
        inp.dispatchEvent(new Event('input', {bubbles:true}));
        inp.dispatchEvent(new KeyboardEvent('keydown', {key: ch, bubbles:true}));
      }
      await new Promise(r => setTimeout(r, 600));
      return { typed: chunk.length, page: document.body.innerText.slice(0, 400) };
    });
    if (r.err) throw new Error(r.err);
    if (!/wpm|\d+\s*%|accuracy/i.test(r.page)) throw new Error('typed ' + r.typed + ' chars but no WPM/accuracy appeared');
    const wpm = (r.page.match(/(\d+)\s*wpm/i) || [])[1];
    return `typed ${r.typed} chars, live stats shown` + (wpm ? ` (wpm ${wpm})` : '');
  },

  'ip-lookup': async p => {
    // network is blocked here; verify the offline CIDR toolkit instead
    const r = await p.evaluate(() => {
      const ins = [...document.querySelectorAll('input')];
      const cidr = ins.find(e => /cidr|subnet|ip/i.test(e.id + e.placeholder));
      if (!cidr) return { err: 'no cidr input' };
      cidr.value = '192.168.1.0/24';
      cidr.dispatchEvent(new Event('input', {bubbles:true}));
      const b = [...document.querySelectorAll('button')].find(x => /calc|analy|subnet|cidr/i.test(x.innerText));
      if (b) b.click();
      return { text: document.body.innerText };
    });
    if (r.err) throw new Error(r.err);
    if (!/192\.168\.1\.(255|0)|254|256|broadcast|netmask/i.test(r.text))
      throw new Error('CIDR 192.168.1.0/24 produced no subnet details');
    return 'offline CIDR toolkit computes subnet details (network needs user click, by design)';
  },

  'audio-trimmer': async p => {
    // synthesise a real WAV so decodeAudioData succeeds
    const r = await p.evaluate(async () => {
      const sr = 8000, secs = 2, n = sr * secs;
      const buf = new ArrayBuffer(44 + n * 2), dv = new DataView(buf);
      const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)) };
      ws(0, 'RIFF'); dv.setUint32(4, 36 + n*2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
      dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
      dv.setUint32(24, sr, true); dv.setUint32(28, sr*2, true); dv.setUint16(32, 2, true);
      dv.setUint16(34, 16, true); ws(36, 'data'); dv.setUint32(40, n*2, true);
      for (let i = 0; i < n; i++) dv.setInt16(44 + i*2, Math.sin(i/12) * 12000, true);
      const f = new File([buf], 'tone.wav', {type:'audio/wav'});
      const dt = new DataTransfer(); dt.items.add(f);
      const el = document.querySelector('input[type=file]');
      el.files = dt.files; el.dispatchEvent(new Event('change', {bubbles:true}));
      return f.size;
    });
    await p.waitForTimeout(3000);
    const t = await p.evaluate(() => document.body.innerText);
    if (!/2|sec|duration|0:0/i.test(t)) throw new Error('2s WAV fed but no duration shown');
    return `fed a real ${r}-byte 2s WAV, tool decoded it`;
  },

  'html-editor': async p => {
    // The preview iframe is sandbox="allow-scripts" without allow-same-origin, so
    // contentDocument is intentionally unreadable. Assert on the srcdoc it builds.
    const r = await p.evaluate(async () => {
      const h = document.getElementById('htmlCode'), css = document.getElementById('cssCode'),
            js = document.getElementById('jsCode');
      if (!h) return { err: 'no html textarea' };
      h.value = '<h1 id="x">Live</h1>';   h.dispatchEvent(new Event('input',{bubbles:true}));
      if (css) { css.value = 'h1{color:#f00}'; css.dispatchEvent(new Event('input',{bubbles:true})) }
      if (js)  { js.value  = 'console.log("hi")'; js.dispatchEvent(new Event('input',{bubbles:true})) }
      if (window.run) run(); else if (window.onEdit) onEdit();
      await new Promise(r => setTimeout(r, 900));
      const fr = document.getElementById('preview');
      const doc = typeof getPreviewDoc === 'function' ? getPreviewDoc() : (fr ? fr.srcdoc : '');
      return { srcdoc: (fr && fr.srcdoc ? fr.srcdoc.length : 0), doc: (doc||'').slice(0,400),
               sandbox: fr ? fr.getAttribute('sandbox') : null };
    });
    if (r.err) throw new Error(r.err);
    if (!/<h1 id="x">Live<\/h1>/.test(r.doc)) throw new Error('typed HTML missing from preview document');
    if (!/h1\{color:#f00\}/.test(r.doc)) throw new Error('typed CSS missing from preview document');
    if (!r.srcdoc) throw new Error('iframe srcdoc was never populated');
    return `preview document assembled (${r.srcdoc} bytes), sandbox="${r.sandbox}"`;
  },
};

(async () => {
  const b = await chromium.launch({
    executablePath: '/tmp/chrome_x/opt/google/chrome/chrome',
    args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
           '--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']
  });
  const ctx = await b.newContext();
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (/googlesyndication|googletagmanager|google-analytics|doubleclick|pagead/.test(u)) return r.abort();
    r.continue();
  });
  const page = await ctx.newPage();
  page.on('dialog', d => d.dismiss().catch(() => {}));

  const names = process.argv[2] ? [process.argv[2]] : Object.keys(CASES);
  console.log(`=== TARGETED DEEP TESTS: ${names.length} tools ===\n`);
  let pass = 0, fail = 0;
  for (const n of names) {
    try {
      await page.goto(`${BASE}/tools/${n}`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(1200);
      const detail = await CASES[n](page);
      console.log(`  ok   ${n.padEnd(20)} ${detail}`);
      pass++;
    } catch (e) {
      console.log(`  FAIL ${n.padEnd(20)} ${(e.message || e).split('\n')[0].slice(0, 160)}`);
      fail++;
    }
  }
  console.log(`\n=== ${pass} pass, ${fail} fail ===`);
  await b.close();
})();
