# Web3

QuickDapp provides comprehensive Web3 integration through RainbowKit, Wagmi, and Viem. This enables seamless wallet connections, blockchain interactions, and smart contract management with excellent TypeScript support.

## Wallet Configuration

The wallet configuration is set up in the root of your application:

```typescript
// src/client/lib/wagmi.ts
import { createConfig, http } from 'wagmi'
import { sepolia, anvil } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { 
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  rainbowWallet
} from '@rainbow-me/rainbowkit/wallets'
import { clientConfig } from '@shared/config/client'

// Define available wallets
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [metaMaskWallet, rainbowWallet, coinbaseWallet],
    },
    {
      groupName: 'Others',
      wallets: [walletConnectWallet],
    },
  ],
  {
    appName: 'QuickDapp',
    projectId: clientConfig.WEB3_WALLETCONNECT_PROJECT_ID,
  }
)

// Wagmi configuration
export const wagmiConfig = createConfig({
  connectors,
  chains: [
    clientConfig.CHAIN === 'sepolia' ? sepolia : anvil,
  ],
  transports: {
    [sepolia.id]: http(), // Uses viem's default public RPC
    [anvil.id]: http('http://localhost:8545'),
  },
})
```

## Provider Setup

Wrap your application with the necessary providers:

```typescript
// src/client/main.tsx
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './lib/wagmi'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

export function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <Router>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/tokens" element={<TokensPage />} />
            </Routes>
          </Router>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

## Wallet Connection

### Basic Connection Hook

```typescript
// src/client/hooks/useWalletConnection.ts
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useEffect } from 'react'
import { useAuth } from './useAuth'

export function useWalletConnection() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { signIn, signOut, user } = useAuth()
  
  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (isConnected && address && !user) {
      signIn(address)
    } else if (!isConnected && user) {
      signOut()
    }
  }, [isConnected, address, user, signIn, signOut])
  
  return {
    address,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    connectors
  }
}
```

### Connect Button Component

```typescript
// src/client/components/ConnectButton.tsx
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit'
import { useAuth } from '../hooks/useAuth'
import { Button } from './ui/Button'

export function ConnectButton() {
  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading'
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated')

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button onClick={openConnectModal}>
                    Connect Wallet
                  </Button>
                )
              }

              if (chain.unsupported) {
                return (
                  <Button onClick={openChainModal} variant="destructive">
                    Wrong network
                  </Button>
                )
              }

              return (
                <div className="flex gap-2">
                  <Button
                    onClick={openChainModal}
                    variant="outline"
                    size="sm"
                  >
                    {chain.hasIcon && (
                      <div className="w-3 h-3 mr-1">
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </Button>

                  <Button
                    onClick={openAccountModal}
                    size="sm"
                  >
                    {account.displayName}
                  </Button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </RainbowConnectButton.Custom>
  )
}
```

## Smart Contract Interactions

### Reading Contract Data

```typescript
// src/client/hooks/useTokenBalance.ts
import { useReadContract } from 'wagmi'
import { ERC20_ABI } from '../lib/abis'
import { useAccount } from 'wagmi'

export function useTokenBalance(tokenAddress: string) {
  const { address } = useAccount()
  
  const { data: balance, isLoading, error } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!tokenAddress,
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  })
  
  return { 
    balance: balance || BigInt(0), 
    isLoading, 
    error 
  }
}

export function useTokenInfo(tokenAddress: string) {
  const { data: name } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'name',
  })
  
  const { data: symbol } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'symbol',
  })
  
  const { data: decimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'decimals',
  })
  
  const { data: totalSupply } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'totalSupply',
  })
  
  return {
    name: name as string,
    symbol: symbol as string,
    decimals: decimals as number,
    totalSupply: totalSupply as bigint,
  }
}
```

### Writing to Contracts

```typescript
// src/client/hooks/useTokenTransactions.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { ERC20_ABI } from '../lib/abis'
import { toast } from 'react-hot-toast'

export function useTokenTransfer(tokenAddress: string, decimals: number = 18) {
  const { 
    writeContract, 
    data: hash, 
    isPending,
    error: writeError 
  } = useWriteContract()
  
  const { 
    isLoading: isConfirming,
    isSuccess,
    error: receiptError
  } = useWaitForTransactionReceipt({
    hash,
  })
  
  const transfer = async (to: string, amount: string) => {
    try {
      const amountBigInt = parseUnits(amount, decimals)
      
      writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [to as `0x${string}`, amountBigInt],
      })
      
      toast.success('Transaction submitted!')
    } catch (error) {
      toast.error('Failed to submit transaction')
      console.error(error)
    }
  }
  
  // Handle transaction confirmation
  React.useEffect(() => {
    if (isSuccess) {
      toast.success('Transfer completed!')
    } else if (receiptError) {
      toast.error('Transaction failed')
    }
  }, [isSuccess, receiptError])
  
  return {
    transfer,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error: writeError || receiptError
  }
}

export function useTokenApproval(tokenAddress: string, decimals: number = 18) {
  const { writeContract, data: hash, isPending } = useWriteContract()
  
  const approve = async (spender: string, amount: string) => {
    const amountBigInt = parseUnits(amount, decimals)
    
    writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender as `0x${string}`, amountBigInt],
    })
  }
  
  return { approve, hash, isPending }
}
```

### Factory Contract Interactions

```typescript
// src/client/hooks/useTokenFactory.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useReadContract } from 'wagmi'
import { FACTORY_ABI } from '../lib/abis'
import { clientConfig } from '@shared/config/client'
import { parseEther } from 'viem'

export function useDeployToken() {
  const { writeContract, data: hash, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })
  
  const deployToken = async (name: string, symbol: string, initialSupply: string) => {
    writeContract({
      address: clientConfig.WEB3_FACTORY_CONTRACT_ADDRESS as `0x${string}`,
      abi: FACTORY_ABI,
      functionName: 'deployToken',
      args: [name, symbol, parseEther(initialSupply)],
    })
  }
  
  return {
    deployToken,
    isPending,
    isConfirming,
    isSuccess,
    hash
  }
}

export function useUserTokens() {
  const { address } = useAccount()
  
  const { data: tokenCount } = useReadContract({
    address: clientConfig.WEB3_FACTORY_CONTRACT_ADDRESS as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: 'getUserTokenCount',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })
  
  const { data: tokens } = useReadContract({
    address: clientConfig.WEB3_FACTORY_CONTRACT_ADDRESS as `0x${string}`,
    abi: FACTORY_ABI,
    functionName: 'getUserTokens',
    args: address ? [address, 0n, tokenCount || 0n] : undefined,
    query: {
      enabled: !!address && !!tokenCount,
    }
  })
  
  return { 
    tokens: (tokens as string[]) || [], 
    tokenCount: tokenCount as bigint 
  }
}
```

## Utility Functions

### Format and Parse Values

```typescript
// src/client/lib/web3-utils.ts
import { formatUnits, parseUnits, isAddress } from 'viem'

export function formatTokenAmount(
  value: bigint, 
  decimals: number = 18, 
  displayDecimals: number = 4
): string {
  const formatted = formatUnits(value, decimals)
  return parseFloat(formatted).toFixed(displayDecimals)
}

export function parseTokenAmount(value: string, decimals: number = 18): bigint {
  try {
    return parseUnits(value, decimals)
  } catch {
    return BigInt(0)
  }
}

export function shortenAddress(address: string, chars: number = 4): string {
  if (!isAddress(address)) return address
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`
}

export function isValidAddress(address: string): boolean {
  return isAddress(address)
}
```

### Error Handling

```typescript
// src/client/lib/web3-errors.ts
export function parseContractError(error: Error): string {
  const message = error.message
  
  // User rejected transaction
  if (message.includes('User rejected') || message.includes('rejected')) {
    return 'Transaction was rejected'
  }
  
  // Insufficient funds
  if (message.includes('insufficient funds')) {
    return 'Insufficient funds for transaction'
  }
  
  // Gas estimation failed
  if (message.includes('gas')) {
    return 'Transaction may fail - check gas settings'
  }
  
  // Contract revert
  if (message.includes('revert')) {
    // Try to extract revert reason
    const revertMatch = message.match(/revert (.+)/)
    if (revertMatch) {
      return revertMatch[1]
    }
    return 'Transaction would revert'
  }
  
  return 'Transaction failed'
}
```

## Component Examples

### Token Transfer Form

```typescript
// src/client/components/forms/TransferTokenForm.tsx
import { useState } from 'react'
import { useTokenTransfer, useTokenInfo } from '../../hooks/useTokenTransactions'
import { parseTokenAmount, formatTokenAmount, isValidAddress } from '../../lib/web3-utils'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface TransferTokenFormProps {
  tokenAddress: string
  onSuccess?: () => void
}

export function TransferTokenForm({ tokenAddress, onSuccess }: TransferTokenFormProps) {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  
  const { symbol, decimals } = useTokenInfo(tokenAddress)
  const { transfer, isPending, isConfirming } = useTokenTransfer(tokenAddress, decimals)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isValidAddress(recipient)) {
      alert('Invalid recipient address')
      return
    }
    
    if (parseFloat(amount) <= 0) {
      alert('Amount must be greater than 0')
      return
    }
    
    try {
      await transfer(recipient, amount)
      onSuccess?.()
    } catch (error) {
      console.error('Transfer failed:', error)
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input
          label="Recipient Address"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          required
        />
      </div>
      
      <div>
        <Input
          label={`Amount (${symbol})`}
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          step="any"
          min="0"
          required
        />
      </div>
      
      <Button
        type="submit"
        disabled={isPending || isConfirming}
        loading={isPending || isConfirming}
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Transfer'}
      </Button>
    </form>
  )
}
```

### Network Switching

```typescript
// src/client/components/NetworkSwitcher.tsx
import { useSwitchChain, useChainId } from 'wagmi'
import { sepolia, anvil } from 'wagmi/chains'

const SUPPORTED_CHAINS = [sepolia, anvil]

export function NetworkSwitcher() {
  const chainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()
  
  const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId)
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Network:</span>
      
      <select
        value={chainId}
        onChange={(e) => switchChain({ chainId: parseInt(e.target.value) })}
        disabled={isPending}
        className="px-3 py-1 text-sm border rounded-md"
      >
        {SUPPORTED_CHAINS.map((chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.name}
          </option>
        ))}
      </select>
      
      {isPending && (
        <span className="text-xs text-gray-500">Switching...</span>
      )}
    </div>
  )
}
```

The Web3 integration in QuickDapp provides a complete toolkit for building modern dApps with excellent user experience and robust error handling.