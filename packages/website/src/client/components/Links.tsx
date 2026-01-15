import type { PropsWithChildren } from "react"
import type { PropsWithClassName } from "../utils/cn"

export const HomeLink: React.FC<PropsWithChildren<PropsWithClassName>> = ({
  className,
  children,
}) => {
  return (
    <a className={className} aria-label="home page" href="/">
      {children || "Home"}
    </a>
  )
}

export const DemoLink: React.FC<PropsWithChildren<PropsWithClassName>> = ({
  className,
  children,
}) => {
  return (
    <a
      className={className}
      aria-label="demo site"
      href="https://demo.quickdapp.xyz"
    >
      {children || "Demo"}
    </a>
  )
}

export const DocsLink: React.FC<PropsWithChildren<PropsWithClassName>> = ({
  className,
  children,
}) => {
  return (
    <a
      className={className}
      aria-label="getting-started"
      href="https://docs.quickdapp.xyz/getting-started/"
    >
      {children || "Docs"}
    </a>
  )
}

export const LicenseLink: React.FC<PropsWithChildren<PropsWithClassName>> = ({
  className,
  children,
}) => {
  return (
    <a
      className={className}
      aria-label="licensing"
      href="https://github.com/QuickDapp/QuickDapp/blob/master/LICENSE.md"
    >
      {children || "License"}
    </a>
  )
}

export const HelpLink: React.FC<PropsWithChildren<PropsWithClassName>> = ({
  className,
  children,
}) => {
  return (
    <a
      className={className}
      aria-label="help"
      href="mailto:support@quickdapp.xyz"
    >
      {children || "Help"}
    </a>
  )
}

export const CommunityLink: React.FC<PropsWithChildren<PropsWithClassName>> = ({
  className,
  children,
}) => {
  return (
    <a
      className={className}
      aria-label="community"
      href="https://github.com/QuickDapp/QuickDapp/discussions"
    >
      {children || "Community"}
    </a>
  )
}

export const GithubLink: React.FC<PropsWithChildren<PropsWithClassName>> = ({
  className,
  children,
}) => {
  return (
    <a
      className={className}
      aria-label="github"
      href="https://github.com/QuickDapp/QuickDapp"
    >
      {children || "Github"}
    </a>
  )
}
