import { gql } from "graphql-tag"

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
