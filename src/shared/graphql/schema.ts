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

  # Token-related types
  type Token {
    address: String!
    name: String!
    symbol: String!
    decimals: Int!
    totalSupply: BigInt!
    balance: BigInt!
    createdAt: DateTime!
  }

  type TokensResponse {
    tokens: [Token]!
    total: Int!
  }

  type CreateTokenResult {
    success: Boolean!
    tokenAddress: String
    transactionHash: String
    error: String
  }

  type TransferTokenResult {
    success: Boolean!
    transactionHash: String
    error: String
  }

  input CreateTokenInput {
    name: String!
    symbol: String!
    decimals: Int!
    initialSupply: BigInt!
  }

  input TransferTokenInput {
    tokenAddress: String!
    to: String!
    amount: BigInt!
  }

  input PageParam {
    startIndex: Int!
    perPage: Int!
  }

  type Query {
    # Health check queries (no auth required)
    health: String!
    version: String!
    
    # User-specific queries (auth required)
    getMyNotifications(pageParam: PageParam!): NotificationsResponse! @auth
    getMyUnreadNotificationsCount: Int! @auth
    
    # Token queries (auth required)
    getMyTokens: TokensResponse! @auth
    getTokenInfo(address: String!): Token @auth
    getTokenCount: Int! @auth
  }

  type Mutation {
    # User-specific mutations (auth required)
    markNotificationAsRead(id: PositiveInt!): Success! @auth
    markAllNotificationsAsRead: Success! @auth
    
    # Token mutations (auth required)
    createToken(input: CreateTokenInput!): CreateTokenResult! @auth
    transferToken(input: TransferTokenInput!): TransferTokenResult! @auth
  }
`
