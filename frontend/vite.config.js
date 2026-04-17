import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("../package.json", "utf8"));

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify(pkg.buildNumber),
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
