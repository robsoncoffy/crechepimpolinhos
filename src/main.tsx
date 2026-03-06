console.log("ANTIGRAVITY: MAIN.TSX START");

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("ANTIGRAVITY: Attempting to find root element");
const rootElement = document.getElementById("root");

if (rootElement) {
    console.log("ANTIGRAVITY: Root element found, creating React root");
    const root = createRoot(rootElement);
    console.log("ANTIGRAVITY: Rendering <App />");
    root.render(<App />);
    console.log("ANTIGRAVITY: Render call completed");
} else {
    console.error("ANTIGRAVITY: FATAL - Root element NOT found in DOM");
}

