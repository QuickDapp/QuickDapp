---
order: 91
icon: puzzle
expanded: true
---

# Variants

QuickDapp variants are standalone derivations of the base package, each tailored for a specific domain or use case. They share the same core architecture — ElysiaJS, PostgreSQL, GraphQL, React — but add specialized features on top.

## How Variants Work

Each variant is a complete, self-contained project. It includes everything from the base package plus its domain-specific additions: extra database tables, new GraphQL operations, additional frontend components, and specialized worker jobs. You clone a variant and develop it as your own project, just like the base package.

Variants are not plugins or add-ons. They don't depend on the base package at runtime. Instead, they started as copies of base and evolved with their specific features. This means you get a single, cohesive codebase with no indirection or abstraction layers between base and variant functionality.

## Available Variants

| Variant | Description |
|---------|-------------|
| [Web3](web3/) | Blockchain integration with wallet authentication (SIWE), smart contract interactions, token management, and chain event monitoring |

## Building Your Own Variant

QuickDapp is designed as a framework for building specialized starter kits. To create your own variant:

1. Start with the base package (or an existing variant close to your needs)
2. Add your domain-specific features — database tables, GraphQL operations, frontend components, worker jobs
3. Include any additional dependencies and configuration
4. Add documentation for your variant's features

The base package provides the foundation: authentication, user management, background jobs, real-time notifications, and a complete dev/build/deploy toolchain. Your variant adds everything specific to your domain.

## Community Variants

Community-contributed variants are on the roadmap. If you build a variant that others might find useful, it could be published as an official QuickDapp variant in the future.
