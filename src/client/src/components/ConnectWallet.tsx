import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useCallback, useMemo } from "react"
import { useAccount } from "wagmi"
import { useAuthContext } from "../contexts/AuthContext"

export function ConnectWallet() {
  const { isAuthenticated, isLoading, userRejectedAuth, authenticate } =
    useAuthContext()
  const { address } = useAccount()

  const handleRetryAuth = useCallback(async () => {
    if (address) {
      await authenticate(address)
    }
  }, [address, authenticate])

  // Memoized button classes and content for better performance
  const accountButtonClass = useMemo(() => {
    const baseClass = "font-medium px-3 py-2 rounded-md transition-colors"
    if (isLoading) {
      return `${baseClass} bg-yellow-600 text-white cursor-wait`
    }
    if (isAuthenticated) {
      return `${baseClass} bg-green-600 hover:bg-green-700 text-white`
    }
    if (userRejectedAuth) {
      return `${baseClass} bg-blue-600 hover:bg-blue-700 text-white`
    }
    return `${baseClass} bg-slate-700 hover:bg-slate-600 text-white`
  }, [isLoading, isAuthenticated, userRejectedAuth])

  const accountButtonContent = useMemo(() => {
    if (isLoading) {
      return "Signing in..."
    }
    if (userRejectedAuth) {
      return "Sign In"
    }
    return null // Will use account info in render
  }, [isLoading, userRejectedAuth])

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready = mounted && authenticationStatus !== "loading"
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === "authenticated")

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md transition-colors"
                  >
                    Connect Wallet
                  </button>
                )
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-md transition-colors"
                  >
                    Wrong network
                  </button>
                )
              }

              return (
                <div className="flex gap-2">
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="bg-slate-700 hover:bg-slate-600 text-white font-medium px-3 py-2 rounded-md transition-colors flex items-center gap-2"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 16,
                          height: 16,
                          borderRadius: 999,
                          overflow: "hidden",
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? "Chain icon"}
                            src={chain.iconUrl}
                            style={{ width: 16, height: 16 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </button>

                  <button
                    onClick={
                      userRejectedAuth ? handleRetryAuth : openAccountModal
                    }
                    type="button"
                    className={accountButtonClass}
                  >
                    {accountButtonContent || (
                      <>
                        {account.displayName}
                        {account.displayBalance
                          ? ` (${account.displayBalance})`
                          : ""}
                        {isAuthenticated && " ✓"}
                      </>
                    )}
                  </button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
