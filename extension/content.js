// Agency Node - Clean URLs (Content Script)
// - Strips common tracking params from links & current location
// - Adds rel="noopener noreferrer" to external links
// - Cleans clipboard URLs on copy

(function () {
  "use strict";

  const TRACK = new Set([
    "utm_source","utm_medium","utm_campaign","utm_term","utm_content",
    "utm_name","utm_id","utm_reader","utm_cid","utm_referrer",
    "fbclid","gclid","igshid","mc_cid","mc_eid","oly_anon_id","oly_enc_id",
    "msclkid","vero_conv","vero_id","stm_campaign","pk_campaign","pk_kwd"
  ]);

  function isExternal(href) {
    try {
      const url = new URL(href, location.href);
      return url.origin !== location.origin;
    } catch {
      return false;
    }
  }

  function cleanUrl(u) {
    try {
      const url = new URL(u, location.href);
      let changed = false;
      for (const key of Array.from(url.searchParams.keys())) {
        if (TRACK.has(key) || key.toLowerCase().startsWith("utm_")) {
          url.searchParams.delete(key);
          changed = true;
        }
      }
      // optional: strip empty hash
      if (url.hash === "#") { url.hash = ""; }
      return { href: url.toString(), changed };
    } catch {
      return { href: u, changed: false };
    }
  }

  // Clean current address bar (history replace) without navigation
  function cleanLocation() {
    const { href, changed } = cleanUrl(location.href);
    if (changed) history.replaceState({}, "", href);
  }

  // Mutate links in DOM
  function cleanLinks(root = document) {
    const aTags = root.querySelectorAll("a[href]");
    for (const a of aTags) {
      const { href, changed } = cleanUrl(a.href);
      if (changed) a.href = href;
      if (isExternal(a.href)) {
        const rel = new Set((a.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
        rel.add("noopener"); rel.add("noreferrer");
        a.setAttribute("rel", Array.from(rel).join(" "));
      }
    }
  }

  // Try to clean clipboard URLs on copy
  function onCopy(e) {
    try {
      const sel = document.getSelection()?.toString() || "";
      const trimmed = sel.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        const { href, changed } = cleanUrl(trimmed);
        if (changed && e.clipboardData) {
          e.preventDefault();
          e.clipboardData.setData("text/plain", href);
        }
      }
    } catch {}
  }

  // Observe DOM changes (SPA frameworks)
  const observer = new MutationObserver((muts) => {
    for (const mut of muts) {
      if (mut.type === "childList") {
        mut.addedNodes.forEach((n) => {
          if (n.nodeType === 1) cleanLinks(n);
        });
      } else if (mut.type === "attributes" && mut.attributeName === "href" && mut.target.tagName === "A") {
        cleanLinks(mut.target);
      }
    }
  });

  function init() {
    cleanLocation();
    cleanLinks(document);
    document.addEventListener("copy", onCopy, true);
    observer.observe(document.documentElement || document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["href"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
