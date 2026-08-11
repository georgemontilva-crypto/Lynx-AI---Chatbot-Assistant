import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const PROJECT_ROOT = import.meta.dirname;

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  VitePWA({
    registerType: "autoUpdate",
    injectRegister: "auto",
    manifest: false, // Use existing client/public/manifest.json
    includeAssets: ["favicon.ico", "robots.txt", "icon-192x192.png", "icon-512x512.png"],
    workbox: {
      // Only hashed build assets are precached. HTML is NOT: this app is
      // server-rendered, so a cached shell would serve a stale page (and stale
      // asset hashes) that a hard reload can't clear.
      globPatterns: ["**/*.{js,css,ico,png,svg,woff,woff2}"],
      importScripts: ["/sw-push.js"],
      // Take over immediately instead of waiting for every tab to close —
      // without these, a deploy only lands on the *next* visit after closing
      // the browser, which is why Ctrl+Shift+R appeared to do nothing.
      skipWaiting: true,
      clientsClaim: true,
      cleanupOutdatedCaches: true,
      // No runtimeCaching for /api/trpc: it used to serve dashboard data from
      // cache for 5 minutes, so saved changes seemed not to apply.
      // navigateFallback must be null explicitly: the plugin defaults it to
      // index.html, which would serve a stale cached shell on every navigation.
      navigateFallback: null,
    },
    devOptions: {
      enabled: false, // Disable in dev to avoid conflicts
    },
  }),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    minify: "esbuild",
    target: "es2020",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "motion": ["framer-motion"],
          "charts": ["recharts"],
          "date": ["date-fns"],
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: [
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
