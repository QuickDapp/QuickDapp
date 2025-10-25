---
order: 80
---

# build

Create an optimized production build:

```shell
bun run build
```

The build process:
* Compiles TypeScript to JavaScript
* Optimizes and bundles frontend assets with Vite
* Generates production-ready server code
* Bundles static assets into the server
* Optimizes for production performance
* Creates self-contained binary executable

## Environment Configuration

The command set `NODE_ENV` to `production` and thus loads in the production environment variables from `.env.production`.

These values are written to an intermediate file at `./dist/binary.js` which gets embedded into the final output binary.

## Build Artifacts

After building, you'll find these artifacts:

```
dist/
├── server/              # Compiled server code
│   ├── index.js        # Main server entry point
│   └── ...             # Server modules
├── client/             # Optimized frontend bundle
│   ├── index.html      # Main HTML file
│   ├── assets/         # CSS, JS, and other assets
└── binaries/          # Self-contained binaries
    ├── quickdapp-linux-x64
    ├── quickdapp-darwin-x64
    └── quickdapp-windows-x64.exe
```

The binaries are self-contained executables which contain all the code necessary (including library dependencies) to run the server, including the frontend client assets.

This makes deployment of a QuickDapp extremely simple and reliable, without needing to install dependencies where you deploy.

