#!/usr/bin/env bun

import {
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"
import { $ } from "bun"
import matter from "gray-matter"
import {
  type CommandSetup,
  createScriptRunner,
  type ScriptOptions,
} from "./shared/script-runner"

interface FetchDocsOptions extends ScriptOptions {
  tag?: string
  force?: boolean
}

interface DocPage {
  path: string
  title: string
  markdown: string
  order: number
  icon?: string
  label?: string
  expanded?: boolean
}

interface TreeItem {
  title: string
  path: string
  order: number
  icon?: string
  label?: string
  expanded?: boolean
  children?: TreeItem[]
}

interface DocsVersion {
  version: string
  pages: Record<string, DocPage>
}

async function extractTitleFromMarkdown(markdown: string): Promise<string> {
  const lines = markdown.split("\n")
  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)$/)
    if (h1Match?.[1]) {
      return h1Match[1].trim()
    }
  }
  return "Untitled"
}

function processRetypeCallouts(markdown: string): string {
  return markdown.replace(
    /^!!!\s*(\w+)?\s*\n([\s\S]*?)^!!!\s*$/gm,
    (_match, type, content) => {
      const calloutType = type || "note"
      return `:::${calloutType}\n${content.trim()}\n:::`
    },
  )
}

function processGitHubLinks(markdown: string, version: string): string {
  return markdown.replace(
    /https:\/\/github\.com\/QuickDapp\/QuickDapp\/blob\/main\//g,
    `https://github.com/QuickDapp/QuickDapp/blob/${version}/`,
  )
}

async function fetchDocsHandler(
  options: FetchDocsOptions,
  config: { rootFolder: string; env: string },
) {
  const { tag: specificTag, force = false, verbose = false } = options

  const outputDir = path.join(config.rootFolder, "docs-versions")

  console.log("📚 Fetching documentation from git tags...")
  console.log("")

  const tags = specificTag
    ? [specificTag]
    : await getVersionTags(config.rootFolder)

  if (tags.length === 0) {
    console.log("⚠️  No version tags found")
    return
  }

  console.log(`📋 Found ${tags.length} version tag(s): ${tags.join(", ")}`)
  console.log("")

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  const processedVersions: string[] = []

  for (const tag of tags) {
    const displayVersion = tag.replace(/^v/, "")
    const versionDir = path.join(outputDir, displayVersion)

    if (existsSync(versionDir) && !force) {
      if (verbose) {
        console.log(
          `⏭️  Skipping ${tag} (already exists, use --force to rebuild)`,
        )
      }
      processedVersions.push(displayVersion)
      continue
    }

    console.log(`📖 Processing ${tag}...`)

    try {
      const docs = await fetchDocsFromTag(config.rootFolder, tag, verbose)

      if (docs) {
        if (existsSync(versionDir)) {
          rmSync(versionDir, { recursive: true, force: true })
        }
        mkdirSync(versionDir, { recursive: true })

        const indexJson: DocsVersion = {
          version: displayVersion,
          pages: docs.pages,
        }
        writeFileSync(
          path.join(versionDir, "index.json"),
          JSON.stringify(indexJson, null, 2),
        )

        writeFileSync(
          path.join(versionDir, "tree.json"),
          JSON.stringify(docs.tree, null, 2),
        )

        const allMarkdown = Object.values(docs.pages)
          .map((p) => p.markdown)
          .join("\n\n---\n\n")
        writeFileSync(path.join(versionDir, "llm.md"), allMarkdown)

        processedVersions.push(displayVersion)
        console.log(
          `✅ ${tag} processed (${Object.keys(docs.pages).length} pages)`,
        )
      }
    } catch (error) {
      console.warn(`⚠️  Failed to process ${tag}:`, error)
    }
  }

  const sortedVersions = processedVersions.sort((a, b) => {
    const aNum = a.split(".").map(Number)
    const bNum = b.split(".").map(Number)
    for (let i = 0; i < 3; i++) {
      if ((aNum[i] || 0) !== (bNum[i] || 0)) {
        return (bNum[i] || 0) - (aNum[i] || 0)
      }
    }
    return 0
  })
  const manifest = {
    versions: sortedVersions,
    latest: sortedVersions[0] || null,
    generatedAt: new Date().toISOString(),
  }
  writeFileSync(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  )

  console.log("")
  console.log(
    `✨ Documentation fetched for ${processedVersions.length} version(s)`,
  )
  console.log(`📁 Output: ${outputDir}`)
}

async function getVersionTags(rootFolder: string): Promise<string[]> {
  const repoRoot = await findGitRoot(rootFolder)
  const result = await $`git tag --list 'v*'`.cwd(repoRoot).text()
  return result
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && /^v\d+\.\d+\.\d+$/.test(t))
    .sort((a, b) => {
      const aNum = a.replace("v", "").split(".").map(Number)
      const bNum = b.replace("v", "").split(".").map(Number)
      for (let i = 0; i < 3; i++) {
        if ((aNum[i] || 0) !== (bNum[i] || 0)) {
          return (bNum[i] || 0) - (aNum[i] || 0)
        }
      }
      return 0
    })
}

async function findGitRoot(startDir: string): Promise<string> {
  const result = await $`git rev-parse --show-toplevel`.cwd(startDir).text()
  return result.trim()
}

async function fetchDocsFromTag(
  rootFolder: string,
  tag: string,
  verbose: boolean,
): Promise<{
  pages: Record<string, DocPage>
  tree: { items: TreeItem[] }
} | null> {
  const repoRoot = await findGitRoot(rootFolder)
  const tempDir = path.join(rootFolder, ".temp-docs", tag)

  try {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
    mkdirSync(tempDir, { recursive: true })

    await $`git archive ${tag} packages/docs/ | tar -x -C ${tempDir}`.cwd(
      repoRoot,
    )

    const docsDir = path.join(tempDir, "packages", "docs")

    if (!existsSync(docsDir)) {
      if (verbose) {
        console.log(`  ⚠️  No packages/docs/ in ${tag}`)
      }
      return null
    }

    const pages: Record<string, DocPage> = {}
    const mdFiles = findMarkdownFiles(docsDir)

    for (const filePath of mdFiles) {
      const relativePath = path.relative(docsDir, filePath)
      const pagePath = relativePath.replace(/\.md$/, "").replace(/\/index$/, "")

      if (relativePath === "CLAUDE.md") {
        continue
      }

      const content = await Bun.file(filePath).text()
      const { data: frontmatter, content: markdown } = matter(content)

      const processedMarkdown = processGitHubLinks(
        processRetypeCallouts(markdown),
        tag,
      )

      const title =
        frontmatter.label || (await extractTitleFromMarkdown(markdown))

      pages[pagePath || "index"] = {
        path: pagePath || "index",
        title,
        markdown: processedMarkdown,
        order: frontmatter.order ?? 0,
        icon: frontmatter.icon,
        label: frontmatter.label,
        expanded: frontmatter.expanded,
      }
    }

    const tree = buildNavigationTree(pages, docsDir)

    rmSync(tempDir, { recursive: true, force: true })

    return { pages, tree }
  } catch (error) {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
    throw error
  }
}

function findMarkdownFiles(dir: string): string[] {
  const files: string[] = []

  const entries = readdirSync(dir)
  for (const entry of entries) {
    const fullPath = path.join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath))
    } else if (entry.endsWith(".md") && entry !== "CLAUDE.md") {
      files.push(fullPath)
    }
  }

  return files
}

function buildNavigationTree(
  pages: Record<string, DocPage>,
  _docsDir: string,
): { items: TreeItem[] } {
  const root: TreeItem[] = []
  const folderNodes = new Map<string, TreeItem>()

  // Identify which paths are folders (have children)
  const folderPaths = new Set<string>()
  for (const pagePath of Object.keys(pages)) {
    const parts = pagePath.split("/")
    for (let i = 1; i < parts.length; i++) {
      folderPaths.add(parts.slice(0, i).join("/"))
    }
  }

  // First pass: create folder nodes from index pages
  for (const [pagePath, page] of Object.entries(pages)) {
    if (folderPaths.has(pagePath)) {
      folderNodes.set(pagePath, {
        title: page.title,
        path: `${pagePath}/index`,
        order: page.order,
        icon: page.icon,
        label: page.label,
        expanded: page.expanded,
        children: [],
      })
    }
  }

  // Second pass: create leaf nodes and assign to parent folders
  for (const [pagePath, page] of Object.entries(pages)) {
    if (folderPaths.has(pagePath)) continue

    const item: TreeItem = {
      title: page.title,
      path: pagePath,
      order: page.order,
      icon: page.icon,
      label: page.label,
      expanded: page.expanded,
    }

    const parts = pagePath.split("/")
    if (parts.length === 1) {
      // Skip flat pages that have a corresponding folder (folder takes precedence)
      if (folderNodes.has(pagePath)) continue
      root.push(item)
    } else {
      const parentPath = parts.slice(0, -1).join("/")
      const parent = folderNodes.get(parentPath)
      if (parent) {
        parent.children!.push(item)
      } else {
        root.push(item)
      }
    }
  }

  // Third pass: nest folders within parent folders
  for (const [folderPath, folder] of folderNodes) {
    const parts = folderPath.split("/")
    if (parts.length === 1) {
      root.push(folder)
    } else {
      const parentPath = parts.slice(0, -1).join("/")
      const parent = folderNodes.get(parentPath)
      if (parent) {
        parent.children!.push(folder)
      } else {
        root.push(folder)
      }
    }
  }

  // Recursive sort by order (descending)
  const sortItems = (items: TreeItem[]) => {
    items.sort((a, b) => b.order - a.order)
    for (const item of items) {
      if (item.children?.length) {
        sortItems(item.children)
      }
    }
  }
  sortItems(root)

  return { items: root }
}

const setupCommand: CommandSetup = (program) => {
  return program
    .option("--tag <tag>", "process only a specific tag")
    .option("--force", "force rebuild even if output exists")
}

export async function runFetchDocs(options: {
  rootFolder?: string
  verbose?: boolean
  tag?: string
  force?: boolean
}): Promise<void> {
  const rootFolder = options.rootFolder || path.resolve(import.meta.dir, "..")
  await fetchDocsHandler(
    { verbose: options.verbose, tag: options.tag, force: options.force },
    { rootFolder, env: "production" } as any,
  )
}

createScriptRunner(
  {
    name: "fetch-docs",
    description: "Fetch documentation from git version tags",
    env: "production",
  },
  fetchDocsHandler,
  setupCommand,
)
