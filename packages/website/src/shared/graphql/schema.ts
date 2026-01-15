import { gql } from "graphql-tag"

export const typeDefs = gql`
  type GithubStats {
    lastCommitTime: String!
    latestTag: String!
  }

  type Query {
    getGithubStats: GithubStats!
  }
`
