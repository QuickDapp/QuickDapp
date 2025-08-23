import { useQuery } from "@tanstack/react-query"
import { useAccount } from "wagmi"
import { getGraphQLClient } from "../../../shared/graphql/client"
import {
  GET_MY_TOKENS,
  GET_TOKEN_COUNT,
  GET_TOKEN_INFO,
} from "../../../shared/graphql/queries"
import { useAuthContext } from "../contexts/AuthContext"

export interface Token {
  address: string
  name: string
  symbol: string
  decimals: number
  totalSupply: bigint
  balance: bigint
  createdAt: string
}

export interface TokensResponse {
  tokens: Token[]
  total: number
}

/**
 * Hook to get all tokens owned by the current user
 */
export function useMyTokens() {
  const { isConnected } = useAccount()
  const { isAuthenticated } = useAuthContext()

  return useQuery({
    queryKey: ["tokens", "my-tokens"],
    queryFn: async (): Promise<TokensResponse> => {
      const graphqlClient = getGraphQLClient()
      const response = (await graphqlClient.request(GET_MY_TOKENS)) as any
      return response.getMyTokens
    },
    enabled: isConnected && isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
  })
}

/**
 * Hook to get information about a specific token
 */
export function useTokenInfo(address: string | undefined) {
  const { isConnected } = useAccount()
  const { isAuthenticated } = useAuthContext()

  return useQuery({
    queryKey: ["tokens", "token-info", address],
    queryFn: async (): Promise<Token | null> => {
      if (!address) return null
      const graphqlClient = getGraphQLClient()
      const response = (await graphqlClient.request(GET_TOKEN_INFO, {
        address,
      })) as any
      return response.getTokenInfo
    },
    enabled: isConnected && isAuthenticated && !!address,
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Hook to get the total count of tokens owned by the user
 */
export function useTokenCount() {
  const { isConnected } = useAccount()
  const { isAuthenticated } = useAuthContext()

  return useQuery({
    queryKey: ["tokens", "count"],
    queryFn: async (): Promise<number> => {
      const graphqlClient = getGraphQLClient()
      const response = (await graphqlClient.request(GET_TOKEN_COUNT)) as any
      return response.getTokenCount
    },
    enabled: isConnected && isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
  })
}
