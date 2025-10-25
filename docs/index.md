---
order: 100
---

# Introduction

**QuickDapp** is a highly opinionated framework that helps you quickly build _and_ deploy Web3 dapps, batteries included. 

It is designed to save you a massive amount of time and effort, freeing you up to focus on the parts of your dapp that actually matter.

Roughly speaking, it integrates the following:

* [Bun](https://bun.sh/) + [ElysiaJS](https://elysiajs.com/) + [React](https://react.dev/) as the foundation.
* [TailwindCSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) for components and styling.
* [DrizzleORM](https://orm.drizzle.team/) + [PostgreSQL](https://www.postgresql.org/) for database storage.
* [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) + [React Query](https://tanstack.com/query/latest) for backend API surface.
* [RainbowKit](https://rainbowkit.com) + [Wagmi](https://wagmi.sh/) + [Viem](https://viem.sh/) for web3 interaction.
* [Sign-in-with-Ethereum](https://login.xyz/) + JWT tokens for wallet authentication.
* Background job scheduling _"worker"_ system with support for cron jobs, repeat-on-failure logic, etc.
* [Commander](https://github.com/tj/commander.js) for powerful CLI scripts.
* Binary distribution for self-contained deployments.
* WebSocket integration for real-time communication.
* Comprehensive backend integration tests.
* Sample smart contracts in `sample-contracts/` for local development and testing.

As you can see, QuickDapp does a lot for you out of the box. 

QuickDapp comes with a built-in worker system that can handle background jobs, cron tasks, and blockchain monitoring. You can deploy the worker processes separately or combine them into a single binary. All using the readily available build scripts.

The base QuickDapp distribution is itself a ready-made dapp which lets you deploy and interact with ERC-20 contracts so that you can see all the elements of a working dapp from the get-go.

## Why does this exist?

If you've ever built multiple dapps you'll have found yourself reusing code and integrations from one dapp to the next to save time. Even with code re-use you'll always need to spend time adapting the base layer to suit the new dapp. 

Now, imagine the reusable part of a dapp was built to be generically usable for any dapp with some sensible defaults included. And imagine it had ready integrations for production deployment with baked-in support for useful features like background jobs, real-time updates, and comprehensive testing. This would save you a tonne of time. 

This is exactly what QuickDapp is.

## What if I don't like something?

QuickDapp is distributed as source code so you can change anything you like to suit your neeeds. However, recommend keeping the core architecture intact (since it's well tested and production-ready) and making just the changes necessary for your dapp to work.

Parts of this documentation will touch on how you can customize and/or replace certain components to your liking whilst still taking advantage of QuickDapp's other useful features.

## Where do I start?

The [Getting Started](./getting-started.md) section will get you up and running quickly. 

The remainder of this documentation gives you a thorough understanding of all the different parts of QuickDapp and how to get the most out of the framework as a whole.