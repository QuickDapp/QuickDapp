import { gql } from "graphql-tag"

export const USER_PROFILE_FIELDS = gql`
  fragment UserProfileFields on UserProfile {
    id
    email
    createdAt
  }
`

export const AUTH_RESULT_FIELDS = gql`
  fragment AuthResultFields on AuthResult {
    success
    token
    profile {
      ...UserProfileFields
    }
    error
  }
  ${USER_PROFILE_FIELDS}
`

export const NOTIFICATION_FIELDS = gql`
  fragment NotificationFields on Notification {
    id
    userId
    data
    createdAt
    read
  }
`

export const NOTIFICATIONS_RESPONSE_FIELDS = gql`
  fragment NotificationsResponseFields on NotificationsResponse {
    notifications {
      ...NotificationFields
    }
    startIndex
    total
  }
  ${NOTIFICATION_FIELDS}
`

export const VALIDATE_TOKEN_RESULT_FIELDS = gql`
  fragment ValidateTokenResultFields on ValidateTokenResult {
    valid
  }
`

export const SUCCESS_FIELDS = gql`
  fragment SuccessFields on Success {
    success
  }
`

export const EMAIL_VERIFICATION_RESULT_FIELDS = gql`
  fragment EmailVerificationResultFields on EmailVerificationResult {
    success
    blob
    error
  }
`
