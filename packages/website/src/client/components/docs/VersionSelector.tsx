import { Check, ChevronDown } from "lucide-react"
import { cn } from "../../utils/cn"
import { Popover } from "../Popover"

interface VersionSelectorProps {
  version: string
  versions: string[]
  latestVersion: string
  onVersionChange: (version: string) => void
  className?: string
  fullWidth?: boolean
}

export function VersionSelector({
  version,
  versions,
  latestVersion,
  onVersionChange,
  className,
  fullWidth,
}: VersionSelectorProps) {
  const isOnLatest = version === "latest" || version === latestVersion
  const displayVersion = version === "latest" ? latestVersion : version

  return (
    <Popover
      className={className}
      closeOnSelect
      trigger={
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm hover:border-foreground/40",
            fullWidth && "w-full justify-between",
          )}
        >
          <span>
            {displayVersion}
            {isOnLatest && " (latest)"}
          </span>
          <ChevronDown className="h-4 w-4 text-foreground/60" />
        </button>
      }
      contentClassName={cn("min-w-[160px] p-1", fullWidth && "w-full")}
    >
      {versions.map((v) => {
        const isSelected =
          v === version || (version === "latest" && v === latestVersion)
        return (
          <button
            key={v}
            type="button"
            onClick={() => onVersionChange(v)}
            className={cn(
              "flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-foreground/10",
              isSelected && "bg-foreground/5",
            )}
          >
            <span>
              {v} {v === latestVersion && "(latest)"}
            </span>
            {isSelected && <Check className="h-4 w-4 text-anchor" />}
          </button>
        )
      })}
    </Popover>
  )
}
