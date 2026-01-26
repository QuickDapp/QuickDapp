import { ArrowLeft, Check, Copy } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { Button } from "../components/Button"
import { DocsErrorState } from "../components/docs/DocsErrorState"
import { DocsLoadingState } from "../components/docs/DocsLoadingState"
import { VersionSelector } from "../components/docs/VersionSelector"
import { useCopyToClipboard } from "../hooks/useCopyToClipboard"
import { useDocsLlm, useDocsManifest } from "../hooks/useDocs"

export function DocsLlmPage() {
  const { version } = useParams<{ version: string }>()
  const navigate = useNavigate()
  const { copied, copy } = useCopyToClipboard()

  const manifestQuery = useDocsManifest()
  const versions = manifestQuery.data?.versions ?? []
  const latestVersion = manifestQuery.data?.latest ?? ""
  const resolvedVersion =
    version === "latest" ? (manifestQuery.data?.latest ?? undefined) : version

  const llmQuery = useDocsLlm(resolvedVersion)

  const handleVersionChange = (newVersion: string) => {
    navigate(`/docs/${newVersion}/llm`)
  }

  const handleCopy = async () => {
    if (llmQuery.data) {
      await copy(llmQuery.data)
    }
  }

  if (manifestQuery.isLoading || llmQuery.isLoading) {
    return <DocsLoadingState />
  }

  if (manifestQuery.error || llmQuery.error) {
    const message =
      (manifestQuery.error as Error)?.message ||
      (llmQuery.error as Error)?.message ||
      "Unknown error"
    return <DocsErrorState message={message} />
  }

  return (
    <div className="container py-24">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to={`/docs/${version}`}
            className="flex items-center gap-2 text-anchor hover:text-anchor/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to docs
          </Link>

          <VersionSelector
            version={version!}
            versions={versions}
            latestVersion={latestVersion}
            onVersionChange={handleVersionChange}
          />
        </div>

        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy to clipboard
            </>
          )}
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">
          QuickDapp Documentation (LLM-friendly)
        </h1>
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
