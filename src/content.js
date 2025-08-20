(() => {
  // Keep these at module scope so hotkeys & popup messages can see state
  let hoverEnabled = false;
  let overlay = null;
  let tooltip = null;
  let tooltipPre = null;
  let lastEl = null;
  let rafBox = false;

  // ---------- Utils ----------
  const css = (o) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(";");
  const rgbToHex = (rgb) => {
    const m = rgb && rgb.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!m) return null;
    const to2 = (n) =>
      Math.max(0, Math.min(255, parseInt(n, 10)))
        .toString(16)
        .padStart(2, "0")
        .toUpperCase();
    return "#" + to2(m[1]) + to2(m[2]) + to2(m[3]);
  };

  // ---------- UI ----------
  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.style.cssText = css({
      position: "fixed",
      pointerEvents: "none", // don't block clicks
      zIndex: 2147483647,
      border: "2px solid #00FFFF",
      background: "rgba(0,255,255,.12)",
      left: "0",
      top: "0",
      width: "0",
      height: "0",
      borderRadius: "10px",
      boxShadow:
        "0 0 0 20000px rgba(0,0,0,.18), 0 0 18px rgba(0,255,255,.35) inset",
      transition: "none",
    });
    document.documentElement.appendChild(overlay);
  }

  function ensureTooltip() {
    if (tooltip) return;
    tooltip = document.createElement("div");
    tooltip.style.cssText = css({
      position: "fixed",
      zIndex: 2147483647,
      pointerEvents: "none", // focus‑friendly
      maxWidth: "440px",
      background:
        "linear-gradient(180deg, rgba(13,2,33,.98), rgba(38,20,71,.98))",
      backdropFilter: "blur(3px)",
      WebkitBackdropFilter: "blur(3px)",
      color: "#cdd6f4",
      font: "12px/1.45 ui-monospace,Menlo,Consolas,monospace",
      border: "1px solid rgba(0,255,255,.35)",
      borderRadius: "12px",
      padding: "10px 12px",
      boxShadow:
        "0 20px 40px rgba(0,0,0,.55), 0 0 12px rgba(0,255,255,.18), 0 0 0 1px rgba(255,16,240,.08) inset",
      userSelect: "text",
      cursor: "default",
    });

    tooltipPre = document.createElement("pre");
    tooltipPre.style.cssText = css({
      margin: 0,
      whiteSpace: "pre",
      maxWidth: "420px",
      overflow: "auto",
      color: "#00FFFF",
      textShadow: "0 0 6px rgba(0,255,255,.2)",
    });
    tooltip.appendChild(tooltipPre);

    const hint = document.createElement("div");
    hint.textContent = "Press C to copy • Esc to exit";
    Object.assign(hint.style, {
      opacity: ".75",
      marginTop: "6px",
      fontSize: "11px",
      color: "#FF10F0",
      letterSpacing: ".3px",
      textShadow: "0 0 8px rgba(255,16,240,.25)",
    });
    tooltip.appendChild(hint);

    document.documentElement.appendChild(tooltip);
  }

  function removeUI() {
    overlay?.remove();
    tooltip?.remove();
    overlay = null;
    tooltip = null;
    tooltipPre = null;
    lastEl = null;
  }

  // ---------- Core ----------
  function elemFromEvent(e) {
    const p = e.composedPath?.();
    if (p && p.length) {
      for (const n of p) if (n && n.nodeType === 1) return n;
    }
    return document.elementFromPoint(e.clientX, e.clientY);
  }

  function box(el) {
    if (!overlay || !el) return;
    const r = el.getBoundingClientRect();
    overlay.style.left = r.left + "px";
    overlay.style.top = r.top + "px";
    overlay.style.width = r.width + "px";
    overlay.style.height = r.height + "px";
  }

  function scheduleBox(el) {
    if (rafBox) return;
    rafBox = true;
    requestAnimationFrame(() => {
      rafBox = false;
      box(el);
    });
  }

  function computeObject(el) {
    const cs = getComputedStyle(el);
    const colorRgb = cs.color;
    const out = {
      colorHex: rgbToHex(colorRgb) || null,
      colorRgb,
      "font-family": cs.fontFamily,
      "font-size": cs.fontSize,
      "font-weight": cs.fontWeight,
      "line-height": cs.lineHeight,
      "letter-spacing": cs.letterSpacing,
    };
    if (
      cs.backgroundImage &&
      cs.backgroundImage.includes("linear-gradient")
    ) {
      out.linearGradient = cs.backgroundImage;
    }
    return out;
  }

  async function copyTooltipJSON() {
    try {
      if (!tooltipPre) return;
      await navigator.clipboard.writeText(tooltipPre.textContent || "");
    } catch {}
  }

  function placeTooltip(x, y) {
    if (!tooltip) return;
    const pad = 12;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const rect = tooltip.getBoundingClientRect();
    let left = x + 24;
    let top = y + 24;
    if (left + rect.width + pad > vw)
      left = Math.max(pad, vw - rect.width - pad);
    if (top + rect.height + pad > vh)
      top = Math.max(pad, vh - rect.height - pad);
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function onMove(e) {
    if (!hoverEnabled) return;
    const el = elemFromEvent(e);
    if (!el) return;
    if (el !== lastEl) lastEl = el;
    ensureOverlay();
    ensureTooltip();
    scheduleBox(lastEl);
    try {
      const obj = computeObject(lastEl);
      if (tooltipPre) tooltipPre.textContent = JSON.stringify(obj, null, 2);
      chrome.runtime.sendMessage({
        type: "DCSI_RESULT",
        payload: { element: "", computed: obj },
      });
      window.__DCSI_LAST_RESULT__ = { element: "", computed: obj };
    } catch {}
    placeTooltip(e.clientX, e.clientY);
  }

  function onKey(e) {
    if (e.key.toLowerCase() === "c" && hoverEnabled) {
      copyTooltipJSON();
    }
    if (e.key === "Escape" && hoverEnabled) {
      setHover(false);
      // tell SW so popup flips
      try {
        chrome.runtime.sendMessage({ type: "hoverStatus", value: false });
      } catch {}
    }
  }

  // Toggle hover programmatically
  function setHover(v) {
    const next = !!v;
    if (hoverEnabled === next) return;
    hoverEnabled = next;
    if (hoverEnabled) {
      document.addEventListener("mousemove", onMove, true);
      window.addEventListener(
        "scroll",
        () => lastEl && scheduleBox(lastEl),
        true
      );
      window.addEventListener(
        "resize",
        () => lastEl && scheduleBox(lastEl),
        true
      );
      ensureOverlay();
      ensureTooltip();
      document.body.style.cursor = "crosshair";
    } else {
      document.removeEventListener("mousemove", onMove, true);
      document.body.style.cursor = "";
      removeUI();
    }
  }

  // ---------- Sync from popup ----------
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "setHover") {
      setHover(!!msg.value);
    }
  });

  // ---------- Hotkeys ----------
  // ignore "m" while typing
  function isEditableTarget(t) {
    if (!t) return false;
    const tag = (t.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || t.isContentEditable) return true;
    if (t.closest?.('[role="textbox"], .CodeMirror, .monaco-editor')) return true;
    return false;
  }

  // "m" toggles hover; keeps popup in sync
  document.addEventListener(
    "keydown",
    (e) => {
      if ((e.key === "m" || e.key === "M") && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        setHover(!hoverEnabled);
        try {
          chrome.runtime.sendMessage({ type: "hoverStatus", value: hoverEnabled });
        } catch {}
      }
    },
    true
  );

  document.addEventListener("keydown", onKey, true);
})();
