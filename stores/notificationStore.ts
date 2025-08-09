import { create } from 'zustand'

interface NotificationState {
    notifications: []
    notificationLoading: boolean
    setNotifications: (notifications: any[]) => void
    setNotificationLoading: (loading: boolean) => void
    clearNotifications: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    notificationLoading: true,
    setNotifications: (notifications:any) => set({ notifications }),
    setNotificationLoading: (notificationLoading) => set({ notificationLoading }),
    clearNotifications: () => set({ notifications: [], notificationLoading: true }),
}))