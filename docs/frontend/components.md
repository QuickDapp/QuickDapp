# Components

QuickDapp uses a simple component system built on Radix UI primitives with TailwindCSS for styling. Components focus on essential functionality and consistency.

## Base Components

### Button

Simple button component with variants and loading state:

```typescript
// src/client/components/Button.tsx
import * as React from "react"
import { cn } from "../utils/cn"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "error"
  size?: "sm" | "default" | "lg"
  loading?: boolean
}

const BUTTON_VARIANTS = {
  default: "bg-anchor text-black hover:bg-anchor/90",
  outline: "border border-anchor text-anchor hover:bg-anchor hover:text-black",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  error: "bg-red-600 text-white hover:bg-red-700",
} as const

const BUTTON_SIZES = {
  sm: "h-8 px-3 text-sm",
  default: "h-10 px-4 py-2",
  lg: "h-11 px-8 text-lg",
} as const

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anchor focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          BUTTON_VARIANTS[variant],
          BUTTON_SIZES[size],
          className,
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    )
  },
)

export { Button }
```

### Dialog

Dialog components built on Radix UI primitives:

```typescript
// src/client/components/Dialog.tsx
import * as DialogPrimitive from "@radix-ui/react-dialog"
import * as React from "react"
import { cn } from "../utils/cn"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-slate-700 bg-slate-900 p-6 shadow-lg duration-200 rounded-lg",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
        <span className="h-4 w-4">✕</span>
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-white", className)}
    {...props}
  />
))

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-slate-400", className)}
    {...props}
  />
))

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger }
```

### Form Components

Simple form components for input handling:

```typescript
// src/client/components/Form.tsx
import * as React from "react"
import { cn } from "../utils/cn"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="text-sm font-medium text-slate-300">
            {label}
          </label>
        )}
        <input
          className={cn(
            "flex h-10 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-anchor focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    )
  }
)

export { Input }
```

## Layout Components

### Header

Simple header with logo, wallet connection, and notifications:

```typescript
// src/client/components/Header.tsx
import type { FC } from "react"
import { useAuthContext } from "../contexts/AuthContext"
import logoSvg from "../images/logo.svg"
import { cn } from "../utils/cn"
import { ConnectWallet } from "./ConnectWallet"
import { NotificationsIndicator } from "./notifications/NotificationsIndicator"

const Logo: FC = () => (
  <img src={logoSvg} alt="QuickDapp Logo" className="w-8 h-8" />
)

export const Header: FC<{ className?: string }> = ({ className }) => {
  const { isAuthenticated } = useAuthContext()

  return (
    <header className={cn(
      "w-screen z-10 flex-0 bg-background flex flex-row place-content-between items-center px-2",
      className,
    )}>
      <a href="/" aria-label="homepage" className="no-anchor-hover-styles clickable">
        <Logo />
      </a>
      <div className="flex flex-row justify-end items-center gap-2">
        {isAuthenticated && <NotificationsIndicator />}
        <ConnectWallet showNetwork={true} />
      </div>
    </header>
  )
}
```

QuickDapp uses a single-page application with a simple header layout. There is no sidebar - the application focuses on essential token management functionality.

## Application Components

QuickDapp includes several specialized components for Web3 functionality:

### ConnectWallet

Wallet connection component with network display:

```typescript
// Handles wallet connection using RainbowKit
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit'

export function ConnectWallet({ showNetwork }: { showNetwork?: boolean }) {
  return (
    <RainbowConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        // Custom wallet connection UI
        // Shows connect button, account info, or chain selector
      }}
    </RainbowConnectButton.Custom>
  )
}
```

### Token Management

Components for creating and managing ERC-20 tokens:

```typescript
// CreateTokenDialog - Modal for deploying new tokens
// SendTokenDialog - Modal for transferring tokens  
// TokenList - List view of user's tokens
// ContractValue - Display contract values and balances
```

### Notifications

Real-time notification system:

```typescript
// NotificationsIndicator - Bell icon with unread count
// NotificationsDialog - Modal showing notification history
// NotificationComponents - Individual notification renderers
```

### Utility Components

Simple utility components:

```typescript
// Loading component
export function Loading() {
  return (
    <div className="flex justify-center items-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-anchor"></div>
    </div>
  )
}

// Error boundary for handling component crashes
export class ErrorBoundary extends React.Component {
  // Catches and displays component errors
}

// Toast notifications
export function Toast({ message, type }: { message: string, type: 'success' | 'error' }) {
  // Shows temporary toast messages
}
```

## Styling

QuickDapp uses TailwindCSS with a dark theme and custom colors:

```typescript
// src/client/tailwind.config.ts
const config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0f0f10',
        foreground: '#ffffff',
        anchor: '#00ff88', // Primary green accent
        accent: '#1a1a1b',
        'accent-foreground': '#ffffff',
      }
    }
  },
  plugins: []
}
```

## Component Structure

Components follow these patterns:
- Use `cn()` utility for className merging
- Forward refs for DOM elements
- TypeScript interfaces for props
- Simple, focused functionality
- Consistent styling with TailwindCSS

The component system emphasizes simplicity and essential functionality for Web3 token management rather than a comprehensive design system.