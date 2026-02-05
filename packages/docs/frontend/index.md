---
order: 94
icon: Monitor
expanded: true
---

# Frontend

The QuickDapp frontend is a React 19 application built with Vite, TypeScript, and TailwindCSS.

## Technology Stack

Vite handles development and production builds with hot module replacement. TailwindCSS v4 provides styling with dark and light theme support and custom utility classes. Radix UI supplies accessible primitives for dialogs, popovers, and tooltips.

For data fetching, React Query manages server state with caching and background refetching. The GraphQL client uses `graphql-request` with queries defined in the shared folder.

## Project Structure

```
src/client/
├── App.tsx              # Root with provider setup
├── components/          # UI components
├── contexts/            # ThemeContext, AuthContext, SocketContext, CookieConsentContext
├── hooks/               # useForm, useNotifications
├── lib/                 # Socket client
├── pages/               # Page components
├── styles/              # Tailwind globals
└── utils/               # cn() helper
```

## Provider Structure

The [`App`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/App.tsx) component wraps content with providers:

```tsx
<ThemeProvider>
  <QueryClientProvider>
    <AuthProvider>
      <SocketProvider>
        <ToastProvider>
          {/* routes */}
        </ToastProvider>
      </SocketProvider>
    </AuthProvider>
  </QueryClientProvider>
</ThemeProvider>
```

## Key Patterns

**State management** uses React Context for global state (theme, auth, sockets, toasts) and React Query for server data. There's no Redux or external state library.

**Forms** use a custom hook-based validation system in [`useForm.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/hooks/useForm.ts). It supports sync and async validation with debouncing, without external form libraries.

**Styling** combines TailwindCSS utilities with the [`cn()`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/utils/cn.ts) helper for conditional classes. CSS Modules handle component-specific styles where needed.

**Configuration** comes from [`clientConfig`](https://github.com/QuickDapp/QuickDapp/blob/main/src/shared/config/client.ts) in the shared folder. The build process injects environment values so they're available at runtime.

