// Shared utilities
function toggleTheme(){document.body.classList.toggle('light');document.getElementById('themeToggle').textContent=document.body.classList.contains('light')?'☀️':'🌙';localStorage.setItem('theme',document.body.classList.contains('light')?'light':'dark');document.querySelectorAll('canvas').forEach(function(c){if(c.style.background==='#fff'||c.style.background==='white')c.style.background=document.body.classList.contains('light')?'#fff':'#fff'})}
if(localStorage.getItem('theme')==='light')document.body.classList.add('light');
function copyText(t){navigator.clipboard.writeText(t);const b=event.target;b.textContent='Copied!';setTimeout(()=>b.textContent='Copy',1000)}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();var t=document.createElement('div');t.textContent='🎉 Downloaded: '+name;t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#4caf50;color:#fff;padding:.6rem 1.2rem;border-radius:8px;font-size:.9rem;font-weight:600;z-index:9999;animation:fadeUp .3s ease';document.body.appendChild(t);setTimeout(function(){t.remove()},2500);if(!document.getElementById('toastCSS')){var s=document.createElement('style');s.id='toastCSS';s.textContent='@keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';document.head.appendChild(s)}}
function loadImage(file){return new Promise(r=>{const img=new Image();img.onload=()=>r(img);img.src=URL.createObjectURL(file)})}
function formatSize(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB'}
function setupDrop(dropId,inputId,cb){const drop=document.getElementById(dropId),inp=document.getElementById(inputId);if(!drop||!inp)return;drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragover')});drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragover');cb(e.dataTransfer.files)});inp.addEventListener('change',()=>cb(inp.files))}

// Register Service Worker for offline support & speed
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});

// Offline banner
window.addEventListener('online',function(){var ob=document.getElementById('offlineBanner');if(ob)ob.remove()});
window.addEventListener('offline',function(){if(!document.getElementById('offlineBanner')){var b=document.createElement('div');b.id='offlineBanner';b.style.cssText='position:fixed;top:0;left:0;right:0;background:#ff9800;color:#fff;text-align:center;padding:8px;font-size:.85rem;font-weight:600;z-index:9999';b.textContent='📴 You are offline — this tool still works! Your files stay on your device.';document.body.appendChild(b)}});
// Show offline tip once
if(!localStorage.getItem('offlineTipShown')&&document.querySelector('.tool-section h1')&&!document.querySelector('.tools-grid')){setTimeout(function(){var tip=document.createElement('div');tip.style.cssText='position:fixed;bottom:80px;right:20px;background:var(--card);border:1px solid var(--accent);padding:1rem;border-radius:12px;max-width:280px;z-index:9998;box-shadow:0 4px 20px rgba(0,0,0,.3)';tip.innerHTML='<div style="font-weight:600;margin-bottom:.3rem">💡 Did you know?</div><div style="font-size:.85rem;color:var(--muted)">This tool works offline! Bookmark it for use without internet.</div><button onclick="this.parentElement.remove();localStorage.setItem(\'offlineTipShown\',\'1\')" style="margin-top:.5rem;padding:.3rem .8rem;border:none;background:var(--accent);color:#fff;border-radius:6px;cursor:pointer;font-size:.8rem">Got it!</button>';document.body.appendChild(tip)},3000)}

// Track recently used tools
if(document.querySelector('.tool-section h1')&&!document.querySelector('.tools-grid')){var path=window.location.pathname.replace('/tools/','').replace('.html','').replace('/','');if(path&&path!==''){var rec=JSON.parse(localStorage.getItem('recentTools')||'[]');rec=rec.filter(function(r){return r!==path});rec.unshift(path);rec=rec.slice(0,8);localStorage.setItem('recentTools',JSON.stringify(rec))}}

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
  }
}

// Processing spinner helper
window.showProcessing=function(el){if(typeof el==='string')el=document.getElementById(el);if(el)el.innerHTML='<div style="text-align:center;padding:2rem"><div style="display:inline-block;width:30px;height:30px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite"></div><p class="info" style="margin-top:.5rem">Processing...</p></div>';if(!document.getElementById('spinCSS')){var s=document.createElement('style');s.id='spinCSS';s.textContent='@keyframes spin{to{transform:rotate(360deg)}}';document.head.appendChild(s)}};

// Large file warning
window.checkFileSize=function(files,maxMB){maxMB=maxMB||50;var total=0;Array.from(files).forEach(function(f){total+=f.size});if(total>maxMB*1024*1024){return confirm('Total file size is '+(total/1024/1024).toFixed(1)+'MB. Large files may slow your browser. Continue?')}return true};

// Memory cleanup after heavy processing
window.cleanupMemory=function(){if(window.gc)window.gc();var imgs=document.querySelectorAll('img[src^="blob:"]');imgs.forEach(function(img){URL.revokeObjectURL(img.src)})};
setInterval(function(){var mem=performance&&performance.memory?performance.memory.usedJSHeapSize:0;if(mem>200*1024*1024)cleanupMemory()},30000);

// Cookie Consent Banner
if(!localStorage.getItem('cookieConsent')){const d=document.createElement('div');d.id='cookieConsent';d.innerHTML='<p>We use cookies and third-party services (Google Analytics, AdSense) to improve your experience and show relevant ads. By continuing, you agree to our <a href="/privacy.html" style="color:#4fc3f7">Privacy Policy</a>.</p><button id="acceptCookies">Accept</button><button id="rejectCookies" style="background:transparent;color:#fff;border:1px solid #fff;margin-left:8px">Reject</button>';d.style.cssText='position:fixed;bottom:0;left:0;right:0;background:#222;color:#fff;padding:16px;display:flex;align-items:center;justify-content:center;gap:12px;z-index:9999;font-size:14px';d.querySelector('#acceptCookies').style.cssText='background:#4fc3f7;color:#000;border:none;padding:8px 20px;border-radius:4px;cursor:pointer;font-weight:bold';document.body.appendChild(d);d.querySelector('#acceptCookies').onclick=()=>{localStorage.setItem('cookieConsent','accepted');d.remove()};d.querySelector('#rejectCookies').onclick=()=>{localStorage.setItem('cookieConsent','rejected');d.remove()}}

// Favorites feature
function toggleFav(toolName,btn){var favs=JSON.parse(localStorage.getItem('favTools')||'[]');var idx=favs.indexOf(toolName);if(idx>-1){favs.splice(idx,1)}else{favs.push(toolName)}localStorage.setItem('favTools',JSON.stringify(favs));
  // Update ALL heart icons for this tool
  document.querySelectorAll('.tool-card[href]').forEach(function(card){var href=card.getAttribute('href');if(!href)return;var n=href.replace('tools/','').replace('.html','');var heart=card.querySelector('span[style*="position:absolute"]');if(heart&&n===toolName){heart.textContent=favs.indexOf(n)>-1?'❤️':'🤍'}});
  refreshFavSection()}
function refreshFavSection(){var favs=JSON.parse(localStorage.getItem('favTools')||'[]');var sec=document.getElementById('favSection');var grid=document.getElementById('favGrid');if(!sec||!grid)return;if(!favs.length){sec.style.display='none';return}sec.style.display='block';grid.innerHTML='';document.querySelectorAll('.tool-card[href]').forEach(function(card){var href=card.getAttribute('href');if(!href)return;var name=href.replace('tools/','').replace('.html','');if(favs.indexOf(name)>-1){var clone=card.cloneNode(true);var heart=clone.querySelector('span');if(heart)clone.removeChild(heart);grid.appendChild(clone)}})}
// Auto-add fav buttons to tool cards on homepage
if(document.querySelectorAll('.tool-card').length>5){document.querySelectorAll('.tool-card').forEach(function(card){var href=card.getAttribute('href');if(!href)return;var name=href.replace('tools/','').replace('.html','');var favs=JSON.parse(localStorage.getItem('favTools')||'[]');var btn=document.createElement('span');btn.textContent=favs.indexOf(name)>-1?'❤️':'🤍';btn.style.cssText='position:absolute;top:4px;right:4px;cursor:pointer;font-size:.8rem;z-index:2';btn.onclick=function(e){e.preventDefault();e.stopPropagation();toggleFav(name,btn)};card.style.position='relative';card.appendChild(btn)})}

// Ctrl+K search shortcut
document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();var s=document.getElementById('searchTools');if(s){s.focus();s.scrollIntoView({behavior:'smooth'})}}});
