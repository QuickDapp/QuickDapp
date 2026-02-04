# QuickDapp

Production-ready boilerplate for vibe coders.

QuickDapp gives you a batteries-included full-stack TypeScript foundation — authentication, database, GraphQL API, background workers, and a polished React frontend — so you can skip the setup and start building. Available with or without Web3 integration.

## Getting Started

```bash
# Create a new project (recommended)
bunx @quickdapp/cli create my-project

# Or with Web3 support
bunx @quickdapp/cli create my-project --variant web3

# npx works too
npx @quickdapp/cli create my-project
```

Try the [live demo](https://demo.quickdapp.xyz) to see what you get out of the box.

## Packages

| Package | Description |
|---------|-------------|
| [packages/base](./packages/base) | Base boilerplate — full-stack TypeScript app with auth, database, workers, and GraphQL |
| [packages/variant-web3](./packages/variant-web3) | Web3 variant — adds wallet auth (SIWE), smart contracts, and chain monitoring |
| [packages/website](./packages/website) | Marketing website at [quickdapp.xyz](https://quickdapp.xyz) |
| [packages/cli](./packages/cli) | `create-quickdapp` CLI tool for scaffolding projects |
| [packages/docs](./packages/docs) | Documentation source for [docs.quickdapp.xyz](https://docs.quickdapp.xyz) |

Each boilerplate package (base, variant-web3, website) is a standalone codebase — not interdependent workspace packages. They can be developed, built, and deployed independently.

## Documentation

- [Full documentation](https://docs.quickdapp.xyz)
- [Website](https://quickdapp.xyz)
- [Live demo](https://demo.quickdapp.xyz)
- [LLM-friendly docs](https://quickdapp.xyz/llms.txt)
- [GitHub Discussions](https://github.com/QuickDapp/quickdapp/discussions)

## License

MIT — see [LICENSE.md](./LICENSE.md)
