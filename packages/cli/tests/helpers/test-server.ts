import { readFileSync } from "node:fs"
import type { Server } from "bun"

interface TestServer {
  url: string
  port: number
  addFile: (urlPath: string, localPath: string) => void
  addJsonResponse: (urlPath: string, data: unknown) => void
  addTextResponse: (urlPath: string, text: string) => void
  close: () => void
}

export function createTestServer(): TestServer {
  const files = new Map<string, string>()
  const jsonResponses = new Map<string, unknown>()
  const textResponses = new Map<string, string>()

  const server: Server = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url)
      const path = url.pathname

      if (jsonResponses.has(path)) {
        return new Response(JSON.stringify(jsonResponses.get(path)), {
          headers: { "Content-Type": "application/json" },
        })
      }

      if (textResponses.has(path)) {
        return new Response(textResponses.get(path), {
          headers: { "Content-Type": "text/plain" },
        })
      }

      if (files.has(path)) {
        const filePath = files.get(path)!
        try {
          const content = readFileSync(filePath)
          return new Response(content, {
            headers: { "Content-Type": "application/octet-stream" },
          })
        } catch {
          return new Response("File not found", { status: 404 })
        }
      }

      return new Response("Not found", { status: 404 })
    },
  })

  return {
    url: `http://localhost:${server.port}`,
    port: server.port,
    addFile: (urlPath: string, localPath: string) => {
      files.set(urlPath, localPath)
    },
    addJsonResponse: (urlPath: string, data: unknown) => {
      jsonResponses.set(urlPath, data)
    },
    addTextResponse: (urlPath: string, text: string) => {
      textResponses.set(urlPath, text)
    },
    close: () => {
      server.stop()
    },
  }
}
