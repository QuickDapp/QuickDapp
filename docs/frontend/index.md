# Frontend

The QuickDapp frontend is a modern React application built with cutting-edge technologies for an optimal developer experience and user interface. It provides seamless Web3 integration, real-time updates, and a responsive design system.

## Technology Stack

* **[React 19](https://react.dev/)** - Latest React with concurrent features and modern hooks
* **[Vite](https://vitejs.dev/)** - Lightning-fast build tool and development server
* **[TypeScript](https://www.typescriptlang.org/)** - Full type safety across the application
* **[TailwindCSS](https://tailwindcss.com/)** - Utility-first CSS framework
* **[Radix UI](https://www.radix-ui.com/)** - Unstyled, accessible UI components
* **[RainbowKit](https://rainbowkit.com/)** - Beautiful wallet connection UI
* **[Wagmi](https://wagmi.sh/)** - React hooks for Ethereum
* **[Viem](https://viem.sh/)** - TypeScript Ethereum library
* **[React Query](https://tanstack.com/query/latest)** - Powerful data synchronization
* **[React Router](https://reactrouter.com/)** - Client-side routing

## Key Features

### Web3 Integration
Complete Web3 functionality with wallet connections, transaction handling, and blockchain interactions:

```typescript
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export function WalletConnection() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted }) => (
        <div>
          {!account ? (
            <button onClick={openConnectModal}>Connect Wallet</button>
          ) : (
            <div>Connected: {account.displayName}</div>
          )}
        </div>
      )}
    </ConnectButton.Custom>
  )
}
```

### Real-time Data
React Query integration for efficient data fetching and caching:

```typescript
import { useQuery } from '@tanstack/react-query'
import { graphqlClient } from '../lib/graphql'

export function useTokens() {
  return useQuery({
    queryKey: ['tokens'],
    queryFn: async () => {
      const data = await graphqlClient.request(`
        query GetTokens {
          tokens {
            id
            address
            name
            symbol
            createdAt
          }
        }
      `)
      return data.tokens
    }
  })
}
```

### Responsive Design
TailwindCSS with mobile-first design principles:

```typescript
export function TokenCard({ token }: { token: Token }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 
                    border border-gray-200 hover:shadow-lg 
                    transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {token.name}
        </h3>
        <span className="text-sm text-gray-500 font-mono">
          {token.symbol}
        </span>
      </div>
      <p className="text-sm text-gray-600 font-mono break-all">
        {token.address}
      </p>
    </div>
  )
}
```

### Component System
Reusable components built on Radix UI primitives:

```typescript
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from './Button'

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children 
}: ModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform 
                                   -translate-x-1/2 -translate-y-1/2
                                   bg-white rounded-lg p-6 shadow-xl
                                   max-w-md w-full">
          <Dialog.Title className="text-lg font-semibold mb-4">
            {title}
          </Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

## Project Structure

```
src/client/
├── components/         # Reusable UI components
│   ├── ui/            # Base UI components (Button, Input, etc.)
│   ├── forms/         # Form components
│   └── layout/        # Layout components
├── pages/             # Application pages/routes
├── hooks/             # Custom React hooks
│   ├── useAuth.ts     # Authentication hook
│   ├── useTokens.ts   # Token data hooks
│   └── useWebSocket.ts # WebSocket connection
├── lib/               # Client-side utilities
│   ├── graphql.ts     # GraphQL client setup
│   ├── wagmi.ts       # Wagmi configuration
│   └── utils.ts       # General utilities
├── styles/            # Global styles
└── types/             # TypeScript type definitions
```

## Documentation Sections

* [Components](./components.md) - UI component library and usage
* [Forms](./forms.md) - Form handling and validation
* [Global](./global.md) - Global state management and context
* [GraphQL](./graphql.md) - GraphQL client integration
* [Web3](./web3.md) - Blockchain interactions and wallet integration
* [Cookies](./cookies.md) - Client-side data persistence

## Quick Examples

### Custom Hook for Contract Interaction

```typescript
// src/client/hooks/useTokenContract.ts
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { ERC20_ABI } from '../lib/abis'

export function useTokenTransfer(tokenAddress: string) {
  const { writeContract, data: hash, isPending } = useWriteContract()
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })
  
  const transfer = (to: string, amount: bigint) => {
    writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, amount],
    })
  }
  
  return {
    transfer,
    isPending,
    isConfirming,
    isSuccess,
    hash
  }
}
```

### GraphQL Mutation with Optimistic Updates

```typescript
// src/client/hooks/useDeployToken.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { graphqlClient } from '../lib/graphql'

export function useDeployToken() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (input: DeployTokenInput) => {
      const data = await graphqlClient.request(`
        mutation DeployToken($input: DeployTokenInput!) {
          deployToken(input: $input) {
            id
            name
            symbol
            address
          }
        }
      `, { input })
      
      return data.deployToken
    },
    
    // Optimistic update
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['tokens'] })
      
      const previousTokens = queryClient.getQueryData(['tokens'])
      
      queryClient.setQueryData(['tokens'], (old: Token[]) => [
        ...(old || []),
        {
          id: 'optimistic-' + Date.now(),
          name: input.name,
          symbol: input.symbol,
          address: '0x0000000000000000000000000000000000000000',
          createdAt: new Date().toISOString(),
          owner: { address: '0x...' }
        }
      ])
      
      return { previousTokens }
    },
    
    // Revert on error
    onError: (err, variables, context) => {
      queryClient.setQueryData(['tokens'], context?.previousTokens)
    },
    
    // Refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] })
    }
  })
}
```

### Form Component with Validation

```typescript
// src/client/components/forms/DeployTokenForm.tsx
import { useForm } from 'react-hook-form'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useDeployToken } from '../../hooks/useDeployToken'

interface DeployTokenFormData {
  name: string
  symbol: string
  initialSupply: string
}

export function DeployTokenForm({ onSuccess }: { onSuccess?: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset
  } = useForm<DeployTokenFormData>()
  
  const deployToken = useDeployToken()
  
  const onSubmit = async (data: DeployTokenFormData) => {
    try {
      await deployToken.mutateAsync(data)
      reset()
      onSuccess?.()
    } catch (error) {
      console.error('Failed to deploy token:', error)
    }
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input
          label="Token Name"
          {...register('name', { required: 'Token name is required' })}
          error={errors.name?.message}
          placeholder="My Token"
        />
      </div>
      
      <div>
        <Input
          label="Symbol"
          {...register('symbol', { 
            required: 'Symbol is required',
            maxLength: { value: 6, message: 'Symbol must be 6 characters or less' }
          })}
          error={errors.symbol?.message}
          placeholder="MTK"
        />
      </div>
      
      <div>
        <Input
          label="Initial Supply"
          type="number"
          {...register('initialSupply', { 
            required: 'Initial supply is required',
            min: { value: 1, message: 'Supply must be at least 1' }
          })}
          error={errors.initialSupply?.message}
          placeholder="1000000"
        />
      </div>
      
      <Button 
        type="submit"
        disabled={!isValid || deployToken.isPending}
        loading={deployToken.isPending}
      >
        Deploy Token
      </Button>
    </form>
  )
}
```

### Layout Component

```typescript
// src/client/components/layout/AppLayout.tsx
import { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { NotificationCenter } from '../NotificationCenter'
import { useAuth } from '../../hooks/useAuth'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth()
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex">
        {user && <Sidebar />}
        
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      
      <NotificationCenter />
    </div>
  )
}
```

The frontend architecture emphasizes modern React patterns, excellent type safety, and seamless Web3 integration while maintaining a clean, maintainable codebase.