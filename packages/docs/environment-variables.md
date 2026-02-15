---
order: 96
icon: Settings
---

# Environment Variables

QuickDapp uses environment variables for configuration, loaded from `.env` files in the project folder.

## Layered loading

The environment variable loading system uses a layered mechanism, allow for per-environment variable overrides:

1. **The `.env` file is loaded first.**
    * This file is checked into version control and usually contains defaults for environment variables that are suitable for use in a local development environment.
1. **Environment-specific overrides (`.env.development`, `.env.test`, `.env.production`) are then loaded, overwriting previously loaded values.**
    * The specific file loaded depends on the value of the `NODE_ENV` environment variable. For example, if `NODE_ENV=production` in the shell environment then `.env.production` will be loaded.
    * These files **should NOT** be checked into version control as they will probably contain sensitive information such as API keys.
1. **Environment-specific local overrides (`.env.development.local`, `.env.test.local`, `.env.production.local`) are then loaded, overwriting previously loaded values.**
    * The specific file loaded depends on the value of the `NODE_ENV` environment variable. For example, if `NODE_ENV=production` in the shell environment then `.env.production` will be loaded.
    * These files are useful if, for example, you need to temporarily override a value without modifying for your environment-specific variable files.
    * These files **should NOT** be checked into version control as they will probably contain sensitive information such as API keys.
1. **The `.env.local` file will be loaded to allow for even further customization of values.**
    * This file **should NOT** be checked into version control either.
1. **Finally, `process.env` values are checked to see if there are any runtime overrides to apply.**
    * Thus `process.env` values are the final values.

## Client vs server

There are two types of environment variables: _client-side_ and _server-side_.

These are defined in [src/shared/config/client.ts](https://github.com/QuickDapp/QuickDapp/blob/main/packages/base/src/shared/config/client.ts) and [src/shared/config/server.ts](https://github.com/QuickDapp/QuickDapp/blob/main/packages/base/src/shared/config/server.ts) respectively.

**NOTE: Server-side environment variables are only accessible in backend code. client-side variables are accessible in both front- and backend code.**

The above rule will thus dictate where you add a new envirinment variable. For example, if it's an API key that should not be exposed to browsers then it should go into `server.ts`, otherwise it can go into `client.ts.`.

## Client-side variables

These variables are accessible in both frontend and backend code via `clientConfig`.

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APP_NAME` | Display name of the application. | `QuickDapp` | No |
| `NODE_ENV` | Runtime environment. | `development` | No |
| `CLIENT_API_BASE_URL` | Base URL for client API requests. Falls back to `window.location.origin` in the browser. | — | No |
| `SENTRY_DSN` | Sentry DSN for client-side error tracking. | — | No |
| `SENTRY_TRACES_SAMPLE_RATE` | Fraction of transactions to trace (0.0 to 1.0). | `1.0` | No |
| `SENTRY_REPLAY_SESSION_SAMPLE_RATE` | Fraction of sessions to record with Sentry Replay (0.0 to 1.0). | `1.0` | No |

`APP_VERSION` is also available on `clientConfig` but is automatically derived from `package.json` and is not configurable via environment variables.

## Server-side variables

These variables are only accessible in backend code via `serverConfig`. They extend the client-side variables.

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `BASE_URL` | Base URL of the application. | — | Yes |
| `DATABASE_URL` | PostgreSQL connection string. | — | Yes |
| `SESSION_ENCRYPTION_KEY` | Secret key for JWT signing and OAuth state encryption. Must be at least 32 characters. | — | Yes |
| `WEB_ENABLED` | Enable the web server. Set to `false` for worker-only processes. | `true` | No |
| `HOST` | Server bind address. Use `0.0.0.0` in containers. | `localhost` | No |
| `PORT` | Server port number. | `3000` | No |
| `WORKER_COUNT` | Number of worker processes. Set to `cpus` to match CPU cores. | `1` | No |
| `WORKER_ID` | Identifier for the current worker process. | — | No |
| `STATIC_ASSETS_FOLDER` | Custom path for static assets. | — | No |
| `LOG_LEVEL` | Logging verbosity: `trace`, `debug`, `info`, `warn`, `error`. | `info` | No |
| `WORKER_LOG_LEVEL` | Log level for worker processes. | `info` | No |
| `OAUTH_GOOGLE_CLIENT_ID` | Google OAuth client ID. | — | No |
| `OAUTH_GOOGLE_CLIENT_SECRET` | Google OAuth client secret. | — | No |
| `OAUTH_FACEBOOK_CLIENT_ID` | Facebook OAuth app ID. | — | No |
| `OAUTH_FACEBOOK_CLIENT_SECRET` | Facebook OAuth app secret. | — | No |
| `OAUTH_GITHUB_CLIENT_ID` | GitHub OAuth app client ID. | — | No |
| `OAUTH_GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret. | — | No |
| `OAUTH_X_CLIENT_ID` | X (Twitter) OAuth client ID. | — | No |
| `OAUTH_X_CLIENT_SECRET` | X (Twitter) OAuth client secret. | — | No |
| `OAUTH_TIKTOK_CLIENT_KEY` | TikTok OAuth client key. | — | No |
| `OAUTH_TIKTOK_CLIENT_SECRET` | TikTok OAuth client secret. | — | No |
| `OAUTH_LINKEDIN_CLIENT_ID` | LinkedIn OAuth client ID. | — | No |
| `OAUTH_LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth client secret. | — | No |
| `OAUTH_CALLBACK_BASE_URL` | Base URL for OAuth callbacks. | — | No |
| `SOCKET_MAX_CONNECTIONS_PER_USER` | Maximum concurrent WebSocket connections per user. | `5` | No |
| `SOCKET_MAX_TOTAL_CONNECTIONS` | Global limit for all WebSocket connections. | `10000` | No |
| `MAILGUN_API_KEY` | Mailgun API key for sending emails. | — | No |
| `MAILGUN_API_ENDPOINT` | Mailgun API endpoint. Set for EU region. | — | No |
| `MAILGUN_FROM_ADDRESS` | Sender email address. Domain is extracted automatically. | — | No |
| `MAILGUN_REPLY_TO` | Reply-To email address for outgoing emails. | — | No |
| `SENTRY_WORKER_DSN` | Sentry DSN for worker processes. | — | No |
| `SENTRY_PROFILE_SESSION_SAMPLE_RATE` | Fraction of sessions to profile (0.0 to 1.0). | `1.0` | No |


