import type { ReactNode } from "react"
import { cn } from "../../utils/cn"

interface DocsCalloutProps {
  type?: "note" | "warning" | "danger" | "tip"
  children: ReactNode
}

const calloutStyles = {
  note: "border-blue-500/50 bg-blue-500/10",
  warning: "border-yellow-500/50 bg-yellow-500/10",
  danger: "border-red-500/50 bg-red-500/10",
  tip: "border-green-500/50 bg-green-500/10",
}

const calloutIcons = {
  note: "i",
  warning: "!",
  danger: "X",
  tip: "~",
}

export function DocsCallout({ type = "note", children }: DocsCalloutProps) {
  return (
    <div className={cn("my-4 rounded-lg border-l-4 p-4", calloutStyles[type])}>
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-sm font-bold">
          {calloutIcons[type]}
        </span>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
