export interface DocPage {
  path: string
  title: string
  markdown: string
  order: number
  icon?: string
  label?: string
}

export interface TreeItem {
  title: string
  path: string
  order: number
  icon?: string
  label?: string
  expanded?: boolean
  children?: TreeItem[]
}

export interface DocsManifest {
  versions: string[]
  latest: string | null
  generatedAt: string
}

export interface DocsIndex {
  version: string
  pages: Record<string, DocPage>
}

export interface DocsTree {
  items: TreeItem[]
}
