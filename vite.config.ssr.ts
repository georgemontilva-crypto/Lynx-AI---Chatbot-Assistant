import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Dedicated SSR build config.
// Omits dev-tooling plugins (jsxLocPlugin, vitePluginManusRuntime, debug
// collector, VitePWA) — these are dev-server hooks or add data-loc attributes
// that are irrelevant in the SSR bundle. Keep react() and tailwindcss() because
// they transform application source.
export default defineConfig({
  // root: makes dependency externalization deterministic regardless of cwd
  root: import.meta.dirname,
  mode: "production",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  build: {
    ssr: path.resolve(import.meta.dirname, "client/src/entry-server.tsx"),
    outDir: path.resolve(import.meta.dirname, "dist/server-ssr"),
    emptyOutDir: true,
    rollupOptions: {
      output: { entryFileNames: "entry-server.js" },
    },
  },
});
