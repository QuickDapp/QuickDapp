import { getGraphQLClient } from "@shared/graphql/client"
import {
  AUTHENTICATE_WITH_EMAIL,
  SEND_EMAIL_VERIFICATION_CODE,
} from "@shared/graphql/mutations"
import { useState } from "react"
import { type UserProfile, useAuthContext } from "../contexts/AuthContext"
import { useField, useForm } from "../hooks/useForm"
import { Button } from "./Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./Dialog"
import { TextInput } from "./Form"

export interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = "email" | "code"

interface SendEmailResponse {
  sendEmailVerificationCode: {
    success: boolean
    blob?: string
    error?: string
  }
}

interface AuthenticateResponse {
  authenticateWithEmail: {
    success: boolean
    token?: string
    profile?: UserProfile
    error?: string
  }
}

function validateEmail(value: string | undefined): string | undefined {
  if (!value) {
    return "Email is required"
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value)) {
    return "Please enter a valid email address"
  }
  return undefined
}

function validateCode(value: string | undefined): string | undefined {
  if (!value) {
    return "Verification code is required"
  }
  if (!/^\d{6}$/.test(value)) {
    return "Please enter a 6-digit code"
  }
  return undefined
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { login } = useAuthContext()
  const [step, setStep] = useState<Step>("email")
  const [blob, setBlob] = useState<string>("")
  const [submittedEmail, setSubmittedEmail] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string>("")

  const emailField = useField<string>({
    name: "email",
    validate: validateEmail,
  })

  const codeField = useField<string>({
    name: "code",
    validate: validateCode,
  })

  const emailForm = useForm({ fields: [emailField] })
  const codeForm = useForm({ fields: [codeField] })

  const resetForm = () => {
    setStep("email")
    setBlob("")
    setSubmittedEmail("")
    setServerError("")
    emailField.unset()
    codeField.unset()
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm()
    }
    onOpenChange(newOpen)
  }

  const handleSendCode = async () => {
    if (!emailForm.valid || !emailField.value) return

    setIsLoading(true)
    setServerError("")

    try {
      const graphqlClient = getGraphQLClient()
      const response = (await graphqlClient.request(
        SEND_EMAIL_VERIFICATION_CODE,
        {
          email: emailField.value,
        },
      )) as SendEmailResponse

      if (
        response.sendEmailVerificationCode.success &&
        response.sendEmailVerificationCode.blob
      ) {
        setBlob(response.sendEmailVerificationCode.blob)
        setSubmittedEmail(emailField.value)
        setStep("code")
      } else {
        setServerError(
          response.sendEmailVerificationCode.error ||
            "Failed to send verification code",
        )
      }
    } catch (err) {
      console.error("Error sending verification code:", err)
      setServerError("Failed to send verification code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!codeForm.valid || !codeField.value) return

    setIsLoading(true)
    setServerError("")

    try {
      const graphqlClient = getGraphQLClient()
      const response = (await graphqlClient.request(AUTHENTICATE_WITH_EMAIL, {
        email: submittedEmail,
        code: codeField.value,
        blob,
      })) as AuthenticateResponse

      if (
        response.authenticateWithEmail.success &&
        response.authenticateWithEmail.token &&
        response.authenticateWithEmail.profile
      ) {
        login(
          response.authenticateWithEmail.token,
          response.authenticateWithEmail.profile,
        )
        handleOpenChange(false)
      } else {
        setServerError(
          response.authenticateWithEmail.error || "Invalid verification code",
        )
      }
    } catch (err) {
      console.error("Error verifying code:", err)
      setServerError("Failed to verify code. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setStep("email")
    setServerError("")
    codeField.unset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "email" ? "Login with Email" : "Enter Verification Code"}
          </DialogTitle>
          <DialogDescription>
            {step === "email"
              ? "Enter your email address and we'll send you a verification code."
              : `We've sent a 6-digit code to ${submittedEmail}`}
          </DialogDescription>
        </DialogHeader>

        {step === "email" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendCode()
            }}
            className="space-y-4"
          >
            <TextInput
              field={emailField}
              label="Email"
              placeholder="you@example.com"
              type="email"
              required
              disabled={isLoading}
            />

            {serverError && (
              <p className="text-sm text-red-500">{serverError}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={!emailForm.valid || isLoading}
            >
              Send Code
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleVerifyCode()
            }}
            className="space-y-4"
          >
            <TextInput
              field={codeField}
              label="Verification Code"
              placeholder="123456"
              required
              disabled={isLoading}
            />

            {serverError && (
              <p className="text-sm text-red-500">{serverError}</p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                loading={isLoading}
                disabled={!codeForm.valid || isLoading}
              >
                Verify
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
