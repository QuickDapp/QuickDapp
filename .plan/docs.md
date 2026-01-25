# Versioned Documentation Implementation Plan

> **Note**: Keep this plan file updated as implementation progresses. Mark completed items, add notes about decisions made, and track any deviations from the original plan.

## Status

- [ ] **Restore frontmatter to docs package**
- [ ] Fetch docs script
- [ ] Build integration
- [ ] Client-side routing
- [ ] DocsPage component
- [ ] DocsSidebar component
- [ ] DocsContent component
- [ ] DocsLlmPage component
- [ ] Server-side changes
- [ ] GitHub workflow update
- [ ] Testing & verification

---

## Overview

Implement a versioned documentation system for the QuickDapp website that:
1. **Restores YAML frontmatter** to docs package (ported from quickdapp-OLD)
2. Fetches docs from each git version tag
3. Processes markdown links to point to version-specific GitHub URLs
4. Converts docs to JSON with markdown + plain text
5. Renders docs at `/docs` with version selector and hierarchical sidebar

---

## Part 0: Restore Frontmatter to Docs Package

The current `packages/docs/` markdown files are missing YAML frontmatter that was present in `quickdapp-OLD/docs/`. This frontmatter controls ordering and navigation display.

### Frontmatter Format (Retype-compatible)

```yaml
---
order: 98        # Higher number = earlier in navigation
icon: cpu        # Optional icon name (Retype format, mapped to Lucide for website)
label: Display   # Optional display label (overrides H1 title)
expanded: true   # For folder index.md - expand section by default
---
```

### Icon Mapping (Retype → Lucide React)

The docs package uses Retype icon names. For the website, map to Lucide React equivalents:

| Retype Icon | Lucide Icon | Usage |
|-------------|-------------|-------|
| `cpu` | `Cpu` | Backend |
| `browser` | `Globe` | Frontend |
| `checklist` | `ListChecks` | Worker |
| `command-palette` | `Terminal` | Command-line |

In `fetch-docs.ts`, transform icon names:
```typescript
const ICON_MAP: Record<string, string> = {
  'cpu': 'Cpu',
  'browser': 'Globe',
  'checklist': 'ListChecks',
  'command-palette': 'Terminal',
}
const lucideIcon = ICON_MAP[frontmatter.icon] ?? frontmatter.icon
```

In `DocsSidebar.tsx`, render icons dynamically:
```typescript
import { Cpu, Globe, ListChecks, Terminal } from 'lucide-react'

const ICONS = { Cpu, Globe, ListChecks, Terminal }
const IconComponent = icon ? ICONS[icon as keyof typeof ICONS] : null
```

### Files to Update with Frontmatter

| File | order | icon | expanded | label |
|------|-------|------|----------|-------|
| `index.md` | 100 | | | |
| `getting-started.md` | 98 | | | |
| `architecture-layout.md` | 97 | | | |
| `environment-variables.md` | 50 | | | |
| **backend/** | | | | |
| `backend/index.md` | 95 | cpu | true | |
| `backend/bootstrap.md` | 90 | | | |
| `backend/database.md` | 70 | | | |
| `backend/graphql.md` | 60 | | | |
| `backend/authentication.md` | 50 | | | |
| `backend/websockets.md` | 40 | | | |
| **frontend/** | | | | |
| `frontend/index.md` | 94 | browser | true | |
| `frontend/components.md` | 80 | | | |
| `frontend/forms.md` | 70 | | | |
| `frontend/global.md` | 60 | | | |
| `frontend/graphql.md` | 50 | | | |
| `frontend/static-assets.md` | 40 | | | |
| `frontend/web3.md` | 30 | | | |
| **worker/** | | | | |
| `worker/index.md` | 93 | checklist | true | |
| `worker/background-jobs.md` | 80 | | | |
| `worker/adding-jobs.md` | 70 | | | |
| **users/** | | | | |
| `users/index.md` | 92 | | true | |
| `users/authentication.md` | 80 | | | |
| **smart-contracts/** | | | | |
| `smart-contracts/index.md` | 91 | | true | |
| **deployment/** | | | | |
| `deployment/index.md` | 60 | | true | |
| `deployment/docker.md` | 80 | | | |
| `deployment/binary.md` | 70 | | | |
| **command-line/** | | | | |
| `command-line/index.md` | 96 | command-palette | true | Command-line |
| `command-line/dev.md` | 90 | | | |
| `command-line/build.md` | 80 | | | |
| `command-line/prod.md` | 70 | | | |
| `command-line/db.md` | 60 | | | |
| `command-line/test.md` | 50 | | | |

---

## Architecture

### Build-Time Processing

The docs are fetched and processed **at build time** (before Vite build), generating static JSON files that get bundled into the binary. This approach:
- Avoids runtime GitHub API calls
- Ensures docs are available offline
- Simplifies deployment (no external dependencies)

The Docker website workflow on GitHub runs when a new release tag is created, triggering a fresh build that fetches all version tags' docs.

### Data Flow

```
GitHub Tags → Fetch Script → Raw Markdown → Process Links → Generate JSON → Bundle → Serve
```

---

## File Structure

```
packages/website/
├── scripts/
│   └── fetch-docs.ts              # New: Fetches and processes versioned docs
├── src/
│   ├── client/
│   │   ├── App.tsx                # Modified: Add routing
│   │   ├── pages/
│   │   │   ├── HomePage.tsx       # Existing
│   │   │   ├── DocsPage.tsx       # New: Docs viewer page
│   │   │   └── DocsLlmPage.tsx    # New: LLM-friendly plain text page
│   │   ├── components/
│   │   │   ├── docs/
│   │   │   │   ├── DocsSidebar.tsx      # New: Hierarchical navigation
│   │   │   │   ├── DocsContent.tsx      # New: Markdown renderer
│   │   │   │   ├── DocsVersionSelect.tsx # New: Version dropdown
│   │   │   │   └── DocsCopyBlock.tsx    # New: Copyable text block
│   │   │   └── ...
│   │   └── hooks/
│   │       └── useDocs.ts         # New: Hook for loading docs data
│   └── server/
│       └── start-server.ts        # Modified: SPA fallback for /docs routes
├── .gitignore                     # Modified: Add docs-versions/
└── docs-versions/                 # New: Gitignored, generated at build time
    ├── manifest.json              # Version list and metadata
    ├── v3.5.3/
    │   ├── index.json             # Processed docs for this version
    │   └── tree.json              # Navigation tree structure
    ├── v3.5.2/
    │   └── ...
    └── ...
```

---

## Implementation Details

### 1. Fetch Docs Script (`scripts/fetch-docs.ts`)

**Purpose**: Fetch docs from each version tag and process into JSON.

**Process**:
1. List all git tags matching `v*` pattern using `git tag -l "v*"`
2. For each tag:
   - Create temp directory
   - Run `git archive` or `git clone --depth 1 --branch <tag>` to get that tag's `packages/docs/` content
   - Process markdown files
   - Generate JSON output
3. Create manifest.json with version list (sorted, latest first)

**Link Processing**:
- Find GitHub links: `https://github.com/QuickDapp/quickdapp/blob/main/...`
- Replace `main` with version tag: `https://github.com/QuickDapp/quickdapp/blob/v3.5.3/...`
- Also handle `tree/main/` links

**JSON Output Structure** (`v3.5.3/index.json`):
```json
{
  "version": "v3.5.3",
  "pages": {
    "getting-started": {
      "path": "getting-started",
      "title": "Getting started",
      "markdown": "# Getting started\n...",
      "text": "Getting started\nStep 0 - Pre-requisites...",
      "order": 1
    },
    "backend/index": {
      "path": "backend/index",
      "title": "Backend",
      "markdown": "...",
      "text": "...",
      "order": 0
    }
  }
}
```

**Navigation Tree** (`v3.5.3/tree.json`):
```json
{
  "version": "v3.5.3",
  "items": [
    { "title": "Introduction", "path": "index", "order": 0 },
    { "title": "Getting Started", "path": "getting-started", "order": 1 },
    {
      "title": "Backend",
      "path": "backend/index",
      "order": 2,
      "children": [
        { "title": "Database", "path": "backend/database", "order": 0 },
        { "title": "GraphQL", "path": "backend/graphql", "order": 1 }
      ]
    }
  ]
}
```

**Title Extraction**:
- Parse first `# Heading` from markdown as title
- Fallback to filename (kebab-case to Title Case)

**Order Determination**:
- `index.md` files always first (order: 0)
- Other files alphabetically by filename

**Dependencies to add**:
- `unified` - Core processor
- `remark-parse` - Parse markdown to AST
- `strip-markdown` - Remark plugin for text extraction
- `remark-stringify` - Stringify AST back to text

**Markdown Processing (build-time)**:
```typescript
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import stripMarkdown from 'strip-markdown'
import remarkStringify from 'remark-stringify'

const toPlainText = (markdown: string): string => {
  const result = unified()
    .use(remarkParse)
    .use(stripMarkdown)
    .use(remarkStringify)
    .processSync(markdown)
  return String(result).replace(/\s+/g, ' ').trim()
}
```

**Frontmatter Parsing**:
Docs use YAML frontmatter (restored from quickdapp-OLD). Parse with `gray-matter`:
```typescript
import matter from 'gray-matter'

const { data: frontmatter, content: markdown } = matter(fileContent)
// frontmatter.order, frontmatter.icon, frontmatter.label, frontmatter.expanded
```

Metadata extraction:
- **order**: From frontmatter (higher = earlier in nav)
- **title**: From frontmatter `label` OR first `# Heading` in markdown
- **icon**: From frontmatter (optional, for Retype nav icons)
- **expanded**: From frontmatter (optional, for folder expansion)

**Retype `!!!` Callout Conversion**:
Retype uses `!!!` blocks for callouts. These need conversion to styled `<aside>` or `<div>` elements:
```markdown
!!!
This is an info callout
!!!
```
Should become a styled callout component in the rendered output

### 2. Build Integration

**Modify `scripts/build.ts`**:
- Add step before Vite build: `await fetchDocs()`
- Ensure `docs-versions/` is copied to static assets

**Modify `.gitignore`**:
```
docs-versions/
```

### 3. Client-Side Routing

**URL Structure** - Hierarchical paths matching docs folder structure:
```
/docs                           → Redirect to /docs/latest
/docs/latest                    → Latest version intro (index.md)
/docs/latest/getting-started    → Getting started page
/docs/latest/backend            → Backend index
/docs/latest/backend/database   → Backend > Database
/docs/latest/backend/graphql    → Backend > GraphQL
/docs/latest/llm                → LLM-friendly plain text for latest version
/docs/v3.5.3                    → Specific version intro
/docs/v3.5.3/frontend/web3      → Specific version > Frontend > Web3
/docs/v3.5.3/llm                → LLM-friendly plain text for v3.5.3
```

**Modify `App.tsx`**:
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom"

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/:version/llm" element={<DocsLlmPage />} />
          <Route path="/docs/:version/*" element={<DocsPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
```

### 4. DocsPage Component

**Route handling**:
- `/docs` → Redirect to `/docs/latest`
- `/docs/latest` → Load latest version index
- `/docs/latest/backend/database` → Load latest version, backend/database page
- `/docs/v3.5.3/frontend/web3` → Load v3.5.3, frontend/web3 page

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Header (existing)                                   │
├──────────────┬──────────────────────────────────────┤
│ Sidebar      │ Content                              │
│              │                                      │
│ [v3.5.3 ▼]   │ # Getting Started                   │
│              │                                      │
│ Introduction │ ## Step 0 - Pre-requisites          │
│ Getting      │ ...                                  │
│   Started    │                                      │
│ ▼ Backend    │                                      │
│   Database   │                                      │
│   GraphQL    │                                      │
│   ...        │                                      │
│ ▼ Frontend   │                                      │
│   ...        │                                      │
└──────────────┴──────────────────────────────────────┘
```

### 5. DocsSidebar Component

**Features**:
- Version dropdown at top
- Hierarchical tree navigation
- Collapsible sections for folders
- Active page highlighting
- Responsive (drawer on mobile)

**Version Dropdown Display**:
- Latest version shows actual version with suffix: `v3.5.3 (latest)`
- Other versions show just the version: `v3.5.2`, `v3.5.1`, etc.
- URL uses `latest` for latest version: `/docs/latest/getting-started`
- Selecting an older version navigates to: `/docs/v3.5.2/getting-started`

### 6. DocsContent Component

**Features**:
- Render markdown to React using unified pipeline (see Dependencies section)
- Syntax highlighting for code blocks via `rehype-highlight`
- Handle Retype `!!!` info boxes → convert to styled callouts
- Anchor links for headings via `rehype-slug`
- Table of contents (optional)

### 7. DocsLlmPage Component (`/docs/:version/llm`)

**Purpose**: Provide all documentation as plain text for users to copy-paste into AI-assisted editors (Cursor, Copilot, Claude, etc).

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Header                                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│ # QuickDapp Documentation for AI Assistants        │
│                                                     │
│ [v3.5.3 ▼]  Version selector                       │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ## Prompt                                       │ │
│ │                                                 │ │
│ │ Use the following documentation to help answer  │ │
│ │ questions about QuickDapp. This is the official │ │
│ │ documentation for version {version}.            │ │
│ │                                    [Copy] btn   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ## Documentation                                │ │
│ │                                                 │ │
│ │ <plain text of all docs concatenated>           │ │
│ │ ...                                             │ │
│ │                                    [Copy] btn   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [Copy All] - Copies prompt + docs together          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Version dropdown to select which version's docs to display
- Pre-written prompt explaining how to use the docs
- Plain text block containing all docs (markdown-to-text converted)
- Copy buttons for prompt, docs, and combined
- Monospace font for the text blocks
- Text is rendered in a scrollable container

**Prompt Template**:
```
You are helping a developer working with QuickDapp v{version}.

QuickDapp is a full-stack TypeScript boilerplate built with Bun, ElysiaJS, React 19, and PostgreSQL. Use the documentation below to answer questions accurately.

Key technologies:
- Runtime: Bun
- Backend: ElysiaJS, GraphQL Yoga, Drizzle ORM
- Frontend: React 19, Vite, TailwindCSS
- Database: PostgreSQL

Documentation follows:
---
{docs_text}
```

**Data Source**:
- Uses the `text` field from the JSON (markdown-to-text converted)
- Concatenates all pages in hierarchical order with section headers

### 8. Server-Side Changes

**Modify `start-server.ts`**:
- Ensure `/docs/*` routes return `index.html` for SPA routing
- Already handles this via static file serving fallback

### 9. GitHub Workflow Update

**Modify `.github/workflows/docker-website.yml`**:
- Trigger on release tags: `on: push: tags: ['v*']`
- The `bun run build` step will automatically run `fetch-docs.ts`

---

## Dependencies to Add

```json
{
  "dependencies": {
    "unified": "^11.0.0",
    "remark-parse": "^11.0.0",
    "remark-rehype": "^11.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-react": "^8.0.0",
    "rehype-highlight": "^7.0.0",
    "rehype-slug": "^6.0.0",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "strip-markdown": "^6.0.0",
    "remark-stringify": "^11.0.0"
  }
}
```

### Unified Pipeline Architecture

**Build-time (fetch-docs.ts)** - Extract plain text:
```
Markdown String
    ↓ remark-parse
Markdown AST (mdast)
    ↓ strip-markdown
Plain Text AST
    ↓ remark-stringify
Plain Text String
```

**Client-side (DocsContent.tsx)** - Render to React:
```
Markdown String
    ↓ remark-parse
Markdown AST (mdast)
    ↓ remark-gfm (tables, strikethrough, etc.)
    ↓ remark-rehype
HTML AST (hast)
    ↓ rehype-slug (heading IDs)
    ↓ rehype-highlight (syntax highlighting)
    ↓ rehype-react (custom components)
React Elements
```

---

## Implementation Order

1. **Frontmatter**: Add YAML frontmatter to all `packages/docs/*.md` files (see Part 0 table)
2. **Script**: Create `scripts/fetch-docs.ts` with git fetching and JSON generation
3. **Build**: Integrate fetch-docs into build pipeline
4. **Routing**: Add react-router-dom routes to App.tsx
5. **Components**: Build DocsPage, DocsSidebar, DocsContent
6. **Styling**: Style docs viewer with TailwindCSS (match existing site theme)
7. **Workflow**: Update GitHub workflow trigger
8. **Testing**: Manual verification of docs rendering

---

## Key Files to Modify

| File | Change |
|------|--------|
| `packages/docs/*.md` | Add YAML frontmatter (order, icon, expanded, label) |
| `packages/website/scripts/fetch-docs.ts` | New file - fetch and process docs |
| `packages/website/scripts/build.ts` | Add fetch-docs step |
| `packages/website/package.json` | Add dependencies |
| `packages/website/.gitignore` | Add docs-versions/ |
| `packages/website/src/client/App.tsx` | Add routing |
| `packages/website/src/client/pages/DocsPage.tsx` | New file - docs viewer |
| `packages/website/src/client/pages/DocsLlmPage.tsx` | New file - LLM plain text page |
| `packages/website/src/client/components/docs/*` | New files - docs components |
| `.github/workflows/docker-website.yml` | Add tag trigger |

---

## Verification

1. **Retype frontmatter verification** (after Part 0):
   - Run `cd packages/docs && bun run dev`
   - Verify navigation order matches frontmatter `order` values
   - Verify icons appear for sections with `icon` set
   - Verify folder sections expand by default where `expanded: true`

2. **Local testing**:
   - Run `bun run scripts/fetch-docs.ts` manually
   - Verify `docs-versions/` contains expected JSON files
   - Run `bun run dev` and navigate to `/docs`
   - Test version switching
   - Test navigation between pages
   - Verify GitHub links point to correct version tags

3. **Build testing**:
   - Run `bun run build`
   - Run `bun run prod`
   - Navigate to `/docs` and verify docs load correctly

4. **E2E testing**:
   - Add Playwright tests for `/docs` routes
