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
  }

  type Mutation {
    # User-specific mutations (auth required)
    markNotificationAsRead(id: PositiveInt!): Success! @auth
    markAllNotificationsAsRead: Success! @auth
  }
`
