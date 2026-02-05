// FCM Token Management for Work Flow Pulse Frontend

import { iosBridge } from './ios-bridge';

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

        if (this.isAndroidWebView()) {
            this.setupAndroidInterface();
        } else if (iosBridge.isIOSWebView()) {
            // iOS: FCM токен получает и отправляет на бэкенд нативный слой (AppDelegate),
            // при логине фронт уведомляет через iosBridge.notifyTokenSaved → native saveAuthToken → sendFCMTokenToServer
            console.log('FCM: iOS WebView — токен обрабатывается нативно');
        } else {
            console.log('FCM: Running in web browser - push notifications not available');
        }

        this.isInitialized = true;
    }

    /**
     * Проверка именно Android WebView (не iOS: на iOS тоже есть window.FCM от PermissionBridge).
     */
    private isAndroidWebView(): boolean {
        if (typeof window === 'undefined') return false;
        const w = window as any;
        // На Android есть androidApp или FCM с sendTokenToServer; на iOS FCM только с checkPermissionStatus/requestPermission
        return !!(w.androidApp || (w.FCM && typeof w.FCM.sendTokenToServer === 'function'));
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
     * Determine current platform for FCM token
     */
    private getPlatform(): 'android' | 'ios' | 'web' {
        if (iosBridge.isIOSWebView()) {
            return 'ios';
        }
        if (this.isAndroidWebView()) {
            return 'android';
        }
        return 'web';
    }

    /**
     * Send FCM token to backend
     */
    private async sendTokenToBackend(token: string): Promise<void> {
        try {
            const authToken = await this.getAuthToken();
            const platform = this.getPlatform();

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

            const response = await fetch('/api/fcm/token', {
                method: 'POST',
                headers,
                body: JSON.stringify(tokenData),
            });

            if (response.ok) {
                console.log('FCM: Token successfully sent to backend');
            } else {
                const errorText = await response.text().catch(() => 'Unknown error');
                console.error('FCM: Failed to send token to backend:', response.status, errorText);
            }
        } catch (error) {
            console.error('FCM: Error sending token to backend:', error);
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

        if (this.isAndroidWebView()) {
            const { androidBridge } = await import('./android-bridge');
            return await androidBridge.getAuthToken();
        }
        // iOS и веб: читаем из localStorage (на iOS нативный слой сам отправляет FCM токен)
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
