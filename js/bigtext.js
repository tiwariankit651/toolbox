/* Shared helpers for text tools that may receive very large files.
 *
 * The slow, crash-prone step with multi-MB text is not parsing - it is
 * putting the text into a <textarea>. These helpers keep big input and
 * output in memory and show only a preview, run work in a Web Worker so
 * the page never freezes, and let the user cancel.
 *
 *   BigText.attach(textarea, opts)  -> controller {get(), set(text, name), isBig()}
 *   BigText.runWorker(code, data, libs, onProgress) -> {promise, cancel()}
 *   BigText.checkSize(file, maxMB)   -> true/false (asks on phones above 25 MB)
 */
(function () {
  'use strict';
  var PREVIEW = 200 * 1024;          // characters shown in a textarea for big text
  var BIG = 2 * 1024 * 1024;         // above this, text is held in memory, not in the box

  function isPhone() {
    var mem = navigator.deviceMemory;
    var coarse = window.matchMedia && matchMedia('(pointer:coarse)').matches;
    return (mem && mem <= 4) || (coarse && Math.min(screen.width, screen.height) < 820);
  }
  function mb(n) { return (n / 1048576).toFixed(1) + ' MB'; }

  function checkSize(file, maxMB) {
    maxMB = maxMB || 100;
    if (file.size > maxMB * 1048576) {
      notify('That file is ' + mb(file.size) + '. The limit here is ' + maxMB + ' MB, because the whole file has to fit in your browser\u2019s memory.', 'error');
      return false;
    }
    if (isPhone() && file.size > 25 * 1048576) {
      return confirm('This file is ' + mb(file.size) + '. Phones have limited memory, so it may be slow or the tab may close. Continue?');
    }
    return true;
  }

  /* Wrap a textarea. When the held text is larger than BIG, the box shows a
     read-only preview and a note; get() always returns the full text. */
  function attach(ta, opts) {
    opts = opts || {};
    var full = null, note = document.createElement('div');
    note.className = 'info bigtext-note';
    note.setAttribute('role', 'status');
    note.style.cssText = 'display:none;margin:.3rem 0;font-size:.82rem;color:var(--warn)';
    ta.parentNode.insertBefore(note, ta.nextSibling);
    var wasReadonly = ta.readOnly;
    var msg = document.createElement('span'); note.appendChild(msg);
    var clr = null;
    if (!wasReadonly) {
      clr = document.createElement('button'); clr.type = 'button'; clr.className = 'btn btn-outline';
      clr.style.cssText = 'width:auto;margin:0 0 0 .5rem;padding:.25rem .7rem;font-size:.8rem';
      clr.textContent = 'Clear and type';
      clr.onclick = function () { show(''); ta.focus(); ta.dispatchEvent(new Event('input', { bubbles: true })); };
      note.appendChild(clr);
    }
    function show(t, label) {
      if (t.length > BIG) {
        full = t;
        ta.value = t.slice(0, PREVIEW) + '\n\u2026';
        ta.readOnly = true;
        msg.textContent = (label || 'Showing') + ' the first 200 KB of ' + mb(new Blob([t]).size) +
          '. ' + (opts.hint || 'Download or copy for the full text.') + (wasReadonly ? '' : ' Editing is off for text this large.');
        note.style.display = 'block';
      } else {
        full = null;
        ta.value = t;
        ta.readOnly = wasReadonly;
        note.style.display = 'none';
      }
    }
    return {
      get: function () { return full !== null ? full : ta.value; },
      set: function (t, label) { show(String(t), label); },
      isBig: function () { return full !== null; },
      clear: function () { show(''); }
    };
  }

  /* Libraries for a worker are fetched by the page with SRI, then handed to
     the worker as Blob URLs - importScripts() cannot check integrity itself. */
  var libCache = {};
  function libBlobUrl(lib) {
    if (!libCache[lib.url]) {
      libCache[lib.url] = fetch(lib.url, { integrity: lib.sri, mode: 'cors', credentials: 'omit' })
        .then(function (r) { if (!r.ok) throw new Error('lib ' + r.status); return r.text(); })
        .then(function (t) { return URL.createObjectURL(new Blob([t], { type: 'text/javascript' })); });
    }
    return libCache[lib.url];
  }

  /* code: source of a function body run as `onmessage`. It receives `data`
     and must call `done(result)` or `fail(errorObj)`; may call `progress(fraction, label)`. */
  function runWorker(code, data, libs, onProgress) {
    var w = null, cancelled = false, rejectFn;
    var promise = Promise.all((libs || []).map(libBlobUrl)).then(function (urls) {
      if (cancelled) throw new Error('cancelled');
      var src = 'self.onmessage=function(e){var data=e.data;' +
        'function done(r){postMessage({t:"done",r:r})}' +
        'function fail(x){postMessage({t:"fail",e:x})}' +
        'function progress(f,l){postMessage({t:"p",f:f,l:l})}' +
        'try{' + urls.map(function (u) { return 'importScripts(' + JSON.stringify(u) + ');'; }).join('') +
        code + '}catch(err){fail({message:String(err&&err.message||err),mark:err&&err.mark?{line:err.mark.line,column:err.mark.column}:null,reason:err&&err.reason})}};';
      var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      w = new Worker(url);
      return new Promise(function (resolve, reject) {
        rejectFn = reject;
        w.onmessage = function (e) {
          var m = e.data;
          if (m.t === 'p') { if (onProgress) onProgress(m.f, m.l); return; }
          w.terminate(); URL.revokeObjectURL(url);
          if (m.t === 'done') resolve(m.r); else { var er = new Error(m.e.message); er.mark = m.e.mark; er.reason = m.e.reason; reject(er); }
        };
        w.onerror = function (e) { w.terminate(); URL.revokeObjectURL(url); reject(new Error(e.message || 'Worker failed')); };
        w.postMessage(data);
      });
    });
    return {
      promise: promise,
      cancel: function () { cancelled = true; if (w) w.terminate(); if (rejectFn) rejectFn(new Error('cancelled')); }
    };
  }

  /* A small progress row with a Cancel button, placed after `anchor`. */
  function progressUI(anchor) {
    var row = document.createElement('div');
    row.className = 'bigtext-progress';
    row.style.cssText = 'display:none;align-items:center;gap:.6rem;margin:.5rem 0;flex-wrap:wrap';
    row.innerHTML = '<div style="flex:1;min-width:160px;height:8px;border-radius:6px;background:var(--card);overflow:hidden"><i style="display:block;height:100%;width:0;background:var(--accent);transition:width .2s"></i></div>' +
      '<span class="info" style="margin:0;font-size:.85rem" aria-live="polite"></span>' +
      '<button type="button" class="btn btn-outline" style="width:auto;margin:0;padding:.4rem .9rem">Cancel</button>';
    anchor.parentNode.insertBefore(row, anchor.nextSibling);
    var bar = row.querySelector('i'), lab = row.querySelector('span'), btn = row.querySelector('button'), onCancel = null;
    btn.onclick = function () { if (onCancel) onCancel(); };
    return {
      start: function (label, cancelFn) { onCancel = cancelFn; bar.style.width = '0'; lab.textContent = label; row.style.display = 'flex'; },
      set: function (f, label) { if (f != null) bar.style.width = Math.round(Math.max(0, Math.min(1, f)) * 100) + '%'; if (label) lab.textContent = label; },
      end: function () { row.style.display = 'none'; onCancel = null; }
    };
  }

  /* Read a File as text with progress (FileReader gives byte progress). */
  function readText(file, onProgress) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onprogress = function (e) { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      r.onerror = function () { reject(new Error('Could not read that file.')); };
      r.onload = function () { resolve(String(r.result || '')); };
      r.readAsText(file);
    });
  }

  window.BigText = { attach: attach, runWorker: runWorker, checkSize: checkSize, progressUI: progressUI, readText: readText, isPhone: isPhone, BIG: BIG };
})();
