import type { FC } from "react"
import { cn } from "../utils/cn"
import { ConnectWallet } from "./ConnectWallet"
import styles from "./Header.module.css"
import { IfWalletConnected } from "./IfWalletConnected"
import { NumTokens } from "./NumTokens"

const Logo: FC = () => (
  <svg viewBox="0 0 100 100" fill="currentColor">
    <circle cx="50" cy="50" r="40" />
    <text x="50" y="55" textAnchor="middle" fontSize="20" fill="#000">
      Q
    </text>
  </svg>
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
        <IfWalletConnected>
          <div className="mr-4">
            <NumTokens />
          </div>
        </IfWalletConnected>
        <div className="ml-6">
          <ConnectWallet />
        </div>
      </div>
    </header>
  )
}
