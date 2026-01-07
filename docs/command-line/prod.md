# Prod

The production command runs the built application. It requires `bun run build` first.

## Running

```shell
bun run prod              # Run server and client preview
bun run prod server       # Server only (port 3000)
bun run prod client       # Client preview only (port 4173)
```

The server serves both the API and static files on port 3000. The client preview on port 4173 is for testing the frontend build independently.

## Environment

Production mode uses `.env.production`:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:password@prod-host:5432/quickdapp
SESSION_ENCRYPTION_KEY=your_32_character_production_key
```

## Binary vs bun run prod

**`bun run prod`** runs the built JavaScript with Bun. Use this for local testing or when Bun is installed on the server.

**Binary deployment** uses self-contained executables with no dependencies:

```shell
./dist/binaries/quickdapp-linux-x64
```

For production servers, prefer the binary approach for simplicity and reliability.

## Testing Production

```shell
bun run build
NODE_ENV=production bun run prod

# Verify
curl http://localhost:3000/health
```
