import { formatUnits } from "viem"
import type { Token } from "../hooks/useTokens"
import { useMyTokens } from "../hooks/useTokens"
import { SendTokenDialog } from "./SendTokenDialog"
import { Button } from "./ui/Button"

interface TokenCardProps {
  token: Token
}

function TokenCard({ token }: TokenCardProps) {
  const formattedBalance = formatUnits(BigInt(token.balance), token.decimals)
  const formattedTotalSupply = formatUnits(
    BigInt(token.totalSupply),
    token.decimals,
  )

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-white">{token.name}</h3>
        <p className="text-sm text-gray-400">
          {token.symbol} • {token.decimals} decimals
        </p>
        <p className="text-xs text-gray-500 font-mono break-all mt-1">
          {token.address}
        </p>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Your Balance:</span>
          <span className="font-medium text-white">
            {parseFloat(formattedBalance).toLocaleString()} {token.symbol}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Total Supply:</span>
          <span className="text-sm text-gray-300">
            {parseFloat(formattedTotalSupply).toLocaleString()} {token.symbol}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <SendTokenDialog token={token}>
          <Button size="sm" variant="outline" className="flex-1">
            Send
          </Button>
        </SendTokenDialog>

        <Button
          size="sm"
          variant="ghost"
          className="flex-1"
          onClick={() => {
            navigator.clipboard.writeText(token.address)
          }}
        >
          Copy Address
        </Button>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse"
        >
          <div className="mb-3">
            <div className="h-5 bg-gray-700 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-24 mb-1"></div>
            <div className="h-3 bg-gray-700 rounded w-full"></div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-700 rounded w-20"></div>
              <div className="h-4 bg-gray-700 rounded w-16"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-4 bg-gray-700 rounded w-20"></div>
              <div className="h-4 bg-gray-700 rounded w-16"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-700 rounded flex-1"></div>
            <div className="h-8 bg-gray-700 rounded flex-1"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function TokenList() {
  const { data: tokenResponse, isLoading, error, refetch } = useMyTokens()

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Your Tokens</h2>
          <div className="h-8 bg-gray-700 rounded w-20 animate-pulse"></div>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">Failed to load tokens</p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  const tokens = tokenResponse?.tokens || []

  if (tokens.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🪙</div>
        <h3 className="text-xl font-semibold text-white mb-2">No tokens yet</h3>
        <p className="text-gray-400 mb-4">
          Create your first token to get started!
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">
          Your Tokens ({tokens.length})
        </h2>
        <Button onClick={() => refetch()} variant="ghost" size="sm">
          ↻ Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tokens.map((token) => (
          <TokenCard key={token.address} token={token} />
        ))}
      </div>
    </div>
  )
}
