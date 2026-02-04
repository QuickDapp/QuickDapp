---
order: 40
---

# Chain Monitoring

The Web3 variant includes a blockchain event monitoring system that polls for on-chain events and processes them into user notifications. This is how the app stays in sync with contract activity without requiring users to refresh.

## How It Works

The chain monitoring system has three layers:

1. **`watchChain` worker job** — A cron-scheduled background job that polls the blockchain for new events
2. **Chain filter modules** — Event handlers that define which events to watch and how to process them
3. **Notification delivery** — Processed events become user notifications delivered via the existing notification system

```
Blockchain → watchChain job → Chain Filters → Notifications → WebSocket → User
```

## watchChain Worker Job

The [`watchChain`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/workers/jobs/watchChain.ts) job runs on a cron schedule (every 3 seconds by default). Each execution:

1. Gets the current block number from the chain
2. Loads the last processed block from the database (`settings` table)
3. Calculates the block range to process (capped at 500 blocks per run to avoid timeout)
4. Runs each chain filter module against the block range
5. Updates the last processed block in the database

On first run, the watcher starts from the current block (in production) or block 1 (in test mode). This means it only processes events that occur after deployment — historical events are not backfilled.

### Block Range Limiting

To prevent long-running queries against the RPC endpoint, each run processes at most 500 blocks. If the app falls behind (e.g., after being offline), it catches up incrementally over multiple runs.

### Persistence

The last processed block is stored per chain in the database. This means the watcher survives server restarts without reprocessing blocks or missing events.

## Chain Filter Modules

Chain filters are modular event handlers registered in the `watchChain` job. Each filter module implements the `ChainLogModule` interface:

```typescript
interface ChainLogModule {
  getEvent: () => AbiEvent
  getContractAddress: () => `0x${string}` | null
  processLogs: (serverApp: ServerApp, log: Logger, logs: Log[]) => Promise<void>
}
```

- `getEvent()` — Returns the ABI event definition to watch for
- `getContractAddress()` — Returns a specific contract address to filter by, or `null` to watch all contracts
- `processLogs()` — Handles matched events (e.g., creating notifications)

### Built-in Filters

The Web3 variant includes two chain filter modules:

#### createToken

[`src/server/workers/chainFilters/createToken.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/workers/chainFilters/createToken.ts) watches for `ERC20NewToken` events from the factory contract:

```solidity
event ERC20NewToken(
    address indexed token,
    string name,
    string symbol,
    address indexed creator,
    uint256 initialSupply
)
```

When a new token is created, the filter:
1. Extracts the creator address from the event
2. Looks up the user by wallet address in the `userAuth` table
3. Creates a `TOKEN_CREATED` notification for that user

In production, it only watches the configured factory contract address. In test mode, it watches all contracts to support test factories.

#### sendToken

[`src/server/workers/chainFilters/sendToken.ts`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/workers/chainFilters/sendToken.ts) watches for `TokenTransferred` events from SimpleERC20 contracts:

```solidity
event TokenTransferred(
    address indexed from,
    address indexed to,
    uint256 value,
    string name,
    string symbol,
    uint8 decimals
)
```

When a token transfer occurs, the filter:
1. Extracts the sender address from the event
2. Looks up the user by wallet address
3. Creates a `TOKEN_TRANSFER` notification with the formatted transfer amount

This filter watches all contract addresses since any SimpleERC20 token can emit these events.

### Adding Custom Filters

To add a new chain filter:

1. Create a module in `src/server/workers/chainFilters/`:

```typescript
import type { AbiEvent } from "viem"
import { parseAbiItem } from "viem"
import type { ChainLogModule } from "../jobs/types"

const MY_EVENT = parseAbiItem(
  "event MyEvent(address indexed sender, uint256 value)"
)

export const getEvent: ChainLogModule["getEvent"] = () => {
  return MY_EVENT as AbiEvent
}

export const getContractAddress: ChainLogModule["getContractAddress"] = () => {
  return "0x1234..." as `0x${string}`  // or null to watch all contracts
}

export const processLogs: ChainLogModule["processLogs"] = async (
  serverApp, log, logs
) => {
  for (const logEntry of logs) {
    const { args: { sender, value } } = logEntry
    // Process the event...
  }
}
```

2. Register it in `watchChain.ts`:

```typescript
import * as myFilter from "../chainFilters/myFilter"

const chainLogModules: ChainLogRegistry = {
  sendToken: sendTokenFilter,
  createToken: createTokenFilter,
  myFilter: myFilter,  // Add here
}
```

## deployMulticall3 Job

The [`deployMulticall3`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/workers/jobs/deployMulticall3.ts) worker job ensures the Multicall3 contract is available on the development chain. It runs once on startup:

1. Checks if Multicall3 is already deployed at the expected address
2. If not deployed, funds the deterministic deployer address
3. Sends the pre-signed deployment transaction
4. Verifies the contract was deployed successfully

This is only necessary on local development chains (Anvil) where Multicall3 isn't available by default. On mainnet, testnets, and L2s, Multicall3 is already deployed at a well-known address.

## Notification Flow

When a chain filter detects a relevant event, it creates a notification through `serverApp.createNotification()`. This:

1. Inserts the notification into the `notifications` database table
2. Sends a real-time WebSocket message to the user's connected browser sessions
3. The frontend `NotificationsIndicator` updates the unread badge count
4. The `NotificationsDialog` shows the new notification with event-specific details

This means users see blockchain activity in real time without polling — the chain watcher polls the blockchain, and WebSockets push updates to the browser.
