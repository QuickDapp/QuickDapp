import type { FC } from "react"
import { useAuthContext } from "../contexts/AuthContext"
import logoSvg from "../images/logo.svg"
import { cn } from "../utils/cn"
import { Button } from "./Button"
import styles from "./Header.module.css"
import { NotificationsIndicator } from "./notifications/NotificationsIndicator"
import { ThemeSwitcher } from "./ThemeSwitcher"

const Logo: FC = () => (
  <img src={logoSvg} alt="QuickDapp Logo" className="w-8 h-8" />
)

interface HeaderProps {
  className?: string
}

export const Header: FC<HeaderProps> = ({ className }) => {
  const { isAuthenticated, logout } = useAuthContext()

  return (
    <header
      className={cn(
        "w-screen z-10 flex-0 bg-background flex flex-row place-content-between items-center px-2",
        className,
      )}
    >
      <a
        href="/"
        aria-label="homepage"
        className="no-anchor-hover-styles clickable"
      >
        <span className={styles.logo_container}>
          <Logo />
        </span>
      </a>
      <div className="flex flex-row justify-end items-center gap-2">
        <ThemeSwitcher />
        {isAuthenticated && (
          <>
            <NotificationsIndicator />
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
