import type { ClientConfig } from "../../shared/config/client"

interface HtmlTemplateOptions {
  appHtml: string
  dehydratedState: unknown
  clientConfig: ClientConfig
  cssAssets: string[]
  jsAssets: string[]
}

export function buildHtmlDocument(options: HtmlTemplateOptions): string {
  const { appHtml, dehydratedState, clientConfig, cssAssets, jsAssets } =
    options

  const cssLinks = cssAssets
    .map((href) => `<link rel="stylesheet" href="${href}" />`)
    .join("\n    ")

  const jsScripts = jsAssets
    .map((src) => `<script type="module" src="${src}"></script>`)
    .join("\n    ")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QuickDapp</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <script>
    (function() {
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = stored === 'light' ? 'light' :
                    stored === 'dark' ? 'dark' :
                    (prefersDark ? 'dark' : 'light');
      document.documentElement.classList.add(theme);
    })();
  </script>
  ${cssLinks}
</head>
<body>
  <div id="root">${appHtml}</div>
  <script>
    window.__SSR__ = true;
    window.__REACT_QUERY_STATE__ = ${JSON.stringify(dehydratedState)};
    globalThis.__CONFIG__ = ${JSON.stringify(clientConfig)};
  </script>
  ${jsScripts}
</body>
</html>`
}

interface ManifestEntry {
  file: string
  css?: string[]
  isEntry?: boolean
  src?: string
}

type ViteManifest = Record<string, ManifestEntry>

export function parseViteManifest(manifest: ViteManifest): {
  cssAssets: string[]
  jsAssets: string[]
} {
  const cssAssets: string[] = []
  const jsAssets: string[] = []

  const indexEntry = manifest["index.html"]
  if (indexEntry) {
    jsAssets.push(`/${indexEntry.file}`)
    if (indexEntry.css) {
      cssAssets.push(...indexEntry.css.map((css) => `/${css}`))
    }
  } else {
    for (const [, entry] of Object.entries(manifest)) {
      if (entry.isEntry) {
        jsAssets.push(`/${entry.file}`)
        if (entry.css) {
          cssAssets.push(...entry.css.map((css) => `/${css}`))
        }
      }
    }
  }

  return { cssAssets, jsAssets }
}
