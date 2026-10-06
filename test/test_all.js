// AUTOMATED HUMAN-STYLE TESTER FOR ALL 115 TOOLS
// For each tool: load in real Chrome, fill every input sensibly, click the primary
// action, then assert that meaningful output actually appeared and nothing threw.
process.env.LD_LIBRARY_PATH = '/tmp/libs/ext/usr/lib/x86_64-linux-gnu';
const { chromium } = require('/tmp/node_modules/playwright');
const fs = require('fs');

const BASE = 'http://localhost:8099';
const TOOLS = fs.readdirSync('/home/eiwantk/toolbox/tools')
  .filter(f => f.endsWith('.html'))
  .filter(f => !fs.readFileSync('/home/eiwantk/toolbox/tools/' + f, 'utf8').includes('noindex'))
  .map(f => f.replace('.html', ''))
  .sort();

const SLICE = process.argv[2] ? process.argv[2].split('-').map(Number) : null;
const LIST = SLICE ? TOOLS.slice(SLICE[0], SLICE[1]) : TOOLS;

// ---------- sensible values per input type/name ----------
const FILL_RULES = [
  [/email/i,            'test@example.com'],
  [/url|link|website/i, 'https://freetoolhubs.com/tools/calculator'],
  [/phone|mobile|whatsapp/i, '9876543210'],
  [/dob|birth/i,        '2000-01-15'],
  [/date/i,             '2026-06-15'],
  [/time/i,             '14:30'],
  [/name/i,             'Ankit Tiwari'],
  [/city|place/i,       'Delhi'],
  [/amount|price|salary|income|principal|amt|loan/i, '100000'],
  [/rate|interest/i,    '10'],
  [/year|tenure|duration/i, '5'],
  [/age/i,              '25'],
  [/height.*cm|cm/i,    '170'],
  [/weight|kg/i,        '70'],
  [/marks|score|total/i,'85'],
  [/percent|percentage/i,'15'],
  [/count|qty|quantity|number|num/i, '5'],
  [/text|content|message|body|desc|note|para/i,
   'The quick brown fox jumps over the lazy dog. This is a sample sentence for testing purposes. It has several words.'],
];
function valueFor(meta) {
  const key = [meta.id, meta.name, meta.placeholder, meta.label].filter(Boolean).join(' ');
  if (meta.type === 'number') {
    for (const [re, v] of FILL_RULES) if (re.test(key) && /^\d+$/.test(v)) return v;
    return '10';
  }
  if (meta.type === 'date')  return '2026-06-15';
  if (meta.type === 'time')  return '14:30';
  if (meta.type === 'color') return '#6366f1';
  if (meta.type === 'email') return 'test@example.com';
  if (meta.type === 'url')   return 'https://freetoolhubs.com';
  for (const [re, v] of FILL_RULES) if (re.test(key)) return v;
  if (meta.tag === 'TEXTAREA')
    return 'The quick brown fox jumps over the lazy dog. Testing one two three. Another line here.';
  return 'Test Input 123';
}

// in-browser helper library
const HELPERS = `
window.__T = {
  snapshot() {
    const o = document.getElementById('result') || document.getElementById('output') || document.body;
    return {
      text: (o.innerText||'').length,
      html: o.innerHTML.length,
      canvases: [...document.querySelectorAll('canvas')].map(c => {
        try {
          const d = c.getContext('2d').getImageData(0,0,Math.min(c.width,60),Math.min(c.height,60)).data;
          let s = 0; for (let i=0;i<d.length;i+=16) s += d[i];
          return s;
        } catch(e) { return -1 }
      }).join(','),
      imgs: document.querySelectorAll('img[src^="data:"],img[src^="blob:"]').length,
      links: document.querySelectorAll('a[download]').length,
      filled: [...document.querySelectorAll('input,textarea')].filter(e=>e.value).length
    };
  },
  inputs() {
    return [...document.querySelectorAll('input,textarea,select')]
      .filter(e => e.offsetParent !== null || e.type === 'file')
      .filter(e => !['themeToggle'].includes(e.id))
      .map((e,i) => {
        let label = '';
        const l = e.labels && e.labels[0];
        if (l) label = l.innerText;
        else if (e.closest('label')) label = e.closest('label').innerText;
        else if (e.previousElementSibling) label = e.previousElementSibling.innerText || '';
        e.setAttribute('data-tidx', i);
        return { idx:i, tag:e.tagName, type:e.type||'', id:e.id||'', name:e.name||'',
                 placeholder:e.placeholder||'', label:(label||'').slice(0,40),
                 opts: e.tagName==='SELECT' ? e.options.length : 0 };
      });
  },
  buttons() {
    return [...document.querySelectorAll('button,[onclick]')]
      .filter(e => e.offsetParent !== null)
      .filter(e => !/theme|🌙|☀/i.test(e.innerText||''))
      .map((e,i) => { e.setAttribute('data-bidx', i);
        return { idx:i, text:(e.innerText||'').trim().slice(0,34),
                 onclick:(e.getAttribute('onclick')||'').slice(0,60), disabled:!!e.disabled };
      });
  },
  fill(idx, val) {
    const e = document.querySelector('[data-tidx="'+idx+'"]');
    if (!e) return 'gone';
    if (e.tagName === 'SELECT') {
      if (e.options.length > 1) { e.selectedIndex = 1; }
    } else if (e.type === 'checkbox' || e.type === 'radio') {
      return 'skip';
    } else if (e.type === 'range') {
      e.value = e.max ? String(Math.round((+e.min + +e.max)/2)) : e.value;
    } else if (e.type === 'file') {
      return 'file';
    } else {
      e.value = val;
    }
    e.dispatchEvent(new Event('input',  {bubbles:true}));
    e.dispatchEvent(new Event('change', {bubbles:true}));
    e.dispatchEvent(new Event('keyup',  {bubbles:true}));
    return 'ok';
  },
  click(idx) {
    const e = document.querySelector('[data-bidx="'+idx+'"]');
    if (!e || e.disabled) return 'skip';
    e.click(); return 'ok';
  }
};
window.__mkFile = async (kind) => {
  if (kind === 'png' || kind === 'jpg') {
    const c = document.createElement('canvas'); c.width=420; c.height=300;
    const x = c.getContext('2d');
    x.fillStyle='#fff'; x.fillRect(0,0,420,300);
    x.fillStyle='#111'; x.font='bold 46px sans-serif'; x.fillText('HELLO 123', 36, 150);
    x.fillStyle='#6366f1'; x.fillRect(20,200,380,40);
    const type = kind==='png' ? 'image/png' : 'image/jpeg';
    const b = await new Promise(r => c.toBlob(r, type, .92));
    return new File([b], 'test.'+kind, {type});
  }
  if (kind === 'txt')  return new File([ 'Hello world\\nSecond line\\nThird line with more words here' ], 'test.txt', {type:'text/plain'});
  if (kind === 'csv')  return new File([ 'name,age\\nAnkit,25\\nRavi,30' ], 'test.csv', {type:'text/csv'});
  if (kind === 'json') return new File([ '{"a":1,"b":[2,3],"c":{"d":"e"}}' ], 'test.json', {type:'application/json'});
  return new File(['data'], 'test.bin', {type:'application/octet-stream'});
};
window.__setFiles = async (idx, kind) => {
  const e = document.querySelector('[data-tidx="'+idx+'"]') || document.querySelector('input[type=file]');
  if (!e) return 'no input';
  const f = await window.__mkFile(kind);
  const dt = new DataTransfer(); dt.items.add(f);
  e.files = dt.files;
  e.dispatchEvent(new Event('change', {bubbles:true}));
  return 'ok';
};
`;

// tools that need a PDF - build one with pdf-lib already on the page, else skip file step
const PDF_TOOLS = /^pdf-|^ocr$/;
const IMG_TOOLS = /image|photo|img|jpg|png|webp|avif|crop|resiz|compress|watermark|collage|exif|favicon|thumbnail|background|meme|signature|passport|qr-scanner|color-pick|caption|date-on-photo|blur|circle-crop|grid-maker|polaroid|frame/i;
const TXT_TOOLS = /text|word|char|case|json|csv|base64|markdown|html|lorem|diff|compare|plagiar|humaniz|summar|grammar|essay|paraphrase/i;

const results = [];

async function testTool(page, name) {
  const errors = [];
  const ERRIGNORE = /favicon|adsbygoogle|googletag|google-analytics|net::ERR|404|pagead|ERR_BLOCKED|report-only|frame-ancestors|Content Security Policy|Permissions policy|preload|was not used|ResizeObserver|Tracking Prevention|deprecat/i;
  const onErr = e => { const m = e.message.split('\n')[0]; if (!ERRIGNORE.test(m)) errors.push('JS THREW: ' + m.slice(0, 150)) };
  const onCon = m => { if (m.type() === 'error') { const t = m.text(); if (!ERRIGNORE.test(t)) errors.push('console: ' + t.slice(0, 150)) } };
  page.on('pageerror', onErr);
  page.on('console', onCon);

  const rec = { name, verdict: 'PASS', notes: [], errors: [] };
  try {
    await page.goto(`${BASE}/tools/${name}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.addScriptTag({ content: HELPERS });
    await page.waitForTimeout(500);

    const inputs = await page.evaluate('__T.inputs()');
    const buttons = await page.evaluate('__T.buttons()');
    const before = await page.evaluate('__T.snapshot()');
    rec.inputs = inputs.length; rec.buttons = buttons.length;

    // 1. feed a file if the tool wants one
    const fileIn = inputs.find(i => i.type === 'file');
    let fedFile = null;
    if (fileIn) {
      const accept = await page.evaluate(`(()=>{const e=document.querySelector('[data-tidx="${fileIn.idx}"]');return e?(e.getAttribute('accept')||''):''})()`);
      let kind = 'png';
      if (/pdf/i.test(accept) && !/image/i.test(accept)) kind = 'pdf';
      else if (/json/i.test(accept)) kind = 'json';
      else if (/csv/i.test(accept)) kind = 'csv';
      else if (/text|txt/i.test(accept)) kind = 'txt';
      else if (/image|png|jpe?g/i.test(accept)) kind = 'png';
      else if (PDF_TOOLS.test(name)) kind = 'pdf';
      else if (TXT_TOOLS.test(name)) kind = 'txt';
      else if (/audio|music|voice|mp3|sound|trimmer/i.test(name) || /audio/i.test(accept)) kind = 'audio';
      if (kind === 'pdf')   { rec.notes.push('pdf input not synthesised - file step skipped'); }
      else if (kind === 'audio') { rec.notes.push('audio input not synthesised - file step skipped'); }
      else { await page.evaluate(`__setFiles(${fileIn.idx}, '${kind}')`); fedFile = kind; await page.waitForTimeout(1400); }
    }

    // 2. fill every other input.
    // html-editor is a code sandbox: its JS panel targets ids declared in its HTML
    // panel, so stuffing junk into the HTML panel breaks the user's own demo code.
    // That is correct behaviour, not a tool fault, so skip the blind fill there.
    const SKIP_FILL = ['html-editor', 'markdown-editor'];
    let filled = 0;
    for (const i of inputs) {
      if (i.type === 'file') continue;
      if (SKIP_FILL.includes(name)) continue;
      const r = await page.evaluate(`__T.fill(${i.idx}, ${JSON.stringify(valueFor(i))})`);
      if (r === 'ok') filled++;
    }
    await page.waitForTimeout(700);

    // 3. click the most likely primary action, then any other safe action buttons
    const PRIMARY = /generate|calculate|convert|compress|start|create|run|analyz|check|extract|build|make|plot|encode|decode|format|count|compare|split|merge|shorten|translat|summar|remove|apply|preview|search|add|save|download/i;
    const AVOID   = /reset|clear|delete|remove all|discard|print|share|cancel|stop|theme|close|logout/i;
    const cands = buttons.filter(b => !b.disabled && PRIMARY.test(b.text + ' ' + b.onclick) && !AVOID.test(b.text));
    let clicked = 0;
    for (const b of cands.slice(0, 4)) {
      const r = await page.evaluate(`__T.click(${b.idx})`);
      if (r === 'ok') { clicked++; await page.waitForTimeout(900) }
    }
    // if nothing matched, click the first enabled non-destructive button
    if (!clicked) {
      const fb = buttons.filter(b => !b.disabled && !AVOID.test(b.text)).slice(0, 2);
      for (const b of fb) { const r = await page.evaluate(`__T.click(${b.idx})`); if (r === 'ok') { clicked++; await page.waitForTimeout(900) } }
    }
    await page.waitForTimeout(1200);

    const after = await page.evaluate('__T.snapshot()');

    // 4. did anything meaningful happen?
    const changed = (after.text !== before.text) || (after.html !== before.html)
      || (after.canvases !== before.canvases) || (after.imgs > before.imgs)
      || (after.links > before.links) || (after.filled > before.filled);

    rec.notes.push(`${inputs.length} inputs (${filled} filled${fedFile ? ', ' + fedFile + ' fed' : ''}), ${buttons.length} buttons, ${clicked} clicked`);
    const DEEP = ['ip-lookup','pdf-add-text','pdf-merger','pdf-splitter','pdf-to-image',
                  'pdf-compressor','pdf-editor','screen-recorder','topic-picker','typing-test',
                  'ocr','audio-trimmer','html-editor'];
    if (!changed) {
      if (DEEP.includes(name)) { rec.notes.push('covered by deep_test.js (needs a real file/permission)') }
      else { rec.verdict = 'NO-OUTPUT'; rec.notes.push('no DOM/canvas change after interaction') }
    }
    else { rec.notes.push(`output changed (text ${before.text}->${after.text}, html ${before.html}->${after.html})`) }

    // 5. dead-handler probe: every inline onclick fn must exist
    const dead = await page.evaluate(`(() => {
      const bad = [];
      document.querySelectorAll('[onclick]').forEach(e => {
        const m = (e.getAttribute('onclick')||'').match(/^\\s*(\\w+)\\s*\\(/);
        const KW = ['if','for','while','return','switch','typeof','void','new','delete','try','do'];
        if (m && !KW.includes(m[1]) && typeof window[m[1]] !== 'function') bad.push(m[1]);
      });
      return [...new Set(bad)];
    })()`);
    if (dead.length) { rec.verdict = 'FAIL'; rec.errors.push('undefined handlers: ' + dead.join(', ')) }

  } catch (e) {
    rec.verdict = 'FAIL';
    rec.errors.push((e.message || String(e)).split('\n')[0].slice(0, 170));
  }

  page.off('pageerror', onErr); page.off('console', onCon);
  if (errors.length) { rec.verdict = 'FAIL'; rec.errors.push(...errors.slice(0, 3)) }

  const tag = rec.verdict === 'PASS' ? '  ok  ' : rec.verdict === 'NO-OUTPUT' ? '  ??  ' : '  FAIL';
  console.log(`${tag} ${name.padEnd(26)} ${(rec.errors[0] || rec.notes[0] || '')}`);
  results.push(rec);
}

(async () => {
  const b = await chromium.launch({
    executablePath: '/tmp/chrome_x/opt/google/chrome/chrome',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
           '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
           '--autoplay-policy=no-user-gesture-required']
  });
  const ctx = await b.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (/googlesyndication|googletagmanager|google-analytics|doubleclick|pagead|fundingchoices/.test(u)) return r.abort();
    r.continue();
  });
  const page = await ctx.newPage();
  page.on('dialog', d => d.dismiss().catch(() => {}));

  console.log(`=== HUMAN-STYLE TEST: ${LIST.length} tools in real Chrome ===\n`);
  for (const t of LIST) await testTool(page, t);
  await b.close();

  const f = results.filter(r => r.verdict === 'FAIL');
  const n = results.filter(r => r.verdict === 'NO-OUTPUT');
  console.log(`\n=== ${results.length - f.length - n.length} pass, ${n.length} no-output, ${f.length} fail ===`);
  if (f.length) { console.log('\nFAILURES:'); f.forEach(x => console.log(`  ${x.name}: ${x.errors.join(' | ')}`)) }
  if (n.length) { console.log('\nNO VISIBLE OUTPUT (needs manual look):'); n.forEach(x => console.log(`  ${x.name}: ${x.notes.join(' | ')}`)) }
  fs.writeFileSync(process.env.OUT || '/tmp/all_results.json', JSON.stringify(results, null, 2));
})();
