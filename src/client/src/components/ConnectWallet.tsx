import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useEffect } from "react"
import { useAccount } from "wagmi"
import { useAuth } from "../hooks/useAuth"

export function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { authenticate, isAuthenticated, isLoading, restoreAuth } = useAuth()

  // Restore authentication on component mount
  useEffect(() => {
    restoreAuth()
  }, [restoreAuth])

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (isConnected && address && !isAuthenticated()) {
      authenticate(address)
    }
  }, [isConnected, address, authenticate, isAuthenticated])
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
                    className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-3 py-2 rounded-md transition-colors flex items-center gap-2"
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
                    onClick={openAccountModal}
                    type="button"
                    className={`font-medium px-3 py-2 rounded-md transition-colors ${
                      isLoading
                        ? "bg-yellow-600 text-white cursor-wait"
                        : isAuthenticated()
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-700 hover:bg-gray-600 text-white"
                    }`}
                  >
                    {isLoading ? (
                      "Signing in..."
                    ) : (
                      <>
                        {account.displayName}
                        {account.displayBalance
                          ? ` (${account.displayBalance})`
                          : ""}
                        {isAuthenticated() && " ✓"}
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
