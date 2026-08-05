import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  clearScreen: false,
  server: { strictPort: true, host: "127.0.0.1" },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: ["es2021", "chrome100"],
    minify: mode === "development" ? false : "esbuild",
    sourcemap: mode === "development",
    rollupOptions: {
      input: {
        overlay: "./src/overlay/overlay.html",
        window: "./src/window/window.html"
      }
    }
  }
}));
