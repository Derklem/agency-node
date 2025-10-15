# DNS-over-HTTPS (DoH) Quick Setup

## Windows 11
1. Settings → Network & internet → (your adapter) → DNS
2. DNS Server Assignment → Edit → set to **Encrypted (DNS over HTTPS)**.
3. Choose provider (e.g., Cloudflare, Quad9) or Custom with their DoH URL.
4. Save. Flush cache (`ipconfig /flushdns`) or reboot.

## macOS (Sonoma/Ventura)
1. System Settings → Wi-Fi → (i) Details → DNS.
2. Add DoH profile per your provider’s instructions (most provide a config profile).
3. Apply and reconnect.

**Tip:** Pick a resolver you trust. Review their privacy policy. You can change this any time.
