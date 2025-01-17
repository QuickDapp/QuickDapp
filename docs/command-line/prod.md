---
order: 70
---

# prod

The `prod` command is responsible for:

* Running the Next.js production server.
* Running the [background worker](../worker/index.md) production server.
* Running production database management commands.

All of these commands operate using the **production** environment configuration as defined via the [environment variables](../environment-variables.md).

!!!
The servers are spawned as child processes of the CLI command script, with their [stdio](https://blog.logrocket.com/using-stdout-stdin-stderr-node-js/) mapping to the console.
!!!

## Next.js

```shell
pnpm prod web
```

The website will be accessible at http://localhost:3000.

## Background worker

```shell
pnpm prod worker
```

## Running servers simultaneously

To run both the the Next.js and background worker servers simultaneously:

```shell
pnpm prod
```

## Database management

To migrate the database to the latest schema:

```shell
pnpm prod db migrate
```
