---
order: 100
icon: BookOpen
---

# Introduction

**QuickDapp** is a "boilerplate" that serves as the foundation for any modern web app you want to build. Whether you're vibe coding or coding by hand, QuickDapp helps you quickly build _and_ deploy web applications - _"batteries included"_.

It is designed to save you a massive amount of time and effort, freeing you up to focus on the parts of your web app that actually matter.

!!!
A _boilerplate_ is a standardized, reusable piece code that can be used to build multiple projects. Think of it as a design template or blueprint from which you build the actual specific web app you're interested in making.
!!!

## Why do I need this? Can't I just vibe code?

Vibe-coding is great. It saves time and gets the job done. A lot of vibe coding when into QuickDapp, trust us ;)

But when you're vibe coding more than once you'll find that the AI is recreating the same stuff over and over again - like user account management, theming, mobile-friendly UI components, etc. It would get the job done even quicker if it didn't have to repeat previous work.

This is exactly where QuickDapp comes in.

QuickDapp is a working web application out-of-the-box with user authentication, testing, database connectivity, email sending, real-time notifications, basically a whole bunch of stuff that the AI doesn't need to figure out. It's all there so you can straight away just build the stuff that makes your app unique.

_"Don't repeat yourself" (DRY)_ is a principle of software development which dictates that stuff that doesn't need to change should be re-used. This is why, even when vibe coding, an AI will use common frameworks like React.js to build your app.

But that's not all.

Vibe coding often doesn't (yet) have a neat solution for deployment. It's one thing to build your app. It's a whole other challenge to be able to deploy it to the cloud in a way that makes scaling easy. QuickDapp has got your back on this.

Your entire web app gets built into a single executable binary (yes, you read that right) for multiple platforms, making it very easy to run your app. Additionally, QuickDapp can create a [Docker container](https://docker.com/), allowing for deployment to _any_ cloud provider.

## Ok, what do I get with QuickDapp?

QuickDapp uses all of the following:

* [TypeScript](https://www.typescriptlang.org/) as the programming language.
* [Bun](https://bun.sh/) as the package manager for installing third-party dependencies, running the web app and building the production output.
* Backend:
  * [ElysiaJS](https://elysiajs.com/) as the backend framework.
  * [PostgreSQL](https://www.postgresql.org/) as the database.
  * [DrizzleORM](https://orm.drizzle.team/) for structured database querying.
  * [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) for exposing a GraphQL API.
* Frontend:
  * [React](https://react.dev/) as the frontend framework.
  * [TailwindCSS](https://tailwindcss.com/) for styling.
  * [Radix UI](https://www.radix-ui.com/) for UI components
  * [React Query](https://tanstack.com/query/latest) for calls to the GraphQL backend API.

Additionally, QuickDapp provides the following features:

* Authenticate users by email or OAuth (Google, Facebook, etc) without using cookies.
* Background workers so that you can asynchronously schedule long-running tasks.
* Websockets integration for real-time chat and notifications.
* Parallelized testing framework for fast automated integration tests.
* Single-executable binary builds of your entire app for easy distribution.
* Dark and light theme support with system preference detection.

QuickDapp also supports [variants](./variants/index.md) — specialized derivations that add domain-specific features. For example, the [Web3 variant](./variants/web3/index.md) adds blockchain wallet authentication, smart contract interactions, and on-chain event monitoring.

As you can see it is a very opinionated design, meaning that we think all of the above together form a decent foundational layer for any kind of web app you want to build. Having said that, you can change _anything_ you don't like in QuickDapp to suit your own needs.

## What if I don't like something?

As a boilerplate QuickDapp is just a starting point. It comes with the entire source code.

You can choose to stick to the structure and design decisions QuickDapp comes with or you can rewrite it any way you want (and then you have your own custom boilerplate based on QuickDapp!).

On the whole though, we don't think you will need to rewrite QuickDapp that much since we've used it build multiple apps ourselves. We've incorporated the lessons learnt from building those apps into QuickDapp's design choices.

Moreover, QuickDapp has support for "variants". You can find out more about those in the [Variants documentation](./variants/index.md).

## Ok, how do I get started?

The next section - [Getting Started](./getting-started.md) -  will get you up and running quickly.

The remainder of this documentation gives you a thorough understanding of all the different parts of QuickDapp and how to get the most out of it.
