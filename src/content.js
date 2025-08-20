
// Hover OFF by default. Toggle via popup or 'm'. Sends results to SW for popup retrieval.
(() => {
  let hoverEnabled = false;
  let overlay = null;
  let tooltip = null;
  let lastEl = null;
  let rafBox = false;

  function ensureOverlay(){
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed','pointer-events:none','z-index:2147483647',
      'border:2px solid #00FFFF','background:rgba(0,255,255,.12)',
      'left:0','top:0','width:0','height:0','border-radius:6px',
      'box-shadow:0 0 0 20000px rgba(0,0,0,.18)','transition:none'
    ].join(';');
    document.documentElement.appendChild(overlay);
  }

  function ensureTooltip(){
    if (tooltip) return;
    tooltip = document.createElement('div');
    tooltip.style.cssText = [
      'position:fixed','z-index:2147483647','pointer-events:auto',
      'max-width:420px','background:rgba(13,2,33,.95)',
      'backdrop-filter:blur(2px)','-webkit-backdrop-filter:blur(2px)',
      'color:#00FFFF','font:12px/1.45 ui-monospace,Menlo,Consolas,monospace',
      'border:1px solid rgba(0,255,255,.35)','border-radius:10px',
      'padding:8px 10px','box-shadow:0 8px 24px rgba(0,0,0,.45), 0 0 0 1px rgba(255,16,240,.08) inset',
      'user-select:text','cursor:copy'
    ].join(';');
    const pre = document.createElement('pre');
    pre.style.cssText = 'margin:0;white-space:pre;max-width:400px;overflow:auto;color:#00FFFF;';
    pre.id = '__dcsi_pre__';
    tooltip.appendChild(pre);

    const hint = document.createElement('div');
    hint.textContent = 'Click or press C to copy';
    hint.style.cssText = 'opacity:.65;margin-top:6px;font-size:11px;color:#9aa4c7';
    tooltip.appendChild(hint);

    tooltip.addEventListener('click', copyTooltipJSON, true);

    document.documentElement.appendChild(tooltip);
  }

  function removeUI(){
    if (overlay) overlay.remove();
    if (tooltip) tooltip.remove();
    overlay = null; tooltip = null; lastEl = null;
  }

  function elemFromEvent(e){
    const path = e.composedPath?.();
    if (path && path.length) for (const n of path) if (n && n.nodeType === 1) return n;
    return document.elementFromPoint(e.clientX, e.clientY);
  }

  function box(el){
    if (!overlay || !el) return;
    const r = el.getBoundingClientRect();
    overlay.style.left = r.left + 'px';
    overlay.style.top = r.top + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
  }

  function scheduleBox(el){
    if (rafBox) return;
    rafBox = true;
    requestAnimationFrame(() => { rafBox = false; box(el); });
  }

  function rgbToHex(rgb){
    const m = rgb && rgb.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!m) return null;
    const to2 = n => Math.max(0,Math.min(255,parseInt(n,10))).toString(16).padStart(2,'0').toUpperCase();
    return '#' + to2(m[1]) + to2(m[2]) + to2(m[3]);
  }

  function computeObject(el){
    const cs = getComputedStyle(el);
    const colorRgb = cs.color;
    const out = {
      colorHex: rgbToHex(colorRgb) || null,
      colorRgb,
      'font-family': cs.fontFamily,
      'font-size': cs.fontSize,
      'font-weight': cs.fontWeight,
      'line-height': cs.lineHeight,
      'letter-spacing': cs.letterSpacing
    };
    if (cs.backgroundImage && cs.backgroundImage.includes('linear-gradient')) out.linearGradient = cs.backgroundImage;
    return out;
  }

  function computeJSON(el){ return JSON.stringify(computeObject(el), null, 2); }

  async function copyTooltipJSON(){
    try {
      const pre = document.getElementById('__dcsi_pre__');
      if (!pre) return;
      await navigator.clipboard.writeText(pre.textContent || '');
      tooltip.style.borderColor = '#FF10F0';
      setTimeout(()=> tooltip.style.borderColor = 'rgba(0,255,255,.35)', 250);
    } catch {}
  }

  function placeTooltip(x,y){
    if (!tooltip) return;
    const pad = 12;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const rect = tooltip.getBoundingClientRect();
    let left = x + 16;
    let top  = y + 16;
    if (left + rect.width + pad > vw) left = Math.max(pad, vw - rect.width - pad);
    if (top + rect.height + pad > vh) top = Math.max(pad, vh - rect.height - pad);
    tooltip.style.left = left + 'px';
    tooltip.style.top  = top  + 'px';
  }

  function onMove(e){
    if (!hoverEnabled) return;
    const el = elemFromEvent(e);
    if (!el) return;
    if (el !== lastEl) lastEl = el;
    ensureOverlay(); ensureTooltip();
    scheduleBox(lastEl);
    try {
      const pre = document.getElementById('__dcsi_pre__');
      const obj = computeObject(lastEl);
      const json = JSON.stringify(obj, null, 2);
      if (pre) pre.textContent = json;
      // send to SW so popup Copy Last works
      chrome.runtime.sendMessage({ type:'DCSI_RESULT', payload: { element: '', computed: obj }});
      window.__DCSI_LAST_RESULT__ = { element:'', computed: obj };
    } catch {}
    placeTooltip(e.clientX, e.clientY);
  }

  function onKey(e){
    if (e.key.toLowerCase() === 'm'){
      setHover(!hoverEnabled);
    }
    if (e.key.toLowerCase() === 'c' && hoverEnabled){
      copyTooltipJSON();
    }
    if (e.key === 'Escape' && hoverEnabled){
      setHover(false);
    }
  }

  function setHover(v){
    hoverEnabled = !!v;
    if (hoverEnabled){
      document.addEventListener('mousemove', onMove, true);
      window.addEventListener('scroll', () => lastEl && scheduleBox(lastEl), true);
      window.addEventListener('resize', () => lastEl && scheduleBox(lastEl), true);
      ensureOverlay(); ensureTooltip();
      document.body.style.cursor = 'crosshair';
    } else {
      document.removeEventListener('mousemove', onMove, true);
      document.body.style.cursor = '';
      if (overlay) overlay.remove();
      if (tooltip) tooltip.remove();
      overlay = null; tooltip = null; lastEl = null;
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg) return;
    if (msg.type === 'setHover'){ setHover(!!msg.value); }
  });

  document.addEventListener('keydown', onKey, true);
})();
