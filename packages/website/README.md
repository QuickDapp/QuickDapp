# QuickDapp Website

Marketing website for QuickDapp at [quickdapp.xyz](https://quickdapp.xyz). Includes landing page, feature overview, versioned docs hosting, and live GitHub stats.

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

## Docker

Build and run locally:

```bash
bun run build
docker build -t quickdapp-website .
docker run -p 3000:3000 --env-file .env quickdapp-website
```

Images are automatically published to GitHub Container Registry on push to main.

## License

MIT — see [LICENSE.md](./LICENSE.md)
