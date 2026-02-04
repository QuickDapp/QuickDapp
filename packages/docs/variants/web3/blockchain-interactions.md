---
order: 50
---

# Blockchain Interactions

The Web3 variant provides a layered system for reading from and writing to smart contracts, with multicall batching for efficiency and retry logic for reliability.

## Chain Configuration

Chain support is defined in [`src/shared/contracts/chain.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/shared/contracts/chain.ts). The `WEB3_SUPPORTED_CHAINS` environment variable controls which chains are available:

```shell
WEB3_SUPPORTED_CHAINS=anvil,sepolia,mainnet
```

The first chain in the list is the **primary chain** — the one used for server-side operations (blockchain clients, chain watching, contract deployment).

Available chains:

| Name | Chain ID | Description |
|------|----------|-------------|
| `anvil` | 31337 | Local Hardhat/Anvil development chain |
| `mainnet` | 1 | Ethereum mainnet |
| `sepolia` | 11155111 | Sepolia testnet |
| `base` | 8453 | Base L2 |

Each chain can have a custom RPC endpoint via environment variables (`WEB3_ANVIL_RPC`, `WEB3_MAINNET_RPC`, etc.). If no custom RPC is specified, Viem's built-in public RPCs are used.

### Utility Functions

```typescript
import { getChain, getChainId, getSupportedChains, getPrimaryChain } from "@shared/contracts/chain"

getSupportedChains()     // All configured chains as viem Chain objects
getPrimaryChain()        // First chain in WEB3_SUPPORTED_CHAINS
getChain("sepolia")      // Get a specific chain by name
getChainId("mainnet")    // Get chain ID by name
```

## Server-Side Blockchain Access

The `ServerApp` type includes two blockchain clients created during bootstrap:

```typescript
// publicClient — read-only access to chain state
const blockNumber = await serverApp.publicClient.getBlockNumber()
const balance = await serverApp.publicClient.getBalance({ address })

// walletClient — authenticated with WEB3_SERVER_WALLET_PRIVATE_KEY
const hash = await serverApp.walletClient.sendTransaction({ to, value })
```

The `publicClient` connects to the primary chain's RPC endpoint. The `walletClient` uses `privateKeyToAccount()` with the configured server wallet key, allowing the server to send transactions (e.g., deploying contracts, executing administrative operations).

## Contract Reader

The contract reader in [`src/shared/contracts/reader.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/shared/contracts/reader.ts) provides typed contract read operations.

### Single Read

```typescript
import { readContract } from "@shared/contracts/reader"

const totalTokens = await readContract<bigint>(
  {
    address: factoryAddress,
    abi: factoryAbi,
    functionName: "getNumErc20s",
  },
  publicClient
)
```

### Batched Reads (Multicall)

For multiple reads, `readContractMultiple` uses Multicall3 to batch them into a single RPC call:

```typescript
import { readContractMultiple } from "@shared/contracts/reader"

const [name, symbol, decimals] = await readContractMultiple<string | number>(
  [
    { address: tokenAddr, abi: erc20Abi, functionName: "name" },
    { address: tokenAddr, abi: erc20Abi, functionName: "symbol" },
    { address: tokenAddr, abi: erc20Abi, functionName: "decimals" },
  ],
  publicClient
)
```

### Fault-Tolerant Reads

`readContractMultipleWithFallback` returns partial results when some calls fail:

```typescript
import { readContractMultipleWithFallback } from "@shared/contracts/reader"

const { results, errors, successCount } = await readContractMultipleWithFallback(
  calls,
  publicClient
)
// results: (T | null)[] — null for failed calls
```

### Retry Logic

`readContractWithRetry` adds exponential backoff for unreliable RPC endpoints:

```typescript
import { readContractWithRetry } from "@shared/contracts/reader"

const result = await readContractWithRetry(
  call,
  publicClient,
  3,     // max retries
  1000   // base delay in ms (doubles each retry)
)
```

## Contract Writer

The contract writer in [`src/shared/contracts/writer.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/shared/contracts/writer.ts) handles transaction execution with simulation, state tracking, and callbacks.

### ContractWriterInstance

The `ContractWriterInstance` class manages the full lifecycle of a contract write:

1. **Simulate** — Dry-run the transaction to catch errors before spending gas
2. **Submit** — Send the transaction to the blockchain
3. **Confirm** — Wait for the transaction to be included in a block
4. **Verify** — Check the transaction receipt status

```typescript
import { createContractWriter, createContractWrite } from "@shared/contracts/writer"

const request = createContractWrite(
  factoryAddress,
  factoryAbi,
  "erc20DeployToken",
  [tokenConfig, initialBalance]
)

const writer = createContractWriter(publicClient, walletClient, request)

const receipt = await writer.exec({
  onTransactionSubmitted: (txHash) => {
    console.log("Submitted:", txHash)
  },
  onTransactionConfirmed: (receipt) => {
    console.log("Confirmed in block:", receipt.blockNumber)
  },
})
```

### State Tracking

The writer tracks its state throughout execution:

```typescript
interface ContractWriterState {
  isLoading: boolean       // Transaction in progress
  isSuccess: boolean       // Transaction confirmed successfully
  error: Error | null      // Error if any step failed
  txHash?: `0x${string}`   // Transaction hash (available after submission)
  receipt?: TransactionReceipt  // Receipt (available after confirmation)
}
```

Call `writer.reset()` to clear state and allow retries.

### Quick Write

For one-off writes without state tracking, use the `writeContract` function:

```typescript
import { writeContract } from "@shared/contracts/writer"

const receipt = await writeContract(publicClient, walletClient, request)
```

## Multicall3

[Multicall3](https://www.multicall3.com/) batches multiple contract reads into a single RPC call, reducing latency and rate limit consumption.

The multicall implementation in [`src/shared/contracts/multicall.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/shared/contracts/multicall.ts) uses the `aggregate3` function, which allows individual calls to fail without breaking the entire batch.

If Multicall3 is unavailable or fails, the system automatically falls back to individual contract calls.

On local development chains (Anvil), the [`deployMulticall3`](chain-monitoring.md) worker job automatically deploys Multicall3 on startup using a deterministic deployment transaction, so multicall works identically in development and production.

## ABI Generation

Contract ABIs are generated from Foundry build artifacts during `bun run gen`. The codegen process:

1. Reads compiled contract artifacts from `sample-contracts/out/`
2. Extracts the ABI JSON for each contract
3. Generates TypeScript types in `src/shared/abi/generated.ts`

This ensures type safety between your Solidity contracts and TypeScript code — contract function names, argument types, and return types are all statically checked.
