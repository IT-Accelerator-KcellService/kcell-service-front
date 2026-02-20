"use client"

import { useEffect, useRef } from "react"
import { useActivityTrackerStore } from "@/stores/useActivityTrackerStore"
import { useAuthStore } from "@/stores/useAuthStore"
import api, { getOffices } from "@/lib/api"
import { findNearestOffice } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface LocationData {
  latitude: number
  longitude: number
  altitude: number | null
  accuracy: number
  timestamp: number
}

interface ActivityData {
  timestamp: number
  acceleration: {
    x: number
    y: number
    z: number
  }
  rotation: {
    alpha: number
    beta: number
    gamma: number
  }
  location?: LocationData
  posture: 'sitting' | 'standing' | 'unknown'
}

/**
 * Фоновый сервис для ActivityTracker
 * Работает независимо от монтирования основного компонента
 * Продолжает отслеживание даже при переходе на другие страницы
 */
export function ActivityTrackerService() {
  const { user } = useAuthStore()
  const {
    isTracking,
    statistics,
    startTime,
    postureStartTime,
    lastPosture,
    manualStart,
    healthReminders,
    autoStartInWorkingHours,
    setIsTracking,
    setStatistics,
    setStartTime,
    setPostureStartTime,
    setLastPosture,
    updateStatistics,
    setHealthReminders,
    resetStatistics
  } = useActivityTrackerStore()

  // Refs для хранения данных, которые не нужно сохранять в store
  const dataHistoryRef = useRef<ActivityData[]>([])
  const intervalRef = useRef<number | null>(null)
  const orientationRef = useRef<{ beta: number, gamma: number } | null>(null)
  const postureVotesRef = useRef<Array<'sitting' | 'standing'>>([])
  const locationHistoryRef = useRef<LocationData[]>([])
  const watchIdRef = useRef<number | null>(null)
  const lastLocationRef = useRef<LocationData | null>(null)
  const saveIntervalRef = useRef<number | null>(null)
  const officesRef = useRef<any[]>([])
  const officeInfoRef = useRef<{ working_hours_start?: string, working_hours_end?: string, auto_track_enabled?: boolean } | null>(null)
  const autoStartCheckRef = useRef<number | null>(null)
  const isStartingRef = useRef<boolean>(false)
  const isStoppingRef = useRef<boolean>(false)
  const isTrackingRef = useRef<boolean>(false)
  const androidSensorCallbackRef = useRef<((data: any) => void) | null>(null)
  const isAndroidWebView = useRef<boolean>(false)
  const healthReminderIntervalRef = useRef<number | null>(null)

  // Ранний выход, если пользователь не executor или client - сервис не должен работать для других ролей
  useEffect(() => {
    if (user && (user.role !== 'executor' && user.role !== 'client')) {
      // Останавливаем все процессы, если они были запущены
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current)
        saveIntervalRef.current = null
      }
      if (autoStartCheckRef.current) {
        clearInterval(autoStartCheckRef.current)
        autoStartCheckRef.current = null
      }
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (isTracking) {
        setIsTracking(false)
      }
    }
  }, [user, isTracking, setIsTracking])

  // Синхронизация ref с store
  useEffect(() => {
    if (!user || (user.role !== 'executor' && user.role !== 'client')) return // Не обновляем ref для не-executor
    isTrackingRef.current = isTracking
  }, [isTracking, user])

  // Проверка Android WebView для уведомлений
  useEffect(() => {
    if (typeof (window as any).androidApp !== 'undefined') {
      isAndroidWebView.current = true
      console.log('✅ [Health] Android WebView detected for notifications')
    }
  }, [])

  // Проверка Android WebView
  useEffect(() => {
    if (typeof (window as any).AndroidSensors !== 'undefined') {
      isAndroidWebView.current = true
      console.log('✅ [Service] Android WebView detected')
    }
  }, [])

  // Проверка, находится ли пользователь в офисе
  const checkIfInOffice = async (location: LocationData | null): Promise<boolean> => {
    if (!location) return false
    
    try {
      if (officesRef.current.length === 0) {
        const response = await getOffices()
        officesRef.current = response.data
      }
      
      const nearest = findNearestOffice(
        location.latitude,
        location.longitude,
        officesRef.current
      )
      
      if (!nearest) return false
      
      return nearest.distance < 0.1 // 100 метров
    } catch (error) {
      console.error('❌ [Service] Ошибка проверки офиса:', error)
      return false
    }
  }

  // Проверка рабочих часов
  const isWithinWorkingHours = (): boolean => {
    if (!officeInfoRef.current || !officeInfoRef.current.auto_track_enabled) {
      return false
    }

    const now = new Date()
    const currentHours = now.getHours()
    const currentMinutes = now.getMinutes()
    const currentSeconds = now.getSeconds()
    // Округляем до минут для более точного сравнения
    const currentTimeMinutes = currentHours * 60 + currentMinutes + Math.floor(currentSeconds / 60)
    
    const startTimeStr = officeInfoRef.current.working_hours_start || '08:00:00'
    const endTimeStr = officeInfoRef.current.working_hours_end || '18:00:00'
    
    // Парсим время начала и конца
    const [startH, startM, startS] = startTimeStr.split(':').map(Number)
    const [endH, endM, endS] = endTimeStr.split(':').map(Number)
    const startTimeMinutes = startH * 60 + startM + Math.floor((startS || 0) / 60)
    // Для конца рабочих часов считаем, что включен весь последний час (до конца 59-й минуты)
    const endTimeMinutes = endH * 60 + endM + Math.floor((endS || 0) / 60)
    
    const result = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes
    
    // Логируем только при изменении состояния или каждые 10 проверок для отладки
    if (Math.random() < 0.1) { // ~10% проверок
      console.log('🕐 [Service] Проверка рабочих часов:', {
        currentTime: `${currentHours}:${currentMinutes.toString().padStart(2, '0')}`,
        startTime: startTimeStr,
        endTime: endTimeStr,
        withinHours: result
      })
    }
    
    return result
  }

  // Отправка Health уведомления через Android, Web Push и локальные уведомления
  const sendHealthNotification = async (message: string) => {
    try {
      // Сначала сохраняем уведомление в базу данных
      try {
        await api.post('/notifications/health', { message })
        console.log('✅ [Health] Уведомление сохранено в базу данных:', message)
      } catch (error) {
        console.error('❌ [Health] Ошибка сохранения уведомления в БД:', error)
        // Продолжаем выполнение, даже если сохранение не удалось
      }

      // Отправляем через Web Push API на сервер (чтобы пришло даже когда сайт закрыт)
      if (user?.id) {
        try {
          await api.post('/fcm/send/user', {
            userId: user.id,
            title: 'Хелси - Напоминание',
            body: message,
            data: {
              type: 'health_reminder',
              timestamp: new Date().toISOString()
            }
          })
          console.log('✅ [Health] Уведомление отправлено через Web Push:', message)
        } catch (error) {
          console.warn('⚠️ [Health] Не удалось отправить через Web Push:', error)
          // Продолжаем выполнение, даже если Web Push не удался
        }
      }

      // Показываем toast-уведомление (работает на всех устройствах, включая мобильные)
      toast({
        title: 'Хелси - Напоминание',
        description: message,
        variant: 'default',
        duration: 5000,
      })
      console.log('✅ [Health] Toast уведомление показано:', message)

      // Проверяем Android WebView (для нативных Android приложений)
      if (typeof (window as any).androidApp?.showHealthNotification !== 'undefined') {
        (window as any).androidApp.showHealthNotification(message)
        console.log('✅ [Health] Уведомление отправлено через Android:', message)
      }
      
      // Обновляем время последнего напоминания
      setHealthReminders({ lastReminderTime: Date.now() })
    } catch (error) {
      console.error('❌ [Health] Ошибка отправки уведомления:', error)
    }
  }

  // Кэш для информации об офисе (чтобы не запрашивать слишком часто)
  const lastOfficeInfoLoadRef = useRef<number>(0)
  const OFFICE_INFO_CACHE_DURATION = 5 * 60 * 1000 // 5 минут кэш

  // Загрузка информации об офисе
  const loadOfficeInfo = async (force = false) => {
    if (!user?.office_id) return
    
    // Проверяем кэш - если недавно загружали, используем кэш
    const now = Date.now()
    const timeSinceLastLoad = now - lastOfficeInfoLoadRef.current
    if (!force && timeSinceLastLoad < OFFICE_INFO_CACHE_DURATION && officeInfoRef.current) {
      return // Используем кэшированную информацию
    }
    
    try {
      const response = await api.get(`/offices/${user.office_id}`, {
        timeout: 5000 // 5 секунд таймаут
      })
      const info = {
        working_hours_start: response.data.working_hours_start || '08:00:00',
        working_hours_end: response.data.working_hours_end || '18:00:00',
        auto_track_enabled: response.data.auto_track_enabled ?? false
      }
      officeInfoRef.current = info
      lastOfficeInfoLoadRef.current = now // Обновляем время последней загрузки
      console.log('✅ [Service] Информация об офисе загружена:', info)
    } catch (error: any) {
      // Если уже есть кэшированная информация, используем её
      if (officeInfoRef.current) {
        console.log('⚠️ [Service] Используем кэшированную информацию об офисе из-за ошибки сети')
        return
      }
      
      // Только если нет кэша - устанавливаем значения по умолчанию
      officeInfoRef.current = {
        working_hours_start: '08:00:00',
        working_hours_end: '18:00:00',
        auto_track_enabled: false
      }
      
      // Логируем только краткую информацию об ошибке, без полного стека
      const errorMessage = error?.message || 'Неизвестная ошибка'
      const errorCode = error?.code || error?.response?.status || 'N/A'
      
      // Не логируем ошибку, если это просто проблема с сетью - это не критично
      if (errorCode !== 'ERR_CONNECTION_CLOSED' && errorCode !== 'ERR_NETWORK' && errorCode !== 'ECONNABORTED') {
        console.warn('⚠️ [Service] Не удалось загрузить информацию об офисе:', {
          code: errorCode,
          message: errorMessage,
          office_id: user.office_id
        })
      }
    }
  }

  // Сохранение статистики на сервер
  const saveStatisticsToServer = async () => {
    // Проверка роли - только executor может сохранять статистику
    if (!user || (user.role !== 'executor' && user.role !== 'client')) {
      console.log('⏭️ [Service] Пропуск сохранения: пользователь не executor')
      return
    }
    
    // Используем ref для проверки актуального состояния
    if (!isTrackingRef.current) {
      console.log('⏭️ [Service] Пропуск сохранения: трекер не запущен')
      return
    }
    
    try {
      // Получаем актуальные значения из store
      const storeState = useActivityTrackerStore.getState()
      const currentStats = storeState.statistics
      
      // Проверяем, что статистика не пустая (есть хотя бы какое-то время трекинга)
      const hasAnyData = currentStats.totalSittingTime > 0 || 
                        currentStats.totalStandingTime > 0 || 
                        currentStats.standUpCount > 0
      
      if (!hasAnyData) {
        console.log('⏭️ [Service] Пропуск сохранения: статистика пустая (все значения равны 0)')
        return
      }
      
      console.log('💾 [Service] Сохранение статистики:', {
        totalSittingTime: currentStats.totalSittingTime,
        totalStandingTime: currentStats.totalStandingTime,
        standUpCount: currentStats.standUpCount
      })
      
      const isInOffice = await checkIfInOffice(lastLocationRef.current)
      
      await api.post('/activity-stats/save', {
        userId: user.id,
        date: new Date().toISOString().split('T')[0],
        totalSittingTime: currentStats.totalSittingTime,
        totalStandingTime: currentStats.totalStandingTime,
        standUpCount: currentStats.standUpCount,
        isInOffice,
        location: lastLocationRef.current ? {
          latitude: lastLocationRef.current.latitude,
          longitude: lastLocationRef.current.longitude,
          accuracy: lastLocationRef.current.accuracy
        } : null
      })
      
      console.log('✅ [Service] Статистика успешно сохранена на сервер')
    } catch (error) {
      console.error('❌ [Service] Ошибка сохранения статистики:', error)
    }
  }

  // Определение позы
  const detectPosture = (
    acceleration: { x: number, y: number, z: number }, 
    rotation: { beta: number, gamma: number },
    orientation?: { beta: number, gamma: number }
  ): 'sitting' | 'standing' | 'unknown' => {
    // Используем orientation если доступно, иначе rotation
    const beta = orientation?.beta ?? rotation.beta ?? 0
    const gamma = orientation?.gamma ?? rotation.gamma ?? 0
    
    const normalizedBeta = Math.abs(beta)
    const normalizedGamma = Math.abs(gamma)
    
    let vote: 'sitting' | 'standing' | null = null
    
    // Определяем позу на основе угла наклона устройства
    // Телефон лежит горизонтально (beta ~0° или ~180°) → сидит
    // Телефон стоит вертикально (beta ~90°) → стоит
    if (normalizedBeta <= 30 || normalizedBeta >= 150) {
      vote = 'sitting'
    } else if (normalizedBeta >= 60 && normalizedBeta <= 120) {
      vote = 'standing'
    }
    
    // Если не удалось определить по углу, используем ускорение
    // Телефон лежит (Z ≈ гравитация) → сидит; телефон вертикально (Z ≠ гравитация) → стоит
    if (!vote) {
      const absZ = Math.abs(acceleration.z || 0)
      if (absZ >= 8.5 && absZ <= 10.5) {
        vote = 'sitting'
      } else if (absZ < 5 || absZ > 12) {
        vote = 'standing'
      }
    }
    
    if (vote) {
      postureVotesRef.current.push(vote)
      if (postureVotesRef.current.length > 5) {
        postureVotesRef.current.shift()
      }
      
      const sittingCount = postureVotesRef.current.filter(v => v === 'sitting').length
      const standingCount = postureVotesRef.current.filter(v => v === 'standing').length
      
      // Требуем минимум 2 голоса из 5 для определения позы
      if (sittingCount >= 2) {
        return 'sitting'
      } else if (standingCount >= 2) {
        return 'standing'
      }
    }
    
    // Если не удалось определить, возвращаем последнюю известную позу
    const storeState = useActivityTrackerStore.getState()
    const currentLastPosture = storeState.lastPosture
    return currentLastPosture !== 'unknown' ? currentLastPosture : 'unknown'
  }

  // Обработчик движения устройства
  const handleDeviceMotion = (event: DeviceMotionEvent) => {
    if (!isTrackingRef.current) return

    // Получаем актуальные значения из store
    const storeState = useActivityTrackerStore.getState()
    const currentLastPosture = storeState.lastPosture
    const currentPostureStartTime = storeState.postureStartTime

    // Нормализуем acceleration, обрабатывая null значения
    const accel = event.accelerationIncludingGravity
    const acceleration = {
      x: accel?.x ?? 0,
      y: accel?.y ?? 0,
      z: accel?.z ?? 0
    }
    
    // Нормализуем rotation, обрабатывая null значения
    const rot = event.rotationRate
    const rotation = {
      alpha: rot?.alpha ?? 0,
      beta: rot?.beta ?? 0,
      gamma: rot?.gamma ?? 0
    }
    
    const detectedPosture = detectPosture(
      acceleration, 
      rotation,
      orientationRef.current || undefined
    )
    
    // Логируем для отладки (только первые несколько раз)
    if (Math.random() < 0.01) { // Логируем ~1% событий
      console.log('📊 [Service] Device motion:', {
        detectedPosture,
        currentLastPosture,
        acceleration: { x: acceleration.x.toFixed(2), y: acceleration.y.toFixed(2), z: acceleration.z.toFixed(2) },
        orientation: orientationRef.current
      })
    }
    
    // Обновляем статистику
    const now = Date.now()
    
    if (detectedPosture !== currentLastPosture && currentLastPosture !== 'unknown') {
      // Поза изменилась
      if (currentPostureStartTime) {
        const duration = (now - currentPostureStartTime) / 1000
        
        updateStatistics(prev => {
          const newStats = { ...prev }
          
          if (currentLastPosture === 'sitting') {
            newStats.totalSittingTime += duration
          } else if (currentLastPosture === 'standing') {
            newStats.totalStandingTime += duration
          }
          
          if (currentLastPosture === 'sitting' || currentLastPosture === 'standing') {
            newStats.intervals.push({
              start: currentPostureStartTime,
              end: now,
              duration,
              type: currentLastPosture
            })
          }
          
          if (currentLastPosture === 'sitting' && detectedPosture === 'standing') {
            newStats.standUpCount += 1
            newStats.lastStandUpTime = now
          }
          
          return newStats
        })
      }
      
      setPostureStartTime(now)
    } else if (!currentPostureStartTime) {
      setPostureStartTime(now)
    }
    
    setLastPosture(detectedPosture)
    updateStatistics(prev => ({ ...prev, currentPosture: detectedPosture }))
  }

  // Обработчик ориентации
  const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (!isTrackingRef.current) return
    
    orientationRef.current = {
      beta: event.beta || 0,
      gamma: event.gamma || 0
    }
  }

  // Обработчик геолокации
  const handleGeolocation = (position: GeolocationPosition) => {
    if (!isTrackingRef.current) return
    
    const locationData: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude ?? null,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    }
    
    locationHistoryRef.current.push(locationData)
    if (locationHistoryRef.current.length > 5) {
      locationHistoryRef.current.shift()
    }
    
    lastLocationRef.current = locationData
  }

  // Запуск трекера
  const startTracking = async () => {
    // Дополнительная проверка роли для безопасности
    if (!user || (user.role !== 'executor' && user.role !== 'client')) {
      console.warn('⚠️ [Service] Попытка запуска трекера для пользователя без роли executor')
      return
    }
    
    if (isStartingRef.current || isTrackingRef.current) return
    
    isStartingRef.current = true
    
    try {
      // Очищаем старые интервалы
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current)
        saveIntervalRef.current = null
      }
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }

      // Проверяем Android WebView
      if (isAndroidWebView.current && typeof (window as any).AndroidSensors !== 'undefined') {
        const sensorCallback = (data: any) => {
          if (!isTrackingRef.current) return
          
          try {
            const sensorData = typeof data === 'string' ? JSON.parse(data) : data
            const acceleration = sensorData.acceleration || { x: 0, y: 0, z: 0 }
            const rotationRate = sensorData.rotationRate || { alpha: 0, beta: 0, gamma: 0 }
            const orientation = sensorData.orientation || { beta: 0, gamma: 0 }
            
            orientationRef.current = {
              beta: orientation.beta || 0,
              gamma: orientation.gamma || 0
            }
            
            const event = {
              accelerationIncludingGravity: acceleration,
              rotationRate: rotationRate
            } as DeviceMotionEvent
            
            handleDeviceMotion(event)
          } catch (err) {
            console.error('❌ [Service] Error processing Android sensor data:', err)
          }
        }
        
        androidSensorCallbackRef.current = sensorCallback
        ;(window as any).handleAndroidSensorData = sensorCallback
        
        try {
          (window as any).AndroidSensors.startListening('handleAndroidSensorData')
          console.log('✅ [Service] Android sensors started')
        } catch (err) {
          console.error('❌ [Service] Failed to start Android sensors:', err)
          setIsTracking(false)
          isStartingRef.current = false
          return
        }
      } else {
        // Стандартные Web API
        if (typeof DeviceMotionEvent === 'undefined') {
          console.error('❌ [Service] DeviceMotionEvent not supported')
          setIsTracking(false)
          isStartingRef.current = false
          return
        }

        // Запрашиваем разрешения для iOS (если не запросили заранее из обработчика тапа)
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
          try {
            const motionPermission = await (DeviceMotionEvent as any).requestPermission()
            if (motionPermission !== 'granted') {
              console.error('❌ [Service] Motion permission denied')
              setIsTracking(false)
              isStartingRef.current = false
              return
            }
          } catch (err) {
            console.error('❌ [Service] Error requesting motion permission:', err)
            setIsTracking(false)
            isStartingRef.current = false
            return
          }
        }

        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
          try {
              const orientationPermission = await (DeviceOrientationEvent as any).requestPermission()
              if (orientationPermission !== 'granted') {
                console.warn('⚠️ [Service] Orientation permission denied')
                // Ориентация не критична, не сбрасываем isTracking
              } else {
                console.log('✅ [Service] Orientation permission granted')
              }
          } catch (err) {
            console.warn('⚠️ [Service] Orientation permission error:', err)
            // Ориентация не критична
          }
        }
      }

      setIsTracking(true)
      setStartTime(Date.now())
      setPostureStartTime(null)
      setLastPosture('unknown')
      postureVotesRef.current = []
      dataHistoryRef.current = []
      locationHistoryRef.current = []
      lastLocationRef.current = null
      
      // Запускаем отслеживание геолокации
      if (navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          handleGeolocation,
          () => {},
          {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 5000
          }
        )
      }
      
      // Обновляем статистику каждую секунду
      intervalRef.current = window.setInterval(() => {
        if (!isTrackingRef.current) return
        
        // Получаем актуальные значения из store
        const storeState = useActivityTrackerStore.getState()
        const currentPostureStartTime = storeState.postureStartTime
        const currentLastPosture = storeState.lastPosture
        
        if (currentPostureStartTime && currentLastPosture !== 'unknown') {
          updateStatistics(prev => {
            if (currentLastPosture === 'sitting') {
              return { ...prev, totalSittingTime: prev.totalSittingTime + 1 }
            } else if (currentLastPosture === 'standing') {
              return { ...prev, totalStandingTime: prev.totalStandingTime + 1 }
            }
            return prev
          })
        }
      }, 1000)
      
      // Сохраняем статистику каждые 5 минут
      saveIntervalRef.current = window.setInterval(() => {
        console.log('⏰ [Service] Интервал сохранения (5 минут) - вызываю saveStatisticsToServer')
        saveStatisticsToServer()
      }, 5 * 60 * 1000)
      
      console.log('✅ [Service] Интервал сохранения установлен на 5 минут')
      
      console.log('✅ [Service] Tracking started')
    } finally {
      isStartingRef.current = false
    }
  }

  // Остановка трекера
  const stopTracking = async () => {
    if (isStoppingRef.current || !isTrackingRef.current) return
    
    isStoppingRef.current = true
    
    try {
      // Останавливаем Android датчики
      if (isAndroidWebView.current && typeof (window as any).AndroidSensors !== 'undefined') {
        try {
          (window as any).AndroidSensors.stopListening()
          console.log('✅ [Service] Android sensors stopped')
        } catch (err) {
          console.error('❌ [Service] Error stopping Android sensors:', err)
        }
        androidSensorCallbackRef.current = null
        delete (window as any).handleAndroidSensorData
      }
      
      setIsTracking(false)
      
      // Сохраняем статистику перед остановкой
      await saveStatisticsToServer()
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current)
        saveIntervalRef.current = null
      }
      
      // Завершаем последний интервал
      if (postureStartTime && lastPosture !== 'unknown') {
        const now = Date.now()
        const duration = (now - postureStartTime) / 1000
        
        updateStatistics(prev => {
          const newStats = { ...prev }
          
          if (lastPosture === 'sitting') {
            newStats.totalSittingTime += duration
          } else if (lastPosture === 'standing') {
            newStats.totalStandingTime += duration
          }
          
          if (lastPosture === 'sitting' || lastPosture === 'standing') {
            newStats.intervals.push({
              start: postureStartTime,
              end: now,
              duration,
              type: lastPosture
            })
          }
          
          return newStats
        })
      }
      
      // Останавливаем отслеживание геолокации
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      
      // Удаляем обработчики
      window.removeEventListener('devicemotion', handleDeviceMotion as EventListener)
      window.removeEventListener('deviceorientation', handleDeviceOrientation as EventListener)
      
      console.log('✅ [Service] Tracking stopped')
    } finally {
      isStoppingRef.current = false
    }
  }

  // Реакция на изменения isTracking из store (запросы на запуск/остановку)
  useEffect(() => {
    if (!user || (user.role !== 'executor' && user.role !== 'client')) return // Для executor и client
    if (isTracking && !intervalRef.current && !isStartingRef.current) {
      // Запускаем трекер, если он был запрошен
      console.log('🔄 [Service] Tracking requested, starting...')
      startTracking()
    } else if (!isTracking && intervalRef.current && !isStoppingRef.current) {
      // Останавливаем трекер, если он был запрошен
      console.log('🔄 [Service] Tracking stop requested, stopping...')
      stopTracking()
    }
  }, [isTracking, user])

  // Восстановление трекера при монтировании (если был запущен)
  useEffect(() => {
    if (!user || (user.role !== 'executor' && user.role !== 'client')) return // Для executor и client
    if (isTracking && !intervalRef.current) {
      console.log('🔄 [Service] Restoring tracking state...')
      // Восстанавливаем обработчики событий
      if (!isAndroidWebView.current) {
        window.addEventListener('devicemotion', handleDeviceMotion as EventListener)
        window.addEventListener('deviceorientation', handleDeviceOrientation as EventListener)
      }
      
      // Восстанавливаем интервалы
      intervalRef.current = window.setInterval(() => {
        if (!isTrackingRef.current) return
        
        // Получаем актуальные значения из store
        const storeState = useActivityTrackerStore.getState()
        const currentPostureStartTime = storeState.postureStartTime
        const currentLastPosture = storeState.lastPosture
        
        if (currentPostureStartTime && currentLastPosture !== 'unknown') {
          updateStatistics(prev => {
            if (currentLastPosture === 'sitting') {
              return { ...prev, totalSittingTime: prev.totalSittingTime + 1 }
            } else if (currentLastPosture === 'standing') {
              return { ...prev, totalStandingTime: prev.totalStandingTime + 1 }
            }
            return prev
          })
        }
      }, 1000)
      
      saveIntervalRef.current = window.setInterval(() => {
        console.log('⏰ [Service] Интервал сохранения (5 минут) - вызываю saveStatisticsToServer')
        saveStatisticsToServer()
      }, 5 * 60 * 1000)
      
      console.log('✅ [Service] Интервал сохранения восстановлен на 5 минут')
      
      // Восстанавливаем геолокацию
      if (navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          handleGeolocation,
          () => {},
          {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 5000
          }
        )
      }
      
      // Восстанавливаем Android датчики
      if (isAndroidWebView.current && typeof (window as any).AndroidSensors !== 'undefined') {
        const sensorCallback = (data: any) => {
          if (!isTrackingRef.current) return
          
          try {
            const sensorData = typeof data === 'string' ? JSON.parse(data) : data
            const acceleration = sensorData.acceleration || { x: 0, y: 0, z: 0 }
            const rotationRate = sensorData.rotationRate || { alpha: 0, beta: 0, gamma: 0 }
            const orientation = sensorData.orientation || { beta: 0, gamma: 0 }
            
            orientationRef.current = {
              beta: orientation.beta || 0,
              gamma: orientation.gamma || 0
            }
            
            const event = {
              accelerationIncludingGravity: acceleration,
              rotationRate: rotationRate
            } as DeviceMotionEvent
            
            handleDeviceMotion(event)
          } catch (err) {
            console.error('❌ [Service] Error processing Android sensor data:', err)
          }
        }
        
        androidSensorCallbackRef.current = sensorCallback
        ;(window as any).handleAndroidSensorData = sensorCallback
        
        try {
          (window as any).AndroidSensors.startListening('handleAndroidSensorData')
        } catch (err) {
          console.error('❌ [Service] Failed to restore Android sensors:', err)
        }
      }
    }
    
    return () => {
      // Не очищаем при размонтировании - сервис должен работать в фоне
    }
  }, [isTracking, postureStartTime, lastPosture])

  // Автозапуск в рабочие часы
  useEffect(() => {
    if (!user || (user.role !== 'executor' && user.role !== 'client')) return

    let componentMounted = true
    let isChecking = false

    const checkAndAutoStart = async () => {
      if (!componentMounted || isChecking) return
      
      // Получаем актуальное состояние из store
      const storeState = useActivityTrackerStore.getState()
      if (storeState.isTracking || isStartingRef.current) {
        isChecking = false
        return
      }
      
      // Проверяем настройку пользователя для автозапуска
      if (!storeState.autoStartInWorkingHours) {
        console.log('⏭️ [Service] Автозапуск отключен пользователем')
        isChecking = false
        return
      }
      
      isChecking = true
      
      // Загружаем информацию об офисе (с кэшированием)
      await loadOfficeInfo()
      
      if (!isWithinWorkingHours()) {
        isChecking = false
        return
      }

      // Если рабочие часы - запускаем трекер
      const currentManualStart = useActivityTrackerStore.getState().manualStart
      if (!currentManualStart) {
        console.log('✅ [Service] Автозапуск: Рабочие часы, запускаю трекер...')
        await startTracking()
      }
      
      isChecking = false
    }

    const initialTimeout = setTimeout(() => {
      if (componentMounted) {
        const storeState = useActivityTrackerStore.getState()
        if (!storeState.manualStart && !storeState.isTracking && !isStartingRef.current) {
          checkAndAutoStart()
        }
      }
    }, 3000)

    autoStartCheckRef.current = window.setInterval(async () => {
      if (!componentMounted || isChecking) return
      
      // Получаем актуальное состояние из store вместо ref
      const storeState = useActivityTrackerStore.getState()
      const currentIsTracking = storeState.isTracking
      const currentManualStart = storeState.manualStart
      
      // Загружаем актуальную информацию об офисе (с кэшированием)
      await loadOfficeInfo()
      
      const withinHours = isWithinWorkingHours()
      
      if (!withinHours) {
        // Рабочие часы закончились - останавливаем трекер, если он запущен
        // Но только если он был запущен автоматически (не вручную)
        if (currentIsTracking && !currentManualStart) {
          console.log('⏰ [Service] Рабочие часы закончились, останавливаю трекер и сбрасываю статистику...')
          // Используем ref для проверки, чтобы избежать двойной остановки
          if (isTrackingRef.current && !isStoppingRef.current) {
            await stopTracking()
            // Сбрасываем статистику после окончания рабочих часов
            resetStatistics()
            console.log('✅ [Service] Статистика сброшена после окончания рабочих часов')
          }
        }
        return
      }

      // Рабочие часы активны - запускаем трекер, если он не запущен и не был запущен вручную
      // Проверяем настройку пользователя для автозапуска
      const currentAutoStartEnabled = storeState.autoStartInWorkingHours
      if (!currentIsTracking && !currentManualStart && !isStartingRef.current && currentAutoStartEnabled) {
        console.log('✅ [Service] Автозапуск (периодическая проверка): Рабочие часы, запускаю трекер...')
        await startTracking()
      }
    }, 30000)

    return () => {
      componentMounted = false
      isChecking = false
      if (autoStartCheckRef.current) {
        clearInterval(autoStartCheckRef.current)
        autoStartCheckRef.current = null
      }
      if (initialTimeout) {
        clearTimeout(initialTimeout)
      }
    }
  }, [user?.id, user?.role, isTracking, manualStart, autoStartInWorkingHours])

  // Обработчики событий для стандартных Web API
  useEffect(() => {
    if (!user || (user.role !== 'executor' && user.role !== 'client')) {
      // Удаляем обработчики, если пользователь не executor
      window.removeEventListener('devicemotion', handleDeviceMotion as EventListener)
      window.removeEventListener('deviceorientation', handleDeviceOrientation as EventListener)
      return
    }
    
    if (isTracking && !isAndroidWebView.current) {
      window.addEventListener('devicemotion', handleDeviceMotion as EventListener)
      window.addEventListener('deviceorientation', handleDeviceOrientation as EventListener)
    } else {
      window.removeEventListener('devicemotion', handleDeviceMotion as EventListener)
      window.removeEventListener('deviceorientation', handleDeviceOrientation as EventListener)
    }

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion as EventListener)
      window.removeEventListener('deviceorientation', handleDeviceOrientation as EventListener)
      
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current)
        saveIntervalRef.current = null
      }
    }
  }, [isTracking, user])

  // Health напоминания - проверка времени сидения
  useEffect(() => {
    if (!user || (user.role !== 'executor' && user.role !== 'client')) {
      // Очищаем интервал для не-executor
      if (healthReminderIntervalRef.current) {
        clearInterval(healthReminderIntervalRef.current)
        healthReminderIntervalRef.current = null
      }
      return
    }
    
    if (!isTracking || !healthReminders.enabled || lastPosture !== 'sitting') {
      // Очищаем интервал если трекинг выключен или пользователь стоит
      if (healthReminderIntervalRef.current) {
        clearInterval(healthReminderIntervalRef.current)
        healthReminderIntervalRef.current = null
      }
      return
    }

    // Проверяем только если пользователь сидит
    const checkSittingTime = async () => {
      if (lastPosture !== 'sitting' || !postureStartTime) {
        return
      }

      const sittingDuration = Date.now() - postureStartTime
      const intervalMs = healthReminders.sittingIntervalMinutes * 60 * 1000

      // Проверяем, прошло ли достаточно времени с последнего напоминания
      const timeSinceLastReminder = healthReminders.lastReminderTime 
        ? Date.now() - healthReminders.lastReminderTime 
        : Infinity

      // Отправляем напоминание если:
      // 1. Сидит дольше заданного интервала
      // 2. С момента последнего напоминания прошло больше половины интервала (чтобы не спамить)
      if (sittingDuration >= intervalMs && timeSinceLastReminder >= intervalMs / 2) {
        const minutes = Math.floor(sittingDuration / 60000)
        const messages = [
          `Вы сидите уже ${minutes} минут. Пора встать и сделать перерыв!`,
          `Долгое сидение вредно для здоровья. Рекомендуем встать и размяться.`,
          `Вы работаете сидя ${minutes} минут. Сделайте паузу и пройдитесь!`,
          `Пора размяться! Вы сидите уже ${minutes} минут.`
        ]
        const randomMessage = messages[Math.floor(Math.random() * messages.length)]
        await sendHealthNotification(randomMessage)
      }
    }

    // Проверяем каждую минуту
    healthReminderIntervalRef.current = window.setInterval(checkSittingTime, 60000)
    
    // Первая проверка через минуту
    setTimeout(checkSittingTime, 60000)

    return () => {
      if (healthReminderIntervalRef.current) {
        clearInterval(healthReminderIntervalRef.current)
        healthReminderIntervalRef.current = null
      }
    }
  }, [isTracking, healthReminders, lastPosture, postureStartTime, user?.id])

  // Этот компонент не рендерит ничего видимого
  return null
}

