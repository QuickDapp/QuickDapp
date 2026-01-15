import { getGraphQLClient, setAuthToken } from "@shared/graphql/client"
import { VALIDATE_TOKEN } from "@shared/graphql/queries"
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

// Constants
const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
} as const

// Helper functions for localStorage operations
const getAuthFromStorage = () => {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  console.log("Getting auth from localStorage:", { token })
  return { token }
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
    }
  | { status: AuthStatus.ERROR; error: string }

type AuthAction =
  | { type: AuthActionType.AUTH_START }
  | {
      type: AuthActionType.AUTH_SUCCESS
      payload: { token: string }
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

  // Methods
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

  // Logout function
  const logout = useCallback(() => {
    setAuthToken(null)
    dispatch({ type: AuthActionType.LOGOUT })
    clearAuthFromStorage()
  }, [])

  // Restore authentication from localStorage (for OAuth/email tokens)
  const restoreAuth = useCallback(async () => {
    dispatch({ type: AuthActionType.RESTORE_START })

    const { token } = getAuthFromStorage()

    if (token) {
      try {
        setAuthToken(token)
        const graphqlClient = getGraphQLClient()
        const response = (await graphqlClient.request(VALIDATE_TOKEN)) as {
          validateToken: { valid: boolean }
        }

        if (response.validateToken.valid) {
          dispatch({
            type: AuthActionType.AUTH_SUCCESS,
            payload: { token },
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
      logout,
      restoreAuth,
    }),
    [isAuthenticated, isLoading, authState, logout, restoreAuth],
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
