// --- START PWA KILL-SWITCH ---
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    // Check if we need to force a cleanup
    const PWA_CLEANUP_VERSION = "2026-03-06-v2";
    if (localStorage.getItem("pwa_cleanup_v") !== PWA_CLEANUP_VERSION) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
                registration.unregister();
            }
            if ("caches" in window) {
                caches.keys().then((names) => {
                    for (const name of names) caches.delete(name);
                });
            }
            localStorage.setItem("pwa_cleanup_v", PWA_CLEANUP_VERSION);
            window.location.reload();
        });
    }
}
// --- END PWA KILL-SWITCH ---

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
