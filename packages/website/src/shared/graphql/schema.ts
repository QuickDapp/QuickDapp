import { gql } from "graphql-tag"

export const typeDefs = gql`
  scalar BigInt
  scalar DateTime
  scalar JSON
  scalar PositiveInt

  type GithubStats {
    lastCommitTime: String!
    latestTag: String!
  }

  type Query {
    getGithubStats: GithubStats!
  }
`
