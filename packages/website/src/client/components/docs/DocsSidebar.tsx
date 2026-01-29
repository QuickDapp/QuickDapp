import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import type { TreeItem } from "../../hooks/useDocs"
import { cn } from "../../utils/cn"
import { Button } from "../Button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "../Sheet"
import { VersionSelector } from "./VersionSelector"

interface DocsSidebarProps {
  tree: TreeItem[]
  version: string
  versions: string[]
  latestVersion: string
  onVersionChange: (version: string) => void
  currentPath: string
  onSearchClick: () => void
}

const isMac =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().includes("MAC")

function SidebarItem({
  item,
  version,
  currentPath,
  level = 0,
}: {
  item: TreeItem
  version: string
  currentPath: string
  level?: number
}) {
  const hasChildren = item.children && item.children.length > 0
  const isActive =
    currentPath === item.path ||
    currentPath === `${item.path}/index` ||
    (item.path.endsWith("/index") &&
      currentPath === item.path.replace(/\/index$/, ""))
  const isChildActive =
    hasChildren &&
    item.children?.some(
      (child) =>
        currentPath === child.path || currentPath.startsWith(`${child.path}/`),
    )
  const [isExpanded, setIsExpanded] = useState(
    item.expanded || isActive || isChildActive,
  )

  useEffect(() => {
    if (isActive || isChildActive) {
      setIsExpanded(true)
    }
  }, [isActive, isChildActive])

  const linkPath =
    item.path === "index" ? "" : item.path.replace(/\/index$/, "")
  const href = `/docs/${version}${linkPath ? `/${linkPath}` : ""}`

  return (
    <div className={cn(level > 0 && "ml-4")}>
      <div className="flex items-center">
        <Link
          to={href}
          className={cn(
            "flex-1 flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-anchor hover:text-white",
            isActive && "bg-anchor/20 font-medium text-anchor",
          )}
        >
          {item.label || item.title}
        </Link>
        {hasChildren && (
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 shrink-0 p-0 hover:bg-foreground/10"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {item.children!.map((child) => (
            <SidebarItem
              key={child.path}
              item={child}
              version={version}
              currentPath={currentPath}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface SidebarContentProps {
  tree: TreeItem[]
  version: string
  versions: string[]
  latestVersion: string
  onVersionChange: (version: string) => void
  currentPath: string
  onSearchClick: () => void
}

function SidebarContent({
  tree,
  version,
  versions,
  latestVersion,
  onVersionChange,
  currentPath,
  onSearchClick,
}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 pb-4">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
            Version:
          </span>
          <VersionSelector
            version={version}
            versions={versions}
            latestVersion={latestVersion}
            onVersionChange={onVersionChange}
            compact
          />
        </div>

        <Button
          variant="ghost"
          onClick={onSearchClick}
          className="flex w-full items-center justify-start gap-2 rounded-lg border border-foreground/20 px-3 py-2 text-sm font-normal text-foreground/60 hover:border-foreground/40 hover:bg-transparent hover:text-foreground"
        >
          <Search className="h-4 w-4" />
          Search
          <kbd className="ml-auto rounded bg-foreground/10 px-1.5 py-0.5 text-xs">
            {isMac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <nav className="space-y-1">
          {tree.map((item) => (
            <SidebarItem
              key={item.path}
              item={item}
              version={version}
              currentPath={currentPath}
            />
          ))}
        </nav>

        <div className="mt-8 border-t border-foreground/10 pt-4">
          <Link
            to={`/docs/${version}/llm`}
            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-anchor hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
            LLM-friendly view
          </Link>
        </div>
      </div>
    </div>
  )
}

export function DocsSidebar({
  tree,
  version,
  versions,
  latestVersion,
  onVersionChange,
  currentPath,
  onSearchClick,
}: DocsSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [currentPath])

  const sidebarProps = {
    tree,
    version,
    versions,
    latestVersion,
    onVersionChange,
    currentPath,
    onSearchClick,
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="fixed right-4 top-[72px] z-40 gap-2 md:hidden"
            aria-label="Open navigation menu"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 pt-12">
          <SheetTitle className="sr-only">Documentation Navigation</SheetTitle>
          <SidebarContent {...sidebarProps} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-64 shrink-0 border-r border-foreground/10 pb-8 pr-4 md:block">
        <SidebarContent {...sidebarProps} />
      </aside>
    </>
  )
}
