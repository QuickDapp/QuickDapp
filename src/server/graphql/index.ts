import { makeExecutableSchema } from "@graphql-tools/schema"
import { Elysia } from "elysia"
import { createYoga } from "graphql-yoga"
import { AuthDirectiveHelper } from "../../shared/graphql/auth-extractor"
import { defaultResolvers } from "../../shared/graphql/resolvers"
import { typeDefs } from "../../shared/graphql/schema"
import { authenticateRequest } from "../auth"
import type { ServerApp } from "../types"
import { createResolvers } from "./resolvers"

export const createGraphQLHandler = (serverApp: ServerApp) => {
  const logger = serverApp.createLogger("graphql")

  // Create auth directive helper
  const authHelper = new AuthDirectiveHelper(typeDefs)
  logger.info(`Auth operations: ${authHelper.getAuthOperations().join(", ")}`)

  // Create executable schema
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers: {
      ...defaultResolvers,
      ...createResolvers(serverApp),
    },
  })

  const yoga = createYoga({
    schema,
    graphiql: process.env.NODE_ENV === "development",
    maskedErrors: process.env.NODE_ENV === "production",
    context: async ({ request }) => {
      // Debug request headers
      logger.debug(`Incoming request: ${request.method} ${request.url}`)
      logger.debug(
        `Authorization header: ${request.headers.get("Authorization")}`,
      )

      // Extract operation name from request body
      let operationName: string | undefined

      try {
        if (request.method === "POST") {
          const body = await request.clone().json()
          operationName =
            body.operationName || extractOperationNameFromQuery(body.query)
          logger.debug(`Operation name extracted: ${operationName}`)
        }
      } catch {
        // Continue without operation name if parsing fails
      }

      // Check if operation requires auth
      const requiresAuth =
        operationName && authHelper.requiresAuth(operationName)
      logger.debug(`Operation requires auth: ${requiresAuth}`)

      let user: any = null
      if (requiresAuth) {
        logger.debug(`Auth required for operation: ${operationName}`)
        user = await authenticateRequest(request)
        if (!user) {
          logger.debug(
            `Auth required for operation ${operationName} but no valid token provided`,
          )
          logger.debug(
            `Authorization header: ${request.headers.get("Authorization")?.substring(0, 20)}...`,
          )
        } else {
          logger.debug(`User authenticated: ${user.wallet}`)
        }
      }

      return {
        serverApp,
        user,
        operationName,
        requiresAuth,
      }
    },
    logging: {
      debug: (...args) => logger.debug(args.join(" ")),
      info: (...args) => logger.info(args.join(" ")),
      warn: (...args) => logger.warn(args.join(" ")),
      error: (...args) => logger.error(args.join(" ")),
    },
  })

  return new Elysia()
    .all("/graphql", ({ request }) => yoga.fetch(request))
    .get("/graphql", ({ request }) => yoga.fetch(request))
    .post("/graphql", ({ request }) => yoga.fetch(request))
}

/**
 * Extract operation name from GraphQL query string
 * Handles both named operations (query MyOperation) and anonymous operations (query { field })
 */
function extractOperationNameFromQuery(query: string): string | undefined {
  if (!query) return undefined

  // First try to match named operations: query MyOperation { ... }
  const namedMatch = query.match(/(?:query|mutation|subscription)\s+(\w+)/)
  if (namedMatch?.[1]) {
    return namedMatch[1]
  }

  // For anonymous operations, extract the first field name
  // Match: query { fieldName } or mutation { fieldName }
  const anonymousMatch = query.match(
    /(?:query|mutation|subscription)\s*\{\s*(\w+)/,
  )
  return anonymousMatch?.[1]
}
