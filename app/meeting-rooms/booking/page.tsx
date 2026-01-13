"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { BookingModal } from "@/components/meeting-rooms/BookingModal"
import { getMeetingRoomById, type MeetingRoom as ApiMeetingRoom } from "@/lib/api"
import { MeetingRoom } from "@/stores/meetingRoomsStore"
import FullScreenLoading from "@/components/FullScreenLoading"

const convertApiRoomToStoreRoom = (apiRoom: ApiMeetingRoom): MeetingRoom => ({
  id: apiRoom.id,
  name: apiRoom.name,
  floor: apiRoom.floor,
  capacity: apiRoom.capacity,
  photos: apiRoom.photos || [],
  status: apiRoom.status as "available" | "booked",
  isActive: apiRoom.isActive,
  description: apiRoom.description || undefined,
  office_id: apiRoom.office_id || null,
})

export default function BookingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [room, setRoom] = useState<MeetingRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const roomId = searchParams.get("roomId")

  useEffect(() => {
    if (roomId) {
      const fetchRoom = async () => {
        try {
          const response = await getMeetingRoomById(parseInt(roomId))
          setRoom(convertApiRoomToStoreRoom(response.data))
        } catch (error) {
          console.error("Ошибка при загрузке комнаты:", error)
          router.back()
        } finally {
          setLoading(false)
        }
      }
      fetchRoom()
    } else {
      router.back()
    }
  }, [roomId, router])

  const handleClose = () => {
    router.back()
  }

  const handleBookingSuccess = () => {
    // Перенаправление на QR страницу происходит внутри BookingModal
    // Здесь ничего не делаем, чтобы не перекрыть перенаправление
  }

  if (loading) {
    return <FullScreenLoading />
  }

  if (!room) {
    return null
  }

  return (
    <BookingModal
      isOpen={true}
      onClose={handleClose}
      room={room}
      onBookingSuccess={handleBookingSuccess}
      isPageMode={true}
    />
  )
}

