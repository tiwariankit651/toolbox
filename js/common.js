// Shared utilities
function toggleTheme(){document.body.classList.toggle('light');document.getElementById('themeToggle').textContent=document.body.classList.contains('light')?'☀️':'🌙';localStorage.setItem('theme',document.body.classList.contains('light')?'light':'dark')}
if(localStorage.getItem('theme')==='light')document.body.classList.add('light');
function copyText(t){navigator.clipboard.writeText(t);const b=event.target;b.textContent='Copied!';setTimeout(()=>b.textContent='Copy',1000)}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click()}
function loadImage(file){return new Promise(r=>{const img=new Image();img.onload=()=>r(img);img.src=URL.createObjectURL(file)})}
function formatSize(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB'}
function setupDrop(dropId,inputId,cb){const drop=document.getElementById(dropId),inp=document.getElementById(inputId);if(!drop||!inp)return;drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragover')});drop.addEventListener('dragleave',()=>drop.classList.remove('dragover'));drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragover');cb(e.dataTransfer.files)});inp.addEventListener('change',()=>cb(inp.files))}
