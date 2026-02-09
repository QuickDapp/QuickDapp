import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import type { Plugin } from "vite"
import { defineConfig } from "vite"

const { clientConfig } = require("../shared/config/client.ts")

const serverPort = process.env.PORT || 3000
const serverUrl = `http://localhost:${serverPort}`

function injectConfig(): Plugin {
  return {
    name: "inject-config",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const configScript = `  <script>
    globalThis.__CONFIG__ = ${JSON.stringify(clientConfig)};
  </script>`

        return html.replace(
          "</body>",
          `${configScript}
</body>`,
        )
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), injectConfig()],
  publicDir: path.resolve(__dirname, "../server/static-src"),
  define: {
    "globalThis.__CONFIG__": JSON.stringify(clientConfig),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  ssr: {
    noExternal: ["@tanstack/react-query"],
  },
  server: {
    port: 5173,
    proxy: {
      "/graphql": {
        target: serverUrl,
        configure: (proxy) => {
          proxy.on("error", () => undefined)
        },
      },
      "/health": {
        target: serverUrl,
        configure: (proxy) => {
          proxy.on("error", () => undefined)
        },
      },
    },
  },
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
    sourcemap: true,
    manifest: true,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
      output: {
        entryFileNames: "assets/[name].[hash].js",
        chunkFileNames: "assets/[name].[hash].js",
        assetFileNames: "assets/[name].[hash].[ext]",
      },
    },
  },
})
