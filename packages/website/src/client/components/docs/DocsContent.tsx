import type { Root } from "hast"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import { Fragment, type JSX, useMemo } from "react"
import { jsx, jsxs } from "react/jsx-runtime"
import rehypeHighlight from "rehype-highlight"
import rehypeSlug from "rehype-slug"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"
import { cn } from "../../utils/cn"
import { DocsCallout } from "./DocsCallout"

interface DocsContentProps {
  markdown: string
  className?: string
}

function convertRetypeCallouts(markdown: string): string {
  return markdown.replace(
    /^:::(note|warning|danger|tip)?\s*\n([\s\S]*?)^:::$/gm,
    (_match, type, content) => {
      const calloutType = type || "note"
      return `<callout type="${calloutType}">\n${content.trim()}\n</callout>`
    },
  )
}

function createComponents(): Record<string, (props: any) => JSX.Element> {
  return {
    callout: ({ type, children }: { type?: string; children: any }) => (
      <DocsCallout type={type as any}>{children}</DocsCallout>
    ),
    a: ({ href, children, ...props }: any) => (
      <a
        href={href}
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
        className="text-anchor hover:underline"
        {...props}
      >
        {children}
      </a>
    ),
    code: ({ className, children, ...props }: any) => {
      const isInline = !className
      if (isInline) {
        return (
          <code
            className="rounded bg-foreground/10 px-1.5 py-0.5 text-sm font-mono"
            {...props}
          >
            {children}
          </code>
        )
      }
      return (
        <code className={cn("text-sm", className)} {...props}>
          {children}
        </code>
      )
    },
    pre: ({ children, ...props }: any) => (
      <pre
        className="my-4 overflow-x-auto rounded-lg bg-foreground/5 p-4 text-sm"
        {...props}
      >
        {children}
      </pre>
    ),
    h1: ({ children, id, ...props }: any) => (
      <h1
        id={id}
        className="mb-6 mt-8 scroll-mt-20 text-3xl font-bold first:mt-0"
        {...props}
      >
        {children}
      </h1>
    ),
    h2: ({ children, id, ...props }: any) => (
      <h2
        id={id}
        className="mb-4 mt-8 scroll-mt-20 border-b border-foreground/10 pb-2 text-2xl font-semibold"
        {...props}
      >
        {children}
      </h2>
    ),
    h3: ({ children, id, ...props }: any) => (
      <h3
        id={id}
        className="mb-3 mt-6 scroll-mt-20 text-xl font-semibold"
        {...props}
      >
        {children}
      </h3>
    ),
    h4: ({ children, id, ...props }: any) => (
      <h4
        id={id}
        className="mb-2 mt-4 scroll-mt-20 text-lg font-medium"
        {...props}
      >
        {children}
      </h4>
    ),
    p: ({ children, ...props }: any) => (
      <p className="my-4 leading-7" {...props}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }: any) => (
      <ul className="my-4 ml-6 list-disc space-y-2" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }: any) => (
      <ol className="my-4 ml-6 list-decimal space-y-2" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }: any) => (
      <li className="leading-7" {...props}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...props }: any) => (
      <blockquote
        className="my-4 border-l-4 border-foreground/20 pl-4 italic"
        {...props}
      >
        {children}
      </blockquote>
    ),
    table: ({ children, ...props }: any) => (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm" {...props}>
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }: any) => (
      <th
        className="border border-foreground/20 bg-foreground/5 px-4 py-2 text-left font-semibold"
        {...props}
      >
        {children}
      </th>
    ),
    td: ({ children, ...props }: any) => (
      <td className="border border-foreground/20 px-4 py-2" {...props}>
        {children}
      </td>
    ),
    hr: (props: any) => (
      <hr className="my-8 border-t border-foreground/20" {...props} />
    ),
    strong: ({ children, ...props }: any) => (
      <strong className="font-semibold" {...props}>
        {children}
      </strong>
    ),
    img: ({ src, alt, ...props }: any) => (
      <img
        src={src}
        alt={alt}
        className="my-4 max-w-full rounded-lg"
        loading="lazy"
        {...props}
      />
    ),
  }
}

export function DocsContent({ markdown, className }: DocsContentProps) {
  const content = useMemo(() => {
    try {
      const processedMarkdown = convertRetypeCallouts(markdown)

      const processor = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeSlug)
        .use(rehypeHighlight, { detect: true, ignoreMissing: true })

      const mdast = processor.parse(processedMarkdown)
      const hast = processor.runSync(mdast) as Root

      return toJsxRuntime(hast, {
        Fragment,
        jsx: jsx as any,
        jsxs: jsxs as any,
        components: createComponents(),
        passNode: true,
      })
    } catch (error) {
      console.error("Failed to render markdown:", error)
      return <div className="text-red-500">Failed to render content</div>
    }
  }, [markdown])

  return <div className={cn("docs-content", className)}>{content}</div>
}
