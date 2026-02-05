import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  ssr: {
    noExternal: true,
  },
  build: {
    ssr: true,
    outDir: "../../dist/ssr",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "entry-server.tsx"),
      output: {
        entryFileNames: "entry-server.js",
        format: "esm",
      },
    },
  },
})
