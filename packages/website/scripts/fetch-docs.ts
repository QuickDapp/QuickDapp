#!/usr/bin/env bun

import {
  cpSync,
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
import lunr from "lunr"
import semver from "semver"
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

const EXCLUDED_FILES = new Set(["CLAUDE.MD", "README.MD", "LICENSE.MD"])
const MIN_VERSION = "3.10.0"

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

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/[*_~]+/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s+/gm, "")
    .replace(/\|[^\n]+\|/g, "")
    .replace(/[-:]+\|[-:|\s]+/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim()
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

function processImagePaths(markdown: string, version: string): string {
  return markdown.replace(
    /!\[([^\]]*)\]\(\/images\/([^)]+)\)/g,
    (_, alt, imagePath) =>
      `![${alt}](/docs-versions/${version}/images/${imagePath})`,
  )
}

function processInternalLinks(markdown: string, version: string): string {
  return markdown.replace(
    /\]\(([^)]+\.md)(#[^)]*)?\)/g,
    (match, url: string, anchor = "") => {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return match
      }
      let cleanUrl = url.replace(/\.md$/, "").replace(/\/index$/, "")
      cleanUrl = cleanUrl.replace(/^\.\//, "").replace(/^\//, "")
      return `](/docs/${version}/${cleanUrl}${anchor})`
    },
  )
}

function transformImagesForLlm(markdown: string, tag: string): string {
  return markdown.replace(
    /!\[([^\]]*)\]\(\/docs-versions\/[^/]+\/images\/([^)]+)\)/g,
    (_, alt, imagePath) => {
      const url = `https://raw.githubusercontent.com/quickdapp/quickdapp/${tag}/packages/docs/images/${imagePath}`
      return alt ? `(image: ${alt} - ${url})` : `(image: ${url})`
    },
  )
}

function generateLlmTxt(pages: Record<string, DocPage>, tag: string): string {
  const lines: string[] = [
    "# QuickDapp Documentation",
    "",
    `Version: ${tag.replace(/^v/, "")}`,
    "",
    "This is the complete QuickDapp documentation in a plain text format optimized for LLM context windows.",
    "",
    "---",
    "",
  ]

  for (const page of Object.values(pages)) {
    const llmMarkdown = transformImagesForLlm(page.markdown, tag)
    lines.push(llmMarkdown)
    lines.push("")
    lines.push("---")
    lines.push("")
  }

  return lines.join("\n")
}

function generateRootLlmsTxt(versions: string[]): string {
  const latest = versions[0] || null
  const lines: string[] = [
    "# QuickDapp Documentation - LLM-friendly Format",
    "",
    "This directory contains LLM-optimized documentation for QuickDapp.",
    "",
    "Each version has its own llms.txt file containing the full documentation",
    "in plain text format, suitable for use as context in LLM conversations.",
    "",
    "## Available Versions",
    "",
  ]

  for (const version of versions) {
    const isLatest = version === latest
    const suffix = isLatest ? " (latest)" : ""
    lines.push(`- ${version}${suffix}: /docs-versions/${version}/llms.txt`)
  }

  lines.push("")
  lines.push("## Usage")
  lines.push("")
  lines.push("To use this documentation with an LLM:")
  lines.push("1. Fetch the llms.txt file for the version you need")
  lines.push("2. Include the content in your LLM context/prompt")
  lines.push("3. Ask questions about QuickDapp development")
  lines.push("")

  return lines.join("\n")
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

        const llmContent = generateLlmTxt(docs.pages, tag)
        writeFileSync(path.join(versionDir, "llms.txt"), llmContent)

        const searchDocs: Record<string, { title: string; content: string }> =
          {}
        const searchIndex = lunr(function () {
          this.ref("path")
          this.field("title", { boost: 10 })
          this.field("content")

          for (const [pagePath, page] of Object.entries(docs.pages)) {
            const content = stripMarkdown(page.markdown)
            searchDocs[pagePath] = { title: page.title, content }
            this.add({ path: pagePath, title: page.title, content })
          }
        })

        writeFileSync(
          path.join(versionDir, "search-index.json"),
          JSON.stringify(searchIndex),
        )
        writeFileSync(
          path.join(versionDir, "search-docs.json"),
          JSON.stringify(searchDocs),
        )

        if (docs.imagesDir) {
          const destImagesDir = path.join(versionDir, "images")
          cpSync(docs.imagesDir, destImagesDir, { recursive: true })
          const tempDocsDir = path.join(config.rootFolder, ".temp-docs", tag)
          if (existsSync(tempDocsDir)) {
            rmSync(tempDocsDir, { recursive: true, force: true })
          }
        }

        processedVersions.push(displayVersion)
        console.log(
          `✅ ${tag} processed (${Object.keys(docs.pages).length} pages)`,
        )
      }
    } catch (error) {
      console.warn(`⚠️  Failed to process ${tag}:`, error)
    }
  }

  const sortedVersions = processedVersions.sort((a, b) => semver.rcompare(a, b))
  const manifest = {
    versions: sortedVersions,
    latest: sortedVersions[0] || null,
    generatedAt: new Date().toISOString(),
  }
  writeFileSync(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  )

  const rootLlmsTxt = generateRootLlmsTxt(sortedVersions)
  writeFileSync(path.join(outputDir, "llms.txt"), rootLlmsTxt)

  const staticSrcDocsDir = path.join(
    config.rootFolder,
    "src",
    "server",
    "static-src",
    "docs-versions",
  )
  const staticDocsDir = path.join(
    config.rootFolder,
    "src",
    "server",
    "static",
    "docs-versions",
  )

  if (existsSync(staticSrcDocsDir)) {
    rmSync(staticSrcDocsDir, { recursive: true, force: true })
  }
  mkdirSync(staticSrcDocsDir, { recursive: true })
  cpSync(outputDir, staticSrcDocsDir, { recursive: true })

  if (existsSync(staticDocsDir)) {
    rmSync(staticDocsDir, { recursive: true, force: true })
  }
  mkdirSync(staticDocsDir, { recursive: true })
  cpSync(outputDir, staticDocsDir, { recursive: true })

  const staticRoot = path.join(config.rootFolder, "src", "server", "static")
  const staticSrcRoot = path.join(
    config.rootFolder,
    "src",
    "server",
    "static-src",
  )
  writeFileSync(path.join(staticRoot, "llms.txt"), rootLlmsTxt)
  writeFileSync(path.join(staticSrcRoot, "llms.txt"), rootLlmsTxt)

  console.log("")
  console.log(
    `✨ Documentation fetched for ${processedVersions.length} version(s)`,
  )
  console.log(`📁 Output: ${outputDir}`)
  console.log(
    `📁 Copied to: static/llms.txt, static-src/, static/docs-versions`,
  )
}

async function getVersionTags(rootFolder: string): Promise<string[]> {
  const repoRoot = await findGitRoot(rootFolder)
  const result = await $`git tag --list 'v*'`.cwd(repoRoot).text()
  return result
    .split("\n")
    .map((t) => t.trim())
    .filter((t) => {
      const v = semver.valid(t)
      return v !== null && semver.gte(v, MIN_VERSION)
    })
    .sort((a, b) => semver.rcompare(a, b))
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
  imagesDir: string | null
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

      if (EXCLUDED_FILES.has(path.basename(relativePath).toUpperCase())) {
        continue
      }

      const content = await Bun.file(filePath).text()
      const { data: frontmatter, content: markdown } = matter(content)

      const displayVersion = tag.replace(/^v/, "")
      const processedMarkdown = processInternalLinks(
        processImagePaths(
          processGitHubLinks(processRetypeCallouts(markdown), tag),
          displayVersion,
        ),
        displayVersion,
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

    const imagesDir = path.join(docsDir, "images")
    const hasImages = existsSync(imagesDir)

    if (!hasImages) {
      rmSync(tempDir, { recursive: true, force: true })
    }

    return { pages, tree, imagesDir: hasImages ? imagesDir : null }
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
    } else if (
      entry.endsWith(".md") &&
      !EXCLUDED_FILES.has(entry.toUpperCase())
    ) {
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

if (import.meta.main) {
  createScriptRunner(
    {
      name: "fetch-docs",
      description: "Fetch documentation from git version tags",
      env: "production",
    },
    fetchDocsHandler,
    setupCommand,
  )
}
