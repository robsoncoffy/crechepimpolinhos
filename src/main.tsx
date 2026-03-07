import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// --- START PWA KILL-SWITCH ---
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    const PWA_CLEANUP_VERSION = "2026-03-07-v1";
    // Clear stale dynamic-import retry guards
    sessionStorage.removeItem("dashboard_import_retried");
    sessionStorage.removeItem("dashboard_import_reloaded");
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

const rootElement = document.getElementById("root");
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
}
