import type { ReactNode } from "react"
import { Component } from "react"

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: any
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(_error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
    this.setState({
      error,
      errorInfo,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
          <div className="max-w-md mx-auto p-8 text-center">
            <h1 className="text-2xl font-bold mb-4 text-red-400">
              Something went wrong
            </h1>
            <div className="bg-gray-900 p-4 rounded mb-4 text-left">
              <p className="text-sm text-gray-300 mb-2">Error:</p>
              <pre className="text-xs text-red-300 whitespace-pre-wrap">
                {this.state.error?.message}
              </pre>
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null })
                window.location.reload()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Reload App
            </button>
            <div className="mt-4">
              <details className="text-xs text-gray-400">
                <summary className="cursor-pointer mb-2">
                  Technical Details
                </summary>
                <pre className="text-left bg-gray-800 p-2 rounded overflow-auto max-h-32">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
