---
order: 35
---

# Theming

QuickDapp includes a complete theming system with dark and light mode support, system preference detection, and CSS integration through Tailwind v4.

## ThemeContext

The [`ThemeProvider`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/contexts/ThemeContext.tsx) manages theme state throughout the application. It supports three preferences:

- **system** — Follows the operating system's dark/light setting
- **light** — Forces light mode
- **dark** — Forces dark mode

```typescript
const { preference, resolvedTheme, setPreference } = useTheme()

// preference: "system" | "light" | "dark"
// resolvedTheme: "light" | "dark" (what's actually shown)
```

## System Theme Detection

When preference is set to "system", the provider uses `window.matchMedia("(prefers-color-scheme: dark)")` to detect the OS setting. It also listens for changes, so switching your OS theme updates the app in real-time.

## Persistence

The selected preference is saved to localStorage under the `"theme"` key. On page load, the provider reads this value and applies it immediately, preventing a flash of the wrong theme.

## ThemeSwitcher Component

The [`ThemeSwitcher`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/ThemeSwitcher.tsx) provides a popover UI with system, light, and dark options. It's included in the header by default.

## CSS Integration

The theme works by adding `"light"` or `"dark"` to the `<html>` element's class list. Tailwind v4's `@theme` directive in [`globals.css`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/styles/globals.css) defines the color palette:

```css
@theme {
  --color-anchor: #0ec8ff;
  --color-background: #ffffff;
  --color-foreground: #374151;
  --color-muted: #9ca3af;
  --color-border: #e5e7eb;
}

html.dark {
  --color-anchor: #0ec8ff;
  --color-background: #0f172a;
  --color-foreground: #f8fafc;
  --color-muted: #94a3b8;
  --color-border: #334155;
}
```

These CSS variables are referenced by Tailwind utility classes (`bg-background`, `text-foreground`, `text-anchor`, etc.) and automatically switch when the theme changes.

## Custom Colors and Utilities

The theme defines several custom utilities in `globals.css`:

| Utility | Description |
|---------|-------------|
| `btn-primary` | Primary action button styling |
| `btn-secondary` | Secondary action button styling |
| `card` | Card container with border and shadow |
| `glow-effect` | Subtle glow shadow using the anchor color |
| `glow-strong` | Stronger glow effect |
| `flex-center` | Centered flex container |
| `flex-between` | Space-between flex container |
| `gradient-bg` | Fixed gradient background |

## The cn() Utility

The [`cn()`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/utils/cn.ts) helper combines `clsx` and `tailwind-merge` for conditional class application:

```typescript
import { cn } from "../utils/cn"

<div className={cn(
  "bg-background text-foreground",
  isDark && "border-border",
  className
)} />
```

`tailwind-merge` handles deduplication, so conflicting classes resolve correctly (e.g. `"p-4 p-2"` becomes `"p-2"`).

## Adding Custom Theme Colors

To add a new theme-aware color:

1. Add the light value in the `@theme` block
2. Add the dark value in the `html.dark` block
3. Use it with Tailwind: `bg-[var(--color-mycolor)]` or define it as a named color in `@theme`

See [`src/client/contexts/ThemeContext.tsx`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/contexts/ThemeContext.tsx) for the provider implementation and [`src/client/styles/globals.css`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/styles/globals.css) for the complete theme definition.
