import { create } from 'zustand'

interface NotificationsModalState {
    isOpen: boolean
    open: () => void
    close: () => void
}

export const useNotificationsModalStore = create<NotificationsModalState>((set) => ({
    isOpen: false,
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
}))
