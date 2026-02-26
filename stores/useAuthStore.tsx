import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Office {
    name: string;
    photo?: string | null;
}

interface User {
    id: number;
    full_name: string;
    phone?: string;
    email?: string;
    email_verified?: boolean;
    office_id: number;
    office: Office;
    role: string;
    email_notifications: boolean;
    security_notifications: boolean;
    marketing_notifications: boolean;
    push_notifications: boolean;
    service_category_id?: number;
}

interface AuthState {
    token: string | null;
    role: string | null;
    user: User | null;
    isGuest: boolean;
    setAuth: (token: string, role: string, user: User) => void;
    setGuestAuth: () => void;
    clearAuth: () => void;
    updateUser: (updater: Partial<User> | ((prev: User | null) => User | null)) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            role: null,
            user: null,
            isGuest: false,

            setAuth: (token, role, user) =>
                set({
                    token,
                    role,
                    user,
                    isGuest: false,
                }),

            setGuestAuth: () =>
                set({
                    token: "guest-demo",
                    role: "client",
                    user: {
                        id: 0,
                        full_name: "Гость (демо)",
                        phone: "+7 000 000 00 00",
                        email: "guest@demo.kz",
                        email_verified: false,
                        office_id: 0,
                        office: { name: "Демо" },
                        role: "client",
                        email_notifications: false,
                        security_notifications: false,
                        marketing_notifications: false,
                        push_notifications: false,
                    },
                    isGuest: true,
                }),

            clearAuth: () =>
                set({
                    token: null,
                    role: null,
                    user: null,
                    isGuest: false,
                }),
            updateUser: (updater) =>
                set((state) => {
                    if (typeof updater === "function") {
                        return { user: updater(state.user) };
                    }
                    return {
                        user: state.user ? { ...state.user, ...updater } : null,
                    };
                }),
        }),
        {
            name: "auth-storage", // ключ для localStorage
        }
    )
);