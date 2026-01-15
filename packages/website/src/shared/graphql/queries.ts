import { gql } from "graphql-tag"

export const GET_GITHUB_STATS = gql`
  query GetGithubStats {
    getGithubStats {
      lastCommitTime
      latestTag
    }
  }
`
