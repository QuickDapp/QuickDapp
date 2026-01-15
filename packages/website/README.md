# QuickDapp Website

[![Docker Build & Push](https://github.com/QuickDapp/website/actions/workflows/docker.yml/badge.svg?branch=main)](https://github.com/QuickDapp/website/actions/workflows/docker.yml)

https://quickdapp.xyz

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
