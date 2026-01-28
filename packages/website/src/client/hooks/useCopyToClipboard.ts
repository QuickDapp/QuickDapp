import { useCallback, useState } from "react"

export function useCopyToClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(
    async (text: string) => {
      if (!navigator.clipboard) {
        console.warn("Clipboard API not available")
        return
      }
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), timeout)
      } catch (error) {
        console.error("Failed to copy to clipboard:", error)
      }
    },
    [timeout],
  )

  return { copied, copy }
}
