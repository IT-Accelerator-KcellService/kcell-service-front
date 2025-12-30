"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, Loader2, Trash2, Link2, Plus, ChevronLeft, ChevronRight, Power } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    getYandexDevicesList,
    getAllRoomDevices,
    createRoomDevice,
    deleteRoomDevice,
    getMeetingRooms,
    controlDevice,
    getRoomDevicesForClient,
    type YandexDevice,
    type RoomDevice,
    type MeetingRoom,
    type ControlDeviceRequest
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export function RoomDevicesAdmin() {
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingDevices, setIsLoadingDevices] = useState(false)
    const [isDeleting, setIsDeleting] = useState<number | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [yandexDevices, setYandexDevices] = useState<YandexDevice[]>([])
    const [roomDevices, setRoomDevices] = useState<RoomDevice[]>([])
    const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([])
    const [selectedRoom, setSelectedRoom] = useState<number | "">("")
    const [selectedDevice, setSelectedDevice] = useState<string>("")
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deviceToDelete, setDeviceToDelete] = useState<RoomDevice | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 5
    const { toast } = useToast()
    const [isControlling, setIsControlling] = useState<string | null>(null)
    const [devicesForControl, setDevicesForControl] = useState<Map<number, YandexDevice[]>>(new Map())

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setIsLoading(true)
            setError(null)
            await Promise.all([
                loadYandexDevices(),
                loadRoomDevices(),
                loadMeetingRooms()
            ])
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при загрузке данных")
        } finally {
            setIsLoading(false)
        }
    }

    const loadYandexDevices = async () => {
        try {
            setIsLoadingDevices(true)
            const response = await getYandexDevicesList()
            setYandexDevices(response.data.devices || [])
        } catch (err: any) {
            if (err.response?.status === 404) {
                // Токены не настроены - это нормально, не показываем ошибку
                setYandexDevices([])
            } else if (err.response?.status === 401) {
                setError("Токены Яндекс умного дома истекли или недействительны. Обновите токены в разделе 'Управление Яндекс умным домом'")
            } else {
                const errorMessage = err.response?.data?.message || err.message || "Ошибка при загрузке устройств из Яндекс"
                setError(errorMessage)
            }
        } finally {
            setIsLoadingDevices(false)
        }
    }

    const loadRoomDevices = async () => {
        try {
            const response = await getAllRoomDevices()
            const devices = response.data.devices || []
            setRoomDevices(devices)
            
            // Загружаем устройства для управления по комнатам
            await loadDevicesForControl(devices)
        } catch (err: any) {
            if (err.response?.status !== 404) {
                setError(err.response?.data?.message || "Ошибка при загрузке связей устройств")
            }
        }
    }

    const loadDevicesForControl = async (roomDevices: RoomDevice[]) => {
        const devicesMap = new Map<number, YandexDevice[]>()
        
        // Группируем устройства по комнатам
        const roomIds = [...new Set(roomDevices.map(rd => rd.meeting_room_id))]
        
        for (const roomId of roomIds) {
            try {
                // Получаем устройства для комнаты через API клиента (они возвращают YandexDevice с возможностью управления)
                const response = await getRoomDevicesForClient(roomId)
                const devices = response.data.devices || []
                if (devices.length > 0) {
                    devicesMap.set(roomId, devices)
                }
            } catch (err) {
                // Игнорируем ошибки для отдельных комнат
                console.error(`Ошибка загрузки устройств для комнаты ${roomId}:`, err)
            }
        }
        
        setDevicesForControl(devicesMap)
    }

    const loadMeetingRooms = async () => {
        try {
            const response = await getMeetingRooms()
            setMeetingRooms(response.data || [])
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при загрузке переговорных комнат")
        }
    }

    const handleCreate = async () => {
        if (!selectedRoom || !selectedDevice) {
            setError("Выберите комнату и устройство")
            return
        }

        const device = yandexDevices.find(d => d.id === selectedDevice)
        if (!device) {
            setError("Устройство не найдено")
            return
        }

        try {
            setIsLoading(true)
            setError(null)
            await createRoomDevice({
                meeting_room_id: selectedRoom as number,
                device_id: device.id,
                device_name: device.name,
                device_type: device.type
            })

            toast({
                title: "Успешно",
                description: "Устройство успешно связано с комнатой",
                duration: 3000
            })

            setSelectedRoom("")
            setSelectedDevice("")
            await loadRoomDevices()
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при создании связи")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteClick = (device: RoomDevice) => {
        setDeviceToDelete(device)
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!deviceToDelete) return

        try {
            setIsDeleting(deviceToDelete.id)
            setError(null)
            await deleteRoomDevice(deviceToDelete.id)

            toast({
                title: "Успешно",
                description: "Связь устройства с комнатой удалена",
                duration: 3000
            })

            await loadRoomDevices()
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при удалении связи")
        } finally {
            setIsDeleting(null)
            setDeleteDialogOpen(false)
            setDeviceToDelete(null)
        }
    }

    // Получаем доступные устройства (те, которые еще не связаны с выбранной комнатой)
    const getAvailableDevices = () => {
        if (!selectedRoom) return yandexDevices
        const linkedDeviceIds = roomDevices
            .filter(rd => rd.meeting_room_id === selectedRoom)
            .map(rd => rd.device_id)
        return yandexDevices.filter(device => !linkedDeviceIds.includes(device.id))
    }

    // Получаем состояние устройства (включено/выключено)
    const getDeviceState = (device: YandexDevice, capabilityType: string): boolean | null => {
        const capability = device.capabilities?.find((cap: any) => cap.type === capabilityType)
        if (capability?.state?.value !== undefined) {
            return capability.state.value
        }
        return null
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
            setDevicesForControl(prev => {
                const newMap = new Map(prev)
                for (const [roomId, devices] of newMap.entries()) {
                    const updatedDevices = devices.map(d => {
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
                    newMap.set(roomId, updatedDevices)
                }
                return newMap
            })
        } catch (err: any) {
            setError(err.response?.data?.message || "Ошибка при управлении устройством")
        } finally {
            setIsControlling(null)
        }
    }

    // Пагинация для списка связей
    const totalPages = Math.ceil(roomDevices.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedRoomDevices = roomDevices.slice(startIndex, endIndex)

    useEffect(() => {
        // Сбрасываем страницу при изменении данных
        setCurrentPage(1)
    }, [roomDevices.length])

    return (
        <div className="space-y-4 sm:space-y-6">
            <Card className="w-full">
                <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Link2 className="h-5 w-5" />
                        Связь устройств с переговорными комнатами
                    </CardTitle>
                    <CardDescription>
                        Свяжите устройства Яндекс умного дома с переговорными комнатами. Клиенты смогут управлять устройствами во время бронирования.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-red-800">{error}</div>
                            </div>
                        </div>
                    )}

                    {/* Форма создания связи */}
                    <Card className="bg-gray-50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Добавить связь</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Переговорная комната</label>
                                <Select
                                    value={selectedRoom.toString()}
                                    onValueChange={(value) => setSelectedRoom(value === "" ? "" : parseInt(value))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Выберите комнату" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {meetingRooms.map((room) => (
                                            <SelectItem key={room.id} value={room.id.toString()}>
                                                {room.name}{room.office ? ` (${room.office.name})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Устройство</label>
                                {isLoadingDevices ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Загрузка устройств...</span>
                                    </div>
                                ) : (
                                    <Select
                                        value={selectedDevice}
                                        onValueChange={setSelectedDevice}
                                        disabled={!selectedRoom}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder={selectedRoom ? "Выберите устройство" : "Сначала выберите комнату"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getAvailableDevices().length === 0 ? (
                                                <div className="px-2 py-1.5 text-sm text-gray-500">
                                                    Нет доступных устройств
                                                </div>
                                            ) : (
                                                getAvailableDevices().map((device) => (
                                                    <SelectItem key={device.id} value={device.id}>
                                                        {device.name} {device.type ? `(${device.type})` : ""}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            <Button
                                onClick={handleCreate}
                                disabled={isLoading || !selectedRoom || !selectedDevice}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Создание...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Plus className="w-4 h-4" />
                                        <span>Создать связь</span>
                                    </div>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Список существующих связей */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold">Существующие связи</h3>
                        {isLoading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Загрузка...</span>
                            </div>
                        ) : roomDevices.length === 0 ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-600">
                                Нет связанных устройств
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    {paginatedRoomDevices.map((roomDevice) => (
                                        <div
                                            key={roomDevice.id}
                                            className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4 text-blue-600" />
                                                    <div>
                                                        <p className="text-sm font-medium text-blue-900">
                                                            {roomDevice.device_name}
                                                        </p>
                                                        <p className="text-xs text-blue-700">
                                                            Комната: {roomDevice.meetingRoom?.name || `ID: ${roomDevice.meeting_room_id}`}
                                                            {roomDevice.meetingRoom?.office && ` (${roomDevice.meetingRoom.office.name})`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteClick(roomDevice)}
                                                disabled={isDeleting === roomDevice.id}
                                            >
                                                {isDeleting === roomDevice.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="text-sm text-gray-600">
                                            Показано {startIndex + 1}-{Math.min(endIndex, roomDevices.length)} из {roomDevices.length}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </Button>
                                            <span className="text-sm text-gray-600">
                                                Страница {currentPage} из {totalPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages}
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Управление устройствами */}
            <Card className="w-full">
                <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                        <Power className="h-5 w-5" />
                        Управление устройствами
                    </CardTitle>
                    <CardDescription>
                        Управляйте всеми устройствами из всех комнат
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {Array.from(devicesForControl.entries()).length === 0 ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-600">
                            Нет устройств для управления. Сначала создайте связи устройств с комнатами.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Array.from(devicesForControl.entries()).map(([roomId, devices]) => {
                                const room = meetingRooms.find(r => r.id === roomId)
                                const controllableDevices = devices.filter(device => {
                                    return device.capabilities?.some((cap: any) => cap.type === "devices.capabilities.on_off")
                                })

                                if (controllableDevices.length === 0) return null

                                return (
                                    <div key={roomId} className="space-y-2">
                                        <h4 className="text-sm font-semibold text-gray-700">
                                            {room?.name || `Комната ID: ${roomId}`}
                                            {room?.office && ` (${room.office.name})`}
                                        </h4>
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
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить связь?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Вы уверены, что хотите удалить связь устройства "{deviceToDelete?.device_name}" с комнатой?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm}>
                            Удалить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

