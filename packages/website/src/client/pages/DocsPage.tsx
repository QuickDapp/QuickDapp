import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { DocsContent } from "../components/docs/DocsContent"
import { DocsErrorState } from "../components/docs/DocsErrorState"
import { DocsLoadingState } from "../components/docs/DocsLoadingState"
import { DocsSidebar } from "../components/docs/DocsSidebar"
import { SearchModal } from "../components/docs/SearchModal"
import { Footer } from "../components/Footer"
import { useDocs, useDocsManifest, useDocsSearchData } from "../hooks/useDocs"

export function DocsPage() {
  const { version, "*": pagePath } = useParams<{
    version: string
    "*": string
  }>()
  const navigate = useNavigate()

  const manifestQuery = useDocsManifest()
  const isValidVersion =
    version === "latest" || manifestQuery.data?.versions.includes(version!)
  const resolvedVersion =
    version === "latest"
      ? (manifestQuery.data?.latest ?? undefined)
      : isValidVersion
        ? version
        : undefined
  const resolvedPath = pagePath || "index"

  const { page, tree, isLoading, error } = useDocs(
    resolvedVersion,
    resolvedPath,
  )

  const searchDataQuery = useDocsSearchData(resolvedVersion)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleVersionChange = async (newVersion: string) => {
    const urlVersion =
      newVersion === manifestQuery.data?.latest ? "latest" : newVersion
    const resolvedNewVersion =
      newVersion === "latest" ? manifestQuery.data?.latest : newVersion

    let pathExists = false
    if (pagePath && resolvedNewVersion) {
      try {
        const index = await fetch(
          `/docs-versions/${resolvedNewVersion}/index.json`,
        )
        const data = await index.json()
        pathExists = !!data.pages[pagePath]
      } catch {
        pathExists = false
      }
    }

    const newPath = pathExists
      ? `/docs/${urlVersion}/${pagePath}`
      : `/docs/${urlVersion}`
    navigate(newPath)
  }

  if (manifestQuery.isLoading || isLoading) {
    return <DocsLoadingState />
  }

  if (manifestQuery.error || error) {
    const message =
      (manifestQuery.error as Error)?.message ||
      (error as Error)?.message ||
      "Unknown error"
    return <DocsErrorState message={message} />
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

  if (!isValidVersion) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-foreground/60">
          The documentation version "{version}" does not exist.
        </p>
      </div>
    )
  }

  if (!resolvedVersion) {
    return <DocsLoadingState />
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
          version={version!}
          versions={manifestQuery.data.versions}
          latestVersion={
            manifestQuery.data.latest ?? manifestQuery.data.versions[0]!
          }
          onVersionChange={handleVersionChange}
          currentPath={resolvedPath}
          onSearchClick={() => setSearchOpen(true)}
        />
        <SearchModal
          open={searchOpen}
          onOpenChange={setSearchOpen}
          version={version!}
          searchData={searchDataQuery.data}
        />
        <main className="min-w-0 flex-1">
          <DocsContent markdown={page.markdown} />
        </main>
      </div>
      <Footer />
    </div>
  )
}
