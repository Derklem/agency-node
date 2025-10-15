# Agency Node

**Clean URLs + Safer Outbound.** Strips tracking params (utm_*, gclid, fbclid, …), hardens external links with `rel="noopener noreferrer"`, and quietly cleans the current address bar.

_Tagline_: **Simple, opt-in tools to make surveillance expensive and autonomy easy.**

## What’s here
- `userscripts/agency-clean-urls.user.js` — Tampermonkey/Violentmonkey userscript.
- `extension/` — Minimal Chrome/Edge/Brave MV3 extension (content script only).
- `guides/dns-over-https.md` — Quick DoH setup.

## Install (Userscript)
1. Install Tampermonkey or Violentmonkey.
2. Open the raw file `userscripts/agency-clean-urls.user.js` → **Install**.

## Install (Extension)
1. `chrome://extensions/` → enable **Developer mode**.
2. **Load unpacked** → select the `extension/` folder.

## Notes
- Runs on `<all_urls>`; only touches links/URL params.
- No background worker, no data collection.
- SPA-safe via `MutationObserver`.

## License
Mozilla Public License 2.0 (MPL-2.0).
