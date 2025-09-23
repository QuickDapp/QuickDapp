# Command Line

QuickDapp provides a comprehensive set of command-line tools built with TypeScript and Bun for development, testing, building, and deployment. All commands are accessible through `bun run` and provide consistent interfaces across different environments.

## Core Commands

### Development Commands

#### `bun run dev`
Starts the development server with hot reload for both frontend and backend:

```shell
bun run dev
```

This command:
* Starts the ElysiaJS server on port 3000
* Launches the Vite development server on port 5173 (proxied through main server)
* Initializes worker processes for background jobs
* Enables hot reload for both client and server code
* Sets up database connections and WebSocket support

#### `bun run dev --verbose`
Same as `dev` but with detailed startup logging:

```shell
bun run dev -v
# or
bun run dev --verbose
```

### Build Commands

#### `bun run build`
Builds the application for production:

```shell
bun run build
```

This creates:
* Optimized frontend bundle in `dist/client/`
* Server build with embedded static assets
* ABI files and contract artifacts
* Self-contained binary executables (built automatically)
Flags:
- --clean / --no-clean
- --bundle

Artifacts:
- dist/client/, dist/server/, dist/binaries/
- Server binary support files: dist/server/binary.js, dist/server/binary-assets.json


#### `bun run prod`
Runs the built application in production mode:

```shell
bun run prod

# Or run specific components
bun run prod server  # Server only
bun run prod client  # Client preview only
```


### Testing Commands

#### `bun run test`
Runs the complete test suite:

```shell
bun run test
```

Features:
* Sets up test database automatically
* Runs integration tests with server lifecycle management
* Database isolation between tests
* Comprehensive GraphQL and authentication testing

#### `bun run test --watch`
Runs tests in watch mode for development:

```shell
bun run test --watch
```

#### `bun run test --pattern <name>`
Runs specific test patterns:

```shell
bun run test --pattern auth
bun run test --pattern graphql
```
#### Other options
- -s, --serial: Run tests serially. Note: tests already run one-at-a-time; this flag is currently redundant.
- -v, --verbose: Verbose output.


### Code Quality Commands

#### `bun run lint`
Runs TypeScript checking and Biome linting:

```shell
bun run lint
```

#### `bun run lint:fix`
Fixes linting issues automatically:

```shell
bun run lint:fix
```

#### `bun run format`
Formats code using Biome:

```shell
bun run format
```

## Database Commands

All database commands use the `bun run db` script with subcommands:

#### `bun run db push`
Pushes schema changes directly to the database (development only):

```shell
bun run db push
# Force push (destructive)
bun run db push --force
```

#### `bun run db generate`
Generates migration files from schema changes:

```shell
bun run db generate
```

#### `bun run db migrate`
Runs pending migrations (production-safe):

```shell
bun run db migrate
```


## Environment-Specific Commands

Commands automatically detect and use the appropriate environment:

### Development Environment
```shell
NODE_ENV=development bun run dev
```

### Test Environment
```shell
NODE_ENV=test bun run test
```

### Production Environment
```shell
NODE_ENV=production bun run build
```

## Advanced Usage

### Custom Worker Count

Override the number of worker processes:

```shell
# Specific count
WORKER_COUNT=4 bun run dev
```
Note: WORKER_COUNT applies at runtime (dev/prod). It does not affect the build process.

### Debug Logging

Enable debug logging for troubleshooting:

```shell
LOG_LEVEL=debug WORKER_LOG_LEVEL=debug bun run dev
```

### Test Database Configuration

For testing with custom database settings:

```shell
# Create .env.test.local for temporary debug settings
echo "LOG_LEVEL=debug" > .env.test.local
echo "WORKER_LOG_LEVEL=debug" >> .env.test.local

bun run test

# Remove when done
rm .env.test.local
```

## Command Reference

| Command | Description | Environment |
|---------|-------------|-------------|
| `bun run dev` | Development server | Development |
| `bun run build` | Production build | Any |
| `bun run prod` | Production server | Production |
| `bun run test` | Test runner | Test |
| `bun run lint` | Type check + lint | Any |
| `bun run lint:fix` | Fix linting issues | Any |
| `bun run format` | Format code | Any |
| `bun run db push` | Push schema changes | Development |
| `bun run db generate` | Generate migrations | Any |
| `bun run db migrate` | Run migrations | Production |

## Script Architecture

All scripts use a shared bootstrap pattern for consistent environment loading:

```typescript
// Example script structure
import { bootstrap } from './shared/bootstrap.ts'

const { rootFolder, env, parsedEnv } = await bootstrap({
  env: process.env.NODE_ENV,
  verbose: process.argv.includes('--verbose')
})

// Script logic here...
```

## Error Handling

Scripts provide clear error messages and exit codes:

* **Exit code 0** - Success
* **Exit code 1** - General error
* **Exit code 2** - Configuration error

Common error scenarios:
* Missing environment variables
* Database connection failures
* Port conflicts during development
* Build failures

## Documentation Sections

* [Dev](./dev.md) - Development server configuration and usage  
* [Build](./build.md) - Production build and binary creation
* [Prod](./prod.md) - Production server and client preview
* [Database](./db.md) - Database management commands and migration tools
* [Test](./test.md) - Test runner with isolation and debugging features


## Smart Contract Development

Smart contracts are managed in the `sample-contracts/` directory using Foundry and Bun:

```shell
# Start local blockchain
cd sample-contracts && bun devnet.ts

# Deploy contracts
cd sample-contracts && bun deploy.ts
```

For detailed contract development workflow, see the [Getting Started Guide](../getting-started.md#step-4---local-smart-contract-development).

## Integration with IDE

For VS Code and other editors, you can create tasks for common commands:

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "dev",
      "type": "shell",
      "command": "bun",
      "args": ["run", "dev"],
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "shared"
      }
    },
    {
      "label": "test",
      "type": "shell",
      "command": "bun",
      "args": ["run", "test"],
      "group": "test"
    }
  ]
}
```

The command-line interface provides all the tools needed for efficient QuickDapp development, testing, and deployment workflows.
