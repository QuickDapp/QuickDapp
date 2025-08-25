import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import * as React from "react"
import { getGraphQLClient } from "../../../shared/graphql/client"
import {
  MARK_ALL_NOTIFICATIONS_AS_READ,
  MARK_NOTIFICATION_AS_READ,
} from "../../../shared/graphql/mutations"
import { GET_MY_NOTIFICATIONS } from "../../../shared/graphql/queries"
import { cn } from "../utils/cn"
import { Button } from "./Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./Dialog"
import { Loading } from "./Loading"
import { useOnceVisibleInViewport } from "./OnceVisibleInViewport"

// Helper component for load more trigger
function LoadMoreTrigger({
  onLoadMore,
  isLoading,
}: {
  onLoadMore: () => void
  isLoading: boolean
}) {
  const { ref, hasBeenVisible } = useOnceVisibleInViewport()

  React.useEffect(() => {
    if (hasBeenVisible) {
      onLoadMore()
    }
  }, [hasBeenVisible, onLoadMore])

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className="flex justify-center py-4"
    >
      {isLoading ? (
        <Loading />
      ) : (
        <Button onClick={onLoadMore} variant="outline" size="sm">
          Load More
        </Button>
      )}
    </div>
  )
}

interface Notification {
  id: number
  userId: number
  data: Record<string, any>
  createdAt: string
  read: boolean
}

interface NotificationsResponse {
  notifications: Notification[]
  startIndex: number
  total: number
}

interface NotificationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NotificationsDialog({
  open,
  onOpenChange,
}: NotificationsDialogProps) {
  const [pageParam, setPageParam] = React.useState({
    startIndex: 0,
    perPage: 20,
  })
  const [allNotifications, setAllNotifications] = React.useState<
    Notification[]
  >([])

  const queryClient = useQueryClient()

  // Fetch notifications
  const {
    data: notificationsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["notifications", pageParam],
    queryFn: async () => {
      const response = await getGraphQLClient().request<{
        getMyNotifications: NotificationsResponse
      }>(GET_MY_NOTIFICATIONS, { pageParam })
      return response.getMyNotifications
    },
    enabled: open,
  })

  // Update all notifications when new data comes in
  React.useEffect(() => {
    if (notificationsData) {
      if (pageParam.startIndex === 0) {
        // First page - replace all notifications
        setAllNotifications(notificationsData.notifications)
      } else {
        // Additional pages - append to existing notifications
        setAllNotifications((prev) => [
          ...prev,
          ...notificationsData.notifications,
        ])
      }
    }
  }, [notificationsData, pageParam.startIndex])

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await getGraphQLClient().request<{
        markNotificationAsRead: { success: boolean }
      }>(MARK_NOTIFICATION_AS_READ, { id })
      return response.markNotificationAsRead
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] })
    },
  })

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await getGraphQLClient().request<{
        markAllNotificationsAsRead: { success: boolean }
      }>(MARK_ALL_NOTIFICATIONS_AS_READ)
      return response.markAllNotificationsAsRead
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] })
      // Update local state to mark all as read
      setAllNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true })),
      )
    },
  })

  const handleMarkAsRead = (id: number) => {
    // Optimistically update local state
    setAllNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    )
    markAsReadMutation.mutate(id)
  }

  const handleMarkAllAsRead = React.useCallback(() => {
    markAllAsReadMutation.mutate()
  }, [markAllAsReadMutation])

  const loadMore = React.useCallback(() => {
    if (
      notificationsData &&
      allNotifications.length < notificationsData.total
    ) {
      setPageParam((prev) => ({
        ...prev,
        startIndex: allNotifications.length,
      }))
    }
  }, [notificationsData, allNotifications.length])

  // Reset pagination when dialog opens
  React.useEffect(() => {
    if (open) {
      setPageParam({ startIndex: 0, perPage: 20 })
      setAllNotifications([])
    }
  }, [open])

  const hasUnreadNotifications = React.useMemo(
    () => allNotifications.some((n) => !n.read),
    [allNotifications],
  )

  const canLoadMore = React.useMemo(
    () =>
      notificationsData && allNotifications.length < notificationsData.total,
    [notificationsData, allNotifications.length],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription>
            {notificationsData?.total
              ? `${notificationsData.total} notification${
                  notificationsData.total === 1 ? "" : "s"
                }`
              : "Your notifications will appear here"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading && allNotifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loading />
            </div>
          ) : isError ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">Failed to load notifications</p>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          ) : allNotifications.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No notifications yet
            </div>
          ) : (
            <div className="space-y-2">
              {allNotifications.map((notification, index) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-colors",
                    notification.read
                      ? "bg-slate-800 border-slate-700 text-slate-300"
                      : "bg-slate-700 border-slate-600 text-white hover:bg-slate-600",
                  )}
                  onClick={() =>
                    !notification.read && handleMarkAsRead(notification.id)
                  }
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm">
                        {notification.data.message || "Notification"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {format(
                          new Date(notification.createdAt),
                          "MMM d, yyyy 'at' h:mm a",
                        )}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1" />
                    )}
                  </div>
                </div>
              ))}

              {canLoadMore && (
                <LoadMoreTrigger onLoadMore={loadMore} isLoading={isLoading} />
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {hasUnreadNotifications && (
            <Button
              onClick={handleMarkAllAsRead}
              variant="outline"
              size="sm"
              disabled={markAllAsReadMutation.isPending}
            >
              {markAllAsReadMutation.isPending
                ? "Marking..."
                : "Mark All as Read"}
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)} variant="default">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
