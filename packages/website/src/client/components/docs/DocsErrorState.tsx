interface DocsErrorStateProps {
  message: string
}

export function DocsErrorState({ message }: DocsErrorStateProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">Error loading documentation</h1>
      <p className="text-foreground/60">{message}</p>
    </div>
  )
}
