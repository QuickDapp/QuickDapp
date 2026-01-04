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
  OAUTH_PROVIDER,
  OAUTH_PROVIDER_CONFIG,
  OAuthConfigError,
  type OAuthProvider,
  OAuthProviderError,
} from "./oauth"

// Cookie names
const OAUTH_STATE_COOKIE = "oauth_state"
const OAUTH_CODE_VERIFIER_COOKIE = "oauth_code_verifier"
const OAUTH_PROVIDER_COOKIE = "oauth_provider"
const AUTH_TOKEN_COOKIE = "auth_token"

// Error page redirect URL
function getErrorRedirectUrl(error: string): string {
  const baseUrl = serverConfig.BASE_URL
  return `${baseUrl}/auth/error?error=${encodeURIComponent(error)}`
}

// Success redirect URL
function getSuccessRedirectUrl(): string {
  return serverConfig.BASE_URL
}

// Parse cookies from cookie header
function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {}
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...valueParts] = c.trim().split("=")
      return [key, valueParts.join("=")]
    }),
  )
}

// Clear OAuth cookies
function clearOAuthCookies(): string[] {
  const clearOptions = "Path=/; HttpOnly; Max-Age=0"
  return [
    `${OAUTH_STATE_COOKIE}=; ${clearOptions}`,
    `${OAUTH_CODE_VERIFIER_COOKIE}=; ${clearOptions}`,
    `${OAUTH_PROVIDER_COOKIE}=; ${clearOptions}`,
  ]
}

export function createOAuthRoutes(serverApp: ServerApp) {
  const logger = serverApp.createLogger(LOG_CATEGORIES.AUTH)

  // Helper to create redirect response with cookies
  const createRedirectResponse = (url: string, cookies: string[]): Response => {
    const headers = new Headers()
    headers.set("Location", url)
    for (const cookie of cookies) {
      headers.append("Set-Cookie", cookie)
    }
    return new Response(null, { status: 302, headers })
  }

  // Create a shared callback handler
  const handleCallback = async (
    provider: OAuthProvider,
    code: string | undefined,
    stateFromQuery: string | undefined,
    cookies: Record<string, string>,
  ): Promise<Response> => {
    try {
      // Validate state (CSRF protection)
      const storedState = cookies[OAUTH_STATE_COOKIE]
      if (!storedState || storedState !== stateFromQuery) {
        logger.warn(`OAuth state mismatch for ${provider}`)
        return createRedirectResponse(
          getErrorRedirectUrl("Invalid OAuth state"),
          clearOAuthCookies(),
        )
      }

      // Validate code
      if (!code) {
        logger.warn(`No authorization code received for ${provider}`)
        return createRedirectResponse(
          getErrorRedirectUrl("No authorization code received"),
          clearOAuthCookies(),
        )
      }

      // Get code verifier for PKCE providers
      const providerConfig = OAUTH_PROVIDER_CONFIG[provider]
      let codeVerifier: string | undefined
      if (providerConfig.requiresPkce) {
        codeVerifier = cookies[OAUTH_CODE_VERIFIER_COOKIE]
        if (!codeVerifier) {
          logger.warn(`No code verifier found for PKCE provider ${provider}`)
          return createRedirectResponse(
            getErrorRedirectUrl("Missing code verifier"),
            clearOAuthCookies(),
          )
        }
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

      // Set auth token cookie and clear OAuth cookies
      const cookieList = clearOAuthCookies()
      const tokenCookieOptions =
        "Path=/; HttpOnly; SameSite=Lax; Max-Age=604800" // 7 days
      cookieList.push(
        `${AUTH_TOKEN_COOKIE}=${authResult.token}; ${tokenCookieOptions}`,
      )

      // Redirect to success page
      return createRedirectResponse(getSuccessRedirectUrl(), cookieList)
    } catch (error) {
      logger.error(`OAuth callback error for ${provider}:`, error)

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

      return createRedirectResponse(
        getErrorRedirectUrl(errorMessage),
        clearOAuthCookies(),
      )
    }
  }

  return new Elysia({ prefix: "/auth/callback" })
    .get(
      "/google",
      async ({ query, headers }) => {
        const cookies = parseCookies(headers.cookie || null)
        return handleCallback(
          OAUTH_PROVIDER.GOOGLE,
          query.code,
          query.state,
          cookies,
        )
      },
      {
        query: t.Object({
          code: t.Optional(t.String()),
          state: t.Optional(t.String()),
          error: t.Optional(t.String()),
        }),
      },
    )
    .get(
      "/facebook",
      async ({ query, headers }) => {
        const cookies = parseCookies(headers.cookie || null)
        return handleCallback(
          OAUTH_PROVIDER.FACEBOOK,
          query.code,
          query.state,
          cookies,
        )
      },
      {
        query: t.Object({
          code: t.Optional(t.String()),
          state: t.Optional(t.String()),
          error: t.Optional(t.String()),
        }),
      },
    )
    .get(
      "/github",
      async ({ query, headers }) => {
        const cookies = parseCookies(headers.cookie || null)
        return handleCallback(
          OAUTH_PROVIDER.GITHUB,
          query.code,
          query.state,
          cookies,
        )
      },
      {
        query: t.Object({
          code: t.Optional(t.String()),
          state: t.Optional(t.String()),
          error: t.Optional(t.String()),
        }),
      },
    )
    .get(
      "/x",
      async ({ query, headers }) => {
        const cookies = parseCookies(headers.cookie || null)
        return handleCallback(
          OAUTH_PROVIDER.X,
          query.code,
          query.state,
          cookies,
        )
      },
      {
        query: t.Object({
          code: t.Optional(t.String()),
          state: t.Optional(t.String()),
          error: t.Optional(t.String()),
        }),
      },
    )
    .get(
      "/tiktok",
      async ({ query, headers }) => {
        const cookies = parseCookies(headers.cookie || null)
        return handleCallback(
          OAUTH_PROVIDER.TIKTOK,
          query.code,
          query.state,
          cookies,
        )
      },
      {
        query: t.Object({
          code: t.Optional(t.String()),
          state: t.Optional(t.String()),
          error: t.Optional(t.String()),
        }),
      },
    )
    .get(
      "/linkedin",
      async ({ query, headers }) => {
        const cookies = parseCookies(headers.cookie || null)
        return handleCallback(
          OAUTH_PROVIDER.LINKEDIN,
          query.code,
          query.state,
          cookies,
        )
      },
      {
        query: t.Object({
          code: t.Optional(t.String()),
          state: t.Optional(t.String()),
          error: t.Optional(t.String()),
        }),
      },
    )
}
