---
order: 60
---

# Global State

QuickDapp uses React Context for global state management. The application separates concerns into focused providers: theming, authentication, WebSocket connections, and toast notifications. Each handles one responsibility and exposes a hook for components to access its data.

## Provider Structure

The [`App.tsx`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/App.tsx) nests providers to make them available throughout the application:

```tsx
<ThemeProvider>
  <QueryClientProvider client={queryClient}>
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

## Theme Context

The [`ThemeProvider`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/contexts/ThemeContext.tsx) manages dark/light mode with system preference detection.

```typescript
interface ThemeContextValue {
  preference: ThemePreference    // "system" | "light" | "dark"
  resolvedTheme: ResolvedTheme   // "light" | "dark"
  setPreference: (preference: ThemePreference) => void
}
```

The provider resolves the "system" preference by checking `window.matchMedia("(prefers-color-scheme: dark)")` and listens for changes. The resolved theme is applied by adding `"light"` or `"dark"` to the HTML root element's class list, which activates the corresponding CSS variables.

Theme preference is persisted to localStorage under the `"theme"` key.

Access via `useTheme()`. See [Theming](./theming.md) for details on CSS integration.

## Authentication Context

The [`AuthContext`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/contexts/AuthContext.tsx) manages email and OAuth authentication. It uses a state machine to track the authentication lifecycle.

```typescript
interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  error: Error | null
  authToken: string | null
  profile: UserProfile | null
  email: string | null
  login: (token: string, profile: UserProfile) => void
  logout: () => void
  restoreAuth: () => void
}
```

On mount, the context attempts to restore a previous session by reading the JWT from localStorage and validating it with the server. If valid, it fetches the user profile via the `me` query.

The context tracks several states: `IDLE`, `RESTORING` (checking for existing session), `AUTHENTICATING`, `AUTHENTICATED`, and `ERROR`.

Access the context via `useAuthContext()`.

## Socket Context

The [`SocketProvider`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/contexts/SocketContext.tsx) manages WebSocket connections for real-time updates. It initializes after auth loading completes and automatically reconnects with the appropriate token when authentication state changes.

```typescript
interface SocketContextValue {
  connected: boolean
  subscribe: (type: WebSocketMessageType, handler: (message: WebSocketMessage) => void) => () => void
}
```

When a user authenticates, the socket reconnects with their JWT to establish an authenticated session. When they log out, it reconnects without a token. The `subscribe()` method returns an unsubscribe function for cleanup.

Access the context via `useSocket()`.

## Toast Notifications

The [`ToastProvider`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/Toast.tsx) manages temporary notification messages displayed in the UI. Toasts have types (default, success, error, warning), optional titles and descriptions, and auto-dismiss after a configurable duration.

```typescript
interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
}
```

Toasts auto-dismiss after 5 seconds by default. The container renders in the top-right corner with slide-in animations.

Access the context via `useToast()`.

## Notification Hook

The [`useNotifications`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/hooks/useNotifications.ts) hook subscribes to real-time notification events from the WebSocket connection. It wraps the socket subscription for the `NotificationReceived` message type.

```typescript
useNotifications({
  onNotificationReceived: (notification) => {
    // Handle notification
  }
})
```

This hook provides a cleaner API than directly subscribing to socket messages for notifications.

## Cookie Consent (Optional)

The [`CookieConsentProvider`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/contexts/CookieConsentContext.tsx) tracks whether users have accepted or declined cookies. It shows a banner component and persists the choice to localStorage.

```typescript
interface CookieConsentContextValue {
  consent: "accepted" | "declined" | null
  hasConsented: boolean
  isAccepted: boolean
  isDeclined: boolean
  acceptCookies: () => void
  declineCookies: () => void
  resetConsent: () => void
}
```

This provider is not included in the default [`App.tsx`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/App.tsx) but can be added when needed for GDPR compliance.

Access via `useCookieConsent()`.
