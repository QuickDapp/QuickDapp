import { getGraphQLClient, setAuthToken } from "@shared/graphql/client"
import { ME, VALIDATE_TOKEN } from "@shared/graphql/queries"
import type { ReactNode } from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react"

// User profile type (matches GraphQL UserProfile)
export interface UserProfile {
  id: number
  email: string | null
  createdAt: string
}

// Constants - localStorage only stores token
const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
} as const

// Helper functions for localStorage operations
const getTokenFromStorage = () => {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  console.log("Getting token from localStorage:", { hasToken: !!token })
  return token
}

const saveTokenToStorage = (token: string) => {
  console.log("Saving token to localStorage")
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
}

const clearAuthFromStorage = () => {
  console.log("Clearing auth from localStorage")
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
}

// Auth status enum
export enum AuthStatus {
  IDLE = "idle",
  RESTORING = "restoring",
  AUTHENTICATING = "authenticating",
  AUTHENTICATED = "authenticated",
  ERROR = "error",
}

// Auth action types enum
enum AuthActionType {
  AUTH_START = "AUTH_START",
  AUTH_SUCCESS = "AUTH_SUCCESS",
  AUTH_ERROR = "AUTH_ERROR",
  LOGOUT = "LOGOUT",
  RESTORE_START = "RESTORE_START",
  RESTORE_COMPLETE = "RESTORE_COMPLETE",
}

// State Machine Definition
type AuthState =
  | { status: AuthStatus.IDLE }
  | { status: AuthStatus.RESTORING }
  | { status: AuthStatus.AUTHENTICATING }
  | {
      status: AuthStatus.AUTHENTICATED
      token: string
      profile: UserProfile
    }
  | { status: AuthStatus.ERROR; error: string }

type AuthAction =
  | { type: AuthActionType.AUTH_START }
  | {
      type: AuthActionType.AUTH_SUCCESS
      payload: { token: string; profile: UserProfile }
    }
  | { type: AuthActionType.AUTH_ERROR; payload: { error: string } }
  | { type: AuthActionType.LOGOUT }
  | { type: AuthActionType.RESTORE_START }
  | { type: AuthActionType.RESTORE_COMPLETE }

// State machine reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case AuthActionType.AUTH_START:
      return { status: AuthStatus.AUTHENTICATING }

    case AuthActionType.AUTH_SUCCESS:
      return {
        status: AuthStatus.AUTHENTICATED,
        token: action.payload.token,
        profile: action.payload.profile,
      }

    case AuthActionType.AUTH_ERROR:
      return {
        status: AuthStatus.ERROR,
        error: action.payload.error,
      }

    case AuthActionType.LOGOUT:
      return { status: AuthStatus.IDLE }

    case AuthActionType.RESTORE_START:
      return { status: AuthStatus.RESTORING }

    case AuthActionType.RESTORE_COMPLETE:
      return { status: AuthStatus.IDLE }

    default:
      return state
  }
}

const initialState: AuthState = {
  status: AuthStatus.IDLE,
}

interface AuthContextValue {
  // State
  isAuthenticated: boolean
  isLoading: boolean
  error: Error | null
  authToken: string | null
  profile: UserProfile | null
  email: string | null

  // Methods
  login: (token: string, profile: UserProfile) => void
  logout: () => void
  restoreAuth: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

// Auth Provider for email/OAuth authentication
export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, dispatch] = useReducer(authReducer, initialState)
  const restorationStarted = useRef(false)

  // Login function - stores token in localStorage, profile in memory only
  const login = useCallback((token: string, profile: UserProfile) => {
    setAuthToken(token)
    saveTokenToStorage(token)
    dispatch({
      type: AuthActionType.AUTH_SUCCESS,
      payload: { token, profile },
    })
  }, [])

  // Logout function
  const logout = useCallback(() => {
    setAuthToken(null)
    dispatch({ type: AuthActionType.LOGOUT })
    clearAuthFromStorage()
  }, [])

  // Restore authentication from localStorage
  const restoreAuth = useCallback(async () => {
    dispatch({ type: AuthActionType.RESTORE_START })

    const token = getTokenFromStorage()

    if (token) {
      try {
        setAuthToken(token)
        const graphqlClient = getGraphQLClient()

        // First validate the token
        const validateResponse = (await graphqlClient.request(
          VALIDATE_TOKEN,
        )) as {
          validateToken: { valid: boolean }
        }

        if (validateResponse.validateToken.valid) {
          // Token is valid, fetch user profile
          const meResponse = (await graphqlClient.request(ME)) as {
            me: UserProfile
          }

          dispatch({
            type: AuthActionType.AUTH_SUCCESS,
            payload: { token, profile: meResponse.me },
          })
        } else {
          clearAuthFromStorage()
          setAuthToken(null)
          dispatch({ type: AuthActionType.RESTORE_COMPLETE })
        }
      } catch {
        clearAuthFromStorage()
        setAuthToken(null)
        dispatch({ type: AuthActionType.RESTORE_COMPLETE })
      }
    } else {
      dispatch({ type: AuthActionType.RESTORE_COMPLETE })
    }
  }, [])

  // Effect: Token restoration on mount
  useEffect(() => {
    if (authState.status === AuthStatus.IDLE && !restorationStarted.current) {
      restorationStarted.current = true
      restoreAuth().catch(() => {
        dispatch({ type: AuthActionType.RESTORE_COMPLETE })
      })
    }
  }, [authState.status, restoreAuth])

  const isAuthenticated = authState.status === AuthStatus.AUTHENTICATED
  const isLoading =
    authState.status === AuthStatus.AUTHENTICATING ||
    authState.status === AuthStatus.RESTORING

  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      error: null,
      authToken:
        authState.status === AuthStatus.AUTHENTICATED ? authState.token : null,
      profile:
        authState.status === AuthStatus.AUTHENTICATED
          ? authState.profile
          : null,
      email:
        authState.status === AuthStatus.AUTHENTICATED
          ? authState.profile.email
          : null,
      login,
      logout,
      restoreAuth,
    }),
    [isAuthenticated, isLoading, authState, login, logout, restoreAuth],
  )

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  )
}

// Hook to use the auth context
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider")
  }
  return context
}
