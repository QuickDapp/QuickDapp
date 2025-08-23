import { gql } from "graphql-tag"

// Authentication mutations
export const GENERATE_SIWE_MESSAGE = gql`
  mutation GenerateSiweMessage($address: String!) {
    generateSiweMessage(address: $address) {
      message
      nonce
    }
  }
`

export const AUTHENTICATE_WITH_SIWE = gql`
  mutation AuthenticateWithSiwe($message: String!, $signature: String!) {
    authenticateWithSiwe(message: $message, signature: $signature) {
      success
      token
      wallet
      error
    }
  }
`

export const MARK_NOTIFICATION_AS_READ = gql`
  mutation MarkNotificationAsRead($id: PositiveInt!) {
    markNotificationAsRead(id: $id) {
      success
    }
  }
`

export const MARK_ALL_NOTIFICATIONS_AS_READ = gql`
  mutation MarkAllNotificationsAsRead {
    markAllNotificationsAsRead {
      success
    }
  }
`

// Token mutations
export const CREATE_TOKEN = gql`
  mutation CreateToken($input: CreateTokenInput!) {
    createToken(input: $input) {
      success
      tokenAddress
      transactionHash
      error
    }
  }
`

export const TRANSFER_TOKEN = gql`
  mutation TransferToken($input: TransferTokenInput!) {
    transferToken(input: $input) {
      success
      transactionHash
      error
    }
  }
`
