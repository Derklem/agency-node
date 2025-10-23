// content.js — Agency Node (MV3 content script)
// Runs on <all_urls>. Mirrors your userscript logic and exposes a small API
// for the extension UI via chrome.runtime messages.

// -------------------- CORE (from your userscript, enhanced) --------------------
(() => {
  "use strict";

  // --- simple state using localStorage (works in content scripts) ---
  const KEY_ENABLED = "agency.enabled";                // "1" | "0"
  const KEY_BYPASS_PREFIX = "agency.siteBypass.";      // + hostname -> "1"

  const getHost = () => location.hostname.replace(/^www\./, "");
  const getEnabled = () => (localStorage.getItem(KEY_ENABLED) ?? "1") === "1";
  const setEnabled = (v) => localStorage.setItem(KEY_ENABLED, v ? "1" : "0");
  const getBypass = () => localStorage.getItem(KEY_BYPASS_PREFIX + getHost()) === "1";
  const toggleBypass = () => {
    const k = KEY_BYPASS_PREFIX + getHost();
    const nv = localStorage.getItem(k) === "1" ? "0" : "1";
    localStorage.setItem(k, nv);
    toast(`Agency: ${nv === "1" ? "Bypassing on this site" : "Active on this site"}`);
  };

  // Expose minimal API for the message bridge
  // (attached to window so the outer listener can call them safely)
  Object.assign(window, { __agency_getEnabled:getEnabled, __agency_setEnabled:setEnabled,
                          __agency_getBypass:getBypass, __agency_toggleBypass:toggleBypass });

  const TRACK_PARAMS = new Set([
    "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
    "gclid","fbclid","mc_cid","mc_eid","ref","igshid","si","spm"
  ]);

  const toast = (msg) => {
    if (!document.body) return;
    const el = document.createElement("div");
    el.textContent = msg;
    Object.assign(el.style, {
      position:"fixed", right:"10px", bottom:"12px", padding:"6px 10px",
      background:"rgba(0,0,0,0.65)", color:"#fff",
      font:"12px/1.2 system-ui, sans-serif",
      borderRadius:"8px", zIndex: 2147483647, opacity:"0", transition:"opacity .25s"
    });
    document.body.appendChild(el);
    requestAnimationFrame(()=>{ el.style.opacity="1"; });
    setTimeout(()=>{ el.style.opacity="0"; setTimeout(()=>el.remove(),250); }, 1200);
  };

  function cleanURLString(urlStr) {
    try {
      const u = new URL(urlStr, location.href);
      let changed = false;
      for (const key of Array.from(u.searchParams.keys())) {
        if (TRACK_PARAMS.has(key.toLowerCase())) {
          u.searchParams.delete(key);
          changed = true;
        }
      }
      if (!u.searchParams.toString()) u.search = "";
      return { url: u.toString(), changed };
    } catch {
      return { url: urlStr, changed: false };
    }
  }

  function hardenLink(a) {
    if (!a || !a.href) return;
    const rel = (a.getAttribute("rel") || "").toLowerCase();
    const newRel = new Set(rel.split(/\s+/).filter(Boolean));
    ["noreferrer","noopener"].forEach(t => newRel.add(t));
    a.setAttribute("rel", Array.from(newRel).join(" "));
    const { url, changed } = cleanURLString(a.href);
    if (changed) {
      a.href = url;
      a.addEventListener("click", () => toast("Agency: cleaned URL"), { once:true });
    }
  }

  function scan(root = document) {
    if (!getEnabled() || getBypass()) return;
    root.querySelectorAll("a[href]").forEach(hardenLink);
  }

  // Clean the current location immediately (no history add)
  (function cleanCurrentLocation() {
    if (!getEnabled() || getBypass()) return;
    const { url, changed } = cleanURLString(location.href);
    if (changed && url !== location.href) {
      history.replaceState(history.state, "", url);
      window.addEventListener("DOMContentLoaded", () => toast("Agency: cleaned URL"), { once:true });
    }
  })();

  // Handle SPA navigations
  ["pushState","replaceState"].forEach(fn => {
    const orig = history[fn];
    history[fn] = function(...args) {
      const ret = orig.apply(this, args);
      if (!getEnabled() || getBypass()) return ret;

      const idx = 2;
      if (typeof args[idx] === "string") {
        const fixed = cleanURLString(args[idx]);
        if (fixed.changed) orig.call(history, args[0], args[1], fixed.url);
      }
      const now = cleanURLString(location.href);
      if (now.changed) history.replaceState(history.state, "", now.url);
      return ret;
    };
  });

  window.addEventListener("popstate", () => {
    if (!getEnabled() || getBypass()) return;
    const fixed = cleanURLString(location.href);
    if (fixed.changed) history.replaceState(history.state, "", fixed.url);
  });

  // Initial scan (after body)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scan(), { once:true });
  } else {
    scan();
  }

  // Observe dynamic content
  new MutationObserver(muts => {
    if (!getEnabled() || getBypass()) return;
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.tagName === "A") hardenLink(n);
        else scan(n);
      }
    }
  }).observe(document.documentElement, { childList:true, subtree:true });

})(); // ---- end core IIFE ----


// -------------------- MESSAGE BRIDGE (for popup/options) --------------------
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    try {
      if (!msg || !msg.agencyCmd) return;

      if (msg.agencyCmd === "getStatus") {
        sendResponse({
          ok: true,
          enabled: window.__agency_getEnabled?.() ?? true,
          bypass: window.__agency_getBypass?.() ?? false,
          host: location.hostname
        });
        return;
      }

      if (msg.agencyCmd === "enable") {
        window.__agency_setEnabled?.(true);
        sendResponse({ ok: true });
        return;
      }

      if (msg.agencyCmd === "disable") {
        window.__agency_setEnabled?.(false);
        sendResponse({ ok: true });
        return;
      }

      if (msg.agencyCmd === "toggleBypass") {
        window.__agency_toggleBypass?.();
        sendResponse({ ok: true });
        return;
      }

      sendResponse({ ok:false, error:"unknown command" });
    } catch (e) {
      sendResponse({ ok:false, error:String(e) });
    }
    // Keep the channel open if we were async (we’re not here).
    return false;
  });
}
