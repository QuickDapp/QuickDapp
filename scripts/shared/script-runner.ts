#!/usr/bin/env bun

import { Command, type OptionValues } from "commander"
import { bootstrap, type BootstrapOptions } from "./bootstrap"

export interface ScriptConfig {
  name: string
  description: string
  env?: string
}

export interface ScriptOptions extends OptionValues {
  verbose?: boolean
  [key: string]: any
}

export type ScriptHandler<T extends ScriptOptions = ScriptOptions> = (
  options: T,
  config: { rootFolder: string; env: string }
) => Promise<void>

export type CommandSetup = (program: Command) => Command

/**
 * Common script runner that handles:
 * 1. Environment bootstrap
 * 2. CLI parsing with Commander
 * 3. Error handling
 * 4. Common options (verbose, help)
 */
export async function runScript<T extends ScriptOptions = ScriptOptions>(
  scriptConfig: ScriptConfig,
  handler: ScriptHandler<T>,
  options: T
): Promise<void> {
  try {
    // Bootstrap environment
    const bootstrapOptions: BootstrapOptions = {
      env: scriptConfig.env,
      verbose: options.verbose || false,
    }
    
    const config = await bootstrap(bootstrapOptions)

    // Run the actual script handler
    await handler(options, config)

  } catch (error) {
    console.error(`❌ ${scriptConfig.name} failed:`, error)
    process.exit(1)
  }
}

/**
 * Standard script entry point using Commander
 */
export function createScriptRunner<T extends ScriptOptions = ScriptOptions>(
  scriptConfig: ScriptConfig,
  handler: ScriptHandler<T>,
  setupCommand?: CommandSetup
) {
  // Always set up the command - assume we're running as a script, not programmatic usage
  const program = new Command()
  
  program
    .name(scriptConfig.name.toLowerCase().replace(/\s+/g, '-'))
    .description(scriptConfig.description)
    .option('-v, --verbose', 'enable verbose output')
  
  // Allow custom command setup
  const finalProgram = setupCommand ? setupCommand(program) : program
  
  finalProgram.action(async (options: T) => {
    await runScript(scriptConfig, handler, options)
  })

  finalProgram.parseAsync()
  
  // Return the handler for programmatic use (if needed)
  return { runScript: (opts: T) => runScript(scriptConfig, handler, opts) }
}