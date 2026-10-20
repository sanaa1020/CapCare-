import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Plain Vite config (the original Figma Make scaffold's config depended on
// Figma-internal plugins that don't exist outside that environment — this is
// the same app, just runnable standalone with `npm run dev` / `npm run build`).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: true,
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Forward API calls to the Express backend during `npm run dev`.
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
  },
});
