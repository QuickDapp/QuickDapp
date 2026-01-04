# Web3-Optional Mode Implementation Plan

## Overview

Make QuickDapp capable of running as a traditional web app (non-web3) or a web3 dapp. Add OAuth authentication alongside existing email and SIWE auth.

## Progress Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Constants & Config (WEB3_ prefix, WEB3_ENABLED) | ✅ Complete |
| 2 | Database Schema (remove wallet column) | ✅ Complete |
| 3 | User Data Layer (wallet-free functions) | ✅ Complete |
| 4 | Auth Service (JWT, AuthenticatedUser) | ✅ Complete |
| 5 | OAuth Implementation (Arctic, REST callbacks) | ⏳ Pending |
| 6 | GraphQL Changes (schema, resolvers) | ✅ Complete |
| 7 | Server Bootstrap (conditional blockchain clients) | ✅ Complete |
| 8 | Worker Changes (conditional job scheduling) | ✅ Complete |
| 9 | Update All Wallet References | ✅ Complete |
| 10 | Update Tests | ✅ Complete |

**Current Step:** ✅ All 20 test files passing - ready for OAuth implementation (Phase 5)

---

## Phase 1: Constants & Config Changes ✅

### Changes Made

**`src/shared/constants.ts`:**
- Renamed `WALLET` to `WEB3_WALLET` in `AUTH_METHOD`
- Added `GOOGLE` and `GITHUB` auth methods
- Removed `WEB2_WALLET_PREFIX`

**`src/shared/config/client.ts`:**
- Added `WEB3_ENABLED` flag (boolean, default: true)
- Renamed: `WALLETCONNECT_PROJECT_ID` → `WEB3_WALLETCONNECT_PROJECT_ID`
- Renamed: `FACTORY_CONTRACT_ADDRESS` → `WEB3_FACTORY_CONTRACT_ADDRESS`
- Renamed: `SUPPORTED_CHAINS` → `WEB3_SUPPORTED_CHAINS`
- Made web3 fields optional (only required when `WEB3_ENABLED=true`)

**`src/shared/config/server.ts`:**
- Renamed: `SERVER_WALLET_PRIVATE_KEY` → `WEB3_SERVER_WALLET_PRIVATE_KEY`
- Renamed: `ALLOWED_SIWE_ORIGINS` → `WEB3_ALLOWED_SIWE_ORIGINS`
- Renamed: `SERVER_ANVIL_CHAIN_RPC` → `WEB3_ANVIL_RPC`
- Renamed: `SERVER_*_CHAIN_RPC` → `WEB3_*_RPC`
- Added OAuth config fields (optional)

**`.env` and `.env.test`:**
- Updated all env vars with `WEB3_` prefix
- Grouped web3 vars together in dedicated section

---

## Phase 2: Database Schema Changes ✅

### Changes Made

**`src/server/db/schema.ts`:**
- Removed `wallet` column from `users` table
- Wallet addresses now stored in `userAuth` table with `authType="WEB3_WALLET"`

**Users table (after):**
```typescript
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  disabled: boolean("disabled").default(false).notNull(),
  settings: json("settings"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
```

**userAuth table (unchanged):**
- `userId` → references users.id
- `authType` → "WEB3_WALLET", "EMAIL", "GOOGLE", "GITHUB"
- `authIdentifier` → wallet address, email, or OAuth ID

---

## Phase 3: User Data Layer Refactor ✅

### Changes Made

**`src/server/db/users.ts`:**

Removed:
- `getUser(wallet)` - no longer used
- `createUserIfNotExists(wallet)` - replaced

Added/Updated:
- `createWeb3WalletUserIfNotExists(db, walletAddress)` - creates user with WEB3_WALLET auth
- `createEmailUserIfNotExists(db, email)` - creates user with EMAIL auth (no synthetic wallet)
- `createOAuthUserIfNotExists(db, provider, email, providerUserId)` - for OAuth users
- `getUserByAuthIdentifier(db, authType, identifier)` - lookup user by auth method
- `getUserWeb3Wallet(db, userId)` - get user's web3 wallet if they have one
- `getUserById(db, userId)` - get user by ID
- `updateUserSettings(db, userId, settings)` - update by userId instead of wallet

---

## Phase 4: Auth Service Refactor ✅

### Changes Made

**`src/server/auth/index.ts`:**

`AuthenticatedUser` interface:
```typescript
// BEFORE
export interface AuthenticatedUser {
  id: number
  wallet: string
}

// AFTER
export interface AuthenticatedUser {
  id: number
  web3Wallet?: string  // Optional - only set for WEB3_WALLET users
}
```

JWT Token:
- Changed `wallet` key to `web3_wallet` (optional field)
- Only includes `web3_wallet` if user has WEB3_WALLET auth

Token Verification:
- Only requires `userId` in payload
- `web3_wallet` is optional

Auth Methods:
- `authenticateWithSiwe()` - checks `WEB3_ENABLED`, uses `createWeb3WalletUserIfNotExists`
- `authenticateWithEmail()` - uses updated `createEmailUserIfNotExists`
- `authenticateWithOAuth()` - added for OAuth flow (placeholder)

---

## Phase 5: OAuth Implementation ⏳

### TODO

**Create `src/server/auth/oauth.ts`:**
```typescript
import { Google, GitHub } from "arctic"

export function createGoogleClient() { ... }
export function createGitHubClient() { ... }
export function getOAuthAuthorizationUrl(provider: string): { url: string; state: string; codeVerifier?: string }
export function exchangeOAuthCode(provider: string, code: string, codeVerifier?: string): Promise<{ accessToken: string }>
export function fetchOAuthUserInfo(provider: string, accessToken: string): Promise<{ email: string; id: string }>
```

**Create REST Callback Routes (`src/server/routes/auth.ts`):**
```
GET /auth/callback/google
GET /auth/callback/github
```

Each callback:
1. Validates state parameter (CSRF protection)
2. Exchanges code for access token
3. Fetches user info from provider
4. Creates/links user account via `createOAuthUserIfNotExists`
5. Sets JWT in httpOnly cookie
6. Redirects to app

**Add GraphQL Mutation:**
```graphql
getOAuthLoginUrl(provider: String!): OAuthUrlResult!
```

**Dependencies:**
```bash
bun add arctic
```

---

## Phase 6: GraphQL Changes ✅

### Changes Made

**`src/shared/graphql/schema.ts`:**
- Changed `wallet` to `web3Wallet` in `AuthResult` type
- Changed `wallet` to `web3Wallet` in `ValidateTokenResult` type

**`src/shared/graphql/queries.ts`:**
- Updated `VALIDATE_TOKEN` query to use `web3Wallet`

**`src/shared/graphql/mutations.ts`:**
- Updated `AUTHENTICATE_WITH_SIWE` to use `web3Wallet`
- Updated `AUTHENTICATE_WITH_EMAIL` to use `web3Wallet`

**`src/server/graphql/resolvers.ts`:**
- Updated all resolvers to return `web3Wallet` instead of `wallet`
- `generateSiweMessage` checks `WEB3_ENABLED` flag

---

## Phase 7: Server Bootstrap ✅

### Changes Made

**`src/server/types.ts`:**
```typescript
export type ServerApp = {
  // ...
  publicClient?: PublicClient   // Optional
  walletClient?: WalletClient   // Optional
}
```

**`src/server/bootstrap.ts`:**
- Conditionally creates blockchain clients based on `WEB3_ENABLED`
- Only initializes viem clients when web3 is enabled

---

## Phase 8: Worker Changes ✅

### Changes Made

**`src/server/workers/index.ts`:**
- `deployMulticall3` job only scheduled when `WEB3_ENABLED=true`

**`src/server/workers/worker.ts`:**
- `watchChain` cron only scheduled when `WEB3_ENABLED=true`

---

## Phase 9: Update All Wallet References ✅

### Files Updated

| File | Changes |
|------|---------|
| `src/server/lib/sentry.ts` | `wallet` → `web3Wallet` (optional) |
| `src/server/ws/index.ts` | Updated logging to use `web3Wallet` |
| `src/server/graphql/index.ts` | Updated user logging |
| `src/server/workers/chainFilters/createToken.ts` | Uses `getUserByAuthIdentifier` |
| `src/server/workers/chainFilters/sendToken.ts` | Uses `getUserByAuthIdentifier` |
| `src/server/services/tokens.ts` | Uses `WEB3_FACTORY_CONTRACT_ADDRESS` |
| `src/client/contexts/AuthContext.tsx` | `wallet` → `web3Wallet` throughout |
| `src/client/config/web3.ts` | Uses `WEB3_WALLETCONNECT_PROJECT_ID` |
| `src/shared/contracts/index.ts` | Uses `WEB3_FACTORY_CONTRACT_ADDRESS` |
| `src/shared/contracts/chain.ts` | Uses `WEB3_SUPPORTED_CHAINS` |

---

## Phase 10: Update Tests ✅

### Test Helpers Updated

| File | Changes |
|------|---------|
| `tests/helpers/auth.ts` | Updated `createTestJWT` to use `web3_wallet`, fixed imports |
| `tests/helpers/database.ts` | `createTestUser` uses `web3Wallet` parameter |
| `tests/helpers/blockchain.ts` | Uses `WEB3_ANVIL_RPC` |

### Test Files Updated

| File | Changes |
|------|---------|
| `tests/shared/config/server-config.test.ts` | Updated env var names (`WEB3_SUPPORTED_CHAINS`, etc.), error message format |
| `tests/server/graphql/auth.test.ts` | `wallet` → `web3Wallet` in queries, added `userId` to JWT |
| `tests/server/graphql/auth-directive.test.ts` | `wallet` → `web3Wallet` in validateToken query |
| `tests/server/graphql/email-auth.test.ts` | `wallet` → `web3Wallet`, email users return `web3Wallet: null`, disabled user lookup via `userAuth` table |
| `tests/server/auth/jwt.test.ts` | `payload.wallet` → `payload.web3_wallet`, updated tests for optional wallet field |
| `tests/server/auth/siwe.test.ts` | Uses `createWeb3WalletUserIfNotExists`, `web3Wallet` |
| `tests/server/database/user-notification-integration.test.ts` | Uses `web3Wallet` |
| `tests/server/workers/blockchain.test.ts` | Uses `createTestUser({ web3Wallet })` |

### Test Results

All 20 test files passing:
- `tests/shared/contracts/chain.test.ts` ✅
- `tests/shared/config/server-config.test.ts` ✅
- `tests/server/server.test.ts` ✅
- `tests/server/workers/*.test.ts` (6 files) ✅
- `tests/server/db/transaction-retry.test.ts` ✅
- `tests/server/graphql/*.test.ts` (5 files) ✅
- `tests/server/auth/*.test.ts` (2 files) ✅
- `tests/server/websocket/connection-limits.test.ts` ✅
- `tests/server/database/user-notification-integration.test.ts` ✅

---

## Key Breaking Changes

1. **Environment Variables:** All web3 vars require `WEB3_` prefix
2. **Database:** `wallet` column removed from `users` table
3. **JWT:** `wallet` renamed to `web3_wallet` (optional field)
4. **GraphQL:** `wallet` field renamed to `web3Wallet`
5. **Existing JWTs:** Will be invalid - users must re-authenticate

---

## Next Steps

1. ~~**Run tests** to verify all changes work correctly~~ ✅ Done - all 20 test files passing
2. **Implement Phase 5** (OAuth with Arctic library)
   - Install `arctic` package
   - Create `src/server/auth/oauth.ts`
   - Create REST callback routes
   - Add GraphQL mutation for OAuth login URL
3. **Create database migration** for production environments
