import { dateTimeSinceStr } from "@shared/date"
import { type FC, useMemo } from "react"
import { useGetGithubStats } from "../hooks/useGithubStats"
import type { PropsWithClassName } from "../utils/cn"

export const LatestGitTag = () => {
  const { data: githubStats } = useGetGithubStats()

  return <span>{githubStats?.latestTag}</span>
}

export const LastCommitTime: FC<PropsWithClassName> = ({ className }) => {
  const { data: githubStats } = useGetGithubStats()

  const lastCommitTime = useMemo(() => {
    try {
      return dateTimeSinceStr(githubStats?.lastCommitTime)
    } catch {
      return "n/a"
    }
  }, [githubStats?.lastCommitTime])

  return <span className={className}>{lastCommitTime}</span>
}
