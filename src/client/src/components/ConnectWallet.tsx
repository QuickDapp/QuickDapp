import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Button } from "./Button"

interface ConnectWalletProps {
  showNetwork?: boolean
}

export function ConnectWallet({ showNetwork = false }: ConnectWalletProps) {
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
                  <Button onClick={openConnectModal} size="sm">
                    Connect Wallet
                  </Button>
                )
              }

              if (chain.unsupported) {
                return (
                  <Button onClick={openChainModal} variant="error">
                    Wrong network
                  </Button>
                )
              }

              if (showNetwork) {
                return (
                  <div className="flex gap-2">
                    <Button
                      onClick={openChainModal}
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 16,
                            height: 16,
                            borderRadius: 999,
                            overflow: "hidden",
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
                    </Button>
                    <Button
                      onClick={openAccountModal}
                      variant="outline"
                      size="sm"
                    >
                      {account.displayName}
                    </Button>
                  </div>
                )
              }

              return (
                <Button onClick={openAccountModal} variant="outline" size="sm">
                  {account.displayName}
                </Button>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
