import { useMemo, useState, useEffect } from "react";
import { MeetingRoomCard } from "@/components/meeting-rooms/MeetingRoomCard";
import {
  MeetingRoom,
  useMeetingRoomsStore,
} from "@/stores/meetingRoomsStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { OfficeSelection } from "@/components/meeting-rooms/OfficeSelection";
import { BookingModal } from "@/components/meeting-rooms/BookingModal";
import { MyBookings } from "@/components/meeting-rooms/MyBookings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSuccessModal } from "@/hooks/use-success-modal";
import { SuccessModal } from "@/components/success-model";

import { Office } from "@/lib/api";

export function MeetingRoomsCatalog() {
  const rooms = useMeetingRoomsStore((state) => state.rooms);
  const fetchRooms = useMeetingRoomsStore((state) => state.fetchRooms);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"book" | "my-bookings">("book");
  const successModal = useSuccessModal();

  useEffect(() => {
    if (selectedOffice) {
      fetchRooms(selectedOffice.id);
    }
  }, [selectedOffice, fetchRooms]);

  const visibleRooms = useMemo(
    () => rooms.filter((room) => room.isActive),
    [rooms],
  );

  const totalAvailable = useMemo(
    () => rooms.filter((room) => room.status === "available").length,
    [rooms],
  );

  const totalBooked = useMemo(
    () => rooms.filter((room) => room.status === "booked").length,
    [rooms],
  );

  const handleRoomClick = (room: MeetingRoom) => {
    setSelectedRoom(room);
    setIsBookingModalOpen(true);
  };

  const handleBookingSuccess = () => {
    if (selectedOffice) {
      fetchRooms(selectedOffice.id);
    }
  };

  const handleBookingModalSuccess = (message: { title: string; message: string }) => {
    successModal.showSuccess({
      title: message.title,
      message: message.message,
      duration: 3000,
    });
  };

  // Компонент для бронирования комнат
  const BookingContent = () => {
    // Если офис не выбран, показываем выбор офисов
    if (!selectedOffice) {
      return (
        <div>
          <OfficeSelection
            onSelectOffice={(office) => setSelectedOffice(office)}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => {
            setSelectedOffice(null);
          }}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к выбору офисов
        </Button>
        <div>
          <h2 className="text-xl font-semibold">{selectedOffice.name}</h2>
          <p className="text-sm text-muted-foreground">
            {selectedOffice.city}, {selectedOffice.address}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className="flex items-center justify-center rounded-full px-4 py-1 text-sm"
        >
          Доступно: {totalAvailable}
        </Badge>
        <Badge
          variant="outline"
          className="flex items-center justify-center rounded-full px-4 py-1 text-sm"
        >
          Забронировано: {totalBooked}
        </Badge>
      </div>

      <div className="space-y-4">
        {visibleRooms.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <h3 className="text-lg font-semibold">
              Нет переговорных по заданным параметрам
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Попробуйте изменить фильтры или сбросить их.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => handleRoomClick(room)}
                className="cursor-pointer"
              >
                <MeetingRoomCard room={room} />
              </div>
            ))}
          </div>
        )}
      </div>

        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setSelectedRoom(null);
          }}
          room={selectedRoom}
          onBookingSuccess={handleBookingSuccess}
          onSuccess={handleBookingModalSuccess}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "book" | "my-bookings")}>
        <TabsList>
          <TabsTrigger value="book">Бронировать</TabsTrigger>
          <TabsTrigger value="my-bookings">Мои бронирования</TabsTrigger>
        </TabsList>
        
        <TabsContent value="book" className="mt-6">
          <BookingContent />
        </TabsContent>
        
        <TabsContent value="my-bookings" className="mt-6">
          <MyBookings />
        </TabsContent>
      </Tabs>

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={successModal.hideSuccess}
        title={successModal.title}
        message={successModal.message}
        duration={successModal.duration}
      />
    </div>
  );
}
