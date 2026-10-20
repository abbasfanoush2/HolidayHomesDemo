import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import market from "./api/market";
export default defineConfig({
  optimizeDeps: {
    exclude: [
      "/src/localization/jsx-runtime",
      "/src/localization/jsx-dev-runtime",
      "@staypilot/locale",
    ],
  },
  plugins: [
    react({ jsxImportSource: "/src/localization" }),
    {
      name: "source-locale-runtime",
      config(config) {
        if (config.optimizeDeps?.include)
          config.optimizeDeps.include = config.optimizeDeps.include.filter(
            (id) => !id.startsWith("/src/localization/"),
          );
      },
    },
    {
      name: "local-market-fallback",
      configureServer(server) {
        server.middlewares.use("/api/market", (req, res) =>
          market({ method: req.method, headers: {} }, res),
        );
      },
      configurePreviewServer(server) {
        server.middlewares.use("/api/market", (req, res) =>
          market({ method: req.method, headers: {} }, res),
        );
      },
    },
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ["recharts"],
          motion: ["motion"],
          react: ["react", "react-dom", "react-dom/client", "react-router-dom"],
        },
      },
    },
  },
  server: { host: "0.0.0.0", port: 5173, strictPort: true },
});
