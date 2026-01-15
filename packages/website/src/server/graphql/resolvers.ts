import { getSetting } from "../db/settings"
import type { ServerApp } from "../types"

export interface GithubStats {
  lastCommitTime: string
  latestTag: string
}

export interface GraphQLContext {
  serverApp: ServerApp
}

export const createResolvers = (serverApp: ServerApp) => {
  return {
    Query: {
      getGithubStats: async (
        _parent: unknown,
        _args: unknown,
        _context: GraphQLContext,
      ): Promise<GithubStats> => {
        const githubSettingsRaw = await getSetting(serverApp.db, "github")

        if (!githubSettingsRaw) {
          return {
            lastCommitTime: "",
            latestTag: "",
          }
        }

        try {
          const githubSettings = JSON.parse(githubSettingsRaw) as GithubStats
          return {
            lastCommitTime: githubSettings.lastCommitTime || "",
            latestTag: githubSettings.latestTag || "",
          }
        } catch {
          return {
            lastCommitTime: "",
            latestTag: "",
          }
        }
      },
    },
  }
}
