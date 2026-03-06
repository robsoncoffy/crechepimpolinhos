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

console.log("ANTIGRAVITY: MAIN.TSX START");
document.addEventListener("DOMContentLoaded", () => {
    console.log("ANTIGRAVITY: DOMContentLoaded");
    const root = document.getElementById("root");
    if (root) {
        root.innerHTML = "<div style='padding: 50px; text-align: center; color: red;'><h1>TESTE DE EXECUÇÃO: O SCRIPT ESTÁ RODANDO</h1></div>";
        console.log("ANTIGRAVITY: Root modified");
    } else {
        console.error("ANTIGRAVITY: Root NOT found");
    }
});

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// createRoot(document.getElementById("root")!).render(<App />);
