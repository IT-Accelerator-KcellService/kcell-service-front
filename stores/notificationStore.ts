import { create } from 'zustand'

interface NotificationState {
    notifications: any[]
    notificationLoading: boolean
    setNotifications: (notifications: any[]) => void
    appendNotifications: (notifications: any[]) => void
    updateNotification: (id: number, updates: { is_read?: boolean }) => void
    setNotificationLoading: (loading: boolean) => void
    clearNotifications: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    notificationLoading: true,
    setNotifications: (notifications: any[]) => set({ notifications }),
    appendNotifications: (newNotifications: any[]) =>
        set((state) => {
            const existingIds = new Set(state.notifications.map((n: any) => n.id))
            const toAdd = newNotifications.filter((n: any) => !existingIds.has(n.id))
            return { notifications: [...state.notifications, ...toAdd] }
        }),
    updateNotification: (id: number, updates: { is_read?: boolean }) =>
        set((state) => ({
            notifications: state.notifications.map((n: any) =>
                n.id === id ? { ...n, ...updates } : n
            ),
        })),
    setNotificationLoading: (notificationLoading) => set({ notificationLoading }),
    clearNotifications: () => set({ notifications: [], notificationLoading: true }),
}))