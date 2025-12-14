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
            checkPermissionStatus: (permission: string) => string;
            requestPermission: (permission: string) => void;
            isLocationEnabled: () => boolean;
            getAuthToken: (callback: string) => void;
            getFCMTokenWithCallback: (callback: string) => void;
        };
        androidApp?: {
            notifyReady: () => void;
            reloadPage: () => void;
            saveFileBase64: (fileName: string, base64: string, mimeType: string) => void;
            showHealthNotification: (message: string) => void;
        };
        onAndroidEvent?: (event: string, data: any) => void;
        onFCMTokenSent?: (result: { success: boolean; code?: number; error?: string }) => void;
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
     * Проверка статуса разрешения
     * @param permission - тип разрешения: "camera", "location", "notifications"
     * @returns Promise с статусом: "granted", "denied", или "unknown"
     */
    public async checkPermission(permission: 'camera' | 'location' | 'notifications'): Promise<string> {
        if (this.isAndroidWebView() && window.FCM?.checkPermissionStatus) {
            return window.FCM.checkPermissionStatus(permission);
        }
        
        // Для веба используем стандартные API
        if (permission === 'notifications' && 'Notification' in window) {
            return Notification.permission;
        }
        
        // Для камеры и локации в вебе всегда "unknown" (нужно использовать стандартные API)
        return 'unknown';
    }
    
    /**
     * Запрос разрешения
     * @param permission - тип разрешения: "camera", "location", "notifications"
     * @returns Promise с результатом (true если разрешено)
     */
    public async requestPermission(permission: 'camera' | 'location' | 'notifications'): Promise<boolean> {
        if (this.isAndroidWebView() && window.FCM?.requestPermission) {
            window.FCM.requestPermission(permission);
            
            // Ждем результат через событие или проверяем статус
            return new Promise((resolve) => {
                const checkStatus = async () => {
                    const status = await this.checkPermission(permission);
                    if (status === 'granted' || status === 'denied') {
                        resolve(status === 'granted');
                    } else {
                        // Повторяем проверку через 500ms
                        setTimeout(checkStatus, 500);
                    }
                };
                
                // Начинаем проверку через небольшую задержку
                setTimeout(checkStatus, 300);
            });
        }
        
        // Для веба используем стандартные API
        if (permission === 'notifications' && 'Notification' in window) {
            const result = await Notification.requestPermission();
            return result === 'granted';
        }
        
        return false;
    }
    
    /**
     * Проверка включенности GPS
     */
    public isLocationEnabled(): boolean {
        if (this.isAndroidWebView() && window.FCM?.isLocationEnabled) {
            return window.FCM.isLocationEnabled();
        }
        return false;
    }
    
    /**
     * Получение auth токена
     */
    public async getAuthToken(): Promise<string | null> {
        if (this.isAndroidWebView() && window.FCM?.getAuthToken) {
            return new Promise((resolve) => {
                window.FCM!.getAuthToken('__androidBridgeAuthTokenCallback');
                
                // Создаем временный callback
                (window as any).__androidBridgeAuthTokenCallback = (token: string | null) => {
                    delete (window as any).__androidBridgeAuthTokenCallback;
                    resolve(token);
                };
                
                // Таймаут на случай если callback не вызовется
                setTimeout(() => {
                    if ((window as any).__androidBridgeAuthTokenCallback) {
                        delete (window as any).__androidBridgeAuthTokenCallback;
                        resolve(null);
                    }
                }, 3000);
            });
        }
        
        // Fallback для веба
        if (typeof window !== 'undefined') {
            try {
                const authStorage = localStorage.getItem('auth-storage');
                if (authStorage) {
                    const authData = JSON.parse(authStorage);
                    return authData.state?.token || authData.token || null;
                }
                return localStorage.getItem('token') || sessionStorage.getItem('token') || null;
            } catch {
                return null;
            }
        }
        
        return null;
    }
    
    /**
     * Получение FCM токена
     */
    public async getFCMToken(): Promise<string | null> {
        if (this.isAndroidWebView() && window.FCM?.getFCMTokenWithCallback) {
            return new Promise((resolve) => {
                window.FCM!.getFCMTokenWithCallback('__androidBridgeFCMTokenCallback');
                
                // Создаем временный callback
                (window as any).__androidBridgeFCMTokenCallback = (token: string | null) => {
                    delete (window as any).__androidBridgeFCMTokenCallback;
                    resolve(token);
                };
                
                // Таймаут на случай если callback не вызовется
                setTimeout(() => {
                    if ((window as any).__androidBridgeFCMTokenCallback) {
                        delete (window as any).__androidBridgeFCMTokenCallback;
                        resolve(null);
                    }
                }, 3000);
            });
        }
        
        // Fallback
        if (this.isAndroidWebView() && window.FCM?.getFCMToken) {
            return window.FCM.getFCMToken();
        }
        
        return null;
    }
    
    /**
     * Настройка обработчиков событий от Android
     */
    public setupEventListeners(): void {
        if (typeof window === 'undefined') return;
        
        // Обработчик событий от Android
        window.onAndroidEvent = (event: string, data: any) => {
            console.log('📱 Android event received:', event, data);
            
            try {
                const eventData = typeof data === 'string' ? JSON.parse(data) : data;
                
                switch (event) {
                    case 'permission':
                        this.handlePermissionEvent(eventData);
                        break;
                    default:
                        console.log('Unknown Android event:', event);
                }
            } catch (error) {
                console.error('Error handling Android event:', error);
            }
        };
        
        // Обработчик результата отправки FCM токена
        window.onFCMTokenSent = (result: { success: boolean; code?: number; error?: string }) => {
            console.log('📱 FCM token send result:', result);
            
            if (result.success) {
                console.log('✅ FCM token successfully sent to backend');
            } else {
                console.error('❌ Failed to send FCM token:', result.error || `HTTP ${result.code}`);
            }
        };
    }
    
    /**
     * Обработка события разрешения
     */
    private handlePermissionEvent(data: { type: string; granted: boolean }): void {
        console.log(`📱 Permission ${data.type}: ${data.granted ? 'granted' : 'denied'}`);
        
        // Можно добавить логику для обновления UI или состояния приложения
        // Например, обновить состояние в Zustand store
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
    // Настраиваем обработчики событий
    androidBridge.setupEventListeners();
    
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
