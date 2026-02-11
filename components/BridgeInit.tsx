"use client";

/**
 * Клиентский компонент для инициализации мостов (iOS / Android bridge + FCM).
 *
 * В Next.js App Router layout.tsx — серверный компонент. Импорт модулей
 * с побочными эффектами (override localStorage.setItem и т.д.) в серверном
 * компоненте НЕ запускает их в браузере.
 *
 * BridgeInit — "use client" — гарантирует, что ios-bridge.ts и fcm.ts
 * загружаются и инициализируются на клиенте при первом рендере.
 */

import { useEffect } from "react";

export default function BridgeInit() {
    useEffect(() => {
        // Динамический импорт запускает auto-init (side-effects) модулей на клиенте:
        // - ios-bridge.ts: перехват localStorage.setItem → детекция смены аккаунта → уведомление React Native
        // - fcm.ts: инициализация FCM‑сервиса (import ios-bridge внутри)
        import("@/lib/ios-bridge").then(({ iosBridge }) => {
            if (iosBridge.isIOSWebView()) {
                console.log("[BridgeInit] iOS WebView detected — ios-bridge initialized");
            }
        });
        import("@/lib/fcm").then(({ fcmService }) => {
            fcmService.initialize().catch(console.error);
            console.log("[BridgeInit] FCM service initialized");
        });
    }, []);

    return null;
}
