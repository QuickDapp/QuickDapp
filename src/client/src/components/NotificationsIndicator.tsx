import { useQuery } from "@tanstack/react-query"
import * as React from "react"
import { getGraphQLClient } from "../../../shared/graphql/client"
import { GET_MY_UNREAD_NOTIFICATIONS_COUNT } from "../../../shared/graphql/queries"
import { Button } from "./Button"
import { NotificationsDialog } from "./NotificationsDialog"
import { Svg } from "./Svg"

// Bell icon component
function BellIcon({ className }: { className?: string }) {
  return (
    <Svg viewBox="0 0 24 24" className={className}>
      <path
        fillRule="evenodd"
        d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.243.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z"
        clipRule="evenodd"
      />
    </Svg>
  )
}

interface NotificationsIndicatorProps {
  className?: string
}

export function NotificationsIndicator({
  className,
}: NotificationsIndicatorProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const { data: unreadCount, isLoading } = useQuery({
    queryKey: ["unreadNotificationsCount"],
    queryFn: async () => {
      const response = await getGraphQLClient().request<{
        getMyUnreadNotificationsCount: number
      }>(GET_MY_UNREAD_NOTIFICATIONS_COUNT)
      return response.getMyUnreadNotificationsCount
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className={className}
          disabled={isLoading}
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </div>
      <NotificationsDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
