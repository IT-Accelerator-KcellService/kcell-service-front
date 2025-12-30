"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, Loader2, Power, Lightbulb, Home } from "lucide-react"
import { getClientRoomSubscriptions, getRoomDevicesForClient, controlDevice, type YandexDevice, type ControlDeviceRequest } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/stores/useAuthStore"

export function ClientSmartHomeControl() {
    const [isLoading, setIsLoading] = useState(false)
    const [isControlling, setIsControlling] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [subscriptions, setSubscriptions] = useState<any[]>([])
    const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
    const [devices, setDevices] = useState<YandexDevice[]>([])
    const { toast } = useToast()
    const user = useAuthStore(state => state.user)

    useEffect(() => {
        if (user?.id) {
            loadSubscriptions()
        }
    }, [user?.id])

    useEffect(() => {
        if (selectedRoomId) {
            loadDevices()
        } else {
            setDevices([])
        }
    }, [selectedRoomId])

    const loadSubscriptions = async () => {
        try {
            setIsLoading(true)
            setError(null)
            if (!user?.id) return
            const response = await getClientRoomSubscriptions(user.id)
            setSubscriptions(response.data.subscriptions || [])
            // Автоматически выбираем первую комнату, если есть подписки
            if (response.data.subscriptions && response.data.subscriptions.length > 0 && !selectedRoomId) {
                setSelectedRoomId(response.data.subscriptions[0].meeting_room_id)
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при загрузке подписок")
        } finally {
            setIsLoading(false)
        }
    }

    const loadDevices = async () => {
        if (!selectedRoomId) return
        try {
            setIsLoading(true)
            setError(null)
            const response = await getRoomDevicesForClient(selectedRoomId)
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

    if (isLoading && subscriptions.length === 0) {
        return (
            <Card className="w-full">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Загрузка подписок...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (subscriptions.length === 0) {
        return (
            <Card className="w-full">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        Управление умным домом
                    </CardTitle>
                    <CardDescription>
                        Управляйте устройствами в подписанных комнатах
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-gray-600 text-center py-4">
                        У вас нет подписок на комнаты. Обратитесь к администратору для подписки на комнату.
                    </div>
                </CardContent>
            </Card>
        )
    }

    const selectedRoom = subscriptions.find(sub => sub.meeting_room_id === selectedRoomId)

    return (
        <div className="space-y-4">
            <Card className="w-full">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        Управление умным домом
                    </CardTitle>
                    <CardDescription>
                        Выберите комнату и управляйте устройствами
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Выбор комнаты */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Выберите комнату</label>
                        <Select
                            value={selectedRoomId?.toString() || ""}
                            onValueChange={(value) => setSelectedRoomId(value ? parseInt(value) : null)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Выберите комнату" />
                            </SelectTrigger>
                            <SelectContent>
                                {subscriptions.map((sub) => (
                                    <SelectItem key={sub.id} value={sub.meeting_room_id.toString()}>
                                        {sub.meetingRoom?.name || `Комната ID: ${sub.meeting_room_id}`}
                                        {sub.meetingRoom?.office && ` (${sub.meetingRoom.office.name})`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-red-800">{error}</div>
                            </div>
                        </div>
                    )}

                    {selectedRoomId && (
                        <>
                            {isLoading && devices.length === 0 ? (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Загрузка устройств...</span>
                                </div>
                            ) : controllableDevices.length === 0 ? (
                                <div className="text-sm text-gray-600 text-center py-4">
                                    Нет доступных устройств для управления в этой комнате
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold">Устройства в комнате</h3>
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
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

