"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Calendar as CalendarIcon, Clock, Building2, Users, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { MeetingRoom } from "@/stores/meetingRoomsStore"
import api from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useRejectRequestModal } from "@/hooks/use-reject-modal"
import { RejectRequestModal } from "@/components/RejectRequestModal"
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal"
import { getRoomDailyAvailability, getMeetingRoomById, type MeetingRoom as ApiMeetingRoom } from "@/lib/api"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  room: MeetingRoom | null
  onBookingSuccess?: () => void
  onSuccess?: (message: { title: string; message: string }) => void
  isPageMode?: boolean // Режим страницы для мобильных устройств
  variant?: "default" | "dark"
}

// Генерация временных слотов с 9:00 до 00:00 (24:00)
const generateTimeSlots = () => {
  const slots = []
  for (let hour = 9; hour < 24; hour++) {
    const startHour = hour.toString().padStart(2, "0")
    const endHour = (hour + 1).toString().padStart(2, "0")
    slots.push({
      label: `${startHour}:00-${endHour}:00`,
      start: `${startHour}:00`,
      end: `${endHour}:00`,
    })
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

export function BookingModal({
  isOpen,
  onClose,
  room,
  onBookingSuccess,
  onSuccess,
  isPageMode = false,
  variant = "default",
}: BookingModalProps) {
  const isDark = variant === "dark";
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const { toast } = useToast()
  const rejectModal = useRejectRequestModal()
  const router = useRouter()
  const [roomDetails, setRoomDetails] = useState<ApiMeetingRoom | null>(null)

  // Lock body scroll while modal is open (prevents double scrollbars)
  useEffect(() => {
    if (!isOpen || isPageMode) return
    if (typeof window === "undefined") return

    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevHtmlScrollbarGutter = (html.style as any).scrollbarGutter as string | undefined
    const prevBodyOverflow = body.style.overflow
    const prevBodyPaddingRight = body.style.paddingRight

    const scrollbarWidth = window.innerWidth - html.clientWidth
    html.style.overflow = "hidden"
    // Some layouts set `scrollbar-gutter: stable` which keeps a visible gutter/scrollbar.
    // Force normal behavior while modal is open to avoid a second scrollbar track.
    ;(html.style as any).scrollbarGutter = "auto"
    body.style.overflow = "hidden"
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      html.style.overflow = prevHtmlOverflow
      ;(html.style as any).scrollbarGutter = prevHtmlScrollbarGutter ?? ""
      body.style.overflow = prevBodyOverflow
      body.style.paddingRight = prevBodyPaddingRight
    }
  }, [isOpen, isPageMode])

  // Загружаем детали комнаты
  useEffect(() => {
    if (room && isPageMode) {
      getMeetingRoomById(room.id)
        .then((response) => {
          setRoomDetails(response.data)
        })
        .catch((error) => {
          console.error("Ошибка при загрузке деталей комнаты:", error)
        })
    } else if (room) {
      // В режиме модалки используем данные из пропсов
      setRoomDetails(room as any)
    }
  }, [room, isPageMode])

  // Загружаем занятые слоты при выборе даты
  useEffect(() => {
    if (selectedDate && room) {
      const dateString = format(selectedDate, "yyyy-MM-dd")
      setLoadingAvailability(true)
      getRoomDailyAvailability(room.id, dateString, 60)
        .then((response) => {
          console.log("Ответ API доступности:", response.data)
          const booked = new Set<string>()
          
          // Обрабатываем bookings напрямую - это основной источник данных
          if (response.data.bookings && Array.isArray(response.data.bookings)) {
            console.log(`Найдено бронирований: ${response.data.bookings.length}`)
            response.data.bookings.forEach((booking: any) => {
              console.log(`Обработка бронирования:`, {
                id: booking.id,
                start_time: booking.start_time,
                end_time: booking.end_time,
                status: booking.status
              })
              
              const startTime = new Date(booking.start_time)
              const endTime = new Date(booking.end_time)
              
              // Извлекаем дату из ISO строки напрямую (например "2025-11-22T22:00:00.000Z" -> "2025-11-22")
              // Время в базе хранится локально, но Sequelize возвращает его как UTC с суффиксом Z
              // Но если в базе было "2025-11-22 22:00:00" локально, то PostgreSQL сохранит это время,
              // а Sequelize при сериализации может конвертировать в UTC или оставить как есть
              // Проверяем дату из UTC времени, но если она не совпадает, пробуем из строки
              const bookingDateFromUTC = format(startTime, "yyyy-MM-dd")
              const bookingDateFromString = booking.start_time.substring(0, 10)
              
              // Используем дату из строки, так как она соответствует локальному времени в базе
              const bookingDate = bookingDateFromString
              
              console.log(`Дата бронирования (из строки): ${bookingDate}, выбранная дата: ${dateString}, UTC дата: ${bookingDateFromUTC}`)
              
              if (bookingDate === dateString) {
                // Время в строке показывает локальное время из базы (например 22:00)
                // Но когда парсим в Date, оно интерпретируется как UTC и конвертируется в локальное
                // Поэтому нужно использовать UTC часы напрямую из строки, а не из parsed Date
                // Извлекаем час из строки: "2025-11-22T22:00:00.000Z" -> час 22
                const timePart = booking.start_time.substring(11, 13) // "22"
                const endTimePart = booking.end_time.substring(11, 13) // "23"
                
                const startHour = parseInt(timePart, 10)
                const endHour = parseInt(endTimePart, 10)
                
                console.log(`Часы бронирования (из строки): ${startHour} - ${endHour}`)
                
                // Добавляем все часы в диапазоне бронирования
                for (let h = startHour; h < endHour; h++) {
                  const hourStr = h.toString().padStart(2, "0")
                  booked.add(`${hourStr}:00`)
                  console.log(`Добавлен занятый час: ${hourStr}:00`)
                }
              }
            })
          } else {
            console.log("Bookings не найдены или не массив:", response.data.bookings)
          }
          
          // Также обрабатываем slots для дополнительной информации
          if (response.data.slots && Array.isArray(response.data.slots)) {
            console.log(`Найдено слотов: ${response.data.slots.length}`)
            response.data.slots.forEach((slot) => {
              if (!slot.is_available && slot.start_time) {
                // Извлекаем дату из ISO строки напрямую
                const slotDateStr = slot.start_time.substring(0, 10)
                
                if (slotDateStr === dateString) {
                  // Извлекаем час напрямую из строки
                  const timePart = slot.start_time.substring(11, 13)
                  const hour = timePart.padStart(2, "0")
                  booked.add(`${hour}:00`)
                  console.log(`Добавлен занятый слот из slots: ${hour}:00`)
                }
              }
            })
          } else {
            console.log("Slots не найдены или не массив:", response.data.slots)
          }
          
          console.log("Загружены занятые слоты для", dateString, ":", Array.from(booked).sort())
          setBookedSlots(booked)
        })
        .catch((error) => {
          console.error("Ошибка при загрузке доступности:", error)
          setBookedSlots(new Set())
        })
        .finally(() => {
          setLoadingAvailability(false)
        })
    } else {
      setBookedSlots(new Set())
    }
  }, [selectedDate, room])

  // Сброс при закрытии модального окна
  useEffect(() => {
    if (!isOpen) {
      setSelectedDate(undefined)
      setSelectedTimeSlot(null)
      setCompanyName("")
      setBookedSlots(new Set())
      setCalendarOpen(false)
    }
  }, [isOpen])

  // В режиме страницы всегда показываем, если есть комната
  if (!isPageMode && (!isOpen || !room)) return null
  if (isPageMode && !room) return null

  const handleBooking = () => {
    if (!selectedDate || !selectedTimeSlot) {
      rejectModal.showReject({
        title: "Не заполнены поля",
        message: "Пожалуйста, выберите дату и время",
      })
      return
    }

    const timeSlot = TIME_SLOTS.find((slot) => slot.label === selectedTimeSlot)
    if (!timeSlot) {
      rejectModal.showReject({
        title: "Ошибка",
        message: "Неверный временной слот",
      })
      return
    }

    // Проверка, что время не в прошлом
    const now = new Date()
    const isToday = selectedDate.toDateString() === now.toDateString()
    const slotDateTime = new Date(selectedDate)
    const [hour] = timeSlot.start.split(':')
    slotDateTime.setHours(parseInt(hour), 0, 0, 0)
    
    if (isToday && slotDateTime < now) {
      rejectModal.showReject({
        title: "Неверное время",
        message: "Нельзя бронировать время, которое уже прошло",
      })
      return
    }

    // Проверка, что слот не занят
    if (bookedSlots.has(timeSlot.start)) {
      rejectModal.showReject({
        title: "Время занято",
        message: "Выбранное время уже забронировано. Пожалуйста, выберите другое время.",
      })
      return
    }

    // Показываем красивое модальное окно подтверждения
    setShowConfirmModal(true)
  }

  const handleBookingConfirm = async () => {
    if (!selectedDate || !selectedTimeSlot || !room) return

    const timeSlot = TIME_SLOTS.find((slot) => slot.label === selectedTimeSlot)
    if (!timeSlot) return

    setShowConfirmModal(false)
    setIsSubmitting(true)
    try {
      // Преобразуем время в формат с секундами (HH:MM:SS) для правильного парсинга бэкендом
      const startTimeFormatted = timeSlot.start.split(':').length === 2 
        ? `${timeSlot.start}:00` 
        : timeSlot.start
      
      const endTimeFormatted = timeSlot.end.split(':').length === 2 
        ? `${timeSlot.end}:00` 
        : timeSlot.end

      const bookingDate = format(selectedDate, "dd MMMM yyyy", { locale: ru })

      const response = await api.post("/meeting-room-bookings", {
        meeting_room_id: room.id,
        date: format(selectedDate, "yyyy-MM-dd"),
        start_time: startTimeFormatted,
        end_time: endTimeFormatted,
        company_name: companyName || null,
      })
      
      const booking = response.data
      
      // Сброс формы
      setSelectedDate(undefined)
      setSelectedTimeSlot(null)
      setCompanyName("")
      
      // Вызываем callback успешного бронирования
      onBookingSuccess?.()
      
      // Сразу переходим на страницу с QR кодом
      // В режиме страницы не вызываем onClose, так как мы перенаправляемся
      if (!isPageMode) {
      onClose()
      }
      
      router.push(`/booking/${booking.id}`)
    } catch (error: any) {
      console.error("Ошибка при бронировании:", error)
      const errorMessage = error.response?.data?.message || error.message || "Ошибка при бронировании комнаты"
      
      // Специальная обработка для ошибки занятого слота
      if (errorMessage.includes("already booked") || errorMessage.includes("занято")) {
        rejectModal.showReject({
          title: "Время занято",
          message: "Выбранное время уже забронировано. Пожалуйста, выберите другое время.",
        })
      } else {
        rejectModal.showReject({
          title: "Ошибка бронирования",
          message: errorMessage,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const content = (
    <>
      <Card
        className={cn(
          isPageMode 
            ? "w-full min-h-screen rounded-none border-0 shadow-none" 
            : "w-full max-w-4xl max-h-[90vh] overflow-y-auto",
          !isPageMode && (isDark ? "custom-scrollbar-dark" : "custom-scrollbar"),
          isDark && !isPageMode && "bg-[#1C1C1E] border-white/10 shadow-2xl"
        )}
        onClick={(e) => !isPageMode && e.stopPropagation()}
      >
      <CardHeader className={cn(isPageMode && "pb-4", isDark && "border-b border-white/10")}>
        <div className="flex items-center gap-4">
          {isPageMode && (
            <Button
              variant="ghost"
              onClick={onClose}
              className={cn("-ml-2", isDark && "text-white hover:bg-white/10")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
          )}
          <CardTitle className={cn(isPageMode ? "" : "flex-1", isDark && "text-white")}>Бронирование</CardTitle>
        </div>
        </CardHeader>
        <CardContent className={cn("space-y-6", isDark && "text-white")}>
          {/* Информация о комнате */}
          {room && roomDetails && (
            <div className="space-y-4">
              <div className={cn(
                "rounded-xl border overflow-hidden",
                isDark ? "border-white/10 bg-[#2C2C2E]" : "bg-card"
              )}>
                <div className={cn("relative aspect-video", isDark ? "bg-[#1A1A1A]" : "bg-muted")}>
                  {roomDetails.photos && roomDetails.photos.length > 0 ? (
                    <Image
                      src={roomDetails.photos[0]}
                      alt={roomDetails.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 100%"
                    />
                  ) : (
                    <div className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center gap-2",
                      isDark ? "text-white/50" : "text-muted-foreground"
                    )}>
                      <ImageIcon className="h-12 w-12" />
                      <span className="text-sm">Фото не загружено</span>
                    </div>
                  )}
                  <Badge
                    className={cn(
                      "absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold shadow-lg",
                      roomDetails.status === "available"
                        ? isDark
                          ? "bg-[#2A9D8F] text-white border-0"
                          : "bg-gradient-to-r from-[#114A65] to-[#114A65]/90 text-white backdrop-blur-md border border-[#114A65]/50"
                        : isDark
                          ? "bg-[#E85D2B]/90 text-white border-0"
                          : "bg-gradient-to-r from-[#B8400E] to-[#B8400E]/90 text-white backdrop-blur-md border border-[#B8400E]/50"
                    )}
                  >
                    {roomDetails.status === "available" ? "Доступна" : "Забронирована"}
                  </Badge>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className={cn("text-lg font-semibold", isDark && "text-white")}>{roomDetails.name}</h3>
                    {roomDetails.description && (
                      <p className={cn("text-sm mt-1", isDark ? "text-white/70" : "text-muted-foreground")}>{roomDetails.description}</p>
                    )}
                  </div>
                  <Separator className={isDark ? "bg-white/10" : undefined} />
                  <div className={cn("flex flex-wrap items-center gap-4 text-sm", isDark ? "text-white/80" : "text-muted-foreground")}>
                    <div className="flex items-center gap-2">
                      <Building2 className={cn("h-4 w-4 shrink-0", isDark ? "text-[#E85D2B]" : "text-primary")} />
                      <span>{roomDetails.floor} этаж</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className={cn("h-4 w-4 shrink-0", isDark ? "text-[#2A9D8F]" : "text-primary")} />
                      <span>до {roomDetails.capacity} человек</span>
                    </div>
                    {roomDetails.office && (
                      <div className="flex items-center gap-2">
                        <Building2 className={cn("h-4 w-4 shrink-0", isDark ? "text-[#E85D2B]" : "text-primary")} />
                        <span>{roomDetails.office.name}, {roomDetails.office.city}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Separator className={isDark ? "bg-white/10" : undefined} />
            </div>
          )}
          {selectedDate && selectedTimeSlot && (
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-xl border",
              isDark
                ? "bg-[#E85D2B]/15 border-[#E85D2B]/30"
                : "bg-gradient-to-r from-[#114A65]/10 to-[#B8400E]/10 border-[#114A65]/20"
            )}>
              <CalendarIcon className={cn("w-4 h-4", isDark ? "text-[#E85D2B]" : "text-[#114A65]")} />
              <span className={cn("text-sm", isDark ? "text-white" : "text-[#040404]")}>
                {format(selectedDate, "dd MMMM yyyy", { locale: ru })} {selectedTimeSlot}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="space-y-2">
              <Label className={isDark ? "text-white/90" : ""}>Дата</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && (isDark ? "text-white/50" : "text-muted-foreground"),
                      isDark && "border-white/20 bg-[#2C2C2E] text-white hover:bg-[#3A3A3C]"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "dd MMMM yyyy", { locale: ru })
                    ) : (
                      <span>Выберите дату</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className={cn("w-auto p-0", isDark && "bg-[#2C2C2E] border-white/10")} align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date)
                      if (date) setCalendarOpen(false)
                    }}
                    disabled={(date) => {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      return date < today
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {selectedDate && (
              <div className="space-y-2">
                <Label className={isDark ? "text-white/90" : ""}>Время</Label>
                {loadingAvailability ? (
                  <div className="flex items-center justify-center p-8">
                    <div className={cn("w-4 h-4 border-2 border-t-transparent rounded-full animate-spin", isDark ? "border-[#E85D2B]" : "border-[#114A65]")} />
                    <span className={cn("ml-2 text-sm", isDark ? "text-white/70" : "text-muted-foreground")}>Загрузка доступности...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map((slot) => {
                      const now = new Date()
                      const isToday = selectedDate.toDateString() === now.toDateString()
                      const slotDateTime = new Date(selectedDate)
                      const [hour] = slot.start.split(':')
                      slotDateTime.setHours(parseInt(hour), 0, 0, 0)
                      
                      const isPast = isToday && slotDateTime < now
                      const isBooked = bookedSlots.has(slot.start)
                      const isDisabled = isPast || isBooked

                      return (
                        <Button
                          key={slot.label}
                          variant={selectedTimeSlot === slot.label ? "default" : "outline"}
                          size="sm"
                          disabled={isDisabled}
                          className={cn(
                            "w-full justify-start text-sm",
                            selectedTimeSlot === slot.label && (
                              isDark
                                ? "bg-[#E85D2B] hover:bg-[#d14d1b] text-white border-0"
                                : "bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white"
                            ),
                            !selectedTimeSlot && isDark && "border-white/20 bg-[#2C2C2E] text-white hover:bg-[#3A3A3C]",
                            isDisabled && "opacity-50 cursor-not-allowed",
                            isBooked && !selectedTimeSlot && (isDark ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-red-50 border-red-200 text-red-600")
                          )}
                          onClick={() => {
                            if (!isDisabled) setSelectedTimeSlot(slot.label)
                          }}
                          title={
                            isPast ? "Это время уже прошло" : isBooked ? "Это время уже забронировано" : undefined
                          }
                        >
                          <div className="flex items-center justify-between gap-2 w-full min-w-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Clock className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{slot.label}</span>
                            </div>
                          {isBooked && (
                              <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded flex-shrink-0",
                                isDark ? "bg-red-500/30 text-red-300" : "bg-red-100 text-red-700"
                              )}>
                                Занято
                              </span>
                          )}
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-name" className={isDark ? "text-white/90" : ""}>Название компании (необязательно)</Label>
            <Input
              id="company-name"
              placeholder="Название компании"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={isDark ? "bg-[#2C2C2E] border-white/20 text-white placeholder:text-white/40" : ""}
            />
          </div>

          <div className="flex gap-3 justify-end">
            {!isPageMode && (
            <Button
              variant="outline"
              onClick={onClose}
              className={isDark ? "border-white/20 bg-[#2C2C2E] text-white hover:bg-[#3A3A3C]" : ""}
            >
              Отмена
            </Button>
            )}
            <Button
              onClick={handleBooking}
              disabled={!selectedDate || !selectedTimeSlot || isSubmitting}
              className={isDark ? "bg-[#E85D2B] hover:bg-[#d14d1b] text-white" : "bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D]"}
            >
              {isSubmitting ? "Бронирование..." : "Забронировать"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )

  // В режиме страницы возвращаем только контент без overlay
  if (isPageMode) {
    return (
      <div className="min-h-screen bg-background">
        {content}
        
        <RejectRequestModal
          isOpen={rejectModal.isOpen}
          onClose={rejectModal.hideReject}
          title={rejectModal.title}
          message={rejectModal.message}
          duration={rejectModal.duration}
        />

        <DeleteConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => !isSubmitting && setShowConfirmModal(false)}
          onConfirm={handleBookingConfirm}
          title="Подтвердите бронирование"
          description={
            selectedDate && selectedTimeSlot && room
              ? `Вы уверены, что хотите забронировать комнату "${room.name}"?${companyName ? `\nКомпания: ${companyName}` : ''}\n\nДата: ${format(selectedDate, "dd MMMM yyyy", { locale: ru })}\nВремя: ${TIME_SLOTS.find(s => s.label === selectedTimeSlot)?.label || selectedTimeSlot}`
              : "Подтвердите бронирование"
          }
          confirmText={isSubmitting ? "Бронирование..." : "Забронировать"}
          cancelText="Отмена"
          isLoading={isSubmitting}
        />
      </div>
    )
  }

  // В режиме модалки: скролл только внутри карточки, страница залочена
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 p-4 flex items-center justify-center",
        isDark ? "bg-black/60 backdrop-blur-sm" : "bg-black/50"
      )}
      onClick={onClose}
    >
      {content}

      <RejectRequestModal
        isOpen={rejectModal.isOpen}
        onClose={rejectModal.hideReject}
        title={rejectModal.title}
        message={rejectModal.message}
        duration={rejectModal.duration}
      />

      <DeleteConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => !isSubmitting && setShowConfirmModal(false)}
        onConfirm={handleBookingConfirm}
        title="Подтвердите бронирование"
        description={
          selectedDate && selectedTimeSlot && room
            ? `Вы уверены, что хотите забронировать комнату "${room.name}"?${companyName ? `\nКомпания: ${companyName}` : ''}\n\nДата: ${format(selectedDate, "dd MMMM yyyy", { locale: ru })}\nВремя: ${TIME_SLOTS.find(s => s.label === selectedTimeSlot)?.label || selectedTimeSlot}`
            : "Подтвердите бронирование"
        }
        confirmText={isSubmitting ? "Бронирование..." : "Забронировать"}
        cancelText="Отмена"
        isLoading={isSubmitting}
      />
    </div>
  )
}

