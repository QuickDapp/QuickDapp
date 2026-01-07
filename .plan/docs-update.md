# Documentation Rewrite Plan

## Goal
Rewrite all docs/ files to use plain English with good flow. Less code blocks, more readable prose that emphasizes key points without being exhaustive.

## Writing Principles
1. **VERIFY AGAINST CODEBASE FIRST** - Read actual source files before writing documentation. Never assume or hallucinate.
2. Lead with concepts in plain English, code follows only when essential
3. Write complete sentences and short paragraphs (2-4 sentences max)
4. Explain the "why" before the "how"
5. One good code example beats three similar ones
6. Copy interfaces/types directly from source files to ensure accuracy
7. Link to source files for full implementations rather than duplicating them
8. Keep code blocks under 30 lines, preferring 10-20 lines
9. **Use markdown code formatting** for file names, function names, class names, and component names - link these to the actual files in the repo using `https://github.com/QuickDapp/QuickDapp/blob/main/` as the base URL

---

## Progress Tracking

### ✅ COMPLETED

#### Sample + Approval
- [x] `docs/frontend/global.md` - Rewritten as sample (607→139 lines)
- [x] User approved the new style

#### Batch 1: Entry Points (light touch - already good)
- [x] `docs/index.md` - Reviewed, already readable
- [x] `docs/getting-started.md` - Reviewed, already good
- [x] `docs/architecture-layout.md` - Reviewed, already good

#### Batch 2: Backend Docs
- [x] `docs/backend/index.md` - Rewritten (180→65 lines)
- [x] `docs/backend/database.md` - Rewritten (459→133 lines)
- [x] `docs/backend/bootstrap.md` - Rewritten (264→119 lines)
- [x] `docs/backend/graphql.md` - Rewritten (139→79 lines)
- [x] `docs/backend/authentication.md` - Rewritten (79→66 lines)
- [x] `docs/backend/websockets.md` - Rewritten (35→57 lines, added more context)

### ✅ COMPLETED

#### Batch 3: Frontend Docs (6 files)
- [x] `docs/frontend/global.md` - Done (607→129 lines)
- [x] `docs/frontend/index.md` - Done (342→78 lines)
- [x] `docs/frontend/components.md` - Done (315→73 lines)
- [x] `docs/frontend/forms.md` - Done (345→123 lines)
- [x] `docs/frontend/graphql.md` - Done (55→32 lines)
- [x] `docs/frontend/web3.md` - Done (617→76 lines)

All docs updated with code formatting and repo links per writing principle #9.

#### Batch 4: Worker & Users Docs (5 files)
- [x] `docs/worker/index.md` - Done (106→57 lines)
- [x] `docs/worker/adding-jobs.md` - Done (172→98 lines)
- [x] `docs/worker/background-jobs.md` - Done (204→82 lines)
- [x] `docs/users/index.md` - Done (454→99 lines)
- [x] `docs/users/authentication.md` - Done (633→119 lines)

#### Batch 5: Deployment & CLI Docs (9 files)
- [x] `docs/deployment/index.md` - Done (279→63 lines)
- [x] `docs/deployment/binary.md` - Done (228→76 lines)
- [x] `docs/deployment/docker.md` - Done (130→69 lines)
- [x] `docs/command-line/index.md` - Done (323→92 lines)
- [x] `docs/command-line/dev.md` - Done (387→96 lines)
- [x] `docs/command-line/build.md` - Done (409→71 lines)
- [x] `docs/command-line/prod.md` - Done (193→46 lines)
- [x] `docs/command-line/db.md` - Done (307→96 lines)
- [x] `docs/command-line/test.md` - Done (410→84 lines)

#### Batch 6: Reference Docs (2 files)
- [x] `docs/environment-variables.md` - Done (72→105 lines, more complete)
- [x] `docs/smart-contracts/index.md` - Done (274→119 lines)

---

## ✅ DOCUMENTATION REWRITE COMPLETE

All 31 documentation files have been rewritten with:
- Prose-first approach with minimal code blocks
- Code formatting and repo links for file/function/class/component names
- Verified accuracy against actual source code
- Consistent style across all docs

---

## Codebase Reference (Verified Facts)

### Directory Structure
```
src/
├── server/           # Backend
│   ├── auth/         # SIWE, email, OAuth authentication
│   ├── bootstrap.ts  # ServerApp creation
│   ├── db/           # Schema, queries, connection
│   ├── graphql/      # Resolvers
│   ├── lib/          # Logger, errors, crypto
│   ├── start-server.ts
│   ├── start-worker.ts
│   ├── types.ts      # ServerApp type
│   ├── workers/      # Background jobs
│   └── ws/           # WebSocket
├── client/           # Frontend
│   ├── App.tsx
│   ├── components/   # Button, Dialog, Form, Toast, Header, etc.
│   ├── contexts/     # AuthContext, SocketContext, CookieConsentContext
│   ├── hooks/        # useForm, useTokens, useTokenActions, useNotifications
│   ├── lib/          # socket.ts
│   ├── config/       # web3.ts
│   └── styles/       # globals.css (Tailwind v4)
└── shared/
    ├── config/       # client.ts, server.ts
    ├── graphql/      # schema.ts, queries.ts, mutations.ts, client.ts
    └── websocket/    # types.ts
```

### ServerApp Type (from src/server/types.ts)
```typescript
type ServerApp = {
  app: Elysia
  db: Database
  rootLogger: Logger
  createLogger: (category: string) => Logger
  startSpan: typeof startSpan
  workerManager: WorkerManager
  socketManager: ISocketManager
  publicClient?: PublicClient    // Web3 only
  walletClient?: WalletClient    // Web3 only
  createNotification: (userId: number, data: NotificationData) => Promise<void>
}
```

### Database Schema (from src/server/db/schema.ts)
Tables:
- `users` (id, disabled, settings, createdAt, updatedAt) - NO wallet field
- `userAuth` (id, userId, authType, authIdentifier, createdAt, updatedAt) - links auth methods to users
- `notifications` (id, userId, data, read, createdAt, updatedAt)
- `workerJobs` (id, tag, type, userId, data, due, started, finished, removeAt, success, result, cronSchedule, autoRescheduleOnFailure, autoRescheduleOnFailureDelay, removeDelay, rescheduledFromJob, persistent, createdAt, updatedAt)
- `settings` (id, key, value, createdAt, updatedAt)

### Frontend Contexts (from src/client/contexts/)
- `AuthContext.tsx` - State machine with SIWE/non-Web3 auth, useAuthContext()
- `SocketContext.tsx` - WebSocket management, useSocket()
- `CookieConsentContext.tsx` - Cookie consent, useCookieConsent()
- `Toast.tsx` (in components/) - Toast notifications, useToast()

### Frontend Hooks (from src/client/hooks/)
- `useForm.ts` - Custom form validation (useField, useForm) - NOT react-hook-form
- `useTokens.ts` - useMyTokens, useTokenInfo, useTokenCount
- `useTokenActions.ts` - useCreateToken, useTransferToken
- `useNotifications.ts` - WebSocket notification subscription

### Worker Jobs (from src/server/workers/jobs/)
Built-in job types:
- `removeOldWorkerJobs` - Cleanup old jobs (hourly cron)
- `watchChain` - Monitor blockchain logs (every 3 seconds, Web3 only)
- `deployMulticall3` - Deploy Multicall3 contract (startup, Web3 only)

### CLI Commands (from scripts/)
- `dev.ts` - Development server with hot reload
- `build.ts` - Production build with binary generation
- `prod.ts` - Run production server
- `test.ts` - Run tests with isolation
- `gen.ts` - Generate types (GraphQL, ABI) and migrations
- `db.ts` - Database commands (generate, migrate, push)

### Authentication Methods
1. SIWE (Sign-In With Ethereum) - Web3 wallet signing
2. Email verification - Codes sent via email
3. OAuth - Google, Facebook, GitHub, X, TikTok, LinkedIn

### Key Patterns
- Stateless JWT authentication (no session table)
- SERIALIZABLE transaction isolation with auto-retry
- No FOR UPDATE row locking
- No GraphQL field resolvers (all data via joins)
- Workers as child processes with IPC communication
- Database polling for job queue (1-second cycle)

---

## How to Resume

1. Read this plan file
2. Check the Progress Tracking section for what's done/pending
3. For each file to rewrite:
   a. Read the current doc file
   b. Read the relevant source files to verify accuracy
   c. Rewrite with prose-first approach, minimal code
   d. Mark as complete in this plan

**IMPORTANT: Keep this plan file updated as progress is made.**

## Sample Transformation

**Before (code-heavy):**
```markdown
### AuthContext Implementation
Manages user authentication state:
[140 lines of TypeScript]
```

**After (prose-first):**
```markdown
### How Authentication Works
The AuthContext tracks three things: the current user, their auth token, and wallet connection status. When someone connects their wallet and signs in, the context coordinates with the backend to verify the signature, stores the JWT, and keeps user data available throughout the app.

If the wallet disconnects, the user is automatically signed out. If they reconnect, the context attempts to restore the previous session.

See `src/client/contexts/AuthContext.tsx` for the full implementation.
```
