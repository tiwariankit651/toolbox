// Minimal static server for testing the site in a real browser
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = '/home/eiwantk/toolbox';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml',
  '.ico':'image/x-icon', '.webp':'image/webp', '.xml':'application/xml', '.txt':'text/plain',
  '.woff2':'font/woff2', '.wasm':'application/wasm' };

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let f = path.join(ROOT, p);
  // extensionless clean URLs, like Cloudflare Pages
  if (!fs.existsSync(f) && fs.existsSync(f + '.html')) f = f + '.html';
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  const ext = path.extname(f);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    // needed for any SharedArrayBuffer / worker heavy libs
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless'
  });
  fs.createReadStream(f).pipe(res);
}).listen(8099, () => console.log('serving on http://localhost:8099'));
