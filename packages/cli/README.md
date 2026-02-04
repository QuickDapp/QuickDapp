# create-quickdapp

CLI tool to scaffold new [QuickDapp](https://quickdapp.xyz) projects.

QuickDapp is a production-ready full-stack TypeScript boilerplate — authentication, PostgreSQL database, GraphQL API, background workers, and a polished React frontend — so you can skip the setup and start building. Available as a base package or with Web3 integration (wallet auth, smart contracts, chain monitoring).

## Usage

```bash
# Using bunx (recommended)
bunx @quickdapp/cli create my-project

# Using npx
npx @quickdapp/cli create my-project

# 'create' is the default command, so this also works
bunx @quickdapp/cli my-project

# With Web3 variant
bunx @quickdapp/cli create my-project --variant web3
```

## Options

| Option | Description |
|--------|-------------|
| `-v, --variant <name>` | Project variant: `base` or `web3` (default: `base`) |
| `--skip-install` | Skip running `bun install` after scaffolding |
| `-r, --release <version>` | Use a specific release version |
| `--list-versions` | List available QuickDapp versions |
| `--version` | Show CLI version |
| `--help` | Show help |

## Prerequisites

- [Git](https://git-scm.com/)
- [Bun](https://bun.sh/)
- [Docker](https://docker.com/)

## Documentation

See the [CLI documentation](https://quickdapp.xyz/docs/getting-started) for a full getting started guide.

## License

MIT — see [LICENSE.md](./LICENSE.md)
