import { makeExecutableSchema } from "@graphql-tools/schema"
import { Elysia } from "elysia"
import { createYoga } from "graphql-yoga"
import { serverConfig } from "../../shared/config/server"
import { defaultResolvers } from "../../shared/graphql/resolvers"
import { typeDefs } from "../../shared/graphql/schema"
import { LOG_CATEGORIES } from "../lib/logger"
import type { ServerApp } from "../types"
import { createResolvers } from "./resolvers"

export const createGraphQLHandler = (serverApp: ServerApp) => {
  const logger = serverApp.createLogger(LOG_CATEGORIES.GRAPHQL)

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers: {
      ...defaultResolvers,
      ...createResolvers(serverApp),
    },
  })

  const yoga = createYoga({
    schema,
    cors: false,
    graphiql:
      serverConfig.NODE_ENV === "development" ||
      serverConfig.NODE_ENV === "test",
    maskedErrors: serverConfig.NODE_ENV === "production",
    plugins: [
      {
        onResultProcess: ({ result, setResult }) => {
          if (Array.isArray(result)) {
            const processedResults = result.map((r: any) => {
              if (r.errors && r.errors.length > 0 && r.data === undefined) {
                return { ...r, data: null }
              }
              return r
            })
            setResult(processedResults)
          } else {
            const singleResult = result as any
            if (
              singleResult.errors &&
              singleResult.errors.length > 0 &&
              singleResult.data === undefined
            ) {
              setResult({
                ...singleResult,
                data: null,
              })
            }
          }
        },
      },
    ],
    context: async () => {
      return {
        serverApp,
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
    .get("/graphql", ({ request }) => yoga.fetch(request))
    .post("/graphql", ({ request }) => yoga.fetch(request))
}
