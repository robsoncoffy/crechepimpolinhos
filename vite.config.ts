import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          
          // UI Components (grouped)
          'vendor-ui-core': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-dropdown-menu',
          ],
          'vendor-ui-forms': [
            '@radix-ui/react-checkbox',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-switch',
            '@radix-ui/react-slider',
          ],
          'vendor-ui-nav': [
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-navigation-menu',
          ],
          'vendor-ui-feedback': [
            '@radix-ui/react-tooltip',
            '@radix-ui/react-toast',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-hover-card',
          ],
          
          // Charts (lazy loaded)
          'vendor-charts': ['recharts'],
          
          // Date utilities
          'vendor-date': ['date-fns'],
        },
      },
    },
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
