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
import { cn } from "@/lib/utils";

import { Office } from "@/lib/api";

interface MeetingRoomsCatalogProps {
  initialOffice?: Office | null;
  onOfficeChange?: (office: Office | null) => void;
  initialTab?: "book" | "my-bookings";
  onTabChange?: (tab: "book" | "my-bookings") => void;
  showCalculator?: boolean;
  onCalculatorToggle?: (show: boolean) => void;
  variant?: "default" | "dark";
}

export function MeetingRoomsCatalog({ 
  initialOffice = null, 
  onOfficeChange,
  initialTab = "book",
  onTabChange,
  showCalculator = false,
  onCalculatorToggle,
  variant = "default"
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

    const isDark = variant === "dark";

    return (
      <div className="flex flex-col gap-6">
      <div ref={officeInfoRef} className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => {
            handleOfficeChange(null);
          }}
          className={cn(
            "gap-2 rounded-xl transition-colors",
            isDark && "text-white/80 hover:text-white hover:bg-white/10"
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Назад к выбору офисов
        </Button>
        <div>
          <h2 className={cn("text-xl font-semibold", isDark && "text-white")}>{selectedOffice.name}</h2>
          <p className={cn("text-sm", isDark ? "text-white/70" : "text-muted-foreground")}>
            {selectedOffice.city}, {selectedOffice.address}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            isDark
              ? "border-[#2A9D8F]/50 bg-[#2A9D8F]/20 text-[#2A9D8F]"
              : ""
          )}
        >
          Доступно: {totalAvailable}
        </Badge>
        <Badge
          variant="outline"
          className={cn(
            "flex items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            isDark
              ? "border-[#E85D2B]/50 bg-[#E85D2B]/20 text-[#E85D2B]"
              : ""
          )}
        >
          Забронировано: {totalBooked}
        </Badge>
      </div>

      <div className="space-y-4">
        {visibleRooms.length === 0 ? (
          <div className={cn(
            "rounded-xl border border-dashed p-10 text-center",
            isDark ? "border-white/20 bg-[#2C2C2E]/50" : ""
          )}>
            <h3 className={cn("text-lg font-semibold", isDark && "text-white")}>
              Нет переговорных по заданным параметрам
            </h3>
            <p className={cn("mt-2 text-sm", isDark ? "text-white/60" : "text-muted-foreground")}>
              Попробуйте изменить фильтры или сбросить их.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => handleRoomClick(room)}
                className={cn(
                  "cursor-pointer transition-transform duration-200 active:scale-[0.99]",
                  isDark && "rounded-2xl hover:scale-[1.02]"
                )}
              >
                <MeetingRoomCard room={room} darkTheme={isDark} />
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
          variant={variant}
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
          <MyBookings variant={variant} />
        </TabsContent>
      </Tabs>

    </div>
  );
}
