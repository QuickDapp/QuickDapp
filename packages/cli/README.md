# create-quickdapp

CLI tool to scaffold new QuickDapp projects.

## Usage

```bash
# Using bunx (recommended)
bunx create-quickdapp my-project

# Using npx
npx create-quickdapp my-project

# With variant selection
bunx create-quickdapp my-project --variant base   # Base package (no Web3)
bunx create-quickdapp my-project --variant web3   # Web3 variant (default)
```

## Options

| Option | Description |
|--------|-------------|
| `--variant <name>` | Choose package variant: `base` or `web3` (default: `web3`) |
| `--skip-install` | Skip running `bun install` after scaffolding |
| `--help` | Show help |

## Prerequisites

- [Git](https://git-scm.com/)
- [Bun](https://bun.sh/) (v1.0.0 or higher)

## Documentation

See [quickdapp.xyz](https://quickdapp.xyz) for full documentation.

## License

MIT
