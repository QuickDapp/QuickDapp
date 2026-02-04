---
order: 92
icon: Users
expanded: true
---

# Users

QuickDapp provides a simple user management system with flexible authentication. Users can sign in via email verification or OAuth providers. Each authentication method links to a single user record, allowing multiple sign-in options per account.

## User Model

The user system uses two tables: `users` for account records and `userAuth` for authentication methods.

The [`users`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/db/schema.ts) table stores minimal account data:

```typescript
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  disabled: boolean("disabled").default(false).notNull(),
  settings: json("settings"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
```

The [`userAuth`](https://github.com/QuickDapp/QuickDapp/blob/main/src/server/db/schema.ts) table links authentication methods to users:

```typescript
export const userAuth = pgTable("user_auth", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  authType: text("auth_type").notNull(),       // "email", "google", etc.
  authIdentifier: text("auth_identifier").unique().notNull(),  // email, provider ID, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
```

This separation allows a single user to have multiple authentication methods—for example, an email address and a Google account—all pointing to the same user record.

!!!
Variants can add additional authentication types. For example, the [Web3 variant](../variants/web3/authentication.md) adds wallet-based authentication via SIWE (Sign-In With Ethereum).
!!!

## Authentication Methods

QuickDapp supports two base authentication approaches:

**Email Verification** — Users receive a verification code via email. The code is encrypted into a stateless blob, avoiding database storage for pending verifications.

**OAuth** — Six providers are supported: Google, Facebook, GitHub, X (Twitter), TikTok, and LinkedIn. Each uses encrypted state for CSRF protection.

All methods result in a JWT token stored in the client and sent with subsequent API requests.

## User Lifecycle

Users are created automatically on first authentication. The flow:

1. User authenticates via their chosen method
2. Server looks up `userAuth` by auth identifier
3. If found, retrieve the linked user
4. If not found, create a new user and auth record
5. Return JWT token

This just-in-time creation means there's no separate registration step. Users exist as soon as they authenticate.

## Account Linking

A user can add additional authentication methods to their account. For example, someone who signed up with email can later add Google OAuth. The new auth record links to the existing user ID.

The unique constraint on `authIdentifier` prevents the same email or provider account from linking to multiple users.

## User Disabling

Set `users.disabled = true` to prevent a user from accessing protected operations. The GraphQL handler checks this flag and returns `ACCOUNT_DISABLED` errors for disabled users.

Disabling doesn't delete the user or their data—it only prevents new API access.

## User Settings

The `settings` JSON field stores user preferences. There's no fixed schema—store whatever your application needs:

```typescript
// Update user settings
await serverApp.db
  .update(users)
  .set({ settings: { theme: "dark", notifications: true } })
  .where(eq(users.id, userId))
```

## Documentation

- [Authentication](./authentication.md) — Detailed auth flows and frontend integration
- [Notifications](./notifications.md) — Real-time notification system
