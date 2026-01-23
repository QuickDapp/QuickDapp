# Base Package Wallet Cleanup Plan

## Overview

The base package was created as a Web2-only variant without blockchain functionality. However, some wallet-related code remains in the test files that needs to be cleaned up for consistency.

## Files Requiring Changes

### High Priority - Test Files Using Non-Existent Functions

1. **`packages/base/tests/server/auth/jwt.test.ts`**
   - Imports `generateTestWallet`, `createExpiredJWT`, `createMalformedJWT` with old signatures
   - Multiple references to `wallet.address` and `web3_wallet`
   - Tests JWT functionality with wallet addresses instead of email/userId
   - **Action**: Rewrite tests to use email-based JWT authentication

2. **`packages/base/tests/server/database/user-notification-integration.test.ts`**
   - Imports `generateTestWallet`, `getPredefinedTestWallet` from auth helpers
   - Creates users with `web3Wallet` field
   - Tests wallet address normalization
   - **Action**: Update to use email-based user creation

### Medium Priority - GraphQL Test Queries

3. **`packages/base/tests/server/graphql/email-auth.test.ts`**
   - Queries `web3Wallet` field in GraphQL responses (lines 125, 139, 155, 186, etc.)
   - **Action**: Remove `web3Wallet` from query selections

4. **`packages/base/tests/server/graphql/mutations.test.ts`**
   - References `testWallet` and creates JWT with wallet field
   - **Action**: Update to use userId-only JWT

5. **`packages/base/tests/server/graphql/queries.test.ts`**
   - Creates JWT with wallet address
   - **Action**: Update to use userId-only JWT

## Specific Code Changes

### jwt.test.ts - Full Rewrite Needed

Current code pattern (broken):
```typescript
const wallet = generateTestWallet()
const token = await createTestJWT(wallet.address)
expect(payload.web3_wallet).toBe(wallet.address.toLowerCase())
```

New pattern:
```typescript
const token = await createTestJWT({ userId: 123 })
expect(payload.userId).toBe(123)
```

### user-notification-integration.test.ts - Update User Creation

Current code pattern (broken):
```typescript
const wallet = generateTestWallet()
await createTestUser({ web3Wallet: wallet.address.toLowerCase() })
```

New pattern:
```typescript
const user = await createAuthenticatedTestUser({ serverApp })
```

### GraphQL Tests - Remove web3Wallet Queries

Current:
```graphql
validateToken { valid web3Wallet }
authenticateWithEmail { token web3Wallet }
```

New:
```graphql
validateToken { valid }
authenticateWithEmail { token }
```

## GraphQL Schema Consideration

Also verify that the base package GraphQL schema does NOT include:
- `web3Wallet` field on `ValidateTokenResult`
- `web3Wallet` field on `AuthenticationResult`
- `generateSiweMessage` mutation
- `authenticateWithSiwe` mutation

## Testing After Changes

After making these changes:
1. Run `bun run test` in `packages/base/`
2. Verify no TypeScript errors: `bun run lint`
3. Verify no references remain: `grep -r "wallet\|Wallet" packages/base/tests/`

## Estimated Scope

- ~500 lines of test code to update
- 5 test files affected
- Possible GraphQL schema changes (check schema.ts)
