import type { ReactNode } from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { CookieConsentBanner } from "../components/CookieConsentBanner"

export interface CookieConsentContextValue {
  consent: "accepted" | "declined" | null
  hasConsented: boolean
  isAccepted: boolean
  isDeclined: boolean
  acceptCookies: () => void
  declineCookies: () => void
  resetConsent: () => void
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(
  null,
)

export interface CookieConsentProviderProps {
  children: ReactNode
  storageKey?: string
  showBanner?: boolean
  bannerProps?: Partial<React.ComponentProps<typeof CookieConsentBanner>>
}

export function CookieConsentProvider({
  children,
  storageKey = "cookie-consent",
  showBanner = true,
  bannerProps = {},
}: CookieConsentProviderProps) {
  const [consent, setConsent] = useState<"accepted" | "declined" | null>(null)

  useEffect(() => {
    const storedConsent = localStorage.getItem(storageKey)
    setConsent(storedConsent as "accepted" | "declined" | null)
  }, [storageKey])

  const acceptCookies = () => {
    localStorage.setItem(storageKey, "accepted")
    setConsent("accepted")
  }

  const declineCookies = () => {
    localStorage.setItem(storageKey, "declined")
    setConsent("declined")
  }

  const resetConsent = () => {
    localStorage.removeItem(storageKey)
    setConsent(null)
  }

  const contextValue: CookieConsentContextValue = {
    consent,
    hasConsented: consent !== null,
    isAccepted: consent === "accepted",
    isDeclined: consent === "declined",
    acceptCookies,
    declineCookies,
    resetConsent,
  }

  return (
    <CookieConsentContext.Provider value={contextValue}>
      {children}
      {showBanner && (
        <CookieConsentBanner
          onAccept={acceptCookies}
          onDecline={declineCookies}
          storageKey={storageKey}
          {...bannerProps}
        />
      )}
    </CookieConsentContext.Provider>
  )
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext)
  if (!context) {
    throw new Error(
      "useCookieConsent must be used within CookieConsentProvider",
    )
  }
  return context
}
