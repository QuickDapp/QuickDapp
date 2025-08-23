import { CreateTokenDialog } from "../components/CreateTokenDialog"
import { Header } from "../components/Header"
import { IfWalletConnected } from "../components/IfWalletConnected"
import { NumTokens } from "../components/NumTokens"
import { TokenList } from "../components/TokenList"

export function HomePage() {
  return (
    <div className="flex flex-col w-full min-h-screen relative font-body">
      <Header className="fixed h-header" />
      <main className="relative m-after-header">
        <div className="p-4">
          <p className="mb-6">
            This is the default QuickDapp dapp. It lets you create and transfer
            ERC-20 tokens.
          </p>
          <IfWalletConnected>
            <div className="flex flex-row justify-start items-center">
              <NumTokens className="mr-4" />
              <CreateTokenDialog />
            </div>
            <div className="mt-4">
              <TokenList />
            </div>
          </IfWalletConnected>
        </div>
      </main>
      <footer>
        <p className="text-xs p-4">
          Built with <a href="https://quickdapp.xyz">QuickDapp</a>
        </p>
      </footer>
    </div>
  )
}
