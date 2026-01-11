"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Bell, BellOff } from "lucide-react"
import { fcmService } from "@/lib/fcm"

export function NotificationPermissionRequest() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isRequesting, setIsRequesting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const permissionRef = useRef<NotificationPermission>('default')

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const currentPermission = Notification.permission
      setPermission(currentPermission)
      permissionRef.current = currentPermission
      console.log('🔔 [NotificationPermissionRequest] Mounted, permission:', currentPermission)
      
      // Периодически проверяем изменение разрешения (для случаев, когда разрешение дается автоматически)
      // Это особенно важно для Android и ноутбуков, где разрешение может быть дано автоматически
      const checkPermissionInterval = setInterval(() => {
        const newPermission = Notification.permission
        if (newPermission !== permissionRef.current) {
          console.log('🔔 [NotificationPermissionRequest] Permission changed:', permissionRef.current, '->', newPermission)
          permissionRef.current = newPermission
          setPermission(newPermission)
        }
      }, 1000) // Проверяем каждую секунду
      
      return () => {
        clearInterval(checkPermissionInterval)
      }
    } else {
      console.log('⚠️ [NotificationPermissionRequest] Notifications not supported')
    }
  }, []) // Убрали зависимость permission, чтобы избежать бесконечного цикла

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Ваш браузер не поддерживает уведомления')
      return
    }

    const initialPermission = Notification.permission
    if (initialPermission === 'granted') {
      return
    }

    setIsRequesting(true)
    try {
      await fcmService.requestPermissionAndGetToken()
      // Получаем актуальное значение после запроса разрешения
      const currentPermission: NotificationPermission = Notification.permission
      setPermission(currentPermission)
      
      if (currentPermission === 'granted') {
        console.log('✅ Разрешение на уведомления получено')
      } else {
        console.warn('⚠️ Разрешение на уведомления отклонено')
      }
    } catch (error) {
      console.error('❌ Ошибка при запросе разрешения:', error)
      // Обновляем статус разрешения даже при ошибке (на случай, если разрешение было дано автоматически)
      const currentPermission: NotificationPermission = Notification.permission
      setPermission(currentPermission)
    } finally {
      setIsRequesting(false)
    }
  }

  // Не показываем во время SSR
  if (!mounted) {
    console.log('🔔 [NotificationPermissionRequest] Not mounted yet')
    return null
  }

  // Не показываем, если не поддерживается
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('🔔 [NotificationPermissionRequest] Notifications not supported in this browser')
    return null
  }

  // Не показываем, если разрешение уже получено
  if (permission === 'granted') {
    console.log('🔔 [NotificationPermissionRequest] Permission already granted, hiding component')
    return null
  }

  // Показываем только если разрешение еще не запрашивалось или было отклонено
  if (permission === 'default' || permission === 'denied') {
    console.log('🔔 [NotificationPermissionRequest] Showing component, permission:', permission)
    return (
      <div className="fixed bottom-20 right-4 sm:bottom-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-sm z-[100]">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {permission === 'denied' ? (
              <BellOff className="h-5 w-5 text-orange-500" />
            ) : (
              <Bell className="h-5 w-5 text-blue-500" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">
              Включить уведомления?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Получайте push-уведомления о новых заявках и важных событиях
            </p>
            {permission === 'denied' ? (
              <p className="text-xs text-orange-600 dark:text-orange-400 mb-3">
                Разрешение было отклонено. Разрешите уведомления в настройках браузера.
              </p>
            ) : (
              <Button
                size="sm"
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="w-full"
              >
                {isRequesting ? 'Запрос...' : 'Включить уведомления'}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}



