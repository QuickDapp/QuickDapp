import { useState } from "react"
import { Button } from "../components/Button"
import { LoginModal } from "../components/LoginModal"
import { useAuthContext } from "../contexts/AuthContext"
import logoSvg from "../images/logo.svg"

export function HomePage() {
  const { isAuthenticated, email } = useAuthContext()
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <img src={logoSvg} alt="QuickDapp Logo" className="w-16 h-16 mb-8" />
      <h1 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-8">
        This is the
        <br />
        QuickDapp demo page!
      </h1>
      {isAuthenticated ? (
        <p className="text-foreground">
          Email: <span className="font-medium">{email}</span>
        </p>
      ) : (
        <>
          <Button onClick={() => setLoginModalOpen(true)}>Login</Button>
          <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
        </>
      )}
    </div>
  )
}
