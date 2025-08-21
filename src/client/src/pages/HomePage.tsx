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
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="card">
          <h2 className="text-2xl font-semibold mb-4">
            Welcome to QuickDapp v3
          </h2>
          <p className="text-muted mb-6">
            This is the homepage placeholder. Connect your wallet to start
            creating and managing tokens.
          </p>

          <div className="space-y-4">
            <button className="btn-primary">Connect Wallet</button>
            <div className="text-sm text-muted">
              Web3 integration coming in Phase 2
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-xl font-semibold mb-3">Create Tokens</h3>
            <p className="text-muted">
              Deploy ERC20 tokens quickly with our factory contract
            </p>
          </div>
          <div className="card">
            <h3 className="text-xl font-semibold mb-3">Manage Assets</h3>
            <p className="text-muted">
              View and manage your deployed tokens and contracts
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
