/**
 * OAuth callback routes for handling provider redirects
 */

import { serverConfig } from "@shared/config/server"
import { Elysia, t } from "elysia"
import { LOG_CATEGORIES } from "../lib/logger"
import type { ServerApp } from "../types"
import { AuthService } from "./index"
import {
  exchangeCodeAndFetchUserInfo,
  OAUTH_PROVIDER_CONFIG,
  OAuthConfigError,
  type OAuthProvider,
  OAuthProviderError,
} from "./oauth"
import { decryptOAuthState } from "./oauth-state"

function getErrorRedirectUrl(error: string): string {
  const baseUrl = serverConfig.BASE_URL
  return `${baseUrl}/auth/error?error=${encodeURIComponent(error)}`
}

function getSuccessRedirectUrl(): string {
  return serverConfig.BASE_URL
}

function createRedirectResponse(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url },
  })
}

export function createOAuthRoutes(serverApp: ServerApp) {
  const logger = serverApp.createLogger(LOG_CATEGORIES.AUTH)

  const handleCallback = async (
    code: string | undefined,
    encryptedState: string | undefined,
  ): Promise<Response> => {
    try {
      // Decrypt and validate state
      if (!encryptedState) {
        logger.warn("No OAuth state received")
        return createRedirectResponse(
          getErrorRedirectUrl("Invalid OAuth state"),
        )
      }

      const statePayload = await decryptOAuthState(encryptedState)
      if (!statePayload) {
        logger.warn("OAuth state decryption failed or expired")
        return createRedirectResponse(
          getErrorRedirectUrl("Invalid or expired OAuth state"),
        )
      }

      const provider = statePayload.provider as OAuthProvider
      const codeVerifier = statePayload.codeVerifier

      // Validate code
      if (!code) {
        logger.warn(`No authorization code received for ${provider}`)
        return createRedirectResponse(
          getErrorRedirectUrl("No authorization code received"),
        )
      }

      // Verify PKCE providers have code verifier
      const providerConfig = OAUTH_PROVIDER_CONFIG[provider]
      if (providerConfig.requiresPkce && !codeVerifier) {
        logger.warn(`No code verifier found for PKCE provider ${provider}`)
        return createRedirectResponse(
          getErrorRedirectUrl("Missing code verifier"),
        )
      }

      logger.debug(`Processing OAuth callback for ${provider}`)

      // Exchange code for tokens and fetch user info
      const userInfo = await exchangeCodeAndFetchUserInfo(
        provider,
        code,
        codeVerifier,
      )

      logger.debug(
        `OAuth user info received for ${provider}: id=${userInfo.id}`,
      )

      // Authenticate user
      const authService = new AuthService(serverApp)
      const authResult = await authService.authenticateWithOAuth(
        providerConfig.authMethod,
        userInfo.email,
        userInfo.id,
      )

      logger.info(
        `OAuth authentication successful for ${provider}, user ${authResult.user.id}`,
      )

      // Redirect to success page with token in URL fragment
      const successUrl = `${getSuccessRedirectUrl()}#token=${authResult.token}`
      return createRedirectResponse(successUrl)
    } catch (error) {
      logger.error("OAuth callback error:", error)

      let errorMessage = "Authentication failed"
      if (error instanceof OAuthConfigError) {
        errorMessage = "OAuth configuration error"
      } else if (error instanceof OAuthProviderError) {
        errorMessage = "OAuth provider error"
      } else if (
        error instanceof Error &&
        error.message === "Account is disabled"
      ) {
        errorMessage = "Account is disabled"
      }

      return createRedirectResponse(getErrorRedirectUrl(errorMessage))
    }
  }

  const querySchema = {
    query: t.Object({
      code: t.Optional(t.String()),
      state: t.Optional(t.String()),
      error: t.Optional(t.String()),
    }),
  }

  return new Elysia({ prefix: "/auth/callback" })
    .get(
      "/google",
      async ({ query }) => handleCallback(query.code, query.state),
      querySchema,
    )
    .get(
      "/facebook",
      async ({ query }) => handleCallback(query.code, query.state),
      querySchema,
    )
    .get(
      "/github",
      async ({ query }) => handleCallback(query.code, query.state),
      querySchema,
    )
    .get(
      "/x",
      async ({ query }) => handleCallback(query.code, query.state),
      querySchema,
    )
    .get(
      "/tiktok",
      async ({ query }) => handleCallback(query.code, query.state),
      querySchema,
    )
    .get(
      "/linkedin",
      async ({ query }) => handleCallback(query.code, query.state),
      querySchema,
    )
}
