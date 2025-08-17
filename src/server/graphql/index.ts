import { Elysia } from "elysia"
import { buildSchema } from "graphql"
import { createYoga } from "graphql-yoga"
import type { ServerApp } from "../types"

// Basic GraphQL schema
const typeDefs = `
  type Query {
    health: String!
    version: String!
  }
  
  type Mutation {
    placeholder: String
  }
`

// GraphQL resolvers
const resolvers = {
  Query: {
    health: () => "OK",
    version: () => process.env.APP_VERSION || "3.0.0",
  },
  Mutation: {
    placeholder: () => "This is a placeholder mutation",
  },
}

export const createGraphQLHandler = (serverApp: ServerApp) => {
  const logger = serverApp.createLogger("graphql")
  const schema = buildSchema(typeDefs)

  const yoga = createYoga({
    schema,
    rootValue: resolvers,
    graphiql: process.env.NODE_ENV === "development",
    context: () => ({
      serverApp,
      db: serverApp.db,
      logger: serverApp.createLogger("graphql-context"),
    }),
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
