# QuickDapp Base

A highly opinionated framework for building modern web applications.

## Features

- **Authentication**: Email/password + OAuth (Google, GitHub, etc.)
- **Database**: PostgreSQL with DrizzleORM
- **API**: GraphQL Yoga with schema-first approach
- **Frontend**: React 19 with TailwindCSS
- **Server**: ElysiaJS with Bun runtime
- **Background Jobs**: Built-in worker system

## Quick Start

```bash
# Terminal 1: Start PostgreSQL (keep running)
docker-compose up postgres

# Terminal 2: Run these commands
bun install
cp .env.example .env
bun run db push
bun run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run prod` | Run production server |
| `bun run test` | Run tests |
| `bun run gen` | Generate types and migrations |
| `bun run db push` | Push schema to database |
| `bun run lint` | Run linter |

## Documentation

See [quickdapp.xyz](https://quickdapp.xyz) for full documentation.

## License

MIT
