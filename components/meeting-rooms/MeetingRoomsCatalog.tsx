import { useMemo, useState, useEffect } from "react";
import { MeetingRoomCard } from "@/components/meeting-rooms/MeetingRoomCard";
import {
  MeetingRoomsFilters,
  MeetingRoomsFiltersState,
} from "@/components/meeting-rooms/MeetingRoomsFilters";
import {
  MeetingRoom,
  useMeetingRoomsStore,
} from "@/stores/meetingRoomsStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Filter, ChevronUp, ArrowLeft } from "lucide-react";
import { OfficeSelection } from "@/components/meeting-rooms/OfficeSelection";
import { BookingModal } from "@/components/meeting-rooms/BookingModal";
import { MyBookings } from "@/components/meeting-rooms/MyBookings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSuccessModal } from "@/hooks/use-success-modal";
import { SuccessModal } from "@/components/success-model";

const DEFAULT_FILTERS: MeetingRoomsFiltersState = {
  floor: "all",
  capacity: null,
  equipment: [],
  status: "all",
  showInactive: false,
};

const filterRooms = (
  rooms: MeetingRoom[],
  filters: MeetingRoomsFiltersState,
): MeetingRoom[] => {
  return rooms.filter((room) => {
    if (!room.isActive && !filters.showInactive) {
      return false;
    }

    if (filters.floor !== "all" && room.floor !== filters.floor) {
      return false;
    }

    if (typeof filters.capacity === "number" && room.capacity < filters.capacity) {
      return false;
    }

    if (filters.status !== "all" && room.status !== filters.status) {
      return false;
    }

    if (
      filters.equipment.length > 0 &&
      !filters.equipment.every((equipment) =>
        room.equipment?.includes(equipment),
      )
    ) {
      return false;
    }

    return true;
  });
};

interface Office {
  id: number;
  name: string;
  city: string;
  address: string;
  lat: number | null;
  lon: number | null;
}

export function MeetingRoomsCatalog() {
  const rooms = useMeetingRoomsStore((state) => state.rooms);
  const fetchRooms = useMeetingRoomsStore((state) => state.fetchRooms);
  const [filters, setFilters] = useState<MeetingRoomsFiltersState>(
    DEFAULT_FILTERS,
  );
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"book" | "my-bookings">("book");
  const successModal = useSuccessModal();

  useEffect(() => {
    if (selectedOffice) {
      fetchRooms(selectedOffice.id);
    }
  }, [selectedOffice, fetchRooms]);

  const availableFloors = useMemo(() => {
    const floors = Array.from(
      new Set(rooms.filter((room) => room.isActive).map((room) => room.floor)),
    );
    return floors.sort((a, b) => a - b);
  }, [rooms]);

  const filteredRooms = useMemo(
    () => filterRooms(rooms, filters),
    [rooms, filters],
  );

  const totalAvailable = useMemo(
    () => rooms.filter((room) => room.status === "available").length,
    [rooms],
  );

  const totalBooked = useMemo(
    () => rooms.filter((room) => room.status === "booked").length,
    [rooms],
  );

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

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
            setFilters(DEFAULT_FILTERS);
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="flex w-full sm:w-auto items-center justify-center sm:justify-start rounded-full px-4 py-1 text-sm"
          >
            Доступно: {totalAvailable}
          </Badge>
          <Badge
            variant="outline"
            className="flex w-full sm:w-auto items-center justify-center sm:justify-start rounded-full px-4 py-1 text-sm"
          >
            Забронировано: {totalBooked}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            onClick={resetFilters}
            className="gap-2 w-full sm:w-auto justify-center sm:justify-start"
          >
            <RefreshCcw className="h-4 w-4" />
            Сбросить фильтры
          </Button>
        </div>
        
        {/* Кнопка фильтра для мобильных */}
        <div className="lg:hidden">
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          >
            <Filter className="h-4 w-4" />
            Фильтр
            {isFiltersOpen && <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Фильтры для мобильных - показываются после нажатия */}
      {isFiltersOpen && (
        <div className="lg:hidden">
          <MeetingRoomsFilters
            filters={filters}
            onChange={setFilters}
            availableFloors={availableFloors}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_360px]">
        <div className="space-y-4">
          {filteredRooms.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <h3 className="text-lg font-semibold">
                Нет переговорных по заданным параметрам
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Попробуйте изменить фильтры или сбросить их.
              </p>
              <Button className="mt-4 w-full sm:w-auto" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredRooms.map((room) => (
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

        {/* Фильтры для десктопа */}
        <div className="hidden lg:block">
          <MeetingRoomsFilters
            filters={filters}
            onChange={setFilters}
            availableFloors={availableFloors}
          />
        </div>
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

