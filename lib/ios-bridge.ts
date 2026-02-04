// iOS WebView Bridge
// Этот файл предназначен для работы Next.js-приложения внутри iOS WebView:
// - проверка и запрос разрешений (camera, location, notifications) через window.FCM
// - скачивание файлов через native saveFile handler (WebViewMessageHandler.swift)

declare global {
    interface Window {
        ReactNativeWebView?: {
            postMessage: (message: string) => void;
        };
    }
}

type PermissionType = 'camera' | 'location' | 'notifications';

class IOSBridge {
    private static instance: IOSBridge;

    private constructor() {}

    public static getInstance(): IOSBridge {
        if (!IOSBridge.instance) {
            IOSBridge.instance = new IOSBridge();
        }
        return IOSBridge.instance;
    }

    /**
     * Проверяет, работает ли приложение в iOS WebView
     */
    public isIOSWebView(): boolean {
        if (typeof window === 'undefined') return false;

        const ua = navigator.userAgent || navigator.vendor;
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        const hasWebkitBridge =
            !!window.webkit && !!window.webkit.messageHandlers;

        return isIOS || hasWebkitBridge;
    }

    /**
     * Проверка статуса разрешения через iOS PermissionBridge (window.FCM)
     */
    public async checkPermission(permission: PermissionType): Promise<string> {
        if (this.isIOSWebView() && window.FCM?.checkPermissionStatus) {
            try {
                const status = window.FCM.checkPermissionStatus(permission);
                if (status === 'granted' || status === 'denied' || status === 'notDetermined') {
                    return status;
                }
            } catch (e) {
                console.error('[iOSBridge] checkPermission error:', e);
            }
        }

        // Для веба используем стандартный API для уведомлений
        if (permission === 'notifications' && typeof Notification !== 'undefined') {
            return Notification.permission;
        }

        return 'unknown';
    }

    /**
     * Запрос разрешения через PermissionBridge / Notification API
     */
    public async requestPermission(permission: PermissionType): Promise<boolean> {
        if (this.isIOSWebView() && window.FCM?.requestPermission) {
            try {
                window.FCM.requestPermission(permission);

                // Ждём, пока статус станет определённым
                return new Promise((resolve) => {
                    const check = async () => {
                        const status = await this.checkPermission(permission);
                        if (status === 'granted' || status === 'denied') {
                            resolve(status === 'granted');
                        } else {
                            setTimeout(check, 500);
                        }
                    };

                    setTimeout(check, 300);
                });
            } catch (e) {
                console.error('[iOSBridge] requestPermission error:', e);
            }
        }

        // Fallback для веба
        if (permission === 'notifications' && typeof Notification !== 'undefined') {
            const result = await Notification.requestPermission();
            return result === 'granted';
        }

        return false;
    }

    /**
     * Проверка включенности геолокации
     */
    public isLocationEnabled(): boolean {
        if (this.isIOSWebView() && window.FCM?.isLocationEnabled) {
            try {
                return window.FCM.isLocationEnabled();
            } catch (e) {
                console.error('[iOSBridge] isLocationEnabled error:', e);
            }
        }
        return false;
    }

    /**
     * Уведомление нативного слоя iOS о том, что auth‑токен сохранён во фронте.
     * Аналогично AndroidBridge.notifyTokenSaved, но через ReactNativeWebView.
     */
    public notifyTokenSaved(token: string): void {
        if (!this.isIOSWebView()) return;

        try {
            if (window.ReactNativeWebView?.postMessage) {
                window.ReactNativeWebView.postMessage(
                    JSON.stringify({
                        type: 'authTokenSaved',
                        token,
                    }),
                );
            }
        } catch (e) {
            console.error('[iOSBridge] notifyTokenSaved error:', e);
        }
    }

    /**
     * Скачивание файла через native saveFile handler
     * Ожидает обычный HTTP URL, получает blob, конвертирует в base64 и отправляет в iOS.
     */
    public async downloadFileViaNative(
        url: string,
        filename: string,
        mimeTypeFallback = 'application/octet-stream',
        headers?: Record<string, string>
    ): Promise<void> {
        if (!this.isIOSWebView() || !window.webkit?.messageHandlers?.saveFile) {
            // В браузере или без бриджа — должен использоваться обычный download
            console.warn('[iOSBridge] saveFile handler not available, fallback to browser download');
            const res = await fetch(url, { headers });
            const blob = await res.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(objectUrl);
            return;
        }

        try {
            const response = await fetch(url, { headers });
            const blob = await response.blob();
            const reader = new FileReader();

            await new Promise<void>((resolve, reject) => {
                reader.onloadend = () => {
                    try {
                        const result = reader.result?.toString() || '';
                        const base64data = result.split(',')[1] || '';
                        const mimeType = blob.type || mimeTypeFallback;

                        window.webkit?.messageHandlers?.saveFile?.postMessage({
                            filename,
                            base64Data: base64data,
                            mimeType,
                        });
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                };
                reader.onerror = (e) => reject(e);
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('[iOSBridge] downloadFileViaNative error:', error);
            throw error;
        }
    }
}

export const iosBridge = IOSBridge.getInstance();

/**
 * Удобные хелперы для фронта, аналогичные Android bridge:
 * - ensureCameraPermission()
 * - ensureLocationPermission()
 * Их можно вызывать из компонентов/хуков без прямой работы с window.FCM.
 */

export async function ensureCameraPermission(): Promise<boolean> {
    if (!iosBridge.isIOSWebView()) return true; // в вебе даём работать как есть
    const status = await iosBridge.checkPermission('camera');
    if (status === 'granted') return true;
    return iosBridge.requestPermission('camera');
}

export async function ensureLocationPermission(): Promise<boolean> {
    if (!iosBridge.isIOSWebView()) return true;
    const status = await iosBridge.checkPermission('location');
    if (status === 'granted') return true;
    return iosBridge.requestPermission('location');
}


// Авто‑инициализация, аналогичная Android bridge: слушаем изменения auth-storage
// и уведомляем iOS нативный слой, когда во фронте сохраняется auth‑токен.
if (typeof window !== 'undefined') {
    const originalSetItem = localStorage.setItem;

    localStorage.setItem = function (key: string, value: string) {
        originalSetItem.call(this, key, value);

        try {
            if (key === 'auth-storage' && iosBridge.isIOSWebView()) {
                const authData = JSON.parse(value);
                const token: string | undefined =
                    authData?.state?.token || authData?.token;
                if (token) {
                    iosBridge.notifyTokenSaved(token);
                }
            }
        } catch (e) {
            console.error('[iOSBridge] auth-storage listener error:', e);
        }
    };
}


