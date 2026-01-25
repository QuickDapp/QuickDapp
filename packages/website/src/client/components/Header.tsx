import { useCallback, useEffect, useState } from "react"
import logo from "../images/logo.svg"
import { cn } from "../utils/cn"
import { ThemeSwitcher } from "./ThemeSwitcher"

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 10)
  }, [])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-header transition-all duration-200",
        isScrolled ? "bg-background/70 backdrop-blur-sm" : "bg-transparent",
      )}
    >
      <div className="container h-full flex items-center justify-between px-4">
        <a href="/" className="no-anchor-hover-styles">
          <img src={logo} alt="QuickDapp" className="h-8" />
        </a>
        <ThemeSwitcher />
      </div>
    </header>
  )
}
