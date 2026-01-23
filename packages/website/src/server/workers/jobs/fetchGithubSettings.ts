import { Octokit } from "@octokit/rest"
import { serverConfig } from "../../../shared/config/server"
import { setSetting } from "../../db/settings"
import type { JobParams, JobRunner } from "./types"

const octokit = new Octokit({
  auth: serverConfig.GITHUB_AUTH_TOKEN,
  userAgent: "QuickDappWebsiteBackend",
  timeZone: "UTC",
})

export const run: JobRunner = async ({ log, serverApp }: JobParams) => {
  const { data: commits } = await octokit.rest.repos.listCommits({
    owner: "QuickDapp",
    repo: "QuickDapp",
    per_page: 1,
  })

  const latestCommit = commits[0]
  if (!latestCommit) {
    log.warn("No commits found")
    return
  }

  const commitDate = latestCommit.commit.committer?.date
  log.info(`Latest commit: ${latestCommit.commit.tree.sha} at ${commitDate}`)

  const { data: tags } = await octokit.rest.repos.listTags({
    owner: "QuickDapp",
    repo: "QuickDapp",
    per_page: 1,
  })

  const latestTag = tags[0]
  if (!latestTag) {
    log.warn("No tags found")
    return
  }

  log.info(`Latest tag: ${latestTag.name} from commit ${latestTag.commit.sha}`)

  await setSetting(
    serverApp.db,
    "github",
    JSON.stringify({
      lastCommitTime: commitDate || "",
      latestTag: latestTag.name,
    }),
  )
}

export const fetchGithubSettingsJob = {
  run,
}
