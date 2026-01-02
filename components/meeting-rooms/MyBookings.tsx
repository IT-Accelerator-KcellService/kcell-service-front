"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Building2, X, ExternalLink, CheckCircle2, AlertCircle, MapPin, Users } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { getMyBookings, cancelMeetingRoomBooking, MeetingRoomBooking } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useRejectRequestModal } from "@/hooks/use-reject-modal"
import { RejectRequestModal } from "@/components/RejectRequestModal"
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal"
import { useRouter } from "next/navigation"

export function MyBookings() {
  const [bookings, setBookings] = useState<MeetingRoomBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [bookingToCancel, setBookingToCancel] = useState<MeetingRoomBooking | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const { toast } = useToast()
  const rejectModal = useRejectRequestModal()
  const router = useRouter()

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const response = await getMyBookings()
      // API возвращает массив напрямую
      const bookingsData = Array.isArray(response.data) ? response.data : response.data || []
      // Сортируем бронирования по дате и времени (ближайшие сверху)
      const sortedBookings = bookingsData.sort((a, b) => {
        const dateA = new Date(a.start_time)
        const dateB = new Date(b.start_time)
        return dateA.getTime() - dateB.getTime()
      })
      setBookings(sortedBookings)
    } catch (error) {
      console.error("Ошибка при загрузке бронирований:", error)
      setBookings([]) // Устанавливаем пустой массив в случае ошибки
    } finally {
      setLoading(false)
    }
  }

  const handleCancelClick = (booking: MeetingRoomBooking) => {
    setBookingToCancel(booking)
    setShowCancelModal(true)
  }

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return

    const bookingId = bookingToCancel.id
    setShowCancelModal(false)

    try {
      setCancellingId(bookingId)
      
      // Оптимистично обновляем статус в локальном состоянии
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId
            ? { ...booking, status: 'cancelled' }
            : booking
        )
      )
      
      await cancelMeetingRoomBooking(bookingId)
      
      toast({
        title: "Бронирование отменено",
        description: "Бронирование успешно отменено",
      })
      
      // Перезагружаем список для получения актуальных данных
      await fetchBookings()
    } catch (error: any) {
      console.error("Ошибка при отмене бронирования:", error)
      
      // Откатываем оптимистичное обновление при ошибке
      await fetchBookings()
      
      rejectModal.showReject({
        title: "Ошибка отмены",
        message: error.response?.data?.message || "Ошибка при отмене бронирования",
      })
    } finally {
      setCancellingId(null)
      setBookingToCancel(null)
    }
  }

  // Helper функция для конвертации времени в строку
  const timeToString = (time: string | Date): string => {
    return typeof time === 'string' ? time : time.toISOString()
  }

  const isUpcoming = (booking: MeetingRoomBooking) => {
    // Исключаем отмененные, завершенные и активные бронирования
    if (booking.status === 'cancelled' || 
        booking.status === 'auto_cancelled' || 
        booking.status === 'completed' ||
        booking.status === 'in_progress') {
      return false
    }
    const bookingDateTime = new Date(booking.start_time)
    return bookingDateTime > new Date()
  }

  const isActive = (booking: MeetingRoomBooking) => {
    // Исключаем отмененные бронирования
    if (booking.status === 'cancelled' || booking.status === 'auto_cancelled') {
      return false
    }
    
    // Если статус in_progress, то всегда показываем как активное
    if (booking.status === 'in_progress') {
      return true
    }
    
    // Иначе проверяем время
    const now = new Date()
    const start = new Date(booking.start_time)
    const end = new Date(booking.end_time)
    return now >= start && now <= end
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return { 
          text: 'В процессе', 
          className: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-md',
          icon: <AlertCircle className="w-3 h-3 mr-1" />
        }
      case 'confirmed':
        return { 
          text: 'Подтверждено', 
          className: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-md',
          icon: <CheckCircle2 className="w-3 h-3 mr-1" />
        }
      case 'scheduled':
        return { 
          text: 'Запланировано', 
          className: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-md',
          icon: <Clock className="w-3 h-3 mr-1" />
        }
      case 'completed':
        return { 
          text: 'Завершено', 
          className: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0 shadow-md',
          icon: <CheckCircle2 className="w-3 h-3 mr-1" />
        }
      case 'cancelled':
      case 'auto_cancelled':
        return { 
          text: 'Отменено', 
          className: 'bg-gradient-to-r from-red-400 to-red-600 text-white border-0 shadow-md',
          icon: <X className="w-3 h-3 mr-1" />
        }
      default:
        return { 
          text: 'Активно', 
          className: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-md',
          icon: <CheckCircle2 className="w-3 h-3 mr-1" />
        }
    }
  }

  const isPast = (booking: MeetingRoomBooking) => {
    // Если статус уже "completed", показываем как завершенное
    if (booking.status === 'completed') {
      return true
    }
    
    // Иначе проверяем время окончания
    // Учитываем, что время приходит с сервера как UTC, но это время Алматы
    const now = new Date()
    const nowTime = now.getTime()
    
    // Конвертируем end_time в строку для работы с ней
    const endTimeStr = typeof booking.end_time === 'string' ? booking.end_time : booking.end_time.toISOString()
    
    let endTime: number
    const hasTimezone = endTimeStr.includes('Z') || 
                       endTimeStr.includes('+') || 
                       (endTimeStr.includes('-') && endTimeStr.lastIndexOf('-') > 10)
    
    if (hasTimezone && endTimeStr.endsWith('Z')) {
      // Время с Z - это UTC, но на самом деле это время Алматы
      // Вычитаем 5 часов для конвертации в правильное UTC
      const ALMATY_OFFSET_MS = 5 * 60 * 60 * 1000
      const end = new Date(endTimeStr)
      endTime = end.getTime() - ALMATY_OFFSET_MS
    } else {
      const end = new Date(endTimeStr)
      endTime = end.getTime()
    }
    
    return endTime < nowTime
  }

  const isCancelled = (booking: MeetingRoomBooking) => {
    return booking.status === 'cancelled' || booking.status === 'auto_cancelled'
  }

  const handleOpenBookingPage = (bookingId: number) => {
    router.push(`/booking/${bookingId}`)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#114A65] border-t-transparent"></div>
        <p className="text-muted-foreground text-lg">Загрузка ваших бронирований...</p>
      </div>
    )
  }

  const upcomingBookings = bookings.filter(isUpcoming)
  const activeBookings = bookings.filter(isActive)
  const pastBookings = bookings.filter((booking) => isPast(booking) && !isCancelled(booking))
  const cancelledBookings = bookings.filter(isCancelled)

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-[#114A65] to-[#0d3a4f] rounded-xl p-6 text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2">Мои бронирования</h2>
        <p className="text-white/90 text-lg">Управляйте своими бронированиями переговорных комнат</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          {activeBookings.length > 0 && (
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>{activeBookings.length} активных</span>
            </div>
          )}
          {upcomingBookings.length > 0 && (
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Calendar className="w-4 h-4" />
              <span>{upcomingBookings.length} предстоящих</span>
            </div>
          )}
          {pastBookings.length > 0 && (
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <CheckCircle2 className="w-4 h-4" />
              <span>{pastBookings.length} завершенных</span>
            </div>
          )}
        </div>
      </div>

      <RejectRequestModal
        isOpen={rejectModal.isOpen}
        onClose={rejectModal.hideReject}
        title={rejectModal.title}
        message={rejectModal.message}
        duration={rejectModal.duration}
      />

      <DeleteConfirmationModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setBookingToCancel(null)
        }}
        onConfirm={handleCancelBooking}
        title="Отменить бронирование?"
        description={
          bookingToCancel
            ? `Вы уверены, что хотите отменить бронирование комнаты "${bookingToCancel.meetingRoom?.name || bookingToCancel.meeting_room?.name || `Комната #${bookingToCancel.meeting_room_id}`}" на ${format(new Date(bookingToCancel.start_time), "dd MMMM yyyy", { locale: ru })} с ${format(new Date(bookingToCancel.start_time), "HH:mm", { locale: ru })} до ${format(new Date(bookingToCancel.end_time), "HH:mm", { locale: ru })}?`
            : "Вы уверены, что хотите отменить бронирование?"
        }
        confirmText="Отменить бронирование"
        cancelText="Нет, оставить"
        isLoading={cancellingId !== null && bookingToCancel?.id === cancellingId}
      />

      {activeBookings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
            <h3 className="text-xl font-bold text-gray-900">Активные бронирования</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeBookings.map((booking) => {
              const statusBadge = getStatusBadge(booking.status || 'in_progress')
              return (
                <Card key={booking.id} className="relative border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-white to-blue-50/30">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-bl-full"></div>
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-bold text-gray-900 mb-1 break-words line-clamp-2">
                          {booking.meetingRoom?.name || booking.meeting_room?.name || `Комната #${booking.meeting_room_id}`}
                        </CardTitle>
                        {booking.company_name && (
                          <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{booking.company_name}</span>
                          </p>
                        )}
                      </div>
                      <Badge className={`${statusBadge.className} flex items-center flex-shrink-0 whitespace-nowrap`}>
                        {statusBadge.icon}
                        {statusBadge.text}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 relative">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700 bg-white/60 p-2 rounded-lg">
                        <Calendar className="w-4 h-4 text-[#114A65]" />
                        <span className="font-medium">
                          {booking.start_time && typeof booking.start_time === 'string' 
                            ? format(new Date(booking.start_time.substring(0, 10) + 'T00:00:00'), "dd MMMM yyyy", { locale: ru })
                            : format(new Date(booking.start_time), "dd MMMM yyyy", { locale: ru })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 bg-white/60 p-2 rounded-lg">
                        <Clock className="w-4 h-4 text-[#114A65]" />
                        <span className="font-medium">
                          {(() => {
                            const startStr = timeToString(booking.start_time)
                            const endStr = timeToString(booking.end_time)
                            return typeof booking.start_time === 'string'
                              ? `${startStr.substring(11, 16)} - ${endStr.substring(11, 16)}`
                              : `${format(new Date(booking.start_time), "HH:mm", { locale: ru })} - ${format(new Date(booking.end_time), "HH:mm", { locale: ru })}`
                          })()}
                        </span>
                      </div>
                      {(booking.meetingRoom?.office || booking.office) && (
                        <div className="flex items-center gap-2 text-gray-700 bg-white/60 p-2 rounded-lg">
                          <MapPin className="w-4 h-4 text-[#114A65]" />
                          <span className="font-medium">{(booking.meetingRoom?.office || booking.office)?.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full bg-gradient-to-r from-[#114A65] to-[#0d3a4f] hover:from-[#0d3a4f] hover:to-[#114A65] text-white shadow-md"
                        onClick={() => handleOpenBookingPage(booking.id)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Открыть страницу
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => handleCancelClick(booking)}
                        disabled={cancellingId === booking.id}
                      >
                        <X className="w-4 h-4 mr-2" />
                        {cancellingId === booking.id ? "Отмена..." : "Отменить"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {upcomingBookings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full"></div>
            <h3 className="text-xl font-bold text-gray-900">Предстоящие бронирования</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingBookings.map((booking) => {
              const statusBadge = getStatusBadge(booking.status || 'scheduled')
              return (
                <Card key={booking.id} className="relative border-2 border-amber-100 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.01] bg-gradient-to-br from-white to-amber-50/20">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-100/30 rounded-bl-full"></div>
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-bold text-gray-900 mb-1 break-words line-clamp-2">
                          {booking.meetingRoom?.name || booking.meeting_room?.name || `Комната #${booking.meeting_room_id}`}
                        </CardTitle>
                        {booking.company_name && (
                          <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{booking.company_name}</span>
                          </p>
                        )}
                      </div>
                      <Badge className={`${statusBadge.className} flex items-center flex-shrink-0 whitespace-nowrap`}>
                        {statusBadge.icon}
                        {statusBadge.text}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 relative">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700 bg-white/60 p-2 rounded-lg">
                        <Calendar className="w-4 h-4 text-[#114A65]" />
                        <span className="font-medium">
                          {booking.start_time && typeof booking.start_time === 'string' 
                            ? format(new Date(booking.start_time.substring(0, 10) + 'T00:00:00'), "dd MMMM yyyy", { locale: ru })
                            : format(new Date(booking.start_time), "dd MMMM yyyy", { locale: ru })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 bg-white/60 p-2 rounded-lg">
                        <Clock className="w-4 h-4 text-[#114A65]" />
                        <span className="font-medium">
                          {(() => {
                            const startStr = timeToString(booking.start_time)
                            const endStr = timeToString(booking.end_time)
                            return typeof booking.start_time === 'string'
                              ? `${startStr.substring(11, 16)} - ${endStr.substring(11, 16)}`
                              : `${format(new Date(booking.start_time), "HH:mm", { locale: ru })} - ${format(new Date(booking.end_time), "HH:mm", { locale: ru })}`
                          })()}
                        </span>
                      </div>
                      {(booking.meetingRoom?.office || booking.office) && (
                        <div className="flex items-center gap-2 text-gray-700 bg-white/60 p-2 rounded-lg">
                          <MapPin className="w-4 h-4 text-[#114A65]" />
                          <span className="font-medium">{(booking.meetingRoom?.office || booking.office)?.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full bg-gradient-to-r from-[#114A65] to-[#0d3a4f] hover:from-[#0d3a4f] hover:to-[#114A65] text-white shadow-md"
                        onClick={() => handleOpenBookingPage(booking.id)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Открыть страницу
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => handleCancelClick(booking)}
                        disabled={cancellingId === booking.id}
                      >
                        <X className="w-4 h-4 mr-2" />
                        {cancellingId === booking.id ? "Отмена..." : "Отменить"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {cancelledBookings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-red-400 to-red-600 rounded-full"></div>
            <h3 className="text-xl font-bold text-gray-900">Отмененные бронирования</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cancelledBookings.map((booking) => {
              const statusBadge = getStatusBadge(booking.status || 'cancelled')
              return (
                <Card key={booking.id} className="relative opacity-70 border-2 border-red-100 bg-gradient-to-br from-white to-red-50/10">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-red-100/20 rounded-bl-full"></div>
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-bold text-gray-700 mb-1 line-through break-words line-clamp-2">
                          {booking.meetingRoom?.name || booking.meeting_room?.name || `Комната #${booking.meeting_room_id}`}
                        </CardTitle>
                        {booking.company_name && (
                          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{booking.company_name}</span>
                          </p>
                        )}
                      </div>
                      <Badge className={`${statusBadge.className} flex items-center flex-shrink-0 whitespace-nowrap`}>
                        {statusBadge.icon}
                        {statusBadge.text}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 relative">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-500 bg-white/40 p-2 rounded-lg">
                        <Calendar className="w-4 h-4 text-red-400" />
                        <span>
                          {booking.start_time && typeof booking.start_time === 'string' 
                            ? format(new Date(booking.start_time.substring(0, 10) + 'T00:00:00'), "dd MMMM yyyy", { locale: ru })
                            : format(new Date(booking.start_time), "dd MMMM yyyy", { locale: ru })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500 bg-white/40 p-2 rounded-lg">
                        <Clock className="w-4 h-4 text-red-400" />
                        <span>
                          {(() => {
                            const startStr = timeToString(booking.start_time)
                            const endStr = timeToString(booking.end_time)
                            return typeof booking.start_time === 'string'
                              ? `${startStr.substring(11, 16)} - ${endStr.substring(11, 16)}`
                              : `${format(new Date(booking.start_time), "HH:mm", { locale: ru })} - ${format(new Date(booking.end_time), "HH:mm", { locale: ru })}`
                          })()}
                        </span>
                      </div>
                      {(booking.meetingRoom?.office || booking.office) && (
                        <div className="flex items-center gap-2 text-gray-500 bg-white/40 p-2 rounded-lg">
                          <MapPin className="w-4 h-4 text-red-400" />
                          <span>{(booking.meetingRoom?.office || booking.office)?.name}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {pastBookings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-to-b from-gray-400 to-gray-500 rounded-full"></div>
            <h3 className="text-xl font-bold text-gray-900">Завершенные бронирования</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastBookings.map((booking) => {
              const statusBadge = getStatusBadge(booking.status || 'completed')
              return (
                <Card key={booking.id} className="relative opacity-85 border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-white to-gray-50/30">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gray-100/30 rounded-bl-full"></div>
                  <CardHeader className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-bold text-gray-700 mb-1 break-words line-clamp-2">
                          {booking.meetingRoom?.name || booking.meeting_room?.name || `Комната #${booking.meeting_room_id}`}
                        </CardTitle>
                        {booking.company_name && (
                          <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{booking.company_name}</span>
                          </p>
                        )}
                      </div>
                      <Badge className={`${statusBadge.className} flex items-center flex-shrink-0 whitespace-nowrap`}>
                        {statusBadge.icon}
                        {statusBadge.text}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 relative">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 bg-white/60 p-2 rounded-lg">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>
                          {booking.start_time && typeof booking.start_time === 'string' 
                            ? format(new Date(booking.start_time.substring(0, 10) + 'T00:00:00'), "dd MMMM yyyy", { locale: ru })
                            : format(new Date(booking.start_time), "dd MMMM yyyy", { locale: ru })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 bg-white/60 p-2 rounded-lg">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span>
                          {(() => {
                            const startStr = timeToString(booking.start_time)
                            const endStr = timeToString(booking.end_time)
                            return typeof booking.start_time === 'string'
                              ? `${startStr.substring(11, 16)} - ${endStr.substring(11, 16)}`
                              : `${format(new Date(booking.start_time), "HH:mm", { locale: ru })} - ${format(new Date(booking.end_time), "HH:mm", { locale: ru })}`
                          })()}
                        </span>
                      </div>
                      {(booking.meetingRoom?.office || booking.office) && (
                        <div className="flex items-center gap-2 text-gray-600 bg-white/60 p-2 rounded-lg">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span>{(booking.meetingRoom?.office || booking.office)?.name}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => handleOpenBookingPage(booking.id)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Просмотреть детали
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {bookings.length === 0 && (
        <Card className="border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-white">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-[#114A65] to-[#0d3a4f] rounded-full flex items-center justify-center">
                <Calendar className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Нет бронирований</h3>
                <p className="text-muted-foreground text-lg">
                  У вас пока нет бронирований переговорных комнат
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

