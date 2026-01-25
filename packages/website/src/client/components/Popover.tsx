import type { ReactNode } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "../utils/cn"

export interface PopoverProps {
  trigger: ReactNode
  children: ReactNode
  placement?: "top" | "bottom" | "left" | "right"
  className?: string
  contentClassName?: string
  disabled?: boolean
  closeOnClickOutside?: boolean
  closeOnEscape?: boolean
}

export function Popover({
  trigger,
  children,
  placement = "bottom",
  className,
  contentClassName,
  disabled = false,
  closeOnClickOutside = true,
  closeOnEscape = true,
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const toggleOpen = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const closePopover = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    if (!closeOnClickOutside || !isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        triggerRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        closePopover()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen, closeOnClickOutside, closePopover])

  useEffect(() => {
    if (!closeOnEscape || !isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePopover()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, closeOnEscape, closePopover])

  const placementClasses = {
    top: "bottom-full left-0 mb-2",
    bottom: "top-full left-0 mt-2",
    left: "right-full top-0 mr-2",
    right: "left-full top-0 ml-2",
  }

  return (
    <div className={cn("relative inline-block", className)}>
      <div ref={triggerRef} onClick={toggleOpen}>
        {trigger}
      </div>

      {isOpen && (
        <div
          ref={contentRef}
          className={cn(
            "absolute z-50 bg-gradcol2 border border-border rounded-lg shadow-lg",
            "animate-in fade-in-0 zoom-in-95 duration-150",
            placementClasses[placement],
            contentClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}
