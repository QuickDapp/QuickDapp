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
# Install dependencies
bun install

# Set up environment
cp .env.example .env

# Start PostgreSQL
docker-compose up -d postgres

# Push database schema
bun run db push

# Start development server
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
