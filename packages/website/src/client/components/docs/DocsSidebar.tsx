import { Check, ChevronDown, ChevronRight, ExternalLink } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import type { TreeItem } from "../../hooks/useDocs"
import { cn } from "../../utils/cn"
import { Collapsible, CollapsibleContent } from "../Collapsible"
import { Popover } from "../Popover"

interface DocsSidebarProps {
  tree: TreeItem[]
  version: string
  versions: string[]
  latestVersion: string
  onVersionChange: (version: string) => void
  currentPath: string
}

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
  const [open, setOpen] = useState(item.expanded || isActive || isChildActive)

  useEffect(() => {
    if (isActive || isChildActive) {
      setOpen(true)
    }
  }, [isActive, isChildActive])

  const linkPath =
    item.path === "index" ? "" : item.path.replace(/\/index$/, "")
  const href = `/docs/${version}${linkPath ? `/${linkPath}` : ""}`

  if (!hasChildren) {
    return (
      <div className={cn(level > 0 && "ml-4")}>
        <Link
          to={href}
          className={cn(
            "block rounded px-2 py-1.5 text-sm transition-colors hover:bg-foreground/10",
            isActive && "bg-anchor/20 font-medium text-anchor",
          )}
        >
          {item.label || item.title}
        </Link>
      </div>
    )
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={item.expanded ? undefined : setOpen}
      className={cn(level > 0 && "ml-4")}
    >
      <div className="flex items-center">
        <Link
          to={href}
          onClick={item.expanded ? undefined : () => setOpen(!open)}
          className={cn(
            "flex-1 rounded px-2 py-1.5 text-sm transition-colors hover:bg-foreground/10",
            isActive && "bg-anchor/20 font-medium text-anchor",
          )}
        >
          {item.label || item.title}
        </Link>
        {!item.expanded && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-foreground/60">
            {open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        )}
      </div>
      <CollapsibleContent className="mt-1">
        {item.children!.map((child) => (
          <SidebarItem
            key={child.path}
            item={child}
            version={version}
            currentPath={currentPath}
            level={level + 1}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function DocsSidebar({
  tree,
  version,
  versions,
  latestVersion,
  onVersionChange,
  currentPath,
}: DocsSidebarProps) {
  const isOnLatest = version === "latest" || version === latestVersion

  return (
    <aside className="sticky top-20 h-[calc(100vh-5rem)] w-64 shrink-0 overflow-y-auto border-r border-foreground/10 pb-8 pr-4">
      <div className="mb-6">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-foreground/60">
          Version
        </label>
        <Popover
          className="w-full"
          trigger={
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm hover:border-foreground/40"
            >
              <span>
                {version === "latest" ? latestVersion : version}
                {isOnLatest && " (latest)"}
              </span>
              <ChevronDown className="h-4 w-4 text-foreground/60" />
            </button>
          }
          contentClassName="w-full min-w-[200px] p-1"
        >
          {versions.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onVersionChange(v)}
              className={cn(
                "flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-foreground/10",
                (v === version ||
                  (version === "latest" && v === latestVersion)) &&
                  "bg-foreground/5",
              )}
            >
              <span>
                {v} {v === latestVersion && "(latest)"}
              </span>
              {(v === version ||
                (version === "latest" && v === latestVersion)) && (
                <Check className="h-4 w-4 text-anchor" />
              )}
            </button>
          ))}
        </Popover>
      </div>

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
          className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          LLM-friendly view
        </Link>
      </div>
    </aside>
  )
}
