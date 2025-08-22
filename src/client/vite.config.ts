import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { clientConfig } from "../shared/config/env"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // Inject client configuration at build time
    __CONFIG__: JSON.stringify(clientConfig),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/graphql": "http://localhost:3000",
    },
  },
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
      },
    },
  },
})
