Phase 1: Basic Homepage with Complete Foundation ✅ COMPLETED

    1.1 Environment Configuration Update ✅

    ✅ Replace DIAMOND_PROXY_ADDRESS with FACTORY_CONTRACT_ADDRESS:
      ✅ Update src/shared/config/client.ts and server.ts
      ✅ Update .env file with new variable name
      ✅ Use clientConfig from shared config for all client-side env vars

    1.2 Sample Contracts Setup ✅

    ✅ Create self-contained sample-contracts/ directory:
    src/sample-contracts/
    ├── foundry.toml
    ├── deploy.ts           # Deployment script
    ├── README.md           # Instructions for use
    ├── src/
    │   └── ERC20Factory.sol
    └── out/                # Build artifacts (after compile)
    ✅ deploy.ts script:
      ✅ Build contracts using Foundry
      ✅ Deploy to chain specified in parent .env
      ✅ Output deployment addresses to .env.local
      ✅ Can be run independently: cd sample-contracts && bun deploy.ts
    ✅ Factory contract:
      ✅ Based on QuickDapp/contracts ERC20Facet
      ✅ Normal contract (not diamond facet)
      ✅ Methods for creating and managing ERC20 tokens

    1.3 ABI Generation System ✅

    ✅ Port ABI generation from v2:
      ✅ Create src/shared/abi/ directory structure
      ✅ Convert codegen.ts to TypeScript/Bun
      ✅ Create config.json pointing to sample-contracts build output
    ✅ Create shared script utility:
      ✅ Add scripts/shared/generate-abis.ts
      ✅ Call from both dev and build scripts
      ✅ Gracefully handle missing contract artifacts
    - ABI Configuration (src/shared/abi/config.json):
    {
      "Erc20": [
        { "glob": "../data/erc20abi.json" }
      ],
      "FactoryContract": [
        { 
          "glob": "../sample-contracts/out/ERC20Factory.sol/ERC20Factory.json",
          "keyPath": "abi"
        }
      ]
    }

    1.4 GraphQL Client Setup ✅

    ✅ Create shared GraphQL client (src/shared/graphql/client.ts):
      ✅ Port GraphQL client setup from v2
      ✅ Use graphql-request lightweight client
      ✅ Configure with clientConfig.BASE_URL
      ✅ Handle authentication headers
    ✅ Port GraphQL schemas and types:
      ✅ Schema definitions already in src/shared/graphql/schema.ts
      ✅ Created query/mutation definitions in separate files

    1.5 Vite + React Foundation ✅

    ✅ Create Vite project structure in src/client/
    ✅ Install dependencies:
      ✅ React 19.0.0, React DOM 19.0.0
      ✅ Vite + @vitejs/plugin-react
      ✅ React Router v6 for SPA routing
      ✅ @tanstack/react-query for data fetching
      ✅ graphql-request for GraphQL client
    - Configure Vite (vite.config.ts):
    export default defineConfig({
      plugins: [react()],
      server: {
        proxy: {
          '/api': 'http://localhost:3000',
          '/auth': 'http://localhost:3000',
        }
      },
      build: {
        outDir: '../server/static/dist',
        emptyOutDir: true,
      }
    })

    1.6 TailwindCSS v4 Setup ✅

    ✅ Install TailwindCSS v4 with @tailwindcss/vite plugin
    ✅ Create CSS-based theme configuration:
    /* src/client/styles/globals.css */
    @import 'tailwindcss';

    @theme {
      --color-anchor: #0ec8ff;
      --color-background: #000000;
      --color-foreground: #ffffff;
    }

    1.7 Basic UI Components & Homepage ✅

    ✅ Created minimal components structure:
      ✅ Homepage component with basic styling
      ✅ Using Tailwind utility classes from globals.css
    ✅ Create App.tsx with routing:
      ✅ React Query provider setup
      ✅ Router configuration
      ✅ Ready for config injection from window object
    ✅ Homepage with static content:
      ✅ Basic layout and styling with Tailwind v4
      ✅ Placeholder content for token features
      ✅ Ready for wallet connection (Phase 2)

    1.8 Server Static Asset Serving ✅

    ✅ Install ElysiaJS static plugin
    ✅ Configure complete asset serving:
    // Serve built frontend assets
    app.use(staticPlugin({
      assets: 'src/server/static/dist',
      prefix: '/assets'
    }))

    // Serve index.html for SPA routes
    app.get('/*', ({ set }) => {
      set.headers['Content-Type'] = 'text/html'
      return html`
        <!DOCTYPE html>
        <html>
          <head>
            <link rel="stylesheet" href="/assets/index.css">
            <script>
              window.__CONFIG__ = ${JSON.stringify(clientConfig)};
            </script>
          </head>
          <body>
            <div id="root"></div>
            <script type="module" src="/assets/index.js"></script>
          </body>
        </html>
      `
    })

    1.9 Build System Integration ✅

    ✅ Update dev script (scripts/dev.ts):
    ✅ Dev script now:
      ✅ Shows tip about sample contracts if .env.local missing
      ✅ Generates ABIs with graceful error handling
      ✅ Starts backend server with watch mode
      ✅ Starts Vite dev server concurrently
      ✅ Handles graceful shutdown of both processes
    ✅ Update build script (scripts/build.ts):
    ✅ Build script now:
      ✅ Cleans previous builds (frontend and server)
      ✅ Generates ABIs with graceful error handling
      ✅ Runs type checking and linting
      ✅ Builds frontend with Vite
      ✅ Builds server bundle with Bun
      ✅ Validates all build artifacts exist

    1.10 Multicall3 Auto-Deployment ✅

    ✅ Add to worker system:
      ✅ Created deployMulticall3 job with deterministic deployment
      ✅ Added to job registry and worker types
      ✅ Automatically scheduled on worker startup
      ✅ Checks if already deployed before attempting deployment
      ✅ Uses serverConfig.CHAIN for logging instead of chainId parameter

    File Structure

    src/
    ├── client/
    │   ├── index.html
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── vite.config.ts
    │   ├── components/
    │   │   ├── ui/
    │   │   └── layout/
    │   ├── hooks/
    │   │   └── useGraphQL.ts
    │   ├── pages/
    │   │   └── HomePage.tsx
    │   ├── styles/
    │   │   └── globals.css
    │   └── utils/
    │       └── cn.ts
    ├── sample-contracts/
    │   ├── foundry.toml
    │   ├── deploy.ts          # Self-contained deployment script
    │   ├── README.md          # Usage instructions
    │   ├── src/
    │   │   └── ERC20Factory.sol
    │   └── out/               # Build artifacts
    ├── server/
    │   ├── static/
    │   │   └── dist/          # Vite build output
    │   └── workers/
    │       └── jobs/
    │           └── deployMulticall3.ts
    ├── shared/
    │   ├── abi/
    │   │   ├── codegen.ts
    │   │   ├── config.json
    │   │   ├── generated.ts
    │   │   └── data/
    │   │       ├── erc20abi.json
    │   │       └── multicall3.json
    │   ├── contracts/
    │   │   └── index.ts
    │   ├── graphql/
    │   │   ├── client.ts      # GraphQL client instance
    │   │   ├── schema.ts      # Schema definitions
    │   │   ├── queries.ts     # Query definitions
    │   │   └── mutations.ts   # Mutation definitions
    │   └── config/
    │       ├── client.ts      # clientConfig (browser-safe)
    │       └── server.ts      # serverConfig (extends client)
    └── scripts/
        ├── shared/
        │   ├── bootstrap.ts
        │   └── generate-abis.ts
        ├── dev.ts              # Main dev script
        ├── build.ts            # Main build script
        └── test.ts             # Test runner

    Sample Contracts README

    # Sample Contracts

    This directory contains sample smart contracts for local development.

    ## Setup

    1. Install Foundry (if not already installed):
       \`\`\`bash
       curl -L https://foundry.paradigm.xyz | bash
       foundryup
       \`\`\`

    2. Build and deploy contracts:
       \`\`\`bash
       bun deploy.ts
       \`\`\`

    This will:
    - Compile the ERC20Factory contract
    - Deploy it to your local chain
    - Save the deployment address to `.env.local`

    ## Note

    These sample contracts are for development only. In production, you would:
    - Deploy your own contracts separately
    - Update FACTORY_CONTRACT_ADDRESS in your environment
    - Ensure ABIs are available for generation

    Key Benefits of This Structure

    1. Sample contracts are optional: Users can ignore them if they have their own 
    contracts
    2. Self-contained: Everything needed for sample contracts is in one directory
    3. Clear separation: Sample contracts are clearly marked as samples, not 
    production code
    4. Flexibility: Easy to remove or replace sample contracts without affecting 
    core functionality
    5. Developer friendly: Clear instructions and optional usage

Phase 2: Web3 Integration ✅ COMPLETED

    ✅ Wallet connection with RainbowKit:
      ✅ RainbowKit integration in src/client/src/config/web3.ts
      ✅ ConnectWallet component with network display
      ✅ Wagmi configuration for wallet interactions

    ✅ SIWE authentication:
      ✅ AuthContext with Sign-In with Ethereum
      ✅ Server-side SIWE verification and JWT tokens
      ✅ Authentication state management in React

    ✅ Contract interactions with Factory:
      ✅ Comprehensive contract interaction library in src/client/src/lib/contracts/
      ✅ Direct blockchain querying (replaced GraphQL token queries)
      ✅ Multicall3 integration for efficient batch operations
      ✅ Factory contract interactions for ERC20 deployment

    ✅ Token creation and management:
      ✅ CreateTokenDialog component for token deployment
      ✅ SendTokenDialog component for token transfers
      ✅ TokenList component with balance display
      ✅ useTokens and useTokenActions hooks

Phase 3: Full Feature Parity ⚠️ PARTIALLY COMPLETED

    ✅ Core UI component library:
      ✅ Button, Dialog, Form, Toast components
      ✅ Consistent styling with Tailwind v4
      ✅ TypeScript interfaces and proper component patterns

    ✅ Direct blockchain integration:
      ✅ Replaced GraphQL token queries with direct chain calls
      ✅ Multicall3 batching for reduced RPC calls
      ✅ Efficient token metadata and balance fetching

    ⚠️ Additional UI components (partially missing):
      ✅ Header, IfWalletConnected, NumTokens
      ❌ Loading, Popover, Tooltip, Icons, ErrorMessageBox
      ❌ CookieConsentBanner, ClientOnly, Toaster provider
      ❌ OnceVisibleInViewport, PingAnimation, ContractValue

    ❌ Real-time notifications (WebSocket):
      ❌ WebSocket connection for real-time updates
      ❌ Notifications component integration
      ❌ Server notification broadcasting
      (Note: Server has notification DB schema but no client integration)

    ❌ Advanced features:
      ❌ Error boundary implementation
      ❌ Comprehensive loading states management
      ❌ Toast notifications provider setup

Remaining Work for Complete v2 Parity

    3.1 Real-time Notification System
    - Implement WebSocket connection in client
    - Create Notifications component
    - Integrate with existing server notification system
    - Real-time updates for token transactions and events

    3.2 Missing UI Components
    - Port remaining components from v2:
      - Loading spinner/skeleton components
      - Popover and Tooltip components
      - Icons library and Svg wrapper
      - ErrorMessageBox for error display
      - Toaster provider for toast management
      - ContractValue for displaying contract data
      - Utility components (ClientOnly, OnceVisibleInViewport, etc.)

    3.3 Advanced Features
    - Error boundary for graceful error handling
    - Comprehensive loading state management
    - Enhanced accessibility features
    - Performance optimizations

    This final revision properly separates sample contracts as an optional 
    development tool while maintaining the complete foundation for the v3 migration.