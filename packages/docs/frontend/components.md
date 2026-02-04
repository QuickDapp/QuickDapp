---
order: 80
---

# Components

QuickDapp includes a small set of UI components built on Radix UI primitives with TailwindCSS styling. The focus is on essential functionality rather than a comprehensive design system.

## Base Components

[`Button`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/Button.tsx) provides variants (default, outline, ghost, error), sizes, and loading state. It uses the `cn()` utility for class merging and forwards refs properly.

[`Dialog`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/Dialog.tsx) wraps Radix UI's dialog primitive with consistent styling—dark background, blur overlay, and close button. The `DialogContent`, `DialogHeader`, `DialogTitle`, and `DialogDescription` components compose together for modal interfaces.

**Form components** in [`Form.tsx`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/Form.tsx) include `Input`, `Textarea`, `Label`, and `FormField`. `Input` and `Textarea` display validation errors below the field. `Label` supports a required indicator. These integrate with the custom [`useForm`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/hooks/useForm.ts) hook for validation.

[`Toast`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/Toast.tsx) provides temporary notification messages. The `ToastProvider` manages a list of toasts with auto-dismiss. Toast types include default, success, error, and warning with corresponding colors and icons.

## Layout

The application uses a simple layout with a fixed header and main content area. The [`Header`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/Header.tsx) component shows the logo and notification indicator (when authenticated).

There's no sidebar—the application focuses on the main content area. Routing uses React Router with a single page currently ([`HomePage`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/pages/HomePage.tsx)).

```
┌─────────────────────────────────────┐
│ Header (fixed, 56px)                │
├─────────────────────────────────────┤
│                                     │
│ Main Content                        │
│                                     │
├─────────────────────────────────────┤
│ Footer                              │
└─────────────────────────────────────┘
```

## Notification Components

Real-time notification display:

- [`NotificationsIndicator`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/notifications/NotificationsIndicator.tsx) — Bell icon in header with unread count badge
- [`NotificationsDialog`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/notifications/NotificationsDialog.tsx) — Full list of notifications with mark-as-read functionality
- [`NotificationComponents`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/notifications/NotificationComponents.tsx) — Individual renderers for different notification types

## Utility Components

[`Loading`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/Loading.tsx) shows a spinning indicator for async operations.

[`ErrorBoundary`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/ErrorBoundary.tsx) catches component errors and displays a fallback UI instead of crashing the application.

[`ErrorMessageBox`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/ErrorMessageBox.tsx) displays styled error messages.

[`Popover`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/Popover.tsx) wraps Radix UI's popover for dropdown content.

[`Tooltip`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/Tooltip.tsx) wraps Radix UI's tooltip for hover hints.

[`ThemeSwitcher`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/ThemeSwitcher.tsx) provides a popover with system/light/dark theme options. See [Theming](./theming.md) for details.

[`OnceVisibleInViewport`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/OnceVisibleInViewport.tsx) renders children only when the component scrolls into view, useful for lazy loading.

[`CookieConsentBanner`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/CookieConsentBanner.tsx) displays a GDPR-compliant cookie consent banner when needed.

## Styling Approach

Components use TailwindCSS with the [`cn()`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/utils/cn.ts) utility. This combines `clsx` for conditional classes and `tailwind-merge` for deduplication:

```typescript
import { cn } from "../utils/cn"

<div className={cn(
  "base-styles",
  isActive && "active-styles",
  className
)} />
```

The theme is defined in [`globals.css`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/styles/globals.css) using Tailwind v4's `@theme` directive. See [Theming](./theming.md) for details on colors and custom utilities.
