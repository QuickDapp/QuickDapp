import { getGraphQLClient } from "@shared/graphql/client"
import { GET_GITHUB_STATS } from "@shared/graphql/queries"
import { useQuery } from "@tanstack/react-query"

export interface GithubStats {
  lastCommitTime: string
  latestTag: string
}

export enum QueryKeys {
  GetGithubStats = "GetGithubStats",
}

export const useGetGithubStats = () => {
  return useQuery({
    queryKey: [QueryKeys.GetGithubStats],
    queryFn: async () => {
      return getGraphQLClient().request(GET_GITHUB_STATS)
    },
    select: (data) => {
      return (data as any).getGithubStats as GithubStats
    },
    refetchInterval: 3600 * 1000,
  })
}
