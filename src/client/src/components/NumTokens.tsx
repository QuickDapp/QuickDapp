import { useTokenCount } from "../hooks/useTokens"

interface NumTokensProps {
  className?: string
}

export function NumTokens({ className }: NumTokensProps) {
  const { data: count, isLoading, error } = useTokenCount()

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-anchor"></div>
          <span className="text-slate-400">Loading...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <span className="text-red-400">Error loading count</span>
      </div>
    )
  }

  const tokenCount = count ?? 0

  return (
    <div className={className}>
      <div className="flex items-center space-x-2">
        <span className="text-2xl">🪙</span>
        <div>
          <p className="text-lg font-semibold text-white">
            {tokenCount} {tokenCount === 1 ? "Token" : "Tokens"}
          </p>
          <p className="text-sm text-slate-400">
            {tokenCount === 0
              ? "No tokens yet"
              : `You own ${tokenCount} token${tokenCount === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>
    </div>
  )
}
