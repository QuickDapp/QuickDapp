# Global

QuickDapp uses React Context and custom hooks for global state management, providing clean access to shared data and functionality across the application. The global state system handles authentication, user data, notifications, and application-wide settings.

## State Management Architecture

### Context Providers

QuickDapp uses multiple context providers for different concerns:

```typescript
// src/client/App.tsx
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { ThemeProvider } from './contexts/ThemeContext'

export function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AuthProvider>
            <NotificationProvider>
              <ThemeProvider>
                <Router>
                  <Routes>
                    {/* App routes */}
                  </Routes>
                </Router>
              </ThemeProvider>
            </NotificationProvider>
          </AuthProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

## Authentication Context

### AuthContext Implementation

Manages user authentication state and wallet connections:

```typescript
// src/client/contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (address: string) => Promise<void>
  signOut: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { address, isConnected } = useAccount()
  
  const signIn = useCallback(async (address: string) => {
    try {
      setIsLoading(true)
      
      // Get nonce from server
      const { data: nonceData } = await graphqlClient.request(`
        mutation GetNonce($address: String!) {
          getNonce(address: $address)
        }
      `, { address })
      
      // Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in with Ethereum to QuickDapp',
        uri: window.location.origin,
        version: '1',
        chainId: 1,
        nonce: nonceData.getNonce
      })
      
      // Sign message with wallet
      const signature = await walletClient.signMessage({
        message: message.prepareMessage()
      })
      
      // Verify signature and get token
      const { data: verifyData } = await graphqlClient.request(`
        mutation VerifySignature($message: String!, $signature: String!) {
          verifySignature(message: $message, signature: $signature) {
            token
            user {
              id
              address
              isAdmin
              createdAt
            }
          }
        }
      `, {
        message: message.prepareMessage(),
        signature
      })
      
      if (verifyData.verifySignature.token) {
        // Store token
        localStorage.setItem('auth-token', verifyData.verifySignature.token)
        
        // Update GraphQL client headers
        graphqlClient.setHeader('authorization', `Bearer ${verifyData.verifySignature.token}`)
        
        // Set user
        setUser(verifyData.verifySignature.user)
      }
      
    } catch (error) {
      console.error('Authentication failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  const signOut = useCallback(() => {
    localStorage.removeItem('auth-token')
    graphqlClient.setHeader('authorization', '')
    setUser(null)
  }, [])
  
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await graphqlClient.request(`
        query Me {
          me {
            id
            address
            isAdmin
            createdAt
          }
        }
      `)
      setUser(data.me)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      signOut()
    }
  }, [signOut])
  
  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (isConnected && address && !user) {
      signIn(address).catch(console.error)
    } else if (!isConnected && user) {
      signOut()
    }
  }, [isConnected, address, user, signIn, signOut])
  
  // Load existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth-token')
    if (token && !user) {
      graphqlClient.setHeader('authorization', `Bearer ${token}`)
      refreshUser().finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [refreshUser, user])
  
  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signOut,
    refreshUser
  }), [user, isLoading, signIn, signOut, refreshUser])
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

## Notification Context

### Global Notification Management

Handles application-wide notifications and WebSocket messages:

```typescript
// src/client/contexts/NotificationContext.tsx
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  read: boolean
  data?: any
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { user } = useAuth()
  
  // WebSocket connection for real-time notifications
  useWebSocket((data) => {
    if (data.type === 'notification') {
      addNotification({
        type: data.notification.type,
        title: data.notification.title,
        message: data.notification.message,
        data: data.notification.data
      })
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(data.notification.title, {
          body: data.notification.message,
          icon: '/favicon.ico'
        })
      }
    }
  })
  
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      read: false
    }
    
    setNotifications(prev => [newNotification, ...prev])
    
    // Auto-remove after 5 seconds for success notifications
    if (notification.type === 'success') {
      setTimeout(() => {
        removeNotification(newNotification.id)
      }, 5000)
    }
  }, [])
  
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    )
  }, [])
  
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
  }, [])
  
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])
  
  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])
  
  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.read).length, 
    [notifications]
  )
  
  const value = useMemo(() => ({
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  }), [notifications, unreadCount, addNotification, markAsRead, markAllAsRead, removeNotification, clearAll])
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
```

## Theme Context

### Dark/Light Mode Support

Manages application theme and user preferences:

```typescript
// src/client/contexts/ThemeContext.tsx
type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  effectiveTheme: 'light' | 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system'
  })
  
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )
  
  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  
  // Calculate effective theme
  const effectiveTheme = theme === 'system' ? systemTheme : theme
  
  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(effectiveTheme)
  }, [effectiveTheme])
  
  // Persist theme preference
  const updateTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }, [])
  
  const value = useMemo(() => ({
    theme,
    setTheme: updateTheme,
    effectiveTheme
  }), [theme, updateTheme, effectiveTheme])
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
```

## Application Settings Context

### User Preferences and Settings

Manages user-specific application settings:

```typescript
// src/client/contexts/SettingsContext.tsx
interface Settings {
  notifications: {
    browser: boolean
    sound: boolean
    tokenDeployment: boolean
    transactions: boolean
  }
  display: {
    compactMode: boolean
    showTestNets: boolean
    defaultGasPrice: 'slow' | 'standard' | 'fast'
  }
  advanced: {
    debugMode: boolean
    showRawData: boolean
  }
}

const defaultSettings: Settings = {
  notifications: {
    browser: true,
    sound: false,
    tokenDeployment: true,
    transactions: true
  },
  display: {
    compactMode: false,
    showTestNets: true,
    defaultGasPrice: 'standard'
  },
  advanced: {
    debugMode: false,
    showRawData: false
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('app-settings')
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings
  })
  
  const updateSettings = useCallback((updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)
    localStorage.setItem('app-settings', JSON.stringify(newSettings))
  }, [settings])
  
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings)
    localStorage.removeItem('app-settings')
  }, [])
  
  const contextValue = {
    settings,
    updateSettings,
    resetSettings
  }
  
  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  )
}
```

## Global Hooks

### useGlobalState Hook

Centralized access to all global state:

```typescript
// src/client/hooks/useGlobalState.ts
export function useGlobalState() {
  const auth = useAuth()
  const notifications = useNotifications()
  const theme = useTheme()
  const settings = useSettings()
  const { address, isConnected } = useAccount()
  
  return {
    // Authentication
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    signIn: auth.signIn,
    signOut: auth.signOut,
    
    // Wallet
    walletAddress: address,
    isWalletConnected: isConnected,
    
    // Notifications
    notifications: notifications.notifications,
    unreadCount: notifications.unreadCount,
    addNotification: notifications.addNotification,
    
    // Theme
    theme: theme.theme,
    setTheme: theme.setTheme,
    isDarkMode: theme.effectiveTheme === 'dark',
    
    // Settings
    settings: settings.settings,
    updateSettings: settings.updateSettings
  }
}
```

### useNotificationActions Hook

Convenient notification helpers:

```typescript
// src/client/hooks/useNotificationActions.ts
export function useNotificationActions() {
  const { addNotification } = useNotifications()
  
  return {
    showSuccess: (message: string, title = 'Success') => {
      addNotification({ type: 'success', title, message })
    },
    
    showError: (message: string, title = 'Error') => {
      addNotification({ type: 'error', title, message })
    },
    
    showWarning: (message: string, title = 'Warning') => {
      addNotification({ type: 'warning', title, message })
    },
    
    showInfo: (message: string, title = 'Info') => {
      addNotification({ type: 'info', title, message })
    }
  }
}
```

## State Persistence

### LocalStorage Integration

Persist important state across browser sessions:

```typescript
// src/client/lib/storage.ts
export const storage = {
  // Authentication token
  getAuthToken: () => localStorage.getItem('auth-token'),
  setAuthToken: (token: string) => localStorage.setItem('auth-token', token),
  removeAuthToken: () => localStorage.removeItem('auth-token'),
  
  // Theme preference
  getTheme: () => localStorage.getItem('theme') as Theme | null,
  setTheme: (theme: Theme) => localStorage.setItem('theme', theme),
  
  // User settings
  getSettings: () => {
    const settings = localStorage.getItem('app-settings')
    return settings ? JSON.parse(settings) : null
  },
  setSettings: (settings: Settings) => {
    localStorage.setItem('app-settings', JSON.stringify(settings))
  },
  
  // Recent transactions
  getRecentTransactions: () => {
    const txs = localStorage.getItem('recent-transactions')
    return txs ? JSON.parse(txs) : []
  },
  addRecentTransaction: (tx: Transaction) => {
    const recent = storage.getRecentTransactions()
    const updated = [tx, ...recent.slice(0, 9)] // Keep last 10
    localStorage.setItem('recent-transactions', JSON.stringify(updated))
  }
}
```

## Best Practices

### Context Optimization

1. **Separate Concerns** - Use multiple contexts instead of one large context
2. **Memoization** - Memoize context values to prevent unnecessary re-renders
3. **Selective Updates** - Only update the parts of state that actually changed

### Performance Considerations

```typescript
// Memoize context values
const value = useMemo(() => ({
  user,
  signIn,
  signOut
}), [user, signIn, signOut])

// Use callback for functions
const signOut = useCallback(() => {
  // Implementation
}, [])
```

### Error Boundaries

Wrap context providers with error boundaries:

```typescript
// src/client/components/ErrorBoundary.tsx
export function GlobalStateErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      {children}
    </ErrorBoundary>
  )
}
```

The global state management system in QuickDapp provides a clean, performant, and maintainable way to handle application-wide state while keeping concerns properly separated.