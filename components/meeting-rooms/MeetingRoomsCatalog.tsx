"use client"

import { useMemo, useState, useEffect, useRef } from "react";
import { MeetingRoomCard } from "@/components/meeting-rooms/MeetingRoomCard";
import {
  MeetingRoom,
  useMeetingRoomsStore,
} from "@/stores/meetingRoomsStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BookingModal } from "@/components/meeting-rooms/BookingModal";
import { MyBookings } from "@/components/meeting-rooms/MyBookings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { DeskHeightCalculator } from "@/components/meeting-rooms/DeskHeightCalculator";
import { Ruler } from "lucide-react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";

import { Office } from "@/lib/api";

interface MeetingRoomsCatalogProps {
  initialOffice?: Office | null;
  onOfficeChange?: (office: Office | null) => void;
  initialTab?: "book" | "my-bookings";
  onTabChange?: (tab: "book" | "my-bookings") => void;
  showCalculator?: boolean;
  onCalculatorToggle?: (show: boolean) => void;
}

export function MeetingRoomsCatalog({ 
  initialOffice = null, 
  onOfficeChange,
  initialTab = "book",
  onTabChange,
  showCalculator = false,
  onCalculatorToggle
}: MeetingRoomsCatalogProps) {
  const rooms = useMeetingRoomsStore((state) => state.rooms);
  const fetchRooms = useMeetingRoomsStore((state) => state.fetchRooms);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(initialOffice);
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"book" | "my-bookings">(initialTab);
  
  // Синхронизируем с внешним состоянием
  useEffect(() => {
    if (initialOffice !== selectedOffice) {
      setSelectedOffice(initialOffice);
    }
  }, [initialOffice]);
  
  // Синхронизируем активную вкладку с внешним состоянием
  useEffect(() => {
    if (initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  
  const handleOfficeChange = (office: Office | null) => {
    setSelectedOffice(office);
    onOfficeChange?.(office);
  };
  
  const handleTabChange = (tab: "book" | "my-bookings") => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };
  
  const handleCalculatorToggle = (show: boolean) => {
    onCalculatorToggle?.(show);
  };
  const { toast } = useToast();
  const router = useRouter();
  const isMobile = useIsMobile();
  const officeInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedOffice) {
      fetchRooms(selectedOffice.id);
      // Скроллим к информации об офисе после выбора
      // Используем requestAnimationFrame для надежной прокрутки после обновления DOM
      if (typeof window !== 'undefined') {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (officeInfoRef.current) {
              officeInfoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          });
        });
      }
    }
  }, [selectedOffice, fetchRooms]);

  const visibleRooms = useMemo(
    () =>
      rooms.filter(
        (room) =>
          room.isActive &&
          // Only show meeting rooms in booking catalog; cabinets are not bookable
          (room.room_type === "meeting" || room.room_type === undefined)
      ),
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
    if (isMobile) {
      // На мобильных редиректим на страницу бронирования
      router.push(`/meeting-rooms/booking?roomId=${room.id}`);
    } else {
      // На десктопе открываем модалку
      setSelectedRoom(room);
      setIsBookingModalOpen(true);
    }
  };

  const handleBookingSuccess = () => {
    if (selectedOffice) {
      fetchRooms(selectedOffice.id);
    }
  };

  const handleBookingModalSuccess = (message: { title: string; message: string }) => {
    toast({
      title: message.title,
      description: message.message,
      duration: 3000,
    });
  };

  const BookingContent = () => {
    if (!selectedOffice) {
      return (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <h3 className="text-lg font-semibold">Выберите офис</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Выберите офис из главной страницы для просмотра переговорных комнат
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
      <div ref={officeInfoRef} className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => {
            handleOfficeChange(null);
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
      <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as "book" | "my-bookings")}>
        <TabsContent value="book">
          <BookingContent />
        </TabsContent>
        
        <TabsContent value="my-bookings">
          <MyBookings />
        </TabsContent>
      </Tabs>

    </div>
  );
}
