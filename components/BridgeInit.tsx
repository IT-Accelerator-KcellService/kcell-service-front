"use client";

/**
 * Клиентский компонент для инициализации мостов (iOS / Android bridge + FCM)
 * и НАДЁЖНОЙ детекции смены аккаунта через Zustand subscribe.
 *
 * Почему НЕ работал override localStorage.setItem:
 * - Zustand persist может обойти override (ссылка на storage берётся до inject)
 * - clearAuth() не удаляет ключ, а пишет {token: null} — _scheduleLoginCheck
 *   видит null и ничего не делает
 * - Periodic check (setInterval) останавливается через 30 секунд
 *
 * Надёжный способ: подписаться на useAuthStore.subscribe() — Zustand гарантирует
 * вызов при КАЖДОМ изменении state, включая setAuth/clearAuth.
 */

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/useAuthStore";

export default function BridgeInit() {
    const prevTokenRef = useRef<string | null>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        // Инициализируем ios-bridge и fcm (side-effects модулей)
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

    useEffect(() => {
        // Берём текущий токен при первом рендере
        const currentToken = useAuthStore.getState().token;
        prevTokenRef.current = currentToken;
        initializedRef.current = true;

        console.log("[BridgeInit] Auth store subscribe started, current token:", currentToken ? currentToken.substring(0, 20) + "..." : "null");

        // Подписываемся на ВСЕ изменения auth store
        const unsub = useAuthStore.subscribe((state) => {
            const newToken = state.token;
            const prevToken = prevTokenRef.current;

            // Ничего не изменилось
            if (newToken === prevToken) return;

            console.log("[BridgeInit] Auth token changed:", prevToken ? "EXISTS" : "null", "→", newToken ? "EXISTS" : "null");

            // Проверяем, есть ли ReactNativeWebView (мы в iOS/Android WebView)
            const rn = (window as any).ReactNativeWebView;
            if (!rn?.postMessage) {
                // Обычный браузер — обновляем ref и выходим
                prevTokenRef.current = newToken;
                return;
            }

            if (!newToken && prevToken) {
                // === LOGOUT ===
                console.log("[BridgeInit] LOGOUT detected — sending userLoggedOut to React Native");
                rn.postMessage(JSON.stringify({ type: "userLoggedOut" }));
            } else if (newToken && !prevToken) {
                // === LOGIN (первый или после logout) ===
                console.log("[BridgeInit] LOGIN detected — sending userLoggedIn to React Native");
                rn.postMessage(
                    JSON.stringify({
                        type: "userLoggedIn",
                        authToken: newToken,
                        success: true,
                    })
                );
            } else if (newToken && prevToken && newToken !== prevToken) {
                // === СМЕНА АККАУНТА (другой токен без промежуточного logout) ===
                console.log("[BridgeInit] ACCOUNT SWITCH detected — sending userLoggedOut + userLoggedIn");
                rn.postMessage(JSON.stringify({ type: "userLoggedOut" }));
                // Небольшая задержка чтобы React Native успел сбросить флаги
                setTimeout(() => {
                    rn.postMessage(
                        JSON.stringify({
                            type: "userLoggedIn",
                            authToken: newToken,
                            success: true,
                        })
                    );
                }, 200);
            }

            prevTokenRef.current = newToken;
        });

        return () => unsub();
    }, []);

    return null;
}
