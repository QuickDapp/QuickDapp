import { gql } from "graphql-tag"
import {
  AUTH_RESULT_FIELDS,
  EMAIL_VERIFICATION_RESULT_FIELDS,
  SUCCESS_FIELDS,
} from "./fragments"

export const SEND_EMAIL_VERIFICATION_CODE = gql`
  mutation SendEmailVerificationCode($email: String!) {
    sendEmailVerificationCode(email: $email) {
      ...EmailVerificationResultFields
    }
  }
  ${EMAIL_VERIFICATION_RESULT_FIELDS}
`

export const AUTHENTICATE_WITH_EMAIL = gql`
  mutation AuthenticateWithEmail($email: String!, $code: String!, $blob: String!) {
    authenticateWithEmail(email: $email, code: $code, blob: $blob) {
      ...AuthResultFields
    }
  }
  ${AUTH_RESULT_FIELDS}
`

export const MARK_NOTIFICATION_AS_READ = gql`
  mutation MarkNotificationAsRead($id: PositiveInt!) {
    markNotificationAsRead(id: $id) {
      ...SuccessFields
    }
  }
  ${SUCCESS_FIELDS}
`

export const MARK_ALL_NOTIFICATIONS_AS_READ = gql`
  mutation MarkAllNotificationsAsRead {
    markAllNotificationsAsRead {
      ...SuccessFields
    }
  }
  ${SUCCESS_FIELDS}
`
