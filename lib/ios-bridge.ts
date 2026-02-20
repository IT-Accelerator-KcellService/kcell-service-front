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

type PermissionType = 'camera' | 'location' | 'notifications' | 'motion';

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
     * Проверяет, работает ли приложение в iOS WebView (нативная оболочка с инъекцией).
     * В обычном Safari на iPhone messageHandlers нет — тогда возвращаем false и используем DeviceMotionEvent.requestPermission.
     */
    public isIOSWebView(): boolean {
        if (typeof window === 'undefined') return false;

        const ua = navigator.userAgent || navigator.vendor;
        if (/Android/i.test(ua)) return false;
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        const hasWebkitBridge = !!(window as any).webkit?.messageHandlers;

        return isIOS && hasWebkitBridge;
    }

    /**
     * Проверка статуса разрешения через iOS PermissionBridge (window.FCM).
     * Нативный слой возвращает результат через callback: window.FCM[callbackName](status).
     */
    public async checkPermission(permission: PermissionType): Promise<string> {
        if (this.isIOSWebView() && window.FCM?.checkPermissionStatus) {
            try {
                return await new Promise<string>((resolve) => {
                    const cb = '__iosBridgePermissionCallback_' + Date.now();
                    (window as any).FCM = (window as any).FCM || {};
                    (window as any).FCM[cb] = (status: string) => {
                        delete (window as any).FCM[cb];
                        resolve(status || 'unknown');
                    };
                    (window as any).FCM.checkPermissionStatus(permission, cb);
                    setTimeout(() => {
                        if ((window as any).FCM?.[cb]) {
                            delete (window as any).FCM[cb];
                            resolve('unknown');
                        }
                    }, 3000);
                });
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
        // В iOS WebView blob URL не открывается — используем нативный saveFile или ReactNativeWebView.postMessage
        if (this.isIOSWebView()) {
            const useNativeSave =
                !!(window as any).webkit?.messageHandlers?.saveFile ||
                !!(window as any).ReactNativeWebView?.postMessage;
            if (!useNativeSave) {
                if (typeof window !== 'undefined' && window.alert) {
                    window.alert('Скачивание файла в приложении недоступно. Обратитесь к разработчику.');
                }
                return;
            }
        } else {
            // Обычный браузер — скачивание через blob
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

                        if ((window as any).webkit?.messageHandlers?.saveFile) {
                            (window as any).webkit.messageHandlers.saveFile.postMessage({
                                filename,
                                base64Data: base64data,
                                mimeType,
                            });
                        } else if ((window as any).ReactNativeWebView?.postMessage) {
                            (window as any).ReactNativeWebView.postMessage(
                                JSON.stringify({
                                    type: 'saveFile',
                                    filename,
                                    base64Data: base64data,
                                    mimeType,
                                })
                            );
                        }
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

    /**
     * Сохранение уже сгенерированных данных (base64) через нативный saveFile.
     * Для клиентских файлов (например XLSX.write в память), чтобы не использовать blob URL.
     */
    public saveFileFromBase64(
        base64Data: string,
        filename: string,
        mimeType = 'application/octet-stream'
    ): void {
        if (!this.isIOSWebView()) return;
        try {
            if ((window as any).webkit?.messageHandlers?.saveFile) {
                (window as any).webkit.messageHandlers.saveFile.postMessage({
                    filename,
                    base64Data: base64Data,
                    mimeType,
                });
            } else if ((window as any).ReactNativeWebView?.postMessage) {
                (window as any).ReactNativeWebView.postMessage(
                    JSON.stringify({
                        type: 'saveFile',
                        filename,
                        base64Data: base64Data,
                        mimeType,
                    })
                );
            }
        } catch (e) {
            console.error('[iOSBridge] saveFileFromBase64 error:', e);
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
    // Если уже denied — iOS не покажет системный диалог повторно.
    // React Native покажет алерт «Открыть Настройки» при вызове requestPermission.
    if (status === 'denied') {
        // Всё равно вызываем requestPermission, чтобы React Native показал алерт с кнопкой Settings
        iosBridge.requestPermission('camera');
        return false;
    }
    return iosBridge.requestPermission('camera');
}

export async function ensureLocationPermission(): Promise<boolean> {
    if (!iosBridge.isIOSWebView()) return true;
    const status = await iosBridge.checkPermission('location');
    if (status === 'granted') return true;
    // Если уже denied — iOS не покажет системный диалог повторно.
    // React Native покажет алерт «Открыть Настройки» при вызове requestPermission.
    if (status === 'denied') {
        // Всё равно вызываем requestPermission, чтобы React Native показал алерт с кнопкой Settings
        iosBridge.requestPermission('location');
        return false;
    }
    return iosBridge.requestPermission('location');
}

/**
 * Ждёт появления window.FCM с startMotionUpdates (нативная инъекция может быть отложенной).
 * Возвращает true, если FCM готов, иначе false по истечении timeoutMs.
 */
export function waitForFCM(timeoutMs = 5000): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false);
    if ((window as any).FCM?.startMotionUpdates) return Promise.resolve(true);
    return new Promise((resolve) => {
        const deadline = Date.now() + timeoutMs;
        const t = setInterval(() => {
            if ((window as any).FCM?.startMotionUpdates) {
                clearInterval(t);
                resolve(true);
            } else if (Date.now() >= deadline) {
                clearInterval(t);
                resolve(false);
            }
        }, 300);
    });
}

/** Разрешение на датчики движения (акселерометр/гироскоп) для Activity Tracker. */
export async function ensureMotionPermission(): Promise<boolean> {
    if (!iosBridge.isIOSWebView()) return true;
    // Если нативная сторона не внедрила FCM или не реализует проверку motion — считаем разрешённым и полагаемся на startMotionUpdates
    if (!(window as any).FCM?.checkPermissionStatus) return true;
    const status = await iosBridge.checkPermission('motion');
    if (status === 'granted') return true;
    if (status === 'denied') return false;
    const requested = await iosBridge.requestPermission('motion');
    if (requested) return true;
    // После requestPermission иногда приходит "unknown" — не блокируем запуск, нативный слой может начать отдавать данные
    if (status === 'unknown') return true;
    return false;
}

/** Запуск передачи данных CoreMotion в WebView (Activity Tracker). В WebView на iOS DeviceMotionEvent не приходит. */
export function startMotionUpdates(): void {
    if (typeof window === 'undefined' || !(window as any).FCM?.startMotionUpdates) return;
    (window as any).FCM.startMotionUpdates();
}

/** Остановка передачи данных CoreMotion. */
export function stopMotionUpdates(): void {
    if (typeof window === 'undefined' || !(window as any).FCM?.stopMotionUpdates) return;
    (window as any).FCM.stopMotionUpdates();
}

/** Включить фоновый режим для Activity Tracker (обновления геолокации держат приложение активным). */
export function startBackgroundTracking(): void {
    if (typeof window === 'undefined' || !(window as any).FCM?.startBackgroundTracking) return;
    (window as any).FCM.startBackgroundTracking();
}

/** Выключить фоновый режим. */
export function stopBackgroundTracking(): void {
    if (typeof window === 'undefined' || !(window as any).FCM?.stopBackgroundTracking) return;
    (window as any).FCM.stopBackgroundTracking();
}
