# QuickDapp

Production-ready boilerplate for vibe coders.

QuickDapp gives you a batteries-included full-stack TypeScript foundation — authentication, database, GraphQL API, background workers, and a polished React frontend — so you can skip the setup and start building.

## Features

**Backend:** TypeScript, Bun, ElysiaJS, PostgreSQL + Drizzle ORM, GraphQL Yoga, WebSockets
**Frontend:** React 19, TailwindCSS, Radix UI, React Query, dark/light theme
**Auth:** Email/password, OAuth (Google, GitHub, etc.)
**Infrastructure:** Background workers with cron, Docker deployment, single-executable binary builds

## Getting Started

### CLI (recommended)

```bash
bunx @quickdapp/cli create my-project

# npx works too
npx @quickdapp/cli create my-project
```

### Manual setup

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

- [Full documentation](https://quickdapp.xyz/docs)
- [Website](https://quickdapp.xyz)

### LLM-Friendly Docs

Machine-readable documentation is available at [quickdapp.xyz/llms.txt](https://quickdapp.xyz/llms.txt).

## License

MIT — see [LICENSE.md](./LICENSE.md)
