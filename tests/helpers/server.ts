/**
 * Server test helpers for QuickDapp v3
 * 
 * Utilities for starting/stopping test servers, making requests,
 * and managing test server lifecycle.
 */

import type { ServerApp } from "../../src/server/types"
import { createApp } from "../../src/server"

export interface TestServer {
  app: any
  server: any
  serverApp: ServerApp
  url: string
  shutdown: () => Promise<void>
}

/**
 * Start a test server instance
 */
export async function startTestServer(): Promise<TestServer> {
  const { app, server, serverApp } = await createApp()
  
  const url = `http://${process.env.HOST || 'localhost'}:${process.env.PORT || '3002'}`
  
  const shutdown = async () => {
    console.log('🛑 Shutting down test server...')
    
    try {
      // Stop the server
      if (server && typeof server.stop === 'function') {
        await server.stop()
      }
      
      // Disconnect from database
      if (serverApp.db) {
        // TODO: Implement proper database disconnection
      }
      
      // Stop workers
      if (serverApp.workerManager) {
        await serverApp.workerManager.shutdown()
      }
      
      console.log('✅ Test server shut down')
    } catch (error) {
      console.error('❌ Error shutting down test server:', error)
      throw error
    }
  }
  
  return {
    app,
    server,
    serverApp,
    url,
    shutdown,
  }
}

/**
 * Make HTTP request to test server
 */
export async function makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  
  return response
}

/**
 * Make GraphQL request to test server
 */
export async function makeGraphQLRequest(
  url: string,
  query: string,
  variables?: Record<string, any>
): Promise<Response> {
  return makeRequest(`${url}/graphql`, {
    method: 'POST',
    body: JSON.stringify({
      query,
      variables,
    }),
  })
}

/**
 * Wait for server to be ready
 */
export async function waitForServer(url: string, maxAttempts = 10, delayMs = 100): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await makeRequest(`${url}/health`)
      if (response.ok) {
        return
      }
    } catch {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  
  throw new Error(`Server not ready after ${maxAttempts} attempts`)
}