# create-quickdapp

CLI tool to scaffold new QuickDapp projects.

## Usage

```bash
# Using bunx (recommended)
bunx @quickdapp/cli create my-project

# Using npx
npx @quickdapp/cli create my-project

# The 'create' command is the default, so this also works:
bunx @quickdapp/cli my-project

# With variant selection
bunx @quickdapp/cli create my-project --variant web3   # Web3 variant
bunx @quickdapp/cli create my-project --variant base   # Base (default)
```

## Options

| Option | Description |
|--------|-------------|
| `-v, --variant <name>` | Choose package variant: `base` or `web3` (default: `base`) |
| `--skip-install` | Skip running `bun install` after scaffolding |
| `-r, --release <version>` | Use a specific release version |
| `--list-versions` | List available QuickDapp versions |
| `--help` | Show help |

## Prerequisites

- [Git](https://git-scm.com/)
- [Bun](https://bun.sh/) (v1.0.0 or higher)

## Documentation

See [quickdapp.xyz](https://quickdapp.xyz) for full documentation.

## License

MIT
