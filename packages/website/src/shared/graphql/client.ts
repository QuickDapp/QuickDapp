import { GraphQLClient } from "graphql-request"

let graphqlClient: GraphQLClient | null = null

export function getGraphQLClient(): GraphQLClient {
  if (!graphqlClient) {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    graphqlClient = new GraphQLClient(`${baseUrl}/graphql`, {
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
  return graphqlClient
}
