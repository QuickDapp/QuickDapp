import type { ReactNode } from "react"
import { cn } from "../utils/cn"

export interface PingAnimationProps {
  children?: ReactNode
  className?: string
  size?: "sm" | "md" | "lg"
  color?: "blue" | "green" | "red" | "yellow" | "purple"
  duration?: "slow" | "normal" | "fast"
  enabled?: boolean
}

export function PingAnimation({
  children,
  className,
  size = "md",
  color = "blue",
  duration = "normal",
  enabled = true,
}: PingAnimationProps) {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  }

  const colorClasses = {
    blue: "bg-blue-400",
    green: "bg-green-400",
    red: "bg-red-400",
    yellow: "bg-yellow-400",
    purple: "bg-purple-400",
  }

  const pingColorClasses = {
    blue: "bg-blue-400",
    green: "bg-green-400",
    red: "bg-red-400",
    yellow: "bg-yellow-400",
    purple: "bg-purple-400",
  }

  const durationClasses = {
    slow: "animate-ping [animation-duration:2s]",
    normal: "animate-ping",
    fast: "animate-ping [animation-duration:0.5s]",
  }

  if (!enabled) {
    return (
      <div className={cn("relative inline-flex", className)}>
        <div
          className={cn("rounded-full", sizeClasses[size], colorClasses[color])}
        />
        {children}
      </div>
    )
  }

  return (
    <div className={cn("relative inline-flex", className)}>
      <div
        className={cn(
          "absolute inline-flex h-full w-full rounded-full opacity-75",
          pingColorClasses[color],
          durationClasses[duration],
        )}
      />
      <div
        className={cn(
          "relative inline-flex rounded-full",
          sizeClasses[size],
          colorClasses[color],
        )}
      />
      {children}
    </div>
  )
}

// Status indicator with ping animation
export interface StatusIndicatorProps {
  status: "online" | "offline" | "pending" | "error"
  label?: string
  showLabel?: boolean
  className?: string
}

export function StatusIndicator({
  status,
  label,
  showLabel = false,
  className,
}: StatusIndicatorProps) {
  const statusConfig = {
    online: {
      color: "green" as const,
      pingEnabled: true,
      defaultLabel: "Online",
    },
    offline: {
      color: "red" as const,
      pingEnabled: false,
      defaultLabel: "Offline",
    },
    pending: {
      color: "yellow" as const,
      pingEnabled: true,
      defaultLabel: "Pending",
    },
    error: { color: "red" as const, pingEnabled: true, defaultLabel: "Error" },
  }

  const config = statusConfig[status]
  const displayLabel = label || config.defaultLabel

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <PingAnimation
        color={config.color}
        enabled={config.pingEnabled}
        size="sm"
      />
      {showLabel && (
        <span className="text-sm text-slate-300">{displayLabel}</span>
      )}
    </div>
  )
}
