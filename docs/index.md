# Introduction

**QuickDapp** is a highly opinionated framework that helps you quickly build _and_ deploy Web3 dapps, batteries included. 

It is designed to save you a massive amount of time and effort, freeing you up to focus on the parts of your dapp that actually matter.

Roughly speaking, it integrates the following:

* [Bun](https://bun.sh/) + [ElysiaJS](https://elysiajs.com/) + [React](https://react.dev/) as the foundation. **Bun is the only supported package manager.**
* [TailwindCSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) for components and styling.
* [DrizzleORM](https://orm.drizzle.team/) + [PostgreSQL](https://www.postgresql.org/) for database storage.
* [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) + [React Query](https://tanstack.com/query/latest) for AJAX calls.
* [RainbowKit](https://rainbowkit.com) + [Wagmi](https://wagmi.sh/) + [Viem](https://viem.sh/) for web3 interaction.
* [Sign-in-with-Ethereum](https://login.xyz/) + JWT tokens for wallet authentication.
* Background job scheduling _"worker"_ system with support for cron jobs, repeat-on-failure logic, etc.
* Simple factory-based smart contracts in `sample-contracts/` for local development and testing.
* [Commander](https://github.com/tj/commander.js) for powerful CLI scripts.
* Binary distribution for self-contained deployments.
* WebSocket integration for real-time communication.
* Comprehensive test framework with integration testing.

As you can see above, QuickDapp does a lot for you out of the box. 

QuickDapp also comes with a built-in worker system that can handle background jobs, cron tasks, and blockchain monitoring. You can deploy the worker processes separately or combine them into a single binary. All using the readily available build scripts.

Also, the base QuickDapp distribution is itself a ready-made dapp which lets you deploy and interact with ERC-20 contracts on [Sepolia](https://sepolia.etherscan.io) so that you can see all the elements of a working dapp from the get-go.

## Why does this exist?

If you've ever built multiple dapps you'll have found yourself reusing code and integrations from one dapp to the next to save time. Still, you'll need to spend time adapting the base layer to suit the new dapp. 

Now, imagine the reusable part of a dapp was built to be generically usable for any dapp with some sensible defaults included. And imagine it had ready integrations for production deployment with baked-in support for useful features like background jobs, real-time updates, and comprehensive testing. This would save you a tonne of time.

This is exactly what QuickDapp is.

## What if I don't like something?

QuickDapp has been carefully designed to give you the flexibility to build whatever you want without having to change the core structure. However, you may wish to replace some of the peripheral components (e.g the logging provider or database) with your own choices.

In these cases it's easy to do so since QuickDapp is distributed as source code which you then modify/enhance to build your dapp. Meaning that any and every aspect of QuickDapp can be modified as you see fit. There are no limits or restrictions.

Note that parts of the documentation will touch on how you can customize and/or replace certain components to your liking whilst still taking advantage of QuickDapp's other useful features.

## Where do I start?

The [Getting Started](./getting-started.md) section will get you up and running quickly. 

The remainder of this documentation gives you a thorough understanding of all the different parts of QuickDapp and how to get the most out of the framework as a whole.