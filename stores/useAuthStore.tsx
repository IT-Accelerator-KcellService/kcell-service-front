import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Office {
    name: string;
}

interface User {
    id: number;
    email: string;
    full_name: string;
    phone?: string;
    office_id: number;
    office: Office;
    role: string;
    email_notifications: boolean;
    security_notifications: boolean;
    marketing_notifications: boolean;
    push_notifications: boolean;
}

interface AuthState {
    token: string | null;
    role: string | null;
    user: User | null;
    setAuth: (token: string, role: string, user: User) => void;
    clearAuth: () => void;
    updateUser: (updater: Partial<User> | ((prev: User | null) => User | null)) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            role: null,
            user: null,

            setAuth: (token, role, user) =>
                set({
                    token,
                    role,
                    user,
                }),

            clearAuth: () =>
                set({
                    token: null,
                    role: null,
                    user: null,
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