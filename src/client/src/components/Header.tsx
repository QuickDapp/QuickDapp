import type { FC } from "react"
import logoSvg from "../images/logo.svg"
import { cn } from "../utils/cn"
import { ConnectWallet } from "./ConnectWallet"
import styles from "./Header.module.css"

const Logo: FC = () => (
  <img src={logoSvg} alt="QuickDapp Logo" className="w-8 h-8" />
)

interface HeaderProps {
  className?: string
}

export const Header: FC<HeaderProps> = ({ className }) => {
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
      <div className="flex flex-row justify-end items-center">
        <div className="ml-6">
          <ConnectWallet showNetwork={true} />
        </div>
      </div>
    </header>
  )
}
