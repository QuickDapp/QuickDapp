import { useParams } from "react-router-dom"
import { Loading } from "../components/Loading"
import { useDocsLlm, useDocsManifest } from "../hooks/useDocs"

export function DocsLlmPage() {
  const { version } = useParams<{ version: string }>()

  const manifestQuery = useDocsManifest()
  const resolvedVersion =
    version === "latest" ? (manifestQuery.data?.latest ?? undefined) : version

  const llmQuery = useDocsLlm(resolvedVersion)

  if (manifestQuery.isLoading || llmQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (manifestQuery.error || llmQuery.error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Error loading documentation</h1>
        <p className="text-foreground/60">
          {(manifestQuery.error as Error)?.message ||
            (llmQuery.error as Error)?.message ||
            "Unknown error"}
        </p>
      </div>
    )
  }

  return (
    <div className="container py-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">
          QuickDapp Documentation (LLM-friendly)
        </h1>
        <p className="text-foreground/60 mb-4">Version: {resolvedVersion}</p>
        <p className="text-sm text-foreground/40">
          This is the full documentation in markdown format, optimized for LLM
          context windows. Copy and paste into your AI assistant for reference.
        </p>
      </div>
      <pre className="whitespace-pre-wrap rounded-lg bg-foreground/5 p-6 text-sm font-mono leading-relaxed overflow-x-auto">
        {llmQuery.data}
      </pre>
    </div>
  )
}
