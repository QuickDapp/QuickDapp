import { Check, Copy } from "lucide-react"
import { type ReactNode, useCallback, useRef, useState } from "react"
import { Button } from "../Button"

interface CodeBlockProps {
  children: ReactNode
}

export function CodeBlock({ children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  const handleCopy = useCallback(() => {
    const text = preRef.current?.textContent || ""
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  return (
    <div className="group relative my-4">
      <pre
        ref={preRef}
        className="shiki overflow-x-auto rounded-lg border border-foreground/10 p-4 text-sm"
      >
        {children}
      </pre>
      <Button
        variant="ghost"
        size="xs"
        onClick={handleCopy}
        className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}
