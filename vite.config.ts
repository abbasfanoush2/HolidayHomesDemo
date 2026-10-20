import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
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
