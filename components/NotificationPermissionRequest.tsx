"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Bell, BellOff } from "lucide-react"
import { fcmService } from "@/lib/fcm"

export function NotificationPermissionRequest() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isRequesting, setIsRequesting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

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
    } finally {
      setIsRequesting(false)
    }
  }

  // Не показываем во время SSR
  if (!mounted) {
    return null
  }

  // Не показываем, если не поддерживается
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }

  // Не показываем, если разрешение уже получено
  if (permission === 'granted') {
    return null
  }

  // Показываем только если разрешение еще не запрашивалось или было отклонено
  if (permission === 'default' || permission === 'denied') {
    return (
      <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-sm z-50">
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



