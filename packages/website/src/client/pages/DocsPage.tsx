import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { DocsContent } from "../components/docs/DocsContent"
import { DocsSidebar } from "../components/docs/DocsSidebar"
import { Footer } from "../components/Footer"
import { Loading } from "../components/Loading"
import { useDocs, useDocsManifest } from "../hooks/useDocs"

export function DocsPage() {
  const { version, "*": pagePath } = useParams<{
    version: string
    "*": string
  }>()
  const navigate = useNavigate()

  const manifestQuery = useDocsManifest()
  const resolvedVersion =
    version === "latest" ? (manifestQuery.data?.latest ?? undefined) : version
  const resolvedPath = pagePath || "index"

  const { page, tree, isLoading, error } = useDocs(
    resolvedVersion,
    resolvedPath,
  )

  useEffect(() => {
    if (version === "latest" && manifestQuery.data?.latest) {
      const newPath = pagePath
        ? `/docs/${manifestQuery.data.latest}/${pagePath}`
        : `/docs/${manifestQuery.data.latest}`
      navigate(newPath, { replace: true })
    }
  }, [version, manifestQuery.data?.latest, pagePath, navigate])

  const handleVersionChange = (newVersion: string) => {
    const newPath = pagePath
      ? `/docs/${newVersion}/${pagePath}`
      : `/docs/${newVersion}`
    navigate(newPath)
  }

  if (manifestQuery.isLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (manifestQuery.error || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Error loading documentation</h1>
        <p className="text-foreground/60">
          {(manifestQuery.error as Error)?.message ||
            (error as Error)?.message ||
            "Unknown error"}
        </p>
      </div>
    )
  }

  if (!manifestQuery.data?.versions.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">No documentation available</h1>
        <p className="text-foreground/60">
          Documentation has not been generated yet.
        </p>
      </div>
    )
  }

  if (!resolvedVersion) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loading />
      </div>
    )
  }

  if (!page) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-foreground/60">
          The page "{resolvedPath}" does not exist in version {resolvedVersion}.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 container flex gap-8 pt-24 pb-16">
        <DocsSidebar
          tree={tree || []}
          version={resolvedVersion}
          versions={manifestQuery.data.versions}
          onVersionChange={handleVersionChange}
          currentPath={resolvedPath}
        />
        <main className="min-w-0 flex-1">
          <DocsContent markdown={page.markdown} />
        </main>
      </div>
      <Footer />
    </div>
  )
}
