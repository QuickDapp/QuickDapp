import { useAuthContext } from "../contexts/AuthContext"

export function HomePage() {
  const { isAuthenticated } = useAuthContext()

  return (
    <div className="p-4">
      <p className="mb-6">
        Welcome to QuickDapp Base - a modern web application boilerplate with
        authentication, database, and real-time features.
      </p>

      {isAuthenticated ? (
        <div>
          <p className="text-green-600">You are logged in.</p>
        </div>
      ) : (
        <div>
          <p className="text-muted-foreground">
            Sign in using email or OAuth to get started.
          </p>
        </div>
      )}
    </div>
  )
}
