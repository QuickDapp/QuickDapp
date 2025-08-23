import { useMutation } from "@tanstack/react-query"
import { useCallback } from "react"
import { useSignMessage } from "wagmi"
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

/**
 * Hook for SIWE (Sign-In with Ethereum) authentication
 */
export function useAuth() {
  const { signMessageAsync } = useSignMessage()

  // Mutation to generate SIWE message
  const generateMessageMutation = useMutation({
    mutationFn: async (address: string): Promise<SiweMessageResult> => {
      const graphqlClient = getGraphQLClient()
      const response = (await graphqlClient.request(GENERATE_SIWE_MESSAGE, {
        address,
      })) as { generateSiweMessage: SiweMessageResult }
      return response.generateSiweMessage
    },
  })

  // Mutation to authenticate with signed SIWE message
  const authenticateMutation = useMutation({
    mutationFn: async ({
      message,
      signature,
    }: {
      message: string
      signature: string
    }): Promise<AuthResult> => {
      const graphqlClient = getGraphQLClient()
      const response = (await graphqlClient.request(AUTHENTICATE_WITH_SIWE, {
        message,
        signature,
      })) as { authenticateWithSiwe: AuthResult }
      return response.authenticateWithSiwe
    },
    onSuccess: (result) => {
      if (result.success && result.token) {
        // Set the JWT token on the GraphQL client
        setAuthToken(result.token)

        // Store token in localStorage for persistence
        localStorage.setItem("auth_token", result.token)
        localStorage.setItem("auth_wallet", result.wallet || "")
      }
    },
  })

  // Combined authentication flow
  const authenticate = useCallback(
    async (address: string): Promise<AuthResult> => {
      try {
        // Step 1: Generate SIWE message
        const messageResult = await generateMessageMutation.mutateAsync(address)

        // Step 2: Sign the message with the user's wallet
        const signature = await signMessageAsync({
          message: messageResult.message,
        })

        // Step 3: Authenticate with the signed message
        const authResult = await authenticateMutation.mutateAsync({
          message: messageResult.message,
          signature,
        })

        return authResult
      } catch (error) {
        console.error("Authentication failed:", error)
        return {
          success: false,
          token: null,
          wallet: null,
          error:
            error instanceof Error ? error.message : "Authentication failed",
        }
      }
    },
    [generateMessageMutation, authenticateMutation, signMessageAsync],
  )

  // Logout function
  const logout = () => {
    setAuthToken(null)
    localStorage.removeItem("auth_token")
    localStorage.removeItem("auth_wallet")
  }

  // Check if user is authenticated (has token)
  const isAuthenticated = useCallback((): boolean => {
    const token = localStorage.getItem("auth_token")
    return !!token
  }, [])

  // Restore authentication from localStorage on page load
  const restoreAuth = useCallback(() => {
    const token = localStorage.getItem("auth_token")
    if (token) {
      setAuthToken(token)
    }
  }, [])

  return {
    authenticate,
    logout,
    isAuthenticated,
    restoreAuth,
    isGeneratingMessage: generateMessageMutation.isPending,
    isAuthenticating: authenticateMutation.isPending,
    isLoading:
      generateMessageMutation.isPending || authenticateMutation.isPending,
    error: generateMessageMutation.error || authenticateMutation.error,
  }
}
