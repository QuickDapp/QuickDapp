import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import {
  createGraphQLRequest,
  generateTestEmail,
  generateTestEmailVerification,
} from "../../helpers/auth"
import { cleanTestDatabase, setupTestDatabase } from "../../helpers/database"
import {
  makeRequest,
  startTestServer,
  waitForServer,
} from "../../helpers/server"
import "../../setup"

describe("Me Query", () => {
  let testServer: any

  beforeAll(async () => {
    await setupTestDatabase()
    testServer = await startTestServer()
    await waitForServer(testServer.url)
  })

  afterAll(async () => {
    if (testServer) {
      await testServer.shutdown()
    }
    await cleanTestDatabase()
  })

  describe("me query", () => {
    it("should return user profile for authenticated user", async () => {
      const email = generateTestEmail()
      const { code, blob } = await generateTestEmailVerification(email)

      // Authenticate first
      const authResponse = await makeRequest(
        `${testServer.url}/graphql`,
        createGraphQLRequest(
          `
          mutation AuthenticateWithEmail($email: String!, $code: String!, $blob: String!) {
            authenticateWithEmail(email: $email, code: $code, blob: $blob) {
              success
              token
              profile {
                id
                email
                createdAt
              }
              error
            }
          }
        `,
          { email, code, blob },
        ),
      )

      const authBody = await authResponse.json()
      expect(authBody.data.authenticateWithEmail.success).toBe(true)
      const token = authBody.data.authenticateWithEmail.token

      // Query me
      const meResponse = await makeRequest(
        `${testServer.url}/graphql`,
        createGraphQLRequest(
          `
          query Me {
            me {
              id
              email
              createdAt
            }
          }
        `,
          undefined,
          token,
        ),
      )

      const meBody = await meResponse.json()
      expect(meResponse.status).toBe(200)
      expect(meBody.errors).toBeUndefined()
      expect(meBody.data.me).toBeDefined()
      expect(meBody.data.me.id).toBeGreaterThan(0)
      expect(meBody.data.me.email).toBe(email.toLowerCase())
      expect(meBody.data.me.createdAt).toBeTruthy()
    })

    it("should return email matching the auth identifier", async () => {
      const email = generateTestEmail()
      const { code, blob } = await generateTestEmailVerification(email)

      // Authenticate
      const authResponse = await makeRequest(
        `${testServer.url}/graphql`,
        createGraphQLRequest(
          `
          mutation AuthenticateWithEmail($email: String!, $code: String!, $blob: String!) {
            authenticateWithEmail(email: $email, code: $code, blob: $blob) {
              success
              token
              error
            }
          }
        `,
          { email, code, blob },
        ),
      )

      const authBody = await authResponse.json()
      const token = authBody.data.authenticateWithEmail.token

      // Query me
      const meResponse = await makeRequest(
        `${testServer.url}/graphql`,
        createGraphQLRequest(
          `
          query Me {
            me {
              email
            }
          }
        `,
          undefined,
          token,
        ),
      )

      const meBody = await meResponse.json()
      expect(meBody.data.me.email).toBe(email.toLowerCase())
    })

    it("should reject unauthenticated requests", async () => {
      const meResponse = await makeRequest(
        `${testServer.url}/graphql`,
        createGraphQLRequest(
          `
          query Me {
            me {
              id
              email
              createdAt
            }
          }
        `,
        ),
      )

      const meBody = await meResponse.json()
      expect(meResponse.status).toBe(200)
      expect(meBody.errors).toBeDefined()
      expect(meBody.errors[0].extensions.code).toBe("UNAUTHORIZED")
    })

    it("should reject invalid tokens", async () => {
      const meResponse = await makeRequest(
        `${testServer.url}/graphql`,
        createGraphQLRequest(
          `
          query Me {
            me {
              id
              email
              createdAt
            }
          }
        `,
          undefined,
          "invalid-token-value",
        ),
      )

      const meBody = await meResponse.json()
      expect(meResponse.status).toBe(200)
      expect(meBody.errors).toBeDefined()
      expect(meBody.errors[0].extensions.code).toBe("UNAUTHORIZED")
    })
  })

  describe("authenticateWithEmail profile response", () => {
    it("should return profile alongside token on successful auth", async () => {
      const email = generateTestEmail()
      const { code, blob } = await generateTestEmailVerification(email)

      const response = await makeRequest(
        `${testServer.url}/graphql`,
        createGraphQLRequest(
          `
          mutation AuthenticateWithEmail($email: String!, $code: String!, $blob: String!) {
            authenticateWithEmail(email: $email, code: $code, blob: $blob) {
              success
              token
              profile {
                id
                email
                createdAt
              }
              error
            }
          }
        `,
          { email, code, blob },
        ),
      )

      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body.errors).toBeUndefined()
      expect(body.data.authenticateWithEmail.success).toBe(true)
      expect(body.data.authenticateWithEmail.token).toBeTruthy()
      expect(body.data.authenticateWithEmail.profile).toBeDefined()
      expect(body.data.authenticateWithEmail.profile.id).toBeGreaterThan(0)
      expect(body.data.authenticateWithEmail.profile.email).toBe(
        email.toLowerCase(),
      )
      expect(body.data.authenticateWithEmail.profile.createdAt).toBeTruthy()
    })

    it("should return profile email matching the authenticated email", async () => {
      const email = generateTestEmail()
      const { code, blob } = await generateTestEmailVerification(email)

      const response = await makeRequest(
        `${testServer.url}/graphql`,
        createGraphQLRequest(
          `
          mutation AuthenticateWithEmail($email: String!, $code: String!, $blob: String!) {
            authenticateWithEmail(email: $email, code: $code, blob: $blob) {
              success
              profile {
                email
              }
              error
            }
          }
        `,
          { email, code, blob },
        ),
      )

      const body = await response.json()
      expect(body.data.authenticateWithEmail.success).toBe(true)
      expect(body.data.authenticateWithEmail.profile.email).toBe(
        email.toLowerCase(),
      )
    })

    it("should return null profile on auth failure", async () => {
      const email = generateTestEmail()
      const { blob } = await generateTestEmailVerification(email)

      const response = await makeRequest(
        `${testServer.url}/graphql`,
        createGraphQLRequest(
          `
          mutation AuthenticateWithEmail($email: String!, $code: String!, $blob: String!) {
            authenticateWithEmail(email: $email, code: $code, blob: $blob) {
              success
              token
              profile {
                id
                email
                createdAt
              }
              error
            }
          }
        `,
          { email, code: "000000", blob },
        ),
      )

      const body = await response.json()
      expect(body.data.authenticateWithEmail.success).toBe(false)
      expect(body.data.authenticateWithEmail.token).toBeNull()
      expect(body.data.authenticateWithEmail.profile).toBeNull()
    })

    it("should return consistent profile between auth response and me query", async () => {
      const email = generateTestEmail()
      const { code, blob } = await generateTestEmailVerification(email)

      // Authenticate and get profile
      const authResponse = await makeRequest(
        `${testServer.url}/graphql`,
        createGraphQLRequest(
          `
          mutation AuthenticateWithEmail($email: String!, $code: String!, $blob: String!) {
            authenticateWithEmail(email: $email, code: $code, blob: $blob) {
              success
              token
              profile {
                id
                email
                createdAt
              }
              error
            }
          }
        `,
          { email, code, blob },
        ),
      )

      const authBody = await authResponse.json()
      const token = authBody.data.authenticateWithEmail.token
      const authProfile = authBody.data.authenticateWithEmail.profile

      // Query me and compare
      const meResponse = await makeRequest(
        `${testServer.url}/graphql`,
        createGraphQLRequest(
          `
          query Me {
            me {
              id
              email
              createdAt
            }
          }
        `,
          undefined,
          token,
        ),
      )

      const meBody = await meResponse.json()
      const meProfile = meBody.data.me

      expect(meProfile.id).toBe(authProfile.id)
      expect(meProfile.email).toBe(authProfile.email)
      expect(meProfile.createdAt).toBe(authProfile.createdAt)
    })
  })
})
