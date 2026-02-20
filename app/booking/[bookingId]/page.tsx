"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { QRCodeSVG } from "qrcode.react"
import { QrCode, Copy, Share2, MapPin, Building2, Calendar, Clock, ArrowLeft } from "lucide-react"
import { getPublicBooking, type MeetingRoomBooking } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { BottomNav } from "@/components/BottomNav"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function BookingQRPage() {
  const params = useParams()
  const router = useRouter()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const bookingId = params?.bookingId ? parseInt(params.bookingId as string) : null
  const [booking, setBooking] = useState<MeetingRoomBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!bookingId) {
      setError("Неверный ID бронирования")
      setLoading(false)
      return
    }

    const fetchBooking = async () => {
      try {
        const response = await getPublicBooking(bookingId)
        setBooking(response.data)
      } catch (err: any) {
        console.error("Ошибка загрузки бронирования:", err)
        setError(err.response?.data?.message || "Не удалось загрузить информацию о бронировании")
      } finally {
        setLoading(false)
      }
    }

    fetchBooking()
  }, [bookingId])

  const bookingUrl = typeof window !== "undefined" ? window.location.href : ""
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl)
      toast({
        title: "Скопировано!",
        description: "Ссылка скопирована в буфер обмена",
      })
    } catch (err) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать ссылку",
        variant: "destructive",
      })
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Бронирование переговорной комнаты",
          text: `Бронирование: ${booking?.meetingRoom?.name || booking?.meeting_room?.name || "Комната"}`,
          url: bookingUrl,
        })
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Ошибка при попытке поделиться:", err)
        }
      }
    } else {
      // Fallback: копируем ссылку
      handleCopyLink()
    }
  }

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const formatTime = (dateString: string | Date) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#1C1C1E] rounded-[10px] p-8 text-center">
          <div className="w-12 h-12 border-2 border-[#F35713] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-white/60">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#1C1C1E] rounded-[10px] p-8 text-center">
          <p className="text-red-400">{error || "Бронирование не найдено"}</p>
        </div>
      </div>
    )
  }

  const office = booking.office || booking.meetingRoom?.office || booking.meeting_room?.office
  const room = booking.meetingRoom || booking.meeting_room
  const qrData = JSON.stringify({
    bookingId: booking.id,
    roomId: booking.meeting_room_id,
    tablesRemaining: booking.tables_remaining || room?.capacity || 0,
  })

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Header */}
      <div className="pt-12 px-3 pb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Назад</span>
        </button>
        <div className="flex items-center gap-2 mb-2">
          <QrCode className="h-6 w-6 text-[#F35713]" />
          <h1 className="text-xl font-bold text-white">Бронирование переговорной комнаты</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-3 pb-24 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Информация об офисе */}
          {office && (
            <div className="bg-[#1C1C1E] rounded-[10px] p-4">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-[#F35713] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{office.name}</h3>
                  {office.address && (
                    <div className="flex items-start gap-2 text-white/70">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#F35713]" />
                      <p className="text-sm">{office.address}</p>
                    </div>
                  )}
                  {office.city && (
                    <p className="text-sm text-white/50 mt-1">{office.city}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Информация о бронировании */}
          <div className="bg-[#1C1C1E] rounded-[10px] p-4 space-y-3">
            {room && (
              <div className="flex items-center gap-2 flex-wrap">
                <Building2 className="h-4 w-4 text-[#F35713] flex-shrink-0" />
                <span className="text-sm text-white/70">Комната:</span>
                <span className="font-semibold text-white">{room.name}</span>
                {room.floor && (
                  <span className="text-sm text-white/50">(Этаж {room.floor})</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#F35713] flex-shrink-0" />
              <span className="text-sm text-white/70">Дата:</span>
              <span className="font-semibold text-white">{formatDate(booking.start_time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#F35713] flex-shrink-0" />
              <span className="text-sm text-white/70">Время:</span>
              <span className="font-semibold text-white">
                {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
              </span>
            </div>
            {booking.tables_remaining !== undefined && (
              <div className="pt-3 border-t border-white/10">
                <span className="text-sm text-white/70">Столов осталось: </span>
                <span className="font-semibold text-[#F35713]">{booking.tables_remaining}</span>
              </div>
            )}
          </div>

          {/* QR код */}
          <div className="flex flex-col items-center gap-4 bg-[#1C1C1E] rounded-[10px] p-6">
            <div className="p-4 bg-white rounded-[10px] border-2 border-[#F35713]/30">
              <QRCodeSVG
                value={qrData}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>
            <p className="text-sm text-center text-white/60 max-w-xs">
              Покажите этот QR код исполнителю для сканирования
            </p>
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-3 rounded-[10px] bg-[#262626] text-white font-medium flex items-center justify-center gap-2 hover:bg-[#333] transition-colors border border-white/10"
            >
              <Copy className="h-4 w-4" />
              Скопировать ссылку
            </button>
            <button
              onClick={handleShare}
              className="flex-1 py-3 rounded-[10px] bg-[#F35713] text-white font-medium flex items-center justify-center gap-2 hover:bg-[#E24D0F] transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Поделиться
            </button>
          </div>
        </div>
      </div>

      {!isDesktop && <BottomNav activeTab="booking" />}
    </div>
  )
}

