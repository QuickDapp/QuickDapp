# Versioned Documentation Implementation Plan

> **Note**: Keep this plan file updated as implementation progresses. Mark completed items, add notes about decisions made, and track any deviations from the original plan.

## Status

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
1. Fetches docs from each git version tag
2. Processes markdown links to point to version-specific GitHub URLs
3. Converts docs to JSON with markdown + plain text
4. Renders docs at `/docs` with version selector and hierarchical sidebar

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
- `remove-markdown` - For markdown-to-text conversion

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
/docs/v3.5.3                    → Specific version intro
/docs/v3.5.3/frontend/web3      → Specific version > Frontend > Web3
/docs/llm                       → LLM-friendly plain text output page
/docs/llm/v3.5.3                → LLM output for specific version
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
          <Route path="/docs/llm" element={<DocsLlmPage />} />
          <Route path="/docs/llm/:version" element={<DocsLlmPage />} />
          <Route path="/docs" element={<DocsPage />} />
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
- Render markdown to HTML
- Syntax highlighting for code blocks (use `shiki` or `prism`)
- Handle Retype `!!!` info boxes → convert to styled callouts
- Anchor links for headings
- Table of contents (optional)

**Dependencies to add**:
- `react-markdown` - Markdown rendering
- `remark-gfm` - GitHub Flavored Markdown
- `rehype-highlight` or `shiki` - Syntax highlighting
- `rehype-slug` - Heading IDs

### 7. DocsLlmPage Component (`/docs/llm`)

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
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^7.0.0",
    "rehype-slug": "^6.0.0"
  },
  "devDependencies": {
    "remove-markdown": "^0.5.0"
  }
}
```

---

## Implementation Order

1. **Script**: Create `scripts/fetch-docs.ts` with git fetching and JSON generation
2. **Build**: Integrate fetch-docs into build pipeline
3. **Routing**: Add react-router-dom routes to App.tsx
4. **Components**: Build DocsPage, DocsSidebar, DocsContent
5. **Styling**: Style docs viewer with TailwindCSS (match existing site theme)
6. **Workflow**: Update GitHub workflow trigger
7. **Testing**: Manual verification of docs rendering

---

## Key Files to Modify

| File | Change |
|------|--------|
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

1. **Local testing**:
   - Run `bun run scripts/fetch-docs.ts` manually
   - Verify `docs-versions/` contains expected JSON files
   - Run `bun run dev` and navigate to `/docs`
   - Test version switching
   - Test navigation between pages
   - Verify GitHub links point to correct version tags

2. **Build testing**:
   - Run `bun run build`
   - Run `bun run prod`
   - Navigate to `/docs` and verify docs load correctly

3. **E2E testing**:
   - Add Playwright tests for `/docs` routes
