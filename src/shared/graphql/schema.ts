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

  # Authentication types
  type SiweMessageResult {
    message: String!
    nonce: String!
  }

  type AuthResult {
    success: Boolean!
    token: String
    web3Wallet: String
    error: String
  }

  type ValidateTokenResult {
    valid: Boolean!
    web3Wallet: String
  }

  type EmailVerificationResult {
    success: Boolean!
    blob: String
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
    getMyNotifications(pageParam: PageParam!): NotificationsResponse! @auth
    getMyUnreadNotificationsCount: Int! @auth
  }

  type Mutation {
    # Authentication mutations (no auth required)
    generateSiweMessage(address: String!): SiweMessageResult!
    authenticateWithSiwe(message: String!, signature: String!): AuthResult!
    sendEmailVerificationCode(email: String!): EmailVerificationResult!
    authenticateWithEmail(email: String!, code: String!, blob: String!): AuthResult!

    # User-specific mutations (auth required)
    markNotificationAsRead(id: PositiveInt!): Success! @auth
    markAllNotificationsAsRead: Success! @auth
  }
`
