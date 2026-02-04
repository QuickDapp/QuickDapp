---
order: 100
---

# LLM Plugin

The QuickDapp LLM plugin gives your AI code editor deep knowledge of QuickDapp conventions, so it can scaffold projects, generate code that follows best practices, and safely update your `CLAUDE.md` without clobbering QuickDapp-specific instructions.

## Installation (Claude Code)

Add the QuickDapp marketplace to Claude Code:

```
/plugin marketplace add QuickDapp/llm-plugins
```

Install the plugin:

```
/plugin install quickdapp@quickdapp-plugins
```

## Commands

### create-project

Scaffold a new QuickDapp project interactively.

```
/quickdapp:create-project
```

Prompts for folder name, variant (base or web3), and package runner (bunx or npx), then runs the CLI and displays next steps.

## Skills

### write-code

Automatically activated when writing code in a QuickDapp project. Ensures adherence to project conventions by:

- Reading the project `CLAUDE.md` for conventions
- Fetching version-specific documentation from quickdapp.xyz
- Enforcing TypeScript, DrizzleORM, GraphQL schema-first, React named exports, and other conventions
- Detecting the Web3 variant and applying additional conventions
- Flagging convention violations before proceeding

### update-claude-md

Activated when modifying a QuickDapp project's `CLAUDE.md`. Protects QuickDapp-specific instructions by:

- Identifying and preserving QuickDapp sections (Overview, Documentation, CLI Commands, Coding Guidelines, Web3)
- Adding user instructions in clearly separated sections
- Detecting conflicts between user requests and QuickDapp conventions
- Asking the user which should take precedence on conflict
