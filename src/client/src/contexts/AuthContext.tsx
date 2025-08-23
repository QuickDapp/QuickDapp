import type { ReactNode } from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react"
import { useAccount, useSignMessage } from "wagmi"
import { getGraphQLClient, setAuthToken } from "../../../shared/graphql/client"
import {
  AUTHENTICATE_WITH_SIWE,
  GENERATE_SIWE_MESSAGE,
} from "../../../shared/graphql/mutations"

interface SiweMessageResult {
  message: string
  nonce: string
}

interface AuthResult {
  success: boolean
  token: string | null
  wallet: string | null
  error: string | null
}

// Constants
const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  AUTH_WALLET: "auth_wallet",
} as const

// Auth status enum
enum AuthStatus {
  IDLE = "idle",
  AUTHENTICATING = "authenticating",
  AUTHENTICATED = "authenticated",
  REJECTED = "rejected",
  ERROR = "error",
}

// Auth action types enum
enum AuthActionType {
  AUTH_START = "AUTH_START",
  AUTH_SUCCESS = "AUTH_SUCCESS",
  AUTH_REJECTED = "AUTH_REJECTED",
  AUTH_ERROR = "AUTH_ERROR",
  LOGOUT = "LOGOUT",
  RESTORE_AUTH = "RESTORE_AUTH",
  RESTORE_COMPLETE = "RESTORE_COMPLETE",
  RESET_TO_IDLE = "RESET_TO_IDLE",
}

// State Machine Definition
type AuthState =
  | { status: AuthStatus.IDLE; hasRestoredAuth: boolean }
  | { status: AuthStatus.AUTHENTICATING; hasRestoredAuth: boolean }
  | {
      status: AuthStatus.AUTHENTICATED
      token: string
      wallet: string
      hasRestoredAuth: boolean
    }
  | { status: AuthStatus.REJECTED; error: string; hasRestoredAuth: boolean }
  | { status: AuthStatus.ERROR; error: string; hasRestoredAuth: boolean }

type AuthAction =
  | { type: AuthActionType.AUTH_START }
  | {
      type: AuthActionType.AUTH_SUCCESS
      payload: { token: string; wallet: string }
    }
  | { type: AuthActionType.AUTH_REJECTED; payload: { error: string } }
  | { type: AuthActionType.AUTH_ERROR; payload: { error: string } }
  | { type: AuthActionType.LOGOUT }
  | {
      type: AuthActionType.RESTORE_AUTH
      payload: { token: string; wallet: string }
    }
  | { type: AuthActionType.RESTORE_COMPLETE }
  | { type: AuthActionType.RESET_TO_IDLE }

// Error handling utilities
const isUserRejection = (error: unknown): boolean => {
  return (
    error instanceof Error &&
    (error.message.includes("User rejected") ||
      error.message.includes("UserRejectedRequestError"))
  )
}

const isConnectorNotReady = (error: unknown): boolean => {
  return (
    error instanceof Error &&
    error.message.includes("getChainId is not a function")
  )
}

const getAuthErrorMessage = (error: unknown): string => {
  if (isUserRejection(error)) {
    return "Authentication cancelled by user"
  }
  if (isConnectorNotReady(error)) {
    return "Wallet connector not ready, please try connecting again"
  }
  return error instanceof Error ? error.message : "Authentication failed"
}

// State machine reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case AuthActionType.AUTH_START:
      return {
        status: AuthStatus.AUTHENTICATING,
        hasRestoredAuth: state.hasRestoredAuth,
      }

    case AuthActionType.AUTH_SUCCESS:
      return {
        status: AuthStatus.AUTHENTICATED,
        token: action.payload.token,
        wallet: action.payload.wallet,
        hasRestoredAuth: state.hasRestoredAuth,
      }

    case AuthActionType.AUTH_REJECTED:
      return {
        status: AuthStatus.REJECTED,
        error: action.payload.error,
        hasRestoredAuth: state.hasRestoredAuth,
      }

    case AuthActionType.AUTH_ERROR:
      return {
        status: AuthStatus.ERROR,
        error: action.payload.error,
        hasRestoredAuth: state.hasRestoredAuth,
      }

    case AuthActionType.LOGOUT:
      return {
        status: AuthStatus.IDLE,
        hasRestoredAuth: state.hasRestoredAuth,
      }

    case AuthActionType.RESTORE_AUTH:
      return {
        status: AuthStatus.AUTHENTICATED,
        token: action.payload.token,
        wallet: action.payload.wallet,
        hasRestoredAuth: true,
      }

    case AuthActionType.RESTORE_COMPLETE:
      return {
        ...state,
        hasRestoredAuth: true,
      }

    case AuthActionType.RESET_TO_IDLE:
      return {
        status: AuthStatus.IDLE,
        hasRestoredAuth: state.hasRestoredAuth,
      }

    default:
      return state
  }
}

const initialState: AuthState = {
  status: AuthStatus.IDLE,
  hasRestoredAuth: false,
}

interface AuthContextValue {
  // State
  isAuthenticated: boolean
  isLoading: boolean
  error: Error | null
  authToken: string | null
  walletAddress: string | null
  userRejectedAuth: boolean

  // Methods
  authenticate: (address: string) => Promise<AuthResult>
  logout: () => void
  restoreAuth: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, dispatch] = useReducer(authReducer, initialState)
  const [lastRejectedAddress, setLastRejectedAddress] = useState<string | null>(
    null,
  )
  const { address, isConnected, connector, status } = useAccount()
  const { signMessageAsync } = useSignMessage()

  // Simplified authentication flow using state machine
  const authenticate = useCallback(
    async (address: string): Promise<AuthResult> => {
      // Prevent concurrent authentication attempts
      if (authState.status === AuthStatus.AUTHENTICATING) {
        console.log("Authentication already in progress, skipping...")
        return {
          success: false,
          token: null,
          wallet: null,
          error: "Authentication already in progress",
        }
      }

      dispatch({ type: AuthActionType.AUTH_START })

      try {
        console.log("Starting authentication for address:", address)

        // Step 1: Generate SIWE message
        console.log("Generating SIWE message...")
        const graphqlClient = getGraphQLClient()
        const messageResponse = (await graphqlClient.request(
          GENERATE_SIWE_MESSAGE,
          {
            address,
          },
        )) as { generateSiweMessage: SiweMessageResult }
        const { message } = messageResponse.generateSiweMessage
        console.log("SIWE message generated successfully")

        // Step 2: Sign the message with the user's wallet
        console.log("Requesting signature from wallet...")
        const signature = await signMessageAsync({ message })
        console.log("Message signed successfully")

        // Step 3: Authenticate with the signed message
        console.log("Authenticating with server...")
        const authResponse = (await graphqlClient.request(
          AUTHENTICATE_WITH_SIWE,
          {
            message,
            signature,
          },
        )) as { authenticateWithSiwe: AuthResult }
        const result = authResponse.authenticateWithSiwe
        console.log("Authentication completed:", result.success)

        if (result.success && result.token) {
          const payload = {
            token: result.token,
            wallet: result.wallet || address,
          }
          dispatch({ type: AuthActionType.AUTH_SUCCESS, payload })

          // Clear rejection tracking on successful authentication
          setLastRejectedAddress(null)

          // Persist to localStorage and set GraphQL client token
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, result.token)
          localStorage.setItem(STORAGE_KEYS.AUTH_WALLET, payload.wallet)
          setAuthToken(result.token)
        } else {
          dispatch({
            type: AuthActionType.AUTH_ERROR,
            payload: { error: result.error || "Authentication failed" },
          })
        }

        return result
      } catch (error) {
        console.error("Authentication failed:", error)

        const errorMessage = getAuthErrorMessage(error)
        if (isUserRejection(error)) {
          setLastRejectedAddress(address)
          dispatch({
            type: AuthActionType.AUTH_REJECTED,
            payload: { error: errorMessage },
          })
        } else {
          dispatch({
            type: AuthActionType.AUTH_ERROR,
            payload: { error: errorMessage },
          })
        }

        return {
          success: false,
          token: null,
          wallet: null,
          error: errorMessage,
        }
      }
    },
    [authState.status, signMessageAsync],
  )

  // Logout function
  const logout = useCallback(() => {
    setAuthToken(null)
    setLastRejectedAddress(null)
    dispatch({ type: AuthActionType.LOGOUT })
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.AUTH_WALLET)
  }, [])

  // Restore authentication from localStorage
  const restoreAuth = useCallback(() => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
    const wallet = localStorage.getItem(STORAGE_KEYS.AUTH_WALLET)
    if (token && wallet) {
      console.log("Restoring auth from localStorage for wallet:", wallet)
      setAuthToken(token)
      dispatch({
        type: AuthActionType.RESTORE_AUTH,
        payload: { token, wallet },
      })
    } else {
      dispatch({ type: AuthActionType.RESTORE_COMPLETE })
    }
  }, [])

  // State derivation helpers - memoized
  const isAuthenticated = useMemo(
    () => authState.status === AuthStatus.AUTHENTICATED,
    [authState.status],
  )
  const isAuthenticating = useMemo(
    () => authState.status === AuthStatus.AUTHENTICATING,
    [authState.status],
  )
  const userRejectedAuth = useMemo(
    () => authState.status === AuthStatus.REJECTED,
    [authState.status],
  )

  // Helper to check if auto-authentication should happen
  const shouldAutoAuthenticate = useMemo(() => {
    // Don't auto-authenticate if the current address was rejected
    const addressWasRejected = lastRejectedAddress === address

    return !!(
      authState.hasRestoredAuth &&
      isConnected &&
      address &&
      status === "connected" &&
      connector &&
      !isAuthenticated &&
      !isAuthenticating &&
      !addressWasRejected
    )
  }, [
    authState.hasRestoredAuth,
    isConnected,
    address,
    status,
    connector,
    isAuthenticated,
    isAuthenticating,
    lastRejectedAddress,
  ])

  // Combined wallet connection and auth management effect
  useEffect(() => {
    // 1. Restore auth on mount (only once)
    if (!authState.hasRestoredAuth) {
      restoreAuth()
      return
    }

    // 2. Handle wallet disconnection - auto logout
    if (!isConnected && isAuthenticated) {
      console.log("Wallet disconnected, logging out")
      logout()
      return
    }

    // 3. Reset rejection tracking when address changes (different wallet connected)
    if (address && lastRejectedAddress && lastRejectedAddress !== address) {
      console.log("Different wallet connected, clearing rejection tracking")
      setLastRejectedAddress(null)
      // Don't return here - allow auto-authentication to proceed
    }

    // 4. Auto-authenticate when wallet is ready (but not if current address was rejected)
    if (shouldAutoAuthenticate && address) {
      console.log(
        "Auto-authenticating with wallet:",
        address,
        "status:",
        status,
      )
      // Add a small delay to ensure connector is fully ready
      const timeoutId = setTimeout(() => {
        authenticate(address)
      }, 200)
      return () => clearTimeout(timeoutId)
    }
  }, [
    authState.hasRestoredAuth,
    isConnected,
    address,
    status,
    isAuthenticated,
    lastRejectedAddress,
    shouldAutoAuthenticate,
    restoreAuth,
    logout,
    authenticate,
  ])

  // Memoized error derivation
  const error = useMemo(() => {
    if (
      authState.status === AuthStatus.ERROR ||
      authState.status === AuthStatus.REJECTED
    ) {
      return new Error("error" in authState ? authState.error : "Unknown error")
    }
    return null
  }, [authState])

  // Memoized token and wallet derivation
  const authToken = useMemo(() => {
    return authState.status === AuthStatus.AUTHENTICATED
      ? authState.token
      : null
  }, [authState])

  const walletAddress = useMemo(() => {
    return authState.status === AuthStatus.AUTHENTICATED
      ? authState.wallet
      : null
  }, [authState])

  const contextValue = useMemo(
    () => ({
      // State
      isAuthenticated,
      isLoading: isAuthenticating,
      error,
      authToken,
      walletAddress,
      userRejectedAuth,

      // Methods
      authenticate,
      logout,
      restoreAuth,
    }),
    [
      isAuthenticated,
      isAuthenticating,
      error,
      authToken,
      walletAddress,
      userRejectedAuth,
      authenticate,
      logout,
      restoreAuth,
    ],
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
