// Android WebView Bridge
// Этот файл обеспечивает связь между React/Next.js приложением и Android WebView

declare global {
    interface Window {
        FCM?: {
            sendTokenToServer: (token: string, userId?: string) => void;
            getFCMToken: () => string | null;
            debugTokenStorage: () => string;
            forceGetToken: () => string;
            checkTokenAfterPermission: () => string;
            notifyReady: () => void;
        };
    }
}

class AndroidBridge {
    private static instance: AndroidBridge;

    private constructor() {
        this.setupAuthListener();
    }

    public static getInstance(): AndroidBridge {
        if (!AndroidBridge.instance) {
            AndroidBridge.instance = new AndroidBridge();
        }
        return AndroidBridge.instance;
    }

    /**
     * Уведомляет Android о том, что токен авторизации был сохранен
     */
    public notifyTokenSaved(token: string): void {
        console.log('🔔 Notifying Android about token save');

        // Проверяем, что мы в Android WebView
        if (typeof window !== 'undefined' && window.FCM) {
            // Даем время на сохранение в localStorage
            setTimeout(() => {
                try {
                    // Принудительно получаем токен и отправляем FCM токен
                    if (window.FCM?.forceGetToken) {
                        window.FCM.forceGetToken();
                    }

                    // Также уведомляем о готовности
                    if (window.androidApp?.notifyReady) {
                        window.androidApp.notifyReady();
                    }
                } catch (error) {
                    console.error('Error notifying Android:', error);
                }
            }, 1000);
        }
    }

    /**
     * Уведомляет Android о том, что пользователь вышел
     */
    public notifyLogout(): void {
        console.log('🔔 Notifying Android about logout');

        if (typeof window !== 'undefined' && window.FCM) {
            try {
                // Очищаем FCM токен при выходе
                // Можно добавить вызов для удаления FCM токена
                console.log('User logged out, FCM token should be cleaned');

                // Уведомляем Android о выходе
                if (window.androidApp?.notifyReady) {
                    window.androidApp.notifyReady();
                }
            } catch (error) {
                console.error('Error notifying Android about logout:', error);
            }
        }
    }

    /**
     * Настраивает слушатель изменений в auth store
     */
    private setupAuthListener(): void {
        if (typeof window === 'undefined') return;

        // Слушаем изменения в localStorage для auth-storage
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key: string, value: string) {
            originalSetItem.call(this, key, value);

            if (key === 'auth-storage') {
                try {
                    const authData = JSON.parse(value);
                    if (authData.token) {
                        console.log('🔔 Auth token saved to localStorage');
                        AndroidBridge.getInstance().notifyTokenSaved(authData.token);
                    }
                } catch (error) {
                    console.error('Error parsing auth-storage:', error);
                }
            }
        };

        // Слушаем удаление auth-storage
        const originalRemoveItem = localStorage.removeItem;
        localStorage.removeItem = function(key: string) {
            originalRemoveItem.call(this, key);

            if (key === 'auth-storage') {
                console.log('🔔 Auth token removed from localStorage');
                AndroidBridge.getInstance().notifyLogout();
            }
        };
    }

    /**
     * Проверяет, работает ли приложение в Android WebView
     */
    public isAndroidWebView(): boolean {
        return typeof window !== 'undefined' &&
            (window.FCM !== undefined ||
                window.androidApp !== undefined ||
                navigator.userAgent.includes('wv') ||
                navigator.userAgent.includes('Android'));
    }

    /**
     * Отладочная информация
     */
    public debug(): void {
        if (typeof window !== 'undefined') {
            console.log('🔍 Android Bridge Debug:');
            console.log('  FCM available:', !!window.FCM);
            console.log('  androidApp available:', !!window.androidApp);
            console.log('  User agent:', navigator.userAgent);

            if (window.FCM?.debugTokenStorage) {
                window.FCM.debugTokenStorage();
            }

            if (window.androidApp?.notifyReady) {
                console.log('  androidApp.notifyReady available');
            }
        }
    }
}

// Экспортируем singleton
export const androidBridge = AndroidBridge.getInstance();

// Автоматически инициализируем мост
if (typeof window !== 'undefined') {
    // Даем время на загрузку страницы
    setTimeout(() => {
        if (androidBridge.isAndroidWebView()) {
            console.log('🤖 Android WebView detected, bridge initialized');

            // Уведомляем Android о готовности страницы
            if (window.androidApp?.notifyReady) {
                console.log('🔔 Notifying Android that WebView is ready...');
                window.androidApp.notifyReady();
            }
        }
    }, 1000);
}
