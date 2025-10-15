// ==UserScript==
// @name         Agency: Clean URLs + Safer Outbound
// @namespace    https://example.org/agency-node
// @version      0.2
// @description  Strip tracking params, add rel=noreferrer/noopener to outbound links, and show a subtle toast.
// @match        *://*/*
// @grant        none
// ==/UserScript==
(function() {
  "use strict";
  const TRACK_PARAMS = new Set([
    "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
    "gclid","fbclid","mc_cid","mc_eid","ref","igshid","si","spm"
  ]);
  const cleanURL = (urlStr) => {
    try {
      const u = new URL(urlStr);
      let changed = false;
      [...u.searchParams.keys()].forEach(k => {
        if (TRACK_PARAMS.has(k.toLowerCase())) { u.searchParams.delete(k); changed = true; }
      });
      return { url: u.toString(), changed };
    } catch { return { url: urlStr, changed: false }; }
  };
  const toast = (msg) => {
    const el = document.createElement("div");
    el.textContent = msg;
    Object.assign(el.style, {
      position:"fixed", right:"10px", bottom:"12px", padding:"6px 10px",
      background:"rgba(0,0,0,0.65)", color:"#fff", font:"12px/1.2 system-ui, sans-serif",
      borderRadius:"8px", zIndex: 2147483647, opacity: "0", transition:"opacity .25s"
    });
    document.body.appendChild(el);
    requestAnimationFrame(()=>{ el.style.opacity="1"; });
    setTimeout(()=>{ el.style.opacity="0"; setTimeout(()=>el.remove(),250); }, 1200);
  };
  const hardenLink = (a) => {
    if (!a || !a.href) return;
    const rel = (a.getAttribute("rel") || "").toLowerCase();
    const newRel = new Set(rel.split(/\s+/).filter(Boolean));
    ["noreferrer","noopener"].forEach(t => newRel.add(t));
    a.setAttribute("rel", Array.from(newRel).join(" "));
    const { url, changed } = cleanURL(a.href);
    if (changed) {
      a.href = url;
      a.addEventListener("click", () => toast("Agency: cleaned URL"), { once:true });
    }
  };
  const scan = (root=document) => root.querySelectorAll("a[href]").forEach(hardenLink);
  scan();
  new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1) { n.tagName === "A" ? hardenLink(n) : scan(n); }
    }));
  }).observe(document.documentElement, { childList:true, subtree:true });
})();
