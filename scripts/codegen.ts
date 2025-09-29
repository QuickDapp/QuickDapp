#!/usr/bin/env bun

import { generateTypes } from "./shared/generate-types"
import { createScriptRunner, type ScriptOptions } from "./shared/script-runner"

interface CodegenOptions extends ScriptOptions {
  watch?: boolean
}

async function codegenHandler(
  options: CodegenOptions,
  config: { rootFolder: string; env: string },
) {
  console.log("🚀 Starting code generation...")
  console.log("")

  await generateTypes({
    verbose: options.verbose || false,
    watch: options.watch || false,
  })

  if (!options.watch) {
    console.log("")
    console.log("✨ Code generation complete!")
  }
}

// The script runner automatically executes on module load
createScriptRunner<CodegenOptions>(
  {
    name: "Codegen",
    description: "Generate TypeScript types from GraphQL schema and ABIs",
    env: "development",
  },
  codegenHandler,
  (program) => {
    return program.option("-w, --watch", "run in watch mode")
  },
)
