import { gql } from "graphql-tag"

export const GET_HEALTH = gql`
  query GetHealth {
    health
  }
`

export const GET_VERSION = gql`
  query GetVersion {
    version
  }
`

export const GET_MY_NOTIFICATIONS = gql`
  query GetMyNotifications($pageParam: PageParam!) {
    getMyNotifications(pageParam: $pageParam) {
      notifications {
        id
        userId
        data
        createdAt
        read
      }
      startIndex
      total
    }
  }
`

export const GET_MY_UNREAD_NOTIFICATIONS_COUNT = gql`
  query GetMyUnreadNotificationsCount {
    getMyUnreadNotificationsCount
  }
`

// Token queries
export const GET_MY_TOKENS = gql`
  query GetMyTokens {
    getMyTokens {
      tokens {
        address
        name
        symbol
        decimals
        totalSupply
        balance
        createdAt
      }
      total
    }
  }
`

export const GET_TOKEN_INFO = gql`
  query GetTokenInfo($address: String!) {
    getTokenInfo(address: $address) {
      address
      name
      symbol
      decimals
      totalSupply
      balance
      createdAt
    }
  }
`

export const GET_TOKEN_COUNT = gql`
  query GetTokenCount {
    getTokenCount
  }
`
