import formData from "form-data"
import Mailgun from "mailgun.js"
import { serverConfig } from "../../shared/config/server"
import type { Logger } from "./logger"

const mailgun = new Mailgun(formData)

type MailgunClient = ReturnType<typeof mailgun.client>

export type MailerSendParams = {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  replyTo?: string
}

export class Mailer {
  private logger: Logger
  private fromAddress?: string
  private replyTo?: string
  private domain?: string
  private mailClient?: MailgunClient

  constructor(logger: Logger) {
    const { MAILGUN_API_KEY, MAILGUN_FROM_ADDRESS, MAILGUN_REPLY_TO } =
      serverConfig

    this.fromAddress = MAILGUN_FROM_ADDRESS
    this.replyTo = MAILGUN_REPLY_TO || undefined
    this.domain = MAILGUN_FROM_ADDRESS?.split("@")[1]
    this.logger = logger

    if (MAILGUN_API_KEY) {
      this.mailClient = mailgun.client({
        username: "api",
        key: MAILGUN_API_KEY,
      })
    }
  }

  async send(params: MailerSendParams): Promise<void> {
    const { to, subject, text, html = "" } = params

    this.logger.info(`Sending email to ${to} with subject: ${subject}`)

    const attrs: Record<string, unknown> = {
      from: this.fromAddress ?? "",
      to: Array.isArray(to) ? to : [to],
      subject,
      text,
      html: html || text,
    }

    const replyTo = params.replyTo ?? this.replyTo
    if (replyTo) {
      attrs["h:Reply-To"] = replyTo
    }

    try {
      if (this.mailClient && this.domain) {
        await this.mailClient.messages.create(this.domain, attrs as any)
      } else {
        this.logger.warn(
          "Mail client not configured - logging email to console instead:",
        )
        this.logger.warn("━".repeat(50))
        this.logger.warn(`To: ${Array.isArray(to) ? to.join(", ") : to}`)
        this.logger.warn(`Subject: ${subject}`)
        this.logger.warn(`Body: ${text}`)
        this.logger.warn("━".repeat(50))
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      const errMsg = `Error sending email: ${error.message || "Unknown error"}`
      throw new Error(errMsg)
    }
  }
}
