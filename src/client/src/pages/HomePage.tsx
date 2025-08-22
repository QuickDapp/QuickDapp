import { ConnectWallet } from "../components/ConnectWallet"
import { CreateTokenDialog } from "../components/CreateTokenDialog"
import { IfWalletConnected } from "../components/IfWalletConnected"
import { NumTokens } from "../components/NumTokens"
import { TokenList } from "../components/TokenList"

export function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-anchor mb-4 glow-effect">
          QuickDapp
        </h1>
        <p className="text-xl text-muted">
          Fast, simple dapp development platform
        </p>
        <div className="mt-6">
          <ConnectWallet />
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="card mb-8">
          <h2 className="text-2xl font-semibold mb-4">ERC20 Token Factory</h2>
          <p className="text-muted mb-6">
            Create and transfer ERC-20 tokens using our factory contract.
          </p>
        </div>

        <IfWalletConnected>
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <NumTokens />
              <CreateTokenDialog />
            </div>

            <TokenList />
          </div>
        </IfWalletConnected>
      </main>
    </div>
  )
}
