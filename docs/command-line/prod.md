---
order: 70
---

# prod

The production command requires that you've already built the application with `bun run build`. It runs the optimized production code without file watching or development features.

Usage:

```shell
bun run prod
```

This starts:
- **Production server** on http://localhost:3000 (serves API and static files from `./dist/server`)
- **Client frontend server** on http://localhost:4173 (served from `./dist/client`)

* `bun run prod server` - run only the server
* `bun run prod client` - run only the client 

## Environment Configuration

The command set `NODE_ENV` to `production` and thus loads in the production environment variables from `.env.production`.

