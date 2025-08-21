import { GraphQLClient } from "graphql-request"
import { clientConfig } from "../config/env"

let graphqlClient: GraphQLClient | null = null

export function getGraphQLClient(): GraphQLClient {
  if (!graphqlClient) {
    graphqlClient = new GraphQLClient(`${clientConfig.BASE_URL}/graphql`, {
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    })
  }
  return graphqlClient
}

export function setAuthToken(token: string | null) {
  const client = getGraphQLClient()
  if (token) {
    client.setHeader("Authorization", `Bearer ${token}`)
  } else {
    client.setHeader("Authorization", "")
  }
}
