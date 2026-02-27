"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNotificationsModalStore } from "@/stores/useNotificationsModalStore";

export default function NotificationsPage() {
    const open = useNotificationsModalStore((s) => s.open);
    const { user } = useAuthStore();

    useEffect(() => {
        if (user) {
            open();
        }
    }, [user, open]);

    // Страница открывает модалку; при закрытии модалка сама вызовет router.back()
    return null;
}
