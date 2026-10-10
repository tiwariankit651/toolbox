// Shared utilities
function toggleTheme(){document.body.classList.toggle('light');document.getElementById('themeToggle').textContent=document.body.classList.contains('light')?'☀️':'🌙';try{localStorage.setItem('theme',document.body.classList.contains('light')?'light':'dark')}catch(e){}document.querySelectorAll('canvas').forEach(function(c){if(c.style.background==='#fff'||c.style.background==='white')c.style.background=document.body.classList.contains('light')?'#fff':'#fff'})}
try{if(localStorage.getItem('theme')==='light')document.body.classList.add('light')}catch(e){}
function copyText(t,btn){navigator.clipboard.writeText(t);if(btn){btn.textContent='Copied!';setTimeout(()=>btn.textContent='Copy',1000)}}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();var t=document.createElement('div');t.textContent='🎉 Downloaded: '+name;t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#4caf50;color:#fff;padding:.6rem 1.2rem;border-radius:8px;font-size:.9rem;font-weight:600;z-index:9999;animation:fadeUp .3s ease';document.body.appendChild(t);setTimeout(function(){t.remove()},2500);if(!document.getElementById('toastCSS')){var s=document.createElement('style');s.id='toastCSS';s.textContent='@keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';document.head.appendChild(s)}}
/* Shared rejection handler for loadImage chains. Without one, a corrupt file
   turns into an unhandled promise rejection, which is exactly as silent for the
   user as the old never-settling promise was. */
function imgError(err){
  notify((err && err.message) ? err.message : 'That image could not be read.', 'error');
  var el = document.getElementById('result') || document.getElementById('output');
  if (el && !el.innerHTML.trim()) {
    el.innerHTML = '<p class="info" style="color:var(--danger)">' +
      ((err && err.message) ? String(err.message) : 'That image could not be read.') + '</p>';
  }
}

/* A corrupt or non-image file fires onerror, never onload. Without an onerror
   handler this promise never settled at all, so every caller's .then() simply
   never ran and the tool sat there with no output and no message. */
function loadImage(file){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    const clean=()=>{try{URL.revokeObjectURL(url)}catch(e){}};
    img.onload=()=>{clean();resolve(img)};
    img.onerror=()=>{
      clean();
      reject(new Error('"'+(file&&file.name?file.name:'that file')+'" is not a readable image. '+
                       'Try a PNG, JPG or WEBP file.'));
    };
    img.src=url;
  });
}
function formatSize(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB'}
function setupDrop(dropId,inputId,cb){const drop=document.getElementById(dropId),inp=document.getElementById(inputId);if(!drop||!inp)return;drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragover')});drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragover');cb(e.dataTransfer.files)});inp.addEventListener('change',()=>cb(inp.files))}

// Register Service Worker for offline support & speed
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js?v=4').then(function(reg){if(reg.waiting)reg.waiting.postMessage('skipWaiting');reg.addEventListener('updatefound',function(){var sw=reg.installing;if(sw)sw.addEventListener('statechange',function(){if(sw.state==='installed'&&navigator.serviceWorker.controller)sw.postMessage('skipWaiting')})})}).catch(()=>{});

// Offline banner
window.addEventListener('online',function(){var ob=document.getElementById('offlineBanner');if(ob)ob.remove()});
window.addEventListener('offline',function(){if(!document.getElementById('offlineBanner')){var b=document.createElement('div');b.id='offlineBanner';b.style.cssText='position:fixed;top:0;left:0;right:0;background:#ff9800;color:#fff;text-align:center;padding:8px;font-size:.85rem;font-weight:600;z-index:9999';b.textContent='📴 You are offline — this tool still works! Your files stay on your device.';document.body.appendChild(b)}});
// Show offline tip once (lazy loaded)
setTimeout(function(){
if(!storeGetRaw('offlineTipShown', null)&&document.querySelector('.tool-section h1')&&!document.querySelector('.tools-grid')){setTimeout(function(){var tip=document.createElement('div');tip.style.cssText='position:fixed;bottom:80px;right:20px;background:var(--card);border:1px solid var(--accent);padding:1rem;border-radius:12px;max-width:280px;z-index:9998;box-shadow:0 4px 20px rgba(0,0,0,.3)';tip.innerHTML='<div style="font-weight:600;margin-bottom:.3rem">💡 Did you know?</div><div style="font-size:.85rem;color:var(--muted)">This tool works offline! Bookmark it for use without internet.</div><button onclick="this.parentElement.remove();storeSetRaw(\'offlineTipShown\', \'1\', true)" style="margin-top:.5rem;padding:.3rem .8rem;border:none;background:var(--accent);color:#fff;border-radius:6px;cursor:pointer;font-size:.8rem">Got it!</button>';document.body.appendChild(tip)},3000)}
},2000);

// Track recently used tools
if(document.querySelector('.tool-section h1')&&!document.querySelector('.tools-grid')){var path=window.location.pathname.replace('/tools/','').replace('.html','').replace('/','');if(path&&path!==''){var _recentList=storeGet('recentTools', []);_recentList=_recentList.filter(function(r){return r!==path});_recentList.unshift(path);_recentList=_recentList.slice(0,8);storeSet('recentTools', _recentList, true)}}

// Privacy badge + Share button on tool pages
if(document.querySelector('.tool-section h1')&&!document.querySelector('.tools-grid')){
  var h1=document.querySelector('.tool-section h1');
  if(h1){
    var badge=document.createElement('div');
    badge.style.cssText='display:inline-flex;align-items:center;gap:4px;font-size:.75rem;padding:.3rem .6rem;background:rgba(76,175,80,.15);color:#4caf50;border-radius:6px;margin-top:.5rem;font-weight:600';
    badge.innerHTML='🔒 100% Private — No uploads to server';
    h1.parentNode.insertBefore(badge,h1.nextSibling);
    var offBadge=document.createElement('div');
    offBadge.style.cssText='display:inline-flex;align-items:center;gap:4px;font-size:.7rem;padding:.2rem .5rem;background:rgba(79,140,255,.12);color:var(--accent);border-radius:6px;margin-top:.3rem;margin-left:.3rem';
    offBadge.innerHTML='🔋 Works offline after first visit';
    badge.parentNode.insertBefore(offBadge,badge.nextSibling);
    var shareDiv=document.createElement('div');
    shareDiv.style.cssText='margin-top:.8rem;display:flex;gap:6px;flex-wrap:wrap';
    var url=window.location.href;
    var title=document.title;
    shareDiv.innerHTML='<button onclick="if(navigator.share)navigator.share({title:document.title,url:location.href});else{navigator.clipboard.writeText(location.href);this.textContent=\'Copied!\'}" style="padding:.4rem .8rem;border:1px solid var(--border);border-radius:6px;background:none;color:var(--text);cursor:pointer;font-size:.8rem">📤 Share Tool</button><a href="https://wa.me/?text='+encodeURIComponent(title+' '+url)+'" target="_blank" style="padding:.4rem .8rem;border:1px solid #25d366;border-radius:6px;color:#25d366;font-size:.8rem;text-decoration:none">💬 WhatsApp</a><a href="https://twitter.com/intent/tweet?text='+encodeURIComponent(title)+' '+encodeURIComponent(url)+'" target="_blank" style="padding:.4rem .8rem;border:1px solid #1da1f2;border-radius:6px;color:#1da1f2;font-size:.8rem;text-decoration:none">🐦 Twitter</a><a href="https://freetoolhubs.com/tools/whatsapp-direct.html" style="padding:.4rem .8rem;border:1px solid #25d366;border-radius:6px;color:#25d366;font-size:.8rem;text-decoration:none">💬 Send via WhatsApp Direct</a>';
    h1.parentNode.insertBefore(shareDiv,badge.nextSibling);

    // Related Tools section
    var relatedMap={image:['image-compressor','image-resizer','image-converter','image-cropper','png-to-jpg','jpg-to-png','webp-converter','image-watermark'],text:['word-counter','text-formatter','case-converter','lorem-generator','text-diff','markdown-editor','slug-generator','text-to-speech'],dev:['json-formatter','base64','color-picker','regex-tester','html-minifier','css-minifier','js-minifier','code-beautifier'],file:['pdf-merge','pdf-compress','file-converter','csv-to-json','zip-extractor','file-hash','qr-generator','barcode-generator'],media:['video-compressor','audio-trimmer','gif-maker','screen-recorder','video-to-gif','audio-converter','mp3-cutter','video-resizer'],seo:['meta-generator','sitemap-generator','robots-txt','og-image','keyword-density','seo-analyzer','schema-generator','redirect-checker'],calc:['percentage-calculator','age-calculator','bmi-calculator','unit-converter','tip-calculator','loan-calculator','date-calculator','time-zone-converter'],social:['whatsapp-direct','instagram-downloader','youtube-thumbnail','twitter-card','hashtag-generator','social-image-resizer','bio-generator','link-shortener']};
    var curPath=window.location.pathname.replace('/tools/','').replace('.html','').replace('/','');
    var relatedTools=[];
    Object.keys(relatedMap).forEach(function(cat){if(relatedMap[cat].indexOf(curPath)>-1){relatedTools=relatedMap[cat].filter(function(t){return t!==curPath}).slice(0,4)}});
    if(!relatedTools.length){var allTools=[];Object.keys(relatedMap).forEach(function(cat){allTools=allTools.concat(relatedMap[cat])});relatedTools=allTools.filter(function(t){return t!==curPath}).sort(function(){return .5-Math.random()}).slice(0,4)}
    if(relatedTools.length){var relDiv=document.createElement('div');relDiv.style.cssText='margin-top:1.5rem;padding:1rem;background:var(--card);border:1px solid var(--border);border-radius:10px';relDiv.innerHTML='<div style="font-weight:600;margin-bottom:.5rem;font-size:.9rem">🔗 Related Tools</div><div style="display:flex;flex-wrap:wrap;gap:8px">'+relatedTools.map(function(t){return'<a href="/tools/'+t+'.html" style="padding:.4rem .8rem;background:rgba(79,140,255,.1);color:var(--accent);border-radius:6px;font-size:.8rem;text-decoration:none">'+t.replace(/-/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase()})+'</a>'}).join('')+'</div>';shareDiv.parentNode.insertBefore(relDiv,shareDiv.nextSibling);

      // Feedback button
      var fbDiv=document.createElement('div');fbDiv.style.cssText='margin-top:.8rem;display:flex;align-items:center;gap:10px;font-size:.85rem';var fbKey='feedback_'+curPath;var stored=storeGet(fbKey, {up:0,down:0});fbDiv.innerHTML='<span>Was this helpful?</span><button id="fbUp" style="border:none;background:none;cursor:pointer;font-size:1.1rem">👍</button><span id="fbUpC">'+stored.up+'</span><button id="fbDown" style="border:none;background:none;cursor:pointer;font-size:1.1rem">👎</button><span id="fbDownC">'+stored.down+'</span>';relDiv.parentNode.insertBefore(fbDiv,relDiv.nextSibling);
      document.getElementById('fbUp').onclick=function(){stored.up++;storeSet(fbKey, stored, true);document.getElementById('fbUpC').textContent=stored.up};
      document.getElementById('fbDown').onclick=function(){stored.down++;storeSet(fbKey, stored, true);document.getElementById('fbDownC').textContent=stored.down};
    }
  }
}

// Processing spinner helper
window.showProcessing=function(el){if(typeof el==='string')el=document.getElementById(el);if(el)el.innerHTML='<div style="text-align:center;padding:2rem"><div style="display:inline-block;width:30px;height:30px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite"></div><p class="info" style="margin-top:.5rem">Processing...</p></div>';if(!document.getElementById('spinCSS')){var s=document.createElement('style');s.id='spinCSS';s.textContent='@keyframes spin{to{transform:rotate(360deg)}}';document.head.appendChild(s)}};

// Large file warning
window.checkFileSize=function(files,maxMB){maxMB=maxMB||50;var total=0;Array.from(files).forEach(function(f){total+=f.size});if(total>maxMB*1024*1024){return confirm('Total file size is '+(total/1024/1024).toFixed(1)+'MB. Large files may slow your browser. Continue?')}return true};

// Memory cleanup after heavy processing
window.cleanupMemory=function(){if(window.gc)window.gc();var imgs=document.querySelectorAll('img[src^="blob:"]');imgs.forEach(function(img){URL.revokeObjectURL(img.src)})};
setInterval(function(){var mem=performance&&performance.memory?performance.memory.usedJSHeapSize:0;if(mem>200*1024*1024)cleanupMemory()},30000);

// Global error handler for tools
window.addEventListener('error',function(e){console.error('Tool error:',e.message);var result=document.getElementById('result');if(result&&!result.innerHTML.includes('error')){result.innerHTML+='<p style="color:#f44336;margin-top:.5rem">❌ Error: '+e.message+'. Try a different file or refresh the page.</p>'}});
window.addEventListener('unhandledrejection',function(e){console.error('Async error:',e.reason);var result=document.getElementById('result');if(result){result.innerHTML='<p style="color:#f44336">❌ Processing failed. The file may be corrupted or too large. Try a smaller file.</p>'}});

// Cookie Consent Banner (lazy loaded)
setTimeout(function(){
if(!storeGetRaw('cookieConsent', null)){const d=document.createElement('div');d.id='cookieConsent';d.innerHTML='<p>We use cookies and third-party services (Google Analytics, AdSense) to improve your experience and show relevant ads. By continuing, you agree to our <a href="/privacy.html" style="color:#4fc3f7">Privacy Policy</a>.</p><button id="acceptCookies">Accept</button><button id="rejectCookies" style="background:transparent;color:#fff;border:1px solid #fff;margin-left:8px">Reject</button>';d.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#222;color:#fff;padding:16px;display:flex;align-items:center;justify-content:center;gap:12px;z-index:9999;font-size:14px';d.querySelector('#acceptCookies').style.cssText='background:#4fc3f7;color:#000;border:none;padding:8px 20px;border-radius:4px;cursor:pointer;font-weight:bold';document.body.appendChild(d);d.querySelector('#acceptCookies').onclick=()=>{storeSetRaw('cookieConsent', 'accepted', true);d.remove()};d.querySelector('#rejectCookies').onclick=()=>{storeSetRaw('cookieConsent', 'rejected', true);d.remove()}}
},2000);

// Favorites feature (lazy loaded)
setTimeout(function(){
function toggleFav(toolName){var favs=storeGet('favTools', []);var idx=favs.indexOf(toolName);if(idx>-1)favs.splice(idx,1);else favs.push(toolName);storeSet('favTools', favs, true);updateAllHearts();refreshFavSection()}
function updateAllHearts(){var favs=storeGet('favTools', []);document.querySelectorAll('[data-fav]').forEach(function(btn){btn.textContent=favs.indexOf(btn.getAttribute('data-fav'))>-1?'❤️':'🤍'})}
function refreshFavSection(){var favs=storeGet('favTools', []);var sec=document.getElementById('favSection');var grid=document.getElementById('favGrid');if(!sec||!grid)return;if(!favs.length){sec.style.display='none';return}sec.style.display='block';grid.innerHTML='';document.querySelectorAll('.tool-card[href]').forEach(function(card){var href=card.getAttribute('href');if(!href)return;var name=href.replace('tools/','').replace('.html','');if(favs.indexOf(name)>-1){var clone=card.cloneNode(true);var heart=clone.querySelector('[data-fav]');if(heart)heart.remove();grid.appendChild(clone)}})}
window.toggleFav=toggleFav;window.updateAllHearts=updateAllHearts;window.refreshFavSection=refreshFavSection;
// Add heart buttons
if(document.querySelectorAll('.tool-card').length>5){document.querySelectorAll('.tool-card').forEach(function(card){var href=card.getAttribute('href');if(!href)return;var name=href.replace('tools/','').replace('.html','');var favs=storeGet('favTools', []);var btn=document.createElement('span');btn.setAttribute('data-fav',name);btn.textContent=favs.indexOf(name)>-1?'❤️':'🤍';btn.style.cssText='position:absolute;top:4px;right:4px;cursor:pointer;font-size:.8rem;z-index:2';btn.onclick=function(e){e.preventDefault();e.stopPropagation();toggleFav(name)};card.style.position='relative';card.appendChild(btn)})}
},2000);

// Ctrl+K search shortcut
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();var s=document.getElementById('searchTools');if(s){s.focus();s.scrollIntoView({behavior:'smooth'})}}});

/* ---------------------------------------------------------------------------
   Unicode-safe PDF text helpers (shared by the pdf-lib based tools)

   pdf-lib's 14 built-in fonts are WinAnsi-encoded. Drawing a rupee sign, any
   Devanagari character or an emoji throws "WinAnsi cannot encode", which in
   several tools landed in a catch block and produced no download at all - the
   export looked broken for anyone typing an Indian name or amount.

   uniFold   - swap smart quotes/dashes for ASCII lookalikes (the paste-from-Word
               case) so the small built-in fonts still cover most documents
   uniNeeded - true when something genuinely outside Latin-1 remains
   uniEmbed  - lazily fetch and embed a real Unicode TTF via fontkit
   uniSafe   - final guard at the drawText call site
   --------------------------------------------------------------------------- */
var _uniFontBytes=null,_fontkitReady=false;
var UNI_FONT_URL="https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf";

function uniFold(s){
  return String(s==null?"":s)
    .replace(/[\u2018\u2019\u201a\u201b]/g,"'")
    .replace(/[\u201c\u201d\u201e\u201f]/g,'"')
    .replace(/[\u2013\u2014\u2015]/g,"-")
    .replace(/\u2026/g,"...")
    .replace(/\u00a0/g," ")
    .replace(/[\u2022\u00b7]/g,"-");
}

function uniNeeded(s){ return /[^\u0000-\u00ff]/.test(String(s==null?"":s)) }

function _loadScriptOnce(url){
  return new Promise(function(res,rej){
    var s=document.createElement("script");
    s.src=url; s.onload=res;
    s.onerror=function(){rej(new Error("could not load "+url))};
    document.head.appendChild(s);
  });
}

async function uniEmbed(doc){
  if(!_fontkitReady){
    /* The published fontkit UMD bundle references regeneratorRuntime without
       shipping it, so embedFont throws unless the shim is loaded first. */
    if(typeof window.regeneratorRuntime==="undefined")
      await _loadScriptOnce("https://cdn.jsdelivr.net/npm/regenerator-runtime@0.14.1/runtime.js");
    if(typeof window.fontkit==="undefined")
      await _loadScriptOnce("https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js");
    if(typeof window.fontkit==="undefined")throw new Error("Unicode font engine unavailable");
    _fontkitReady=true;
  }
  if(!_uniFontBytes){
    var r=await fetch(UNI_FONT_URL);
    if(!r.ok)throw new Error("Unicode font download failed ("+r.status+")");
    _uniFontBytes=await r.arrayBuffer();
  }
  doc.registerFontkit(window.fontkit);
  return await doc.embedFont(_uniFontBytes,{subset:true});
}

/* Call this at every drawText site. If a Unicode font was embedded the string
   passes through untouched; otherwise undrawable characters are replaced so the
   export completes instead of dying. */
function uniSafe(s,font){
  var out=uniFold(s);
  if(!uniNeeded(out))return out;
  var canDraw=false;
  try{ font.widthOfTextAtSize(out,10); canDraw=true }catch(e){ canDraw=false }
  if(canDraw)return out;
  return out.replace(/\u20b9/g,"Rs.").replace(/[^\u0000-\u00ff]/g,"");
}

/* ---------------------------------------------------------------------------
   Shared feedback and storage helpers

   Three patterns were repeated unsafely across the tools:

   1. alert() for ordinary validation. It blocks the page, looks dated, and on
      mobile it covers the very field the user needs to fix. notify() shows the
      same message as a dismissible toast instead.

   2. Bare localStorage calls. Both setItem and getItem throw in private
      browsing and when the quota is full, and a corrupt entry makes JSON.parse
      throw. An unguarded call took whole pages down mid-interaction, or silently
      lost the thing the user had just done.

   3. clipboard.writeText() with no rejection handler. It rejects on an insecure
      origin and when the document is not focused, so a blocked copy looked
      successful and people pasted stale content.
   --------------------------------------------------------------------------- */

/* Toast feedback. kind: 'info' | 'ok' | 'warn' | 'error' */
function notify(msg, kind) {
  if (!msg) return;
  kind = kind || 'info';
  var host = document.getElementById('_toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = '_toastHost';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    host.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' +
      'z-index:99999;display:flex;flex-direction:column;gap:.4rem;align-items:center;' +
      'pointer-events:none;max-width:92vw';
    document.body.appendChild(host);
  }
  var colors = {
    info:  { bg: '#1e1e3a', fg: '#f8f8ff', icon: 'i' },
    ok:    { bg: '#1b5e20', fg: '#ffffff', icon: '\u2713' },
    warn:  { bg: '#8a5300', fg: '#ffffff', icon: '!' },
    error: { bg: '#a01b1b', fg: '#ffffff', icon: '\u00d7' }
  };
  var c = colors[kind] || colors.info;
  var t = document.createElement('div');
  t.style.cssText = 'background:' + c.bg + ';color:' + c.fg + ';padding:.65rem 1.1rem;' +
    'border-radius:10px;font-size:.9rem;font-weight:500;line-height:1.4;text-align:center;' +
    'box-shadow:0 8px 28px rgba(0,0,0,.35);pointer-events:auto;cursor:pointer;' +
    'max-width:92vw;opacity:0;transition:opacity .18s ease,transform .18s ease;' +
    'transform:translateY(6px)';
  t.textContent = String(msg);
  t.addEventListener('click', function () { remove() });
  host.appendChild(t);
  requestAnimationFrame(function () { t.style.opacity = '1'; t.style.transform = 'translateY(0)' });
  var timer = setTimeout(remove, kind === 'error' ? 5000 : kind === 'warn' ? 4000 : 2600);
  function remove() {
    clearTimeout(timer);
    t.style.opacity = '0';
    t.style.transform = 'translateY(6px)';
    setTimeout(function () { if (t.parentNode) t.remove() }, 200);
  }
  return t;
}

/* Storage that never throws. storeGet returns the fallback on any failure. */
function storeGet(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}
function storeSet(key, value, quiet) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    if (!quiet) {
      notify('Could not save — browser storage is full or blocked (private browsing?).', 'warn');
    }
    return false;
  }
}
function storeDel(key) {
  try { localStorage.removeItem(key); return true } catch (e) { return false }
}

/* Raw string variants. storeSet JSON-encodes its value, which is wrong for data
   that is already a string: a canvas dataURL would gain escaped quotes and grow,
   and reading it back would need a parse step the caller does not expect. */
function storeGetRaw(key, fallback) {
  try {
    var v = localStorage.getItem(key);
    return (v === null || v === undefined) ? fallback : v;
  } catch (e) {
    return fallback;
  }
}
function storeSetRaw(key, value, quiet) {
  try {
    localStorage.setItem(key, String(value));
    return true;
  } catch (e) {
    if (!quiet) {
      notify('Could not save — browser storage is full or blocked (private browsing?).', 'warn');
    }
    return false;
  }
}

/* Clipboard with real success and failure reporting. */
function copyNow(text, okMsg) {
  text = String(text == null ? '' : text);
  if (!text) { notify('Nothing to copy yet.', 'warn'); return Promise.resolve(false) }
  var done = function () { notify(okMsg || 'Copied to clipboard.', 'ok'); return true };
  var failed = function () {
    /* Fall back to a hidden textarea plus execCommand, which still works on
       older mobile browsers and on pages served without HTTPS. */
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      var okExec = document.execCommand && document.execCommand('copy');
      ta.remove();
      if (okExec) return done();
    } catch (e) { /* fall through to the message below */ }
    notify('Copy was blocked by the browser. Select the text and copy manually.', 'error');
    return false;
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(done, failed);
    }
    return Promise.resolve(failed());
  } catch (e) {
    return Promise.resolve(failed());
  }
}

/* ---------------------------------------------------------------------------
   Site-wide keyboard shortcuts

   81 tools had no keyboard handling at all, so the same few actions had to be
   reached by mouse on every one of them. Rather than hand-wiring each tool,
   these bindings infer the primary action from the page itself:

     Ctrl/Cmd + Enter   run the main action (the first primary-looking button)
     Ctrl/Cmd + S       download the result, if the tool offers one
     Ctrl/Cmd + K       focus the first text field (search-like tools)
     /                  focus the first text field, when not already typing
     Escape             close an open dialog, or clear the focused field
     ?                  list the shortcuts available on this page

   Anything a tool binds itself takes precedence: these run on the bubble phase
   and bail out as soon as the event has been handled or default-prevented.
   --------------------------------------------------------------------------- */
(function () {
  var PRIMARY = /^(generate|calculate|convert|compress|create|run|analy[sz]e|check|extract|build|make|plot|encode|decode|format|count|compare|split|merge|shorten|translate|summari[sz]e|remove|apply|search|start|go|submit|render|process|flip|roll|pick|draw)/i;
  var DOWNLOADY = /(download|save|export|\.png|\.pdf|\.zip|\.csv|\.txt)/i;
  var AVOID = /(reset|clear|delete|remove all|discard|logout|theme)/i;

  function visible(el) {
    if (!el) return false;
    if (el.disabled) return false;
    var s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    return el.getBoundingClientRect().width > 0;
  }
  function buttons() {
    return [].slice.call(document.querySelectorAll('button, a.btn, [role="button"]')).filter(visible);
  }
  function findButton(re) {
    var all = buttons();
    for (var i = 0; i < all.length; i++) {
      var label = (all[i].innerText || all[i].getAttribute('aria-label') || '').trim();
      if (!label || AVOID.test(label)) continue;
      if (re.test(label)) return all[i];
    }
    return null;
  }
  function firstField() {
    var sel = 'input[type=text], input[type=search], input[type=url], input[type=email], input:not([type]), textarea';
    var all = [].slice.call(document.querySelectorAll(sel)).filter(visible);
    return all[0] || null;
  }
  function typingIn(e) {
    var t = e.target;
    if (!t) return false;
    if (t.isContentEditable) return true;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
  }

  function shortcutList() {
    var items = [];
    var run = findButton(PRIMARY);
    var dl = findButton(DOWNLOADY);
    var f = firstField();
    if (run) items.push(['Ctrl + Enter', 'Run: ' + (run.innerText || '').trim().slice(0, 28)]);
    if (dl) items.push(['Ctrl + S', (dl.innerText || '').trim().slice(0, 28)]);
    if (f) items.push(['/ or Ctrl + K', 'Jump to the first field']);
    items.push(['Esc', 'Close a dialog or clear the field']);
    items.push(['?', 'Show this list']);
    return items;
  }

  function showHelp() {
    var existing = document.getElementById('_kbdHelp');
    if (existing) { existing.remove(); return; }
    var items = shortcutList();
    var box = document.createElement('div');
    box.id = '_kbdHelp';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Keyboard shortcuts');
    box.style.cssText = 'position:fixed;inset:0;z-index:99998;display:flex;align-items:center;' +
      'justify-content:center;background:rgba(0,0,0,.55);padding:1rem';
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--surface,#15152a);color:var(--text,#f8f8ff);' +
      'border:1px solid var(--border,rgba(148,148,184,.22));border-radius:14px;padding:1.2rem 1.4rem;' +
      'max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.5);font-size:.92rem';
    var rows = items.map(function (it) {
      return '<div style="display:flex;gap:1rem;justify-content:space-between;padding:.35rem 0">' +
        '<kbd style="font-family:inherit;font-weight:600;white-space:nowrap">' + it[0] + '</kbd>' +
        '<span style="opacity:.85;text-align:right">' + it[1] + '</span></div>';
    }).join('');
    card.innerHTML = '<div style="font-weight:700;margin-bottom:.6rem">Keyboard shortcuts</div>' + rows +
      '<div style="opacity:.7;font-size:.8rem;margin-top:.8rem">Press Esc or ? to close</div>';
    box.appendChild(card);
    box.addEventListener('click', function (ev) { if (ev.target === box) box.remove() });
    document.body.appendChild(box);
  }

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;          // the tool already handled it
    var mod = e.ctrlKey || e.metaKey;
    var k = (e.key || '').toLowerCase();

    if (k === 'escape') {
      var help = document.getElementById('_kbdHelp');
      if (help) { help.remove(); return }
      // a visible modal-ish overlay the tool rendered
      var modal = document.querySelector('[id*="odal"]:not([style*="display: none"]), [id*="odal"]:not([style*="display:none"])');
      if (modal && visible(modal) && typeof window.closeModal === 'function') { window.closeModal(); return }
      if (typingIn(e) && e.target.value) { e.target.value = ''; e.target.dispatchEvent(new Event('input', { bubbles: true })); return }
      return;
    }

    if (mod && k === 'enter') {
      var run = findButton(PRIMARY);
      if (run) { e.preventDefault(); run.click(); }
      return;
    }
    if (mod && k === 's') {
      var dl = findButton(DOWNLOADY);
      if (dl) { e.preventDefault(); dl.click(); }
      return;
    }
    if (mod && k === 'k') {
      var f1 = firstField();
      if (f1) { e.preventDefault(); f1.focus(); if (f1.select) f1.select(); }
      return;
    }
    if (typingIn(e)) return;                 // plain keys are for the page, not us

    if (e.key === '/') {
      var f2 = firstField();
      if (f2) { e.preventDefault(); f2.focus(); if (f2.select) f2.select(); }
      return;
    }
    if (e.key === '?') { e.preventDefault(); showHelp(); return; }
  });

  /* A small, unobtrusive hint so the shortcuts are discoverable at all. */
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (!document.querySelector('.tool-section')) return;      // tool pages only
      if (storeGetRaw('kbdHintShown', null)) return;
      var f = document.querySelector('footer');
      if (!f) return;
      var tip = document.createElement('p');
      tip.className = 'info';
      tip.style.cssText = 'text-align:center;font-size:.78rem;margin:.6rem 0';
      tip.innerHTML = 'Tip: press <strong>?</strong> for keyboard shortcuts on any tool.';
      f.parentNode.insertBefore(tip, f);
      storeSetRaw('kbdHintShown', '1', true);
    }, 3000);
  });
})();
