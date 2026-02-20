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

            // Определяем среду: React Native WebView или Android native WebView
            const rn = (window as any).ReactNativeWebView;
            const fcmBridge = (window as any).FCM; // Android native WebView (Kcell copy)
            const isReactNative = !!rn?.postMessage;
            const isAndroidNative = !isReactNative && !!fcmBridge?.notifyLogout;

            if (!isReactNative && !isAndroidNative) {
                // Обычный браузер — обновляем ref и выходим
                prevTokenRef.current = newToken;
                return;
            }

            if (!newToken && prevToken) {
                // === LOGOUT ===
                if (isReactNative) {
                    console.log("[BridgeInit] LOGOUT detected — sending userLoggedOut to React Native");
                    rn.postMessage(JSON.stringify({ type: "userLoggedOut" }));
                } else if (isAndroidNative) {
                    console.log("[BridgeInit] LOGOUT detected — calling FCM.notifyLogout (Android native)");
                    fcmBridge.notifyLogout();
                }
            } else if (newToken && !prevToken) {
                // === LOGIN (первый или после logout) ===
                if (isReactNative) {
                    console.log("[BridgeInit] LOGIN detected — sending userLoggedIn to React Native");
                    rn.postMessage(
                        JSON.stringify({
                            type: "userLoggedIn",
                            authToken: newToken,
                            success: true,
                        })
                    );
                } else if (isAndroidNative) {
                    console.log("[BridgeInit] LOGIN detected — calling FCM.sendStoredTokenToServer (Android native)");
                    // Даём время на сохранение токена в localStorage
                    setTimeout(() => {
                        fcmBridge.sendStoredTokenToServer();
                    }, 500);
                }
            } else if (newToken && prevToken && newToken !== prevToken) {
                // === СМЕНА АККАУНТА (другой токен без промежуточного logout) ===
                if (isReactNative) {
                    console.log("[BridgeInit] ACCOUNT SWITCH detected — sending userLoggedOut + userLoggedIn");
                    rn.postMessage(JSON.stringify({ type: "userLoggedOut" }));
                    setTimeout(() => {
                        rn.postMessage(
                            JSON.stringify({
                                type: "userLoggedIn",
                                authToken: newToken,
                                success: true,
                            })
                        );
                    }, 200);
                } else if (isAndroidNative) {
                    console.log("[BridgeInit] ACCOUNT SWITCH detected — reset + re-send FCM (Android native)");
                    fcmBridge.notifyLogout();
                    // Даём время на сброс флагов и сохранение нового токена
                    setTimeout(() => {
                        fcmBridge.sendStoredTokenToServer();
                    }, 500);
                }
            }

            prevTokenRef.current = newToken;
        });

        return () => unsub();
    }, []);

    return null;
}
