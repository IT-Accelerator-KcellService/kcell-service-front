"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Camera } from "lucide-react"
import { scanBookingQRCode } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Html5Qrcode } from "html5-qrcode"

interface QRScannerProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess?: (data: { booking: any; tables_remaining: number }) => void
}

export function QRScanner({ isOpen, onClose, onScanSuccess }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const scannerId = "qr-scanner"

  useEffect(() => {
    // Убеждаемся, что мы на клиенте
    if (typeof window === 'undefined') return

    if (isOpen) {
      startScanner()
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [isOpen])

  const startScanner = async () => {
    try {
      // Проверяем, что мы на клиенте
      if (typeof window === 'undefined') {
        throw new Error('Сканер может работать только на клиенте')
      }

      // Убираем предварительную проверку - просто пробуем запустить сканер
      // html5-qrcode сам проверит поддержку и запросит разрешения
      const html5QrCode = new Html5Qrcode(scannerId)
      scannerRef.current = html5QrCode
      
      console.log('Попытка запуска QR сканера...')
      
      try {
        // Пробуем разные варианты конфигурации камеры
        let cameraConfig: any = { facingMode: "environment" }
        
        // Пробуем запустить с задней камерой
        try {
          await html5QrCode.start(
            cameraConfig,
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            (decodedText) => {
              handleQRScan(decodedText)
            },
            (errorMessage) => {
              // Игнорируем ошибки сканирования (они нормальны при поиске QR кода)
            }
          )
          
          console.log('✅ QR сканер успешно запущен')
          setScanning(true)
          setError(null)
        } catch (envError: any) {
          // Если задняя камера не работает, пробуем любую доступную камеру
          console.log('Задняя камера недоступна, пробуем любую доступную камеру...')
          
          try {
            await html5QrCode.start(
              { facingMode: "user" }, // Передняя камера
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
              },
              (decodedText) => {
                handleQRScan(decodedText)
              },
              (errorMessage) => {
                // Игнорируем ошибки сканирования
              }
            )
            
            console.log('✅ QR сканер успешно запущен (передняя камера)')
            setScanning(true)
            setError(null)
          } catch (userError: any) {
            // Если и передняя не работает, пробуем без указания камеры
            console.log('Пробуем любую доступную камеру...')
            
            await html5QrCode.start(
              undefined, // Любая доступная камера
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
              },
              (decodedText) => {
                handleQRScan(decodedText)
              },
              (errorMessage) => {
                // Игнорируем ошибки сканирования
              }
            )
            
            console.log('✅ QR сканер успешно запущен (любая камера)')
            setScanning(true)
            setError(null)
          }
        }
      } catch (startError: any) {
        console.error('Ошибка запуска html5-qrcode:', startError)
        
        // Обрабатываем различные типы ошибок
        let errorMessage = 'Не удалось запустить камеру'
        
        if (startError.name === 'NotAllowedError' || startError.name === 'PermissionDeniedError') {
          errorMessage = 'Разрешение на использование камеры было отклонено. Пожалуйста, разрешите доступ к камере в настройках браузера.'
        } else if (startError.name === 'NotFoundError' || startError.name === 'DevicesNotFoundError') {
          errorMessage = 'Камера не найдена. Убедитесь, что камера подключена и доступна.'
        } else if (startError.message?.includes('not supported') || startError.message?.includes('not available') || startError.message?.includes('Camera streaming') || startError.message?.includes('streaming not supported')) {
          const isHttps = window.location.protocol === 'https:'
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          
          if (!isHttps && !isLocalhost) {
            errorMessage = 'Камера требует HTTPS соединение. Пожалуйста, откройте сайт по адресу с https://'
          } else {
            errorMessage = 'Камера не поддерживается. Убедитесь, что:\n' +
              '1. Сайт открыт по HTTPS (не HTTP)\n' +
              '2. Браузер поддерживает доступ к камере (Chrome, Firefox, Safari, Edge)\n' +
              '3. Камера подключена и не используется другим приложением\n' +
              '4. Разрешения на камеру предоставлены в настройках браузера'
          }
        } else if (startError.message) {
          errorMessage = startError.message
        }
        
        throw new Error(errorMessage)
      }
    } catch (err: any) {
      console.error('Ошибка запуска сканера:', err)
      const errorMessage = err.message || 'Не удалось запустить сканер. Убедитесь, что вы предоставили разрешение на использование камеры.'
      setError(errorMessage)
      setScanning(false)
    }
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        // Проверяем, запущен ли сканер перед остановкой
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear()
          scannerRef.current = null
          setScanning(false)
        }).catch((err: any) => {
          // Игнорируем ошибку, если сканер уже остановлен
          if (!err.message?.includes('not running') && !err.message?.includes('not started')) {
            console.error('Ошибка остановки сканера:', err)
          }
          scannerRef.current?.clear()
          scannerRef.current = null
          setScanning(false)
        })
      } catch (err: any) {
        // Если сканер не запущен, просто очищаем
        scannerRef.current?.clear()
        scannerRef.current = null
        setScanning(false)
      }
    } else {
      setScanning(false)
    }
  }

  const handleQRScan = async (qrData: string) => {
    try {
      // Останавливаем сканер после успешного сканирования
      stopScanner()
      
      let bookingData
      try {
        bookingData = JSON.parse(qrData)
      } catch {
        // Если не JSON, пробуем как просто ID
        bookingData = { bookingId: parseInt(qrData) }
      }

      const bookingId = bookingData.bookingId || bookingData.id
      if (!bookingId) {
        throw new Error('Неверный формат QR кода')
      }

      const response = await scanBookingQRCode(bookingId)
      
      toast({
        title: "Успешно!",
        description: `Стол отсканирован. Осталось столов: ${response.data.tables_remaining}`,
      })

      onScanSuccess?.(response.data)
      onClose()
    } catch (err: any) {
      console.error('Ошибка сканирования QR:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Ошибка при сканировании QR кода'
      toast({
        title: "Ошибка",
        description: errorMessage,
        variant: "destructive",
      })
      // Перезапускаем сканер после ошибки
      if (isOpen) {
        startScanner()
      }
    }
  }

  // Простая обработка через input для ручного ввода
  const handleManualInput = () => {
    const qrData = prompt('Введите данные QR кода или ID бронирования:')
    if (qrData) {
      handleQRScan(qrData)
    }
  }

  // Не рендерим на сервере
  if (typeof window === 'undefined' || !isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Сканирование QR кода
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
              <Button
                onClick={handleManualInput}
                className="mt-2 w-full"
                variant="outline"
              >
                Ввести вручную
              </Button>
            </div>
          ) : (
            <>
              <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
                <div id={scannerId} className="w-full h-full" />
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-4 border-purple-500 rounded-lg w-64 h-64" />
                  </div>
                )}
              </div>
              <p className="text-sm text-center text-gray-600">
                Наведите камеру на QR код бронирования
              </p>
              <Button
                onClick={handleManualInput}
                variant="outline"
                className="w-full"
              >
                Ввести вручную
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
