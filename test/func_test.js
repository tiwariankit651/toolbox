// Functional tests: verify real logic produces correct output (beyond "does it load")
const fs = require('fs');
const vm = require('vm');

let pass = 0, fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}  got=${JSON.stringify(actual)} want=${JSON.stringify(expected)}`); }
}

function extractJs(tool) {
  const c = fs.readFileSync(`tools/${tool}.html`, 'utf8');
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
  let m, js = '';
  while ((m = re.exec(c))) {
    if (m[1].includes('src=') || m[1].includes('ld+json')) continue;
    if (m[2].length > js.length) js = m[2];
  }
  return { html: c, js };
}

// pull one function's source out and run it standalone
function grabFn(tool, name) {
  const { js } = extractJs(tool);
  const i = js.search(new RegExp(`function\\s+${name}\\s*\\(`));
  if (i < 0) return null;
  let depth = 0, start = js.indexOf('{', i), end = -1;
  for (let k = start; k < js.length; k++) {
    if (js[k] === '{') depth++;
    else if (js[k] === '}') { depth--; if (depth === 0) { end = k; break } }
  }
  if (end < 0) return null;
  const ctx = { console, Math, JSON, parseInt, parseFloat, isNaN, Number, String, Array, Object, Date, RegExp };
  ctx.window = ctx;
  try {
    vm.runInNewContext(js.slice(i, end + 1) + `;__r=${name};`, ctx, { timeout: 2000 });
    return ctx.__r;
  } catch (e) { return null }
}

// balanced-bracket extract of a literal (array or object) after a marker
function grabLiteral(file, marker, open, close) {
  const c = fs.readFileSync(file, 'utf8');
  const s = c.indexOf(marker);
  if (s < 0) return null;
  const a = c.indexOf(open, s);
  let d = 0, end = -1, inS = false, q = null, esc = false;
  for (let i = a; i < c.length; i++) {
    const ch = c[i];
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (inS) { if (ch === q) inS = false; continue }
    if (ch === '"' || ch === "'") { inS = true; q = ch; continue }
    if (ch === open) d++;
    else if (ch === close) { d--; if (d === 0) { end = i; break } }
  }
  if (end < 0) return null;
  try { return vm.runInNewContext('(' + c.slice(a, end + 1) + ')') } catch (e) { return null }
}

console.log('=== FUNCTIONAL TESTS ===\n');

console.log('pdf-compressor — page range parser:');
{
  const parseRange = grabFn('pdf-compressor', 'parseRange');
  if (!parseRange) { console.log('  FAIL could not extract parseRange'); fail++; }
  else {
    check('blank means all pages', parseRange('', 5), [1, 2, 3, 4, 5]);
    check('single pages', parseRange('1,3', 5), [1, 3]);
    check('range expands', parseRange('2-4', 5), [2, 3, 4]);
    check('mixed list+range', parseRange('1,3-5', 6), [1, 3, 4, 5]);
    check('out-of-bounds clamped', parseRange('1,99', 3), [1]);
    check('reversed range handled', parseRange('4-2', 5), [2, 3, 4]);
    check('duplicates removed', parseRange('1-3,2', 5), [1, 2, 3]);
    check('garbage ignored', parseRange('abc,2', 5), [2]);
  }
}

console.log('\ncalculator — no eval on user input:');
{
  const { js } = extractJs('calculator');
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  check('no eval(', /\beval\s*\(/.test(code), false);
  check('no new Function(', /new\s+Function\s*\(/.test(code), false);
  check('has its own parser', /token|parseExpr|shunting/i.test(code), true);
}

console.log('\ngraph-plotter — no eval on user input:');
{
  const { js } = extractJs('graph-plotter');
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  check('no eval(', /\beval\s*\(/.test(code), false);
  check('no new Function(', /new\s+Function\s*\(/.test(code), false);
}

console.log('\npassword-generator — uses crypto, not Math.random:');
{
  const { js } = extractJs('password-generator');
  check('uses crypto.getRandomValues', /crypto\.getRandomValues/.test(js), true);
}

console.log('\ncoin-flip — uses crypto:');
{
  const { html } = extractJs('coin-flip');
  check('uses crypto.getRandomValues', /crypto\.getRandomValues/.test(html), true);
}

console.log('\nquiz-maker — question bank integrity:');
{
  const rq = grabLiteral('tools/quiz-maker.html', 'var readyQuizzes=', '{', '}');
  if (!rq) { console.log('  FAIL could not parse readyQuizzes'); fail++; }
  else {
    let total = 0, bad = 0;
    for (const k in rq) for (const it of rq[k]) {
      total++;
      if (!Array.isArray(it.o) || it.o.length !== 4) bad++;
      else if (!Number.isInteger(it.c) || it.c < 0 || it.c > 3) bad++;
      else if (!it.q || !it.e) bad++;
    }
    check(`all ${total} questions well-formed`, bad, 0);
    check('30+ topics', Object.keys(rq).length >= 30, true);
  }
}

console.log('\nperiodic-table — element data integrity:');
{
  const E = grabLiteral('tools/periodic-table.html', 'var E=[', '[', ']');
  if (!E) { console.log('  FAIL could not parse element array'); fail++; }
  else {
    check('118 elements', E.length, 118);
    check('atomic numbers 1-118 complete', new Set(E.map(e => e[0])).size, 118);
    check('every row has 14 fields', E.every(e => e.length === 14), true);
    check('last element is Oganesson', E[E.length - 1][2], 'Oganesson');
    check('hydrogen is first', E[0][2], 'Hydrogen');
  }
}

console.log('\ncontent banks — size checks:');
{
  const fsheet = fs.readFileSync('tools/formula-sheet.html', 'utf8');
  const entries = (fsheet.match(/\{s:"/g) || []).length;
  const concepts = (fsheet.match(/,c:"/g) || []).length;
  check('formula-sheet has 700+ formulas', entries >= 700, true);
  check('every formula has a concept note', concepts >= entries, true);

  const vocab = fs.readFileSync('tools/vocab-builder.html', 'utf8');
  check('vocab-builder has 600+ words', (vocab.match(/\{w:"/g) || []).length >= 600, true);
}

console.log('\nexams.json — data integrity:');
{
  const ex = JSON.parse(fs.readFileSync('data/exams.json', 'utf8'));
  check('90 exams', ex.exams.length, 90);
  const REQ = ['id', 'name', 'cat', 'website', 'officialNotificationUrl', 'stages', 'syllabusOutline', 'prepTips', 'relatedTools'];
  check('all have required fields', ex.exams.filter(e => REQ.some(k => !(k in e))).length, 0);
  check('all websites are real URLs', ex.exams.filter(e => !/^https?:\/\//.test(e.website)).length, 0);
  check('no duplicate ids', new Set(ex.exams.map(e => e.id)).size, ex.exams.length);
  const toolFiles = new Set(fs.readdirSync('tools').filter(f => f.endsWith('.html')).map(f => f.replace('.html', '')));
  const badTool = [];
  ex.exams.forEach(e => e.relatedTools.forEach(t => { if (!toolFiles.has(t)) badTool.push(t) }));
  check('all relatedTools slugs point to real tools', [...new Set(badTool)], []);
}

console.log('\nglobal-name safety (the bug that killed speech-to-text):');
{
  const RESERVED = ['rec', 'history', 'name', 'status', 'length', 'top', 'closed', 'origin', 'event', 'self'];
  const offenders = [];
  for (const f of fs.readdirSync('tools').filter(x => x.endsWith('.html'))) {
    const c = fs.readFileSync('tools/' + f, 'utf8');
    if (c.includes('noindex')) continue;
    const { js } = extractJs(f.replace('.html', ''));
    // track brace depth so we only flag TRUE top-level declarations
    let depth = 0;
    for (const line of js.split('\n')) {
      const m = line.trim().match(/^(?:var|let|const)\s+(\w+)/);
      if (m && depth === 0 && RESERVED.includes(m[1])) {
        offenders.push(`${f.replace('.html','')}:${m[1]}`);
      }
      for (const ch of line) { if (ch === '{') depth++; else if (ch === '}') depth--; }
    }
  }
  check('no tool declares a window global at top level', offenders, []);
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
