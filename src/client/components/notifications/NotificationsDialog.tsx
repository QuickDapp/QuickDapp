import { getGraphQLClient } from "@shared/graphql/client"
import {
  MARK_ALL_NOTIFICATIONS_AS_READ,
  MARK_NOTIFICATION_AS_READ,
} from "@shared/graphql/mutations"
import { GET_MY_NOTIFICATIONS } from "@shared/graphql/queries"
import type { NotificationData } from "@shared/notifications/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  type NotificationFromSocket,
  useNotifications,
} from "../../hooks/useNotifications"
import { Button } from "../Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../Dialog"
import { Loading } from "../Loading"
import { useOnceVisibleInViewport } from "../OnceVisibleInViewport"
import { NotificationItem } from "./NotificationComponents"

// Helper component for load more trigger
function LoadMoreTrigger({
  onLoadMore,
  isLoading,
}: {
  onLoadMore: () => void
  isLoading: boolean
}) {
  const { ref, hasBeenVisible } = useOnceVisibleInViewport()

  useEffect(() => {
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
  data: NotificationData
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
  onUnreadCountChange?: (count: number) => void
}

// Utility function to remove duplicate notifications based on ID
function deduplicateNotifications(
  notifications: Notification[],
): Notification[] {
  const seen = new Set<number>()
  return notifications.filter((notification) => {
    if (seen.has(notification.id)) {
      return false
    }
    seen.add(notification.id)
    return true
  })
}

export function NotificationsDialog({
  open,
  onOpenChange,
  onUnreadCountChange,
}: NotificationsDialogProps) {
  const [pageParam, setPageParam] = useState({
    startIndex: 0,
    perPage: 20,
  })
  const [allNotifications, setAllNotifications] = useState<Notification[]>([])

  const queryClient = useQueryClient()

  // Memoized WebSocket notification handler
  const handleNotificationReceived = useCallback(
    (notification: NotificationFromSocket) => {
      if (open) {
        // Add new notification to the beginning of the list and update unread count
        setAllNotifications((prev) => {
          // Check if notification already exists to prevent duplicates
          if (prev.some((n) => n.id === notification.id)) {
            return prev
          }

          const newNotifications = deduplicateNotifications([
            notification,
            ...prev,
          ])

          // Update unread count if the new notification is unread
          if (!notification.read && onUnreadCountChange) {
            const unreadCount = newNotifications.filter((n) => !n.read).length
            onUnreadCountChange(unreadCount)
          }
          return newNotifications
        })
      }
    },
    [open, onUnreadCountChange],
  )

  // Subscribe to real-time notifications when dialog is open
  useNotifications({
    onNotificationReceived: handleNotificationReceived,
  })

  // Fetch notifications - simple query without complex caching logic
  const {
    data: notificationsData,
    isLoading,
    isFetching,
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
    // Disable caching to always get fresh data
    refetchOnMount: "always",
    staleTime: 0,
  })

  // Update notifications when data comes in with deduplication
  useEffect(() => {
    if (notificationsData) {
      if (pageParam.startIndex === 0) {
        // First page - merge with existing real-time notifications from WebSocket
        setAllNotifications((prev) => {
          // Merge and deduplicate: keep WebSocket notifications that aren't in the fetched data
          const merged = deduplicateNotifications([
            ...prev,
            ...notificationsData.notifications,
          ])
            // Sort by createdAt, newest first
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )

          // Update unread count in parent component
          if (onUnreadCountChange) {
            const unreadCount = merged.filter((n) => !n.read).length
            onUnreadCountChange(unreadCount)
          }

          return merged
        })
      } else {
        // Additional pages - append to existing notifications with deduplication
        setAllNotifications((prev) => {
          const merged = deduplicateNotifications([
            ...prev,
            ...notificationsData.notifications,
          ])
            // Sort by createdAt, newest first
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
          return merged
        })
      }
    }
  }, [notificationsData, pageParam.startIndex, onUnreadCountChange])

  // Mark notification as read mutation - just update local state, no complex invalidation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await getGraphQLClient().request<{
        markNotificationAsRead: { success: boolean }
      }>(MARK_NOTIFICATION_AS_READ, { id })
      return response.markNotificationAsRead
    },
    onSuccess: () => {
      // Simple: just invalidate unread count, local state already updated
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
      // Update local state to mark all as read
      setAllNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true })),
      )
      // Update unread count in parent component
      if (onUnreadCountChange) {
        onUnreadCountChange(0)
      }
      // Just invalidate unread count
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationsCount"] })
    },
  })

  const handleMarkAsRead = useCallback(
    (id: number) => {
      // Optimistically update local state
      setAllNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id
            ? { ...notification, read: true }
            : notification,
        ),
      )
      markAsReadMutation.mutate(id)

      // Update unread count in parent component
      if (onUnreadCountChange) {
        const updatedUnreadCount = allNotifications.filter(
          (n) => !n.read && n.id !== id,
        ).length
        onUnreadCountChange(updatedUnreadCount)
      }
    },
    [markAsReadMutation, onUnreadCountChange, allNotifications],
  )

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate()
  }, [markAllAsReadMutation])

  const loadMore = useCallback(() => {
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

  // Reset pagination and refetch when dialog opens
  useEffect(() => {
    if (open) {
      setPageParam({ startIndex: 0, perPage: 20 })
      // Only refetch if not already fetching
      if (!isFetching) {
        refetch()
      }
    }
  }, [open, isFetching, refetch])

  const hasUnreadNotifications = useMemo(
    () => allNotifications.some((n) => !n.read),
    [allNotifications],
  )

  const canLoadMore = useMemo(
    () =>
      notificationsData && allNotifications.length < notificationsData.total,
    [notificationsData, allNotifications.length],
  )

  // Memoized notification items to prevent re-rendering
  const notificationItems = useMemo(() => {
    return allNotifications.map((notification) => (
      <NotificationItem
        key={notification.id}
        id={notification.id}
        data={notification.data}
        createdAt={notification.createdAt}
        read={notification.read}
        onClick={() => !notification.read && handleMarkAsRead(notification.id)}
      />
    ))
  }, [allNotifications, handleMarkAsRead])

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
              {notificationItems}

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
