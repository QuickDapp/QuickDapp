#!/usr/bin/env bun

import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { config } from "dotenv"

/**
 * Bootstrap utility for scripts
 * 
 * Loads environment variables in the following order:
 * 1. .env (base configuration)
 * 2. .env.{NODE_ENV} (environment-specific overrides)
 * 3. .env.local (local overrides, if exists)
 * 
 * Similar to quickdapp v2's bootstrap.js but adapted for v3 and TypeScript
 */

export interface BootstrapOptions {
  env?: string
  verbose?: boolean
}

export interface BootstrapResult {
  rootFolder: string
  env: string
}

interface EnvFileInfo {
  name: string
  path: string
  required: boolean
  override?: boolean
}

/**
 * Load a single environment file
 */
function loadEnvFile(fileInfo: EnvFileInfo, verbose: boolean): void {
  const { name, path, required, override = false } = fileInfo
  
  if (existsSync(path)) {
    const result = config({ path, override })
    if (verbose && result.error) {
      console.warn(`⚠️  Warning loading ${name}: ${result.error}`)
    } else if (verbose) {
      console.log(`✅ Loaded ${name}`)
    }
  } else if (required && verbose) {
    console.warn(`⚠️  ${name} file not found at ${path}`)
  } else if (verbose) {
    console.log(`ℹ️  No ${name} file found (optional)`)
  }
}

/**
 * Display environment information
 */
function showEnvironmentInfo(verbose: boolean): void {
  if (!verbose) return
  
  console.log(`📊 Environment configured:`)
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`)
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^@]*@/, ':***@') || 'not set'}`)
  console.log(`   PORT: ${process.env.PORT}`)
  console.log('')
}

export async function bootstrap(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  const { verbose = false } = options
  let { env } = options
  
  try {
    // Determine environment - prioritize parameter over existing NODE_ENV
    env = env || process.env.NODE_ENV || 'development'
    process.env.NODE_ENV = env
    
    const rootFolder = resolve(import.meta.dir, '..', '..')
    
    if (verbose) {
      console.log(`🚀 Bootstrapping QuickDapp scripts (env: ${env})`)
    }
    
    // Define environment files to load in order
    const envFiles: EnvFileInfo[] = [
      {
        name: 'base .env',
        path: resolve(rootFolder, '.env'),
        required: true,
      },
      {
        name: `.env.${env}`,
        path: resolve(rootFolder, `.env.${env}`),
        required: false,
        override: true,
      },
      {
        name: '.env.local',
        path: resolve(rootFolder, '.env.local'),
        required: false,
        override: true,
      },
    ]
    
    // Load all environment files
    envFiles.forEach(fileInfo => loadEnvFile(fileInfo, verbose))
    
    // Show configuration summary
    showEnvironmentInfo(verbose)
    
    return {
      rootFolder,
      env,
    }
    
  } catch (error) {
    console.error('💥 Bootstrap failed:', error)
    process.exit(1)
  }
}

/**
 * Show help for script usage
 */
export function showScriptHelp(scriptName: string, description: string, usage: string) {
  console.log(`
🧪 ${scriptName}

${description}

Usage: ${usage}

Environment:
  The script loads environment variables in this order:
  1. .env (base configuration)
  2. .env.{NODE_ENV} (environment-specific overrides)  
  3. .env.local (local overrides, if exists)

  Current environment: ${process.env.NODE_ENV || 'development'}
`)
}