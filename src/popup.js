
const output = document.getElementById("output");
const toggleBtn = document.getElementById("toggleHover");
const selectorInput = document.getElementById("selector-input");
const copyLastBtn = document.getElementById("copy-last");

// Placeholder helpers
const PLACEHOLDER_HTML = '{\n  <span class="ph-key">"info"</span>: <span class="ph-value">"Hover over or select an element to see computed CSS values."</span>\n}';
function showPlaceholder(){ output.classList.add('placeholder'); output.setAttribute('data-placeholder','1'); output.innerHTML = PLACEHOLDER_HTML; }
function clearPlaceholder(){ output.classList.remove('placeholder'); output.removeAttribute('data-placeholder'); }

function syntaxHighlight(json){
  if (typeof json !== "string") json = JSON.stringify(json, null, 2);
  json = json.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  return json.replace(/("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\\s*:)?|\\btrue\\b|\\bfalse\\b|\\bnull\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, (m) => {
    if (m[0] === '"') return /":\s*$/.test(m) || /":$/.test(m) ? `<span class="json-key">${m}</span>` : `<span class="json-string">${m}</span>`;
    if (/true|false/.test(m)) return `<span class="json-boolean">${m}</span>`;
    if (/null/.test(m)) return `<span class="json-null">${m}</span>`;
    return `<span class="json-number">${m}</span>`;
  });
}
function render(obj){ clearPlaceholder(); output.innerHTML = syntaxHighlight(obj); }

function activeTab(){ return new Promise(res => chrome.tabs.query({active:true,currentWindow:true},([tab])=>res(tab))); }
async function getHoverStatus(tabId){ return await new Promise(r=> chrome.runtime.sendMessage({type:'getHoverStatus',tabId}, r)); }
async function toggleHover(tabId){ return await new Promise(r=> chrome.runtime.sendMessage({type:'toggleHover',tabId}, r)); }

function setBtn(on){
  toggleBtn.textContent = 'Hover: ' + (on ? 'ON' : 'OFF');
  toggleBtn.style.borderColor = on ? 'rgba(255,16,240,.25)' : 'rgba(0,255,255,.25)';
  toggleBtn.style.color = on ? '#FF10F0' : '#00FFFF';
}

async function fetchLastResult(){
  const tab = await activeTab();
  const fromSW = await new Promise(r=> chrome.runtime.sendMessage({ type:'DCSI_SW_GET_LAST', tabId: tab.id }, r));
  return fromSW && fromSW.payload ? fromSW.payload : null;
}

// Load: show placeholder unless we have a last value
document.addEventListener("DOMContentLoaded", async () => {
  const tab = await activeTab();
  const status = await getHoverStatus(tab.id);
  setBtn(!!status?.value);
  const last = await fetchLastResult();
  if (last) render(last); else showPlaceholder();
});

toggleBtn.addEventListener("click", async () => {
  const tab = await activeTab();
  const res = await toggleHover(tab.id);
  setBtn(!!res?.value);
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'hoverStatus'){ setBtn(!!msg.value); }
});

if (selectorInput){
  selectorInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter"){
      e.preventDefault();
      const selector = (selectorInput.value || '').trim();
      if (!selector) return render({ error: "Please enter a CSS selector." });
      const tab = await activeTab();
      const results = await chrome.scripting.executeScript({
        target:{ tabId: tab.id, allFrames:true },
        func: (selector)=>{
          function rgbToHex(rgb){ const m = rgb && rgb.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i); if(!m) return null;
            const to2=n=>Math.max(0,Math.min(255,parseInt(n,10))).toString(16).padStart(2,'0').toUpperCase();
            return '#'+to2(m[1])+to2(m[2])+to2(m[3]); }
          const el = document.querySelector(selector); if(!el) return null;
          const cs = getComputedStyle(el); const colorRgb = cs.color;
          const o = {'font-family':cs.fontFamily,'font-size':cs.fontSize,'font-weight':cs.fontWeight,'line-height':cs.lineHeight,'letter-spacing':cs.letterSpacing,colorRgb,colorHex:rgbToHex(colorRgb)||null};
          if (cs.backgroundImage && cs.backgroundImage.includes('linear-gradient')) o.linearGradient = cs.backgroundImage;
          return { element: selector, computed: o };
        },
        args:[selector]
      });
      const first = (results||[]).map(r=>r.result).find(Boolean);
      if(!first){ render({ error: 'No element found for selector: ' + selector }); return; }
      render(first);
    }
  });
}

if (copyLastBtn){
  copyLastBtn.addEventListener("click", async ()=>{
    // Guard: don't copy if placeholder is visible
    if (output.getAttribute('data-placeholder') === '1'){
      copyLastBtn.textContent = 'No data';
      setTimeout(()=> copyLastBtn.textContent='Copy Last', 1200);
      return;
    }
    const last = await fetchLastResult();
    if (!last){ copyLastBtn.textContent='No data'; setTimeout(()=>copyLastBtn.textContent='Copy Last', 1200); return; }
    const p = last;
    const o = {
      colorHex: p.computed?.colorHex || null,
      colorRgb: p.computed?.colorRgb || null,
      'font-family': p.computed?.['font-family'] || null,
      'font-size': p.computed?.['font-size'] || null,
      'font-weight': p.computed?.['font-weight'] || null,
      'line-height': p.computed?.['line-height'] || null,
      'letter-spacing': p.computed?.['letter-spacing'] || null
    };
    if (p.computed?.linearGradient) o.linearGradient = p.computed.linearGradient;

    try{
      await navigator.clipboard.writeText(JSON.stringify(o, null, 2));
      copyLastBtn.textContent='Copied!'; setTimeout(()=>copyLastBtn.textContent='Copy Last', 1200);
    }catch{
      copyLastBtn.textContent='Copy failed'; setTimeout(()=>copyLastBtn.textContent='Copy Last', 1200);
    }
  });
}
