// Shared utilities
function toggleTheme(){document.body.classList.toggle('light');document.getElementById('themeToggle').textContent=document.body.classList.contains('light')?'☀️':'🌙';localStorage.setItem('theme',document.body.classList.contains('light')?'light':'dark');document.querySelectorAll('canvas').forEach(function(c){if(c.style.background==='#fff'||c.style.background==='white')c.style.background=document.body.classList.contains('light')?'#fff':'#fff'})}
if(localStorage.getItem('theme')==='light')document.body.classList.add('light');
function copyText(t){navigator.clipboard.writeText(t);const b=event.target;b.textContent='Copied!';setTimeout(()=>b.textContent='Copy',1000)}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click()}
function loadImage(file){return new Promise(r=>{const img=new Image();img.onload=()=>r(img);img.src=URL.createObjectURL(file)})}
function formatSize(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB'}
function setupDrop(dropId,inputId,cb){const drop=document.getElementById(dropId),inp=document.getElementById(inputId);if(!drop||!inp)return;drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragover')});drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragover');cb(e.dataTransfer.files)});inp.addEventListener('change',()=>cb(inp.files))}

// Register Service Worker for offline support & speed
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});

// Privacy badge + Share button on tool pages
if(document.querySelector('.tool-section h1')&&!document.querySelector('.tools-grid')){
  var h1=document.querySelector('.tool-section h1');
  if(h1){
    var badge=document.createElement('div');
    badge.style.cssText='display:inline-flex;align-items:center;gap:4px;font-size:.75rem;padding:.3rem .6rem;background:rgba(76,175,80,.15);color:#4caf50;border-radius:6px;margin-top:.5rem;font-weight:600';
    badge.innerHTML='🔒 100% Private — No uploads to server';
    h1.parentNode.insertBefore(badge,h1.nextSibling);
    var shareDiv=document.createElement('div');
    shareDiv.style.cssText='margin-top:.8rem;display:flex;gap:6px;flex-wrap:wrap';
    var url=window.location.href;
    var title=document.title;
    shareDiv.innerHTML='<button onclick="if(navigator.share)navigator.share({title:document.title,url:location.href});else{navigator.clipboard.writeText(location.href);this.textContent=\'Copied!\'}" style="padding:.4rem .8rem;border:1px solid var(--border);border-radius:6px;background:none;color:var(--text);cursor:pointer;font-size:.8rem">📤 Share Tool</button><a href="https://wa.me/?text='+encodeURIComponent(title+' '+url)+'" target="_blank" style="padding:.4rem .8rem;border:1px solid #25d366;border-radius:6px;color:#25d366;font-size:.8rem;text-decoration:none">💬 WhatsApp</a><a href="https://twitter.com/intent/tweet?text='+encodeURIComponent(title)+' '+encodeURIComponent(url)+'" target="_blank" style="padding:.4rem .8rem;border:1px solid #1da1f2;border-radius:6px;color:#1da1f2;font-size:.8rem;text-decoration:none">🐦 Twitter</a>';
    h1.parentNode.insertBefore(shareDiv,badge.nextSibling);
  }
}

// Processing spinner helper
window.showProcessing=function(el){if(typeof el==='string')el=document.getElementById(el);if(el)el.innerHTML='<div style="text-align:center;padding:2rem"><div style="display:inline-block;width:30px;height:30px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite"></div><p class="info" style="margin-top:.5rem">Processing...</p></div>';if(!document.getElementById('spinCSS')){var s=document.createElement('style');s.id='spinCSS';s.textContent='@keyframes spin{to{transform:rotate(360deg)}}';document.head.appendChild(s)}};

// Cookie Consent Banner
if(!localStorage.getItem('cookieConsent')){const d=document.createElement('div');d.id='cookieConsent';d.innerHTML='<p>We use cookies and third-party services (Google Analytics, AdSense) to improve your experience and show relevant ads. By continuing, you agree to our <a href="/privacy.html" style="color:#4fc3f7">Privacy Policy</a>.</p><button id="acceptCookies">Accept</button><button id="rejectCookies" style="background:transparent;color:#fff;border:1px solid #fff;margin-left:8px">Reject</button>';d.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#222;color:#fff;padding:16px;display:flex;align-items:center;justify-content:center;gap:12px;z-index:9999;font-size:14px';d.querySelector('#acceptCookies').style.cssText='background:#4fc3f7;color:#000;border:none;padding:8px 20px;border-radius:4px;cursor:pointer;font-weight:bold';document.body.appendChild(d);d.querySelector('#acceptCookies').onclick=()=>{localStorage.setItem('cookieConsent','accepted');d.remove()};d.querySelector('#rejectCookies').onclick=()=>{localStorage.setItem('cookieConsent','rejected');d.remove()}}

// Favorites feature
function toggleFav(toolName,btn){var favs=JSON.parse(localStorage.getItem('favTools')||'[]');var idx=favs.indexOf(toolName);if(idx>-1){favs.splice(idx,1);btn.textContent='🤍'}else{favs.push(toolName);btn.textContent='❤️'}localStorage.setItem('favTools',JSON.stringify(favs))}
// Auto-add fav buttons to tool cards on homepage
if(document.querySelectorAll('.tool-card').length>5){document.querySelectorAll('.tool-card').forEach(function(card){var href=card.getAttribute('href');if(!href)return;var name=href.replace('tools/','').replace('.html','');var favs=JSON.parse(localStorage.getItem('favTools')||'[]');var btn=document.createElement('span');btn.textContent=favs.indexOf(name)>-1?'❤️':'🤍';btn.style.cssText='position:absolute;top:4px;right:4px;cursor:pointer;font-size:.8rem;z-index:2';btn.onclick=function(e){e.preventDefault();e.stopPropagation();toggleFav(name,btn)};card.style.position='relative';card.appendChild(btn)})}

// Ctrl+K search shortcut
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();var s=document.getElementById('searchTools');if(s){s.focus();s.scrollIntoView({behavior:'smooth'})}}});
