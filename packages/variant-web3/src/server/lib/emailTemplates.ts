import { serverConfig } from "../../shared/config/server"

const emailLayout = (content: string): string => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #374151;">
  ${content}
</div>
`

export const verificationCodeEmail = (code: string) => {
  const appName = serverConfig.APP_NAME

  return {
    subject: "Your verification code",
    text: `Your verification code is: ${code}`,
    html: emailLayout(`
      <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #111827;">
        Your verification code
      </h1>
      <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
        Enter the following code to verify your email address:
      </p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111827;">${code}</span>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #6b7280;">
        If you didn't request this code, you can safely ignore this email.
      </p>
      <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin-top: 24px;">
        &mdash; The ${appName} Team
      </p>
    `),
  }
}
