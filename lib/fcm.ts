// FCM Token Management for WorkFlow Frontend

interface FCMTokenData {
    token: string;
    platform: 'android' | 'ios' | 'web';
    deviceId?: string;
    userId?: string;
}

class FCMService {
    private static instance: FCMService;
    private currentToken: string | null = null;
    private isInitialized = false;

    private constructor() {}

    static getInstance(): FCMService {
        if (!FCMService.instance) {
            FCMService.instance = new FCMService();
        }
        return FCMService.instance;
    }

    /**
     * Initialize FCM service
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        // Check if we're in Android WebView
        if (this.isAndroidWebView()) {
            this.setupAndroidInterface();
        } else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // For web browsers - setup Web Push
            await this.setupWebPush();
        } else {
            console.log('FCM: Service Worker not supported - push notifications not available');
        }

        this.isInitialized = true;
    }

    /**
     * Setup Web Push for browsers
     */
    private async setupWebPush(): Promise<void> {
        try {
            // Регистрируем Service Worker
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/'
            });
            console.log('✅ [FCM] Service Worker registered:', registration.scope);

            // Ждем активации Service Worker
            await navigator.serviceWorker.ready;
            console.log('✅ [FCM] Service Worker ready');

            // Инициализируем Firebase для веба (если используется)
            // Пока используем нативный Web Push API
            await this.requestNotificationPermission();
            
        } catch (error) {
            console.error('❌ [FCM] Error setting up Web Push:', error);
        }
    }

    /**
     * Request notification permission
     */
    async requestNotificationPermission(): Promise<NotificationPermission> {
        if (!('Notification' in window)) {
            console.warn('⚠️ [FCM] This browser does not support notifications');
            return 'denied';
        }

        let permission = Notification.permission;

        if (permission === 'default') {
            permission = await Notification.requestPermission();
        }

        if (permission === 'granted') {
            console.log('✅ [FCM] Notification permission granted');
            // После получения разрешения, запрашиваем токен
            await this.getWebPushToken();
        } else {
            console.warn('⚠️ [FCM] Notification permission denied');
        }

        return permission;
    }

    /**
     * Get Web Push subscription token
     */
    private async getWebPushToken(): Promise<string | null> {
        try {
            const registration = await navigator.serviceWorker.ready;
            
            // Используем VAPID ключ (нужно получить с сервера или из env)
            // Пока создаем базовую подписку
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: await this.getVAPIDPublicKey()
            });

            // Преобразуем subscription в строку для отправки на сервер
            const subscriptionJson = subscription.toJSON();
            const token = JSON.stringify(subscriptionJson);
            
            this.currentToken = token;
            await this.sendTokenToBackend(token);
            
            console.log('✅ [FCM] Web Push token obtained and sent to server');
            return token;
        } catch (error) {
            console.error('❌ [FCM] Error getting Web Push token:', error);
            return null;
        }
    }

    /**
     * Get VAPID public key from server or environment
     */
    private async getVAPIDPublicKey(): Promise<Uint8Array> {
        // Сначала пытаемся получить с сервера
        try {
            const apiModule = await import('./api');
            const { api } = apiModule;
            
            const response = await api.get('/fcm/vapid-key');
            if (response.data?.key) {
                const base64 = response.data.key;
                const rawData = Uint8Array.from(atob(base64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
                return rawData;
            }
        } catch (error) {
            console.warn('⚠️ [FCM] Could not fetch VAPID key from server:', error);
        }
        
        // Fallback: можно использовать из env переменных (если настроены)
        // Для Web Push нужен VAPID ключ - его нужно настроить на сервере
        // Пока выбрасываем ошибку, чтобы показать, что требуется настройка
        console.error('❌ [FCM] VAPID public key not configured. Web Push requires VAPID keys.');
        throw new Error('VAPID public key not configured. Please configure VAPID keys on the server.');
    }

    /**
     * Check if running in Android WebView
     */
    private isAndroidWebView(): boolean {
        return typeof window !== 'undefined' &&
            'FCM' in window &&
            typeof (window as any).FCM === 'object';
    }

    /**
     * Setup Android WebView interface
     */
    private setupAndroidInterface(): void {
        if (typeof window === 'undefined') return;

        const androidFCM = (window as any).FCM;

        // Override sendTokenToServer to include user authentication
        const originalSendTokenToServer = androidFCM.sendTokenToServer;
        androidFCM.sendTokenToServer = async (token: string) => {
            this.currentToken = token;
            await this.sendTokenToBackend(token);

            // Call original method if it exists
            if (originalSendTokenToServer) {
                originalSendTokenToServer.call(androidFCM, token);
            }
        };

        // Setup global receiveFCMToken function
        (window as any).receiveFCMToken = async (token: string) => {
            console.log('FCM: Received token from Android:', token.substring(0, 20) + '...');
            this.currentToken = token;
            await this.sendTokenToBackend(token);
        };

        // Setup global receiveFCMData function
        (window as any).receiveFCMData = (data: any) => {
            console.log('FCM: Received data from Android:', data);
            this.handleFCMData(data);
        };

        console.log('FCM: Android interface setup complete');
    }

    /**
     * Send FCM token to backend
     */
    private async sendTokenToBackend(token: string): Promise<void> {
        try {
            const authToken = await this.getAuthToken();
            
            // Определяем платформу
            const platform = this.isAndroidWebView() ? 'android' : 'web';
            
            const tokenData: FCMTokenData = {
                token,
                platform,
                deviceId: this.getDeviceId(),
            };

            // Get user ID if available
            const userId = this.getCurrentUserId();
            if (userId) {
                tokenData.userId = userId;
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }

            // Используем api из lib/api.ts для корректной работы с базовым URL
            try {
                const apiModule = await import('./api');
                const { api } = apiModule;
                
                await api.post('/fcm/token', tokenData);
                console.log('✅ [FCM] Token successfully sent to backend');
            } catch (apiError: any) {
                // Fallback на fetch если api не работает
                const authToken = await this.getAuthToken();
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                };
                
                if (authToken) {
                    headers['Authorization'] = `Bearer ${authToken}`;
                }

                const response = await fetch('/api/fcm/token', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(tokenData),
                });

                if (response.ok) {
                    console.log('✅ [FCM] Token successfully sent to backend (via fetch)');
                } else {
                    const errorText = await response.text().catch(() => 'Unknown error');
                    console.error('❌ [FCM] Failed to send token:', response.status, errorText);
                }
            }

        } catch (error) {
            console.error('❌ [FCM] Error sending token to backend:', error);
        }
    }

    /**
     * Get current user ID from storage
     */
    private getCurrentUserId(): string | null {
        if (typeof window === 'undefined') return null;

        try {
            return localStorage.getItem('userId') ||
                sessionStorage.getItem('userId') ||
                null;
        } catch {
            return null;
        }
    }

    /**
     * Get authentication token from storage
     */
    private async getAuthToken(): Promise<string | null> {
        if (typeof window === 'undefined') return null;

        // Используем Android bridge если доступен
        if (this.isAndroidWebView()) {
            const androidBridge = (await import('./android-bridge')).androidBridge;
            return await androidBridge.getAuthToken();
        }

        // Fallback для веба
        try {
            const authStorage = localStorage.getItem('auth-storage');
            if (authStorage) {
                const authData = JSON.parse(authStorage);
                return authData.state?.token || authData.token || null;
            }
            return localStorage.getItem('token') ||
                sessionStorage.getItem('token') ||
                null;
        } catch {
            return null;
        }
    }

    /**
     * Get device ID
     */
    private getDeviceId(): string {
        // Generate a simple device ID for web
        if (typeof window === 'undefined') return 'web-unknown';

        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'web-' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

    /**
     * Handle FCM data received from Android
     */
    private handleFCMData(data: any): void {
        // Handle different types of notifications
        switch (data.type) {
            case 'chat':
                this.handleChatNotification(data);
                break;
            case 'order':
                this.handleOrderNotification(data);
                break;
            case 'payment':
                this.handlePaymentNotification(data);
                break;
            case 'system':
                this.handleSystemNotification(data);
                break;
            default:
                this.handleGenericNotification(data);
        }
    }

    private handleChatNotification(data: any): void {
        console.log('FCM: Chat notification received:', data);
        // Implement chat notification handling
    }

    private handleOrderNotification(data: any): void {
        console.log('FCM: Order notification received:', data);
        // Implement order notification handling
    }

    private handlePaymentNotification(data: any): void {
        console.log('FCM: Payment notification received:', data);
        // Implement payment notification handling
    }

    private handleSystemNotification(data: any): void {
        console.log('FCM: System notification received:', data);
        // Implement system notification handling
    }

    private handleGenericNotification(data: any): void {
        console.log('FCM: Generic notification received:', data);
        // Implement generic notification handling
    }

    /**
     * Get current FCM token
     */
    getCurrentToken(): string | null {
        return this.currentToken;
    }

    /**
     * Request notification permission and get token (public method)
     */
    async requestPermissionAndGetToken(): Promise<string | null> {
        const permission = await this.requestNotificationPermission();
        if (permission === 'granted') {
            return this.currentToken;
        }
        return null;
    }

    /**
     * Subscribe to topic
     */
    async subscribeToTopic(topic: string): Promise<void> {
        if (this.isAndroidWebView()) {
            const androidFCM = (window as any).FCM;
            if (androidFCM && androidFCM.subscribeToNotifications) {
                androidFCM.subscribeToNotifications(topic);
            }
        }
    }

    /**
     * Unsubscribe from topic
     */
    async unsubscribeFromTopic(topic: string): Promise<void> {
        if (this.isAndroidWebView()) {
            const androidFCM = (window as any).FCM;
            if (androidFCM && androidFCM.unsubscribeFromNotifications) {
                androidFCM.unsubscribeFromNotifications(topic);
            }
        }
    }
}

// Export singleton instance
export const fcmService = FCMService.getInstance();

// Auto-initialize when module is loaded
if (typeof window !== 'undefined') {
    fcmService.initialize().catch(console.error);
}
