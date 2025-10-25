---
order: 97
---

# Environment variables

Environment variables are the primary means through which to pass configuration to your app at both build-time and runtime. 

The [dotenv](https://www.npmjs.com/package/dotenv) loads environment varibles from various `.env*` files in the project root folder whilst still allowing for overrides specified directly via the shell/terminal environment itself.

Environment variables are loaded in the following order, with later places taking precendence over earlier ones:

1. `.env`
2. `.env.development` or `.env.production` or `.env.test`, depending on the value of the `NODE_ENV` environment variable.
3. `.env.local` - only loaded in development mode.
4. `process.env` - values set at runtime via the shell environment

What this means is that if the same environment variable is declared in multiple places then its final value during runtime is determined by the above order.

Some key points to note:

* The `.env` file is **required.** This file should contain any values which are unlikely to change across environments. It gets bundled into production and Docker builds and will be checked into source control. 
* The `.env.development` and `.env.production` files are already _git-ignored_ and should **never** be checked into source control since they are intended to contain sensitive information (e.g API keys).
  * The `.env.development` file gets loaded when the `NODE_ENV` shell environment variable = `development`, which is the default fallback value assumed if none set.
  * The `.env.production` file gets loaded when when the `NODE_ENV` shell environment variable = `production`, which is the value set by the QuickDapp build script.
* The `.env.local` file is for further customization during development (i.e. when `NODE_ENV` = `development`), e.g if you are temporarily testing a value different to the default. It also does not get checked into version control.

!!!
**DO NOT** store sensitive information (e.g API keys) in the core `.env` file. Use the environment-specific or `.env.local` files to store such information.
!!!

The files use the INI file format:

```ini
# a comment
SERVER_WALLET_PRIVATE_KEY=0x...
# quotes are allowed
APP_NAME="quickest dapp"

# another comment after some space
BASE_URL=http://localhost:3000
```

**Example**

Let's assume that:

* `.env` contains `APP_NAME=root`
* `.env.development` contains `APP_NAME=dev`
* `.env.production` contains `APP_NAME=prod`
* `.env.local` contains `APP_NAME=local`

When the dev server is run, at runtime the `process.env.APP_NAME` value will equal `local`. If we delete the `.env.local` file and restart the server then the runtime value will be `dev`.

If we restore the `.env.local` file but this time run the production server then the runtime value will be `prod`. 

## Client-side vs Server-side

There are two types of environment variables: _client-side_ and _server-side_.

_Client-side_ environment variables are made available client-side in the browser. Since these variables are accessible browser-side they must **not** hold sensitive passwords, API keys or any other information that browser clients are not meant to see. 

_Server-side_ environment variables are **only** available server-side and are **never** sent to the browser. Thus these variables can hold sensitive passwords, API keys and other information that browser clients are not meant to see.

_Note: All client-side environment variables are automatically available to server-side code._

## Overriding at runtime

Environment variables can be overridden at runtime by setting them in the shell/environment prior to starting the app. For example:

```
LOG_LEVEL=warning pnpm prod
```

## Programmatic access

The `src/config/**` modules are responsible for loading, parsing and ensuring the right syntax for each of the various environment variables. It is recommended that your code access environment variables through this rather than accessing `process.env` directly. 

### Client-side

```typescript
import { clientConfig } from '@shared/config/client'

console.log(clientConfig.BASE_URL) 
```

### Server-side

```typescript
import { serverConfig } from '@shared/config/server'

console.log(serverConfig.APP_NAME) 
```


## Adding your own variables

To add your own custom environment variable:

1. Add your variable to either `src/config/client.ts` or `src/config/server.ts` depending on whether it is a client-side or server-side variable. Follow the conventions used for existing environment variables.
1. Add a default value for your variable to the `.env` file, again following the conventions shown in the file for other variables. If your variable does not have a default value then set its value inside `.env` to the empty string (`""`).
1. Optionally add a value override for your variable to either or both of `.env.development` and `.env.production`.

