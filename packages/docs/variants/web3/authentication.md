---
order: 80
---

# Authentication

The Web3 variant replaces the base package's email/OAuth-first authentication with **SIWE (Sign-In With Ethereum)** — users authenticate by signing a message with their wallet. Email and OAuth authentication remain available as secondary options.

## How SIWE Works

SIWE is a standard for using Ethereum wallets to authenticate with web applications. Instead of passwords or OAuth tokens, the user proves ownership of their wallet address by signing a structured message.

The authentication flow:

1. **User connects wallet** — RainbowKit prompts the user to select and connect a wallet
2. **Client requests SIWE message** — The `generateSiweMessage` GraphQL mutation creates a message containing the domain, address, chain ID, and a random nonce
3. **Server generates message** — The server creates a SIWE-formatted message with the nonce stored for verification
4. **User signs message** — The wallet prompts the user to sign the message (no gas cost)
5. **Client sends signature** — The signed message is sent to `authenticateWithSiwe`
6. **Server verifies** — The server verifies the signature matches the address, checks the domain and nonce, then creates or retrieves the user account
7. **JWT issued** — A JWT token is returned containing `userId` and `web3_wallet` fields

```graphql
# Step 1: Generate SIWE message
mutation {
  generateSiweMessage(
    address: "0x1234..."
    chainId: 1
    domain: "localhost:3000"
  ) {
    message
    nonce
  }
}

# Step 2: Authenticate with signed message
mutation {
  authenticateWithSiwe(
    message: "localhost:3000 wants you to sign in..."
    signature: "0xabcd..."
  ) {
    success
    token
    web3Wallet
    error
  }
}
```

## Domain Validation

The server validates that the SIWE message domain matches an allowed origin. Configure allowed origins with `WEB3_ALLOWED_SIWE_ORIGINS`:

```shell
# .env.local
WEB3_ALLOWED_SIWE_ORIGINS=http://localhost:3000,https://myapp.com
```

In production, this prevents phishing attacks where a malicious site could trick users into signing messages for your domain.

## Frontend AuthContext

The Web3 variant's `AuthContext` is a state machine built on `useReducer` that coordinates wallet connection with SIWE authentication.

### State Machine

```
IDLE ──────────────────► AUTHENTICATING ──► AUTHENTICATED
  │                           │                  │
  │                           ├──► REJECTED       │
  │                           │                   │
  │                           └──► ERROR          │
  │                                               │
  └── (on mount) ──► RESTORING ──► WAITING_FOR_WALLET ──► AUTHENTICATED
                        │
                        └──► IDLE (no saved session)
```

**Key transitions:**

- On mount, the context checks localStorage for a saved token. If found, it validates with the server and enters `WAITING_FOR_WALLET` until the wallet reconnects
- When a wallet connects and the user is in `IDLE`, authentication starts automatically (unless the user previously rejected signing for that address)
- If the user rejects the signature prompt, the state moves to `REJECTED` and auto-authentication is suppressed for that address until a different wallet connects
- Wallet disconnection while authenticated triggers an automatic logout

### Interface

```typescript
interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  error: Error | null
  authToken: string | null
  walletAddress: string | null
  userRejectedAuth: boolean

  authenticate: (address: string) => Promise<AuthResult>
  logout: () => void
  restoreAuth: () => void
}
```

The `walletAddress` and `userRejectedAuth` properties are specific to the Web3 variant. The `authenticate` method takes a wallet address and runs the full SIWE flow.

### Auto-Authentication

When a wallet connects and the user hasn't rejected signing for that address, the context automatically calls `authenticate(address)` after a short delay to ensure the wallet connector is fully ready. This provides a seamless experience — connecting a wallet immediately triggers sign-in.

If the user rejects the signature, the address is tracked so auto-authentication won't trigger again until a different wallet is connected or the page is refreshed.

## JWT Token

The JWT token includes a `web3_wallet` field alongside the standard `userId`:

```json
{
  "type": "auth",
  "userId": 42,
  "web3_wallet": "0x1234...abcd",
  "iat": 1700000000,
  "exp": 1700086400,
  "jti": "unique-token-id"
}
```

The `validateToken` query also returns the `web3Wallet` field, which the frontend uses during session restoration to verify the saved wallet matches.

## ConnectWallet Component

The [`ConnectWallet`](https://github.com/QuickDapp/QuickDapp/blob/main/src/client/components/ConnectWallet.tsx) component uses RainbowKit's `ConnectButton.Custom` API to render wallet connection UI. It shows different states based on the connection and authentication status:

- **Disconnected** — A "Connect Wallet" button
- **Wrong network** — A warning with a chain switcher
- **Connected** — The wallet address and account details
- **Optional `showNetwork` prop** — Adds a chain selector button alongside the account

The component coordinates with `AuthContext` — connecting a wallet triggers SIWE authentication automatically.

## Account Linking

Users who authenticate with SIWE can also link email and OAuth accounts. The web3 wallet address is stored as an auth method in the `userAuth` table alongside any other linked methods. This means a user who initially signed in with their wallet can later add email authentication to the same account.

When authenticating with email or OAuth, the server checks if the user already has a web3 wallet linked and includes it in the JWT token, maintaining wallet context across auth methods.
