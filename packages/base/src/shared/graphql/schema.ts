import { gql } from "graphql-tag"

export const typeDefs = gql`
  # Recommended by: https://the-guild.dev/graphql/scalars/docs/scalars/big-int
  directive @auth on FIELD_DEFINITION

  scalar DateTime
  scalar JSON
  scalar PositiveInt
  scalar BigInt

  type Notification {
    id: PositiveInt!
    userId: PositiveInt!
    data: JSON!
    createdAt: DateTime!
    read: Boolean!
  }

  type NotificationsResponse {
    notifications: [Notification]!
    startIndex: Int!
    total: Int!
  }

  type Success {
    success: Boolean!
  }

  # User profile type
  type UserProfile {
    id: PositiveInt!
    email: String
    createdAt: DateTime!
  }

  # Authentication types
  type AuthResult {
    success: Boolean!
    token: String
    profile: UserProfile
    error: String
  }

  type ValidateTokenResult {
    valid: Boolean!
  }

  type EmailVerificationResult {
    success: Boolean!
    blob: String
    error: String
  }

  # OAuth types
  enum OAuthProvider {
    GOOGLE
    FACEBOOK
    GITHUB
    X
    TIKTOK
    LINKEDIN
  }

  type OAuthLoginUrlResult {
    success: Boolean!
    url: String
    provider: String
    error: String
  }

  input PageParam {
    startIndex: Int!
    perPage: Int!
  }

  type Query {
    # Token validation (requires auth header, but validates it)
    validateToken: ValidateTokenResult!

    # User-specific queries (auth required)
    me: UserProfile! @auth
    getMyNotifications(pageParam: PageParam!): NotificationsResponse! @auth
    getMyUnreadNotificationsCount: Int! @auth
  }

  type Mutation {
    # Authentication mutations (no auth required)
    sendEmailVerificationCode(email: String!): EmailVerificationResult!
    authenticateWithEmail(email: String!, code: String!, blob: String!): AuthResult!
    getOAuthLoginUrl(provider: OAuthProvider!, redirectUrl: String): OAuthLoginUrlResult!

    # User-specific mutations (auth required)
    markNotificationAsRead(id: PositiveInt!): Success! @auth
    markAllNotificationsAsRead: Success! @auth
  }
`
