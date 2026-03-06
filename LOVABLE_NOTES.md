# Technical Summary: White Screen & Stale Service Worker Fix

**Root Cause:**
A previously removed `vite-plugin-pwa` had an active Service Worker persistent in browser caches (especially on mobile). Since the plugin was removed, the SW was serving malformed `304 Not Modified` cached responses for `index.html` and core JS assets, causing a white screen before React could mount.

**Changes Implemented:**
1.  **Created `public/sw.js` (Kill-Switch):** A new minimal Service Worker that triggers `self.skipWaiting()`, unregisters itself from the browser, and forces all open clients to navigate to the current URL.
2.  **Updated `index.html`:** Replaced old inline cleanup scripts with a registration call to our new `sw.js` kill-switch and a secondary `caches.delete` fallback.

**Impact:**
Automatic cache clearing and page reload for any user previously stuck on the white screen. No manual cache clearing required by end-users.
