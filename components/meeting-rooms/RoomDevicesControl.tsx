"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2, Power, Lightbulb } from "lucide-react"
import { getRoomDevicesForClient, controlDevice, type YandexDevice, type ControlDeviceRequest } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface RoomDevicesControlProps {
    meeting_room_id: number
    bookingStartTime: string
    bookingEndTime: string
}

export function RoomDevicesControl({ meeting_room_id, bookingStartTime, bookingEndTime }: RoomDevicesControlProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isControlling, setIsControlling] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [devices, setDevices] = useState<YandexDevice[]>([])
    const [isBookingActive, setIsBookingActive] = useState(false)
    const { toast } = useToast()

    // Проверяем, активно ли бронирование
    useEffect(() => {
        const checkBookingStatus = () => {
            // Получаем текущее время
            const now = new Date()
            const nowTime = now.getTime()
            
            // Парсим время бронирования
            // Время приходит с сервера в формате ISO, но может быть без часовой зоны
            // Если есть 'Z' - это UTC, если есть '+' или '-' после 10-го символа - это со смещением
            // Иначе - интерпретируем как локальное время браузера
            let startTime: number
            let endTime: number
            
            const hasTimezone = bookingStartTime.includes('Z') || 
                              bookingStartTime.includes('+') || 
                              (bookingStartTime.includes('-') && bookingStartTime.lastIndexOf('-') > 10)
            
            if (hasTimezone) {
                // Время с часовой зоной - но если это Z (UTC), нужно конвертировать из Алматы времени
                // Сервер сохраняет время Алматы как UTC, поэтому нужно вычесть 5 часов
                const ALMATY_OFFSET_HOURS = 5
                const ALMATY_OFFSET_MS = ALMATY_OFFSET_HOURS * 60 * 60 * 1000
                
                const start = new Date(bookingStartTime)
                const end = new Date(bookingEndTime)
                
                // Если время заканчивается на Z, это UTC, но на самом деле это время Алматы
                // Вычитаем 5 часов, чтобы получить правильное UTC время
                if (bookingStartTime.endsWith('Z')) {
                    startTime = start.getTime() - ALMATY_OFFSET_MS
                    endTime = end.getTime() - ALMATY_OFFSET_MS
                } else {
                    startTime = start.getTime()
                    endTime = end.getTime()
                }
            } else {
                // Время без часовой зоны - интерпретируем как локальное время Алматы (UTC+5)
                // Создаем как UTC и вычитаем 5 часов (чтобы 20:00 Алматы стало 15:00 UTC)
                const ALMATY_OFFSET_HOURS = 5
                const start = new Date(bookingStartTime + 'Z')
                const end = new Date(bookingEndTime + 'Z')
                // Вычитаем смещение часового пояса Алматы (5 часов = 5 * 60 * 60 * 1000 мс)
                startTime = start.getTime() - (ALMATY_OFFSET_HOURS * 60 * 60 * 1000)
                endTime = end.getTime() - (ALMATY_OFFSET_HOURS * 60 * 60 * 1000)
            }
            
            // Добавляем небольшой буфер (1 минута до начала), чтобы показывать компонент заранее
            const bufferStartTime = startTime - 60 * 1000
            
            // Сравниваем время в миллисекундах
            const isActive = nowTime >= bufferStartTime && nowTime <= endTime
            
            setIsBookingActive(isActive)
        }

        // Проверяем сразу
        checkBookingStatus()
        // Проверяем каждую минуту
        const interval = setInterval(checkBookingStatus, 60000)

        return () => clearInterval(interval)
    }, [bookingStartTime, bookingEndTime])

    useEffect(() => {
        if (isBookingActive) {
            loadDevices()
        }
    }, [isBookingActive, meeting_room_id])

    const loadDevices = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const response = await getRoomDevicesForClient(meeting_room_id)
            setDevices(response.data.devices || [])
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при загрузке устройств")
        } finally {
            setIsLoading(false)
        }
    }

    const handleControlDevice = async (device: YandexDevice, actionType: string, value: any) => {
        try {
            setIsControlling(device.id)
            setError(null)

            const request: ControlDeviceRequest = {
                device_id: device.id,
                action_type: actionType,
                action_state: {
                    instance: "on",
                    value: value
                }
            }

            await controlDevice(request)

            toast({
                title: "Успешно",
                description: `Устройство "${device.name}" ${value ? "включено" : "выключено"}`,
                duration: 2000
            })

            // Обновляем состояние устройства локально
            setDevices(prevDevices =>
                prevDevices.map(d => {
                    if (d.id === device.id) {
                        const updatedDevice = { ...d }
                        const capability = updatedDevice.capabilities?.find(
                            (cap: any) => cap.type === actionType
                        )
                        if (capability) {
                            capability.state = { ...capability.state, value }
                        }
                        return updatedDevice
                    }
                    return d
                })
            )
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при управлении устройством")
        } finally {
            setIsControlling(null)
        }
    }

    // Получаем состояние устройства (включено/выключено)
    const getDeviceState = (device: YandexDevice, capabilityType: string): boolean | null => {
        const capability = device.capabilities?.find((cap: any) => cap.type === capabilityType)
        if (capability?.state?.value !== undefined) {
            return capability.state.value
        }
        return null
    }

    // Фильтруем устройства с возможностью управления (on_off)
    const controllableDevices = devices.filter(device => {
        return device.capabilities?.some((cap: any) => cap.type === "devices.capabilities.on_off")
    })

    if (!isBookingActive) {
        return null // Не показываем, если бронирование не активно
    }

    if (isLoading) {
        return (
            <Card className="w-full">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Загрузка устройств...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Показываем компонент даже если нет устройств, чтобы пользователь знал, что функция доступна
    // Но если есть ошибка и нет устройств - не показываем
    if (controllableDevices.length === 0 && !error && !isLoading) {
        return (
            <Card className="w-full">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="h-5 w-5" />
                        Управление устройствами
                    </CardTitle>
                    <CardDescription>
                        Управляйте устройствами комнаты во время бронирования
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-gray-600 text-center py-4">
                        Нет доступных устройств для управления в этой комнате
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Управление устройствами
                </CardTitle>
                <CardDescription>
                    Управляйте устройствами комнаты во время бронирования
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-red-800">{error}</div>
                        </div>
                    </div>
                )}

                {controllableDevices.length === 0 ? (
                    <div className="text-sm text-gray-600 text-center py-4">
                        Нет доступных устройств для управления
                    </div>
                ) : (
                    <div className="space-y-2">
                        {controllableDevices.map((device) => {
                            const isOn = getDeviceState(device, "devices.capabilities.on_off")
                            const isControllingThis = isControlling === device.id

                            return (
                                <div
                                    key={device.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                >
                                    <div className="flex items-center gap-3">
                                        <Power className={`w-5 h-5 ${isOn ? 'text-yellow-500' : 'text-gray-400'}`} />
                                        <div>
                                            <p className="text-sm font-medium">{device.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {device.type?.replace('devices.types.', '') || 'Устройство'}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleControlDevice(
                                            device,
                                            "devices.capabilities.on_off",
                                            !isOn
                                        )}
                                        disabled={isControllingThis || isOn === null}
                                        variant={isOn ? "default" : "outline"}
                                        size="sm"
                                    >
                                        {isControllingThis ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : isOn ? (
                                            "Выключить"
                                        ) : (
                                            "Включить"
                                        )}
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>

        </Card>
    )
}

