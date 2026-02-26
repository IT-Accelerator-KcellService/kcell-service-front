"use client";

import { useState, useEffect } from "react";
import { MapPin, X, Building2, Users, Clock, ChevronLeft, ChevronRight, ImageIcon, Calendar, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import Image from "next/image";
import api from "@/lib/api";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, startOfDay } from "date-fns";
import { ru } from "date-fns/locale";
import { getRoomDailyAvailability, getMyBookings, cancelMeetingRoomBooking, MeetingRoomBooking } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAuthStore } from "@/stores/useAuthStore";
import { useGuestDemoStore } from "@/stores/useGuestDemoStore";
import { useToast } from "@/hooks/use-toast";

type Office = {
  id: number;
  name: string;
  address: string;
  city: string;
  photo?: string;
};

type Room = {
  id: number;
  name: string;
  floor: number;
  capacity: number;
  photos: string[];
  status: string;
  isActive: boolean;
  description?: string;
  office_id?: number;
};

type SubTab = "offices" | "rooms" | "calculator";

// Генерация временных слотов с 9:00 до 24:00
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 9; hour < 24; hour++) {
    const startHour = hour.toString().padStart(2, "0");
    const endHour = (hour + 1).toString().padStart(2, "0");
    slots.push({
      label: `${startHour}:00-${endHour}:00`,
      start: `${startHour}:00`,
      end: `${endHour}:00`,
    });
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Preset height options for the calculator
const HEIGHT_OPTIONS = [150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200];

const MOCK_OFFICES: Office[] = [{ id: 1, name: "Офис (демо)", address: "ул. Демо, 1", city: "Алматы" }];
const MOCK_ROOMS: Room[] = [{ id: 1, name: "Переговорная 1 (демо)", floor: 1, capacity: 6, photos: [], status: "active", isActive: true, office_id: 1 }];

export default function MeetingRoomsPage() {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isGuest = useAuthStore((s) => s.isGuest);
  const { toast } = useToast();
  const { guestBookings, addGuestBooking, removeGuestBooking } = useGuestDemoStore();
  const [activeTab, setActiveTab] = useState<"book" | "my-bookings">("book");
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("offices");
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [calculatedHeight, setCalculatedHeight] = useState<{ sitting: number; standing: number } | null>(null);
  const [showHeightDropdown, setShowHeightDropdown] = useState(false);
  
  // Modal states
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  
  // Booking form
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [bookingComment, setBookingComment] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  
  // My Bookings state
  const [bookings, setBookings] = useState<MeetingRoomBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [bookingFilter, setBookingFilter] = useState<"upcoming" | "active" | "completed" | "cancelled">("upcoming");

  useEffect(() => {
    fetchOffices();
  }, []);
  
  // Fetch bookings when my-bookings tab is active
  useEffect(() => {
    if (activeTab === "my-bookings") {
      fetchBookings();
    }
  }, [activeTab, isGuest, guestBookings]);
  
  const fetchBookings = async () => {
    try {
      setLoadingBookings(true);
      if (isGuest) {
        const sorted = [...guestBookings].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
        setBookings(sorted as MeetingRoomBooking[]);
        return;
      }
      const response = await getMyBookings();
      const bookingsData = Array.isArray(response.data) ? response.data : response.data || [];
      const sortedBookings = bookingsData.sort((a: MeetingRoomBooking, b: MeetingRoomBooking) => {
        const dateA = new Date(a.start_time);
        const dateB = new Date(b.start_time);
        return dateA.getTime() - dateB.getTime();
      });
      setBookings(sortedBookings);
    } catch (error) {
      console.error("Ошибка при загрузке бронирований:", error);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };
  
  const handleCancelBooking = async (bookingId: number) => {
    try {
      setCancellingId(bookingId);
      if (isGuest) {
        removeGuestBooking(bookingId);
        await fetchBookings();
        toast({ title: "Демо", description: "Бронирование отменено" });
        setCancellingId(null);
        return;
      }
      await cancelMeetingRoomBooking(bookingId);
      await fetchBookings();
    } catch (error) {
      console.error("Ошибка при отмене бронирования:", error);
    } finally {
      setCancellingId(null);
    }
  };
  
  // Booking helpers
  const isUpcoming = (booking: MeetingRoomBooking) => {
    if (booking.status === 'cancelled' || booking.status === 'auto_cancelled' || 
        booking.status === 'completed' || booking.status === 'in_progress') {
      return false;
    }
    const bookingDateTime = new Date(booking.start_time);
    return bookingDateTime > new Date();
  };
  
  const isActive = (booking: MeetingRoomBooking) => {
    // Активные = только статус in_progress (бэкенд автоматически меняет статус через cron)
    return booking.status === 'in_progress';
  };
  
  const isPastBooking = (booking: MeetingRoomBooking) => {
    if (booking.status === 'completed') return true;
    const now = new Date();
    const end = new Date(booking.end_time);
    return end < now;
  };
  
  const isCancelled = (booking: MeetingRoomBooking) => {
    return booking.status === 'cancelled' || booking.status === 'auto_cancelled';
  };
  
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'in_progress':
        return { text: 'В процессе', color: 'bg-blue-500', icon: AlertCircle };
      case 'confirmed':
        return { text: 'Подтверждено', color: 'bg-green-500', icon: CheckCircle2 };
      case 'scheduled':
        return { text: 'Запланировано', color: 'bg-amber-500', icon: Clock };
      case 'completed':
        return { text: 'Завершено', color: 'bg-gray-500', icon: CheckCircle2 };
      case 'cancelled':
      case 'auto_cancelled':
        return { text: 'Отменено', color: 'bg-red-500', icon: X };
      default:
        return { text: 'Активно', color: 'bg-green-500', icon: CheckCircle2 };
    }
  };

  const fetchOffices = async () => {
    try {
      if (isGuest) {
        setOffices(MOCK_OFFICES);
        return;
      }
      const response = await api.get("/offices");
      setOffices(response.data || []);
    } catch (error) {
      console.error("Error fetching offices:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async (officeId: number) => {
    setLoadingRooms(true);
    try {
      if (isGuest) {
        setRooms(MOCK_ROOMS);
        return;
      }
      const response = await api.get(`/meeting-rooms?office_id=${officeId}`);
      const activeRooms = (response.data || []).filter((room: Room) => room.isActive);
      setRooms(activeRooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  // Загружаем занятые слоты при выборе даты
  useEffect(() => {
    if (!selectedDate || !selectedRoom) {
      setBookedSlots(new Set());
      return;
    }
    if (isGuest) {
      setBookedSlots(new Set());
      return;
    }
    const dateString = format(selectedDate, "yyyy-MM-dd");
    setLoadingAvailability(true);
    getRoomDailyAvailability(selectedRoom.id, dateString, 60)
      .then((response) => {
        const booked = new Set<string>();
        if (response.data.bookings && Array.isArray(response.data.bookings)) {
          response.data.bookings.forEach((booking: any) => {
            const bookingDateFromString = booking.start_time.substring(0, 10);
            if (bookingDateFromString === dateString) {
              const timePart = booking.start_time.substring(11, 13);
              const endTimePart = booking.end_time.substring(11, 13);
              const startHour = parseInt(timePart, 10);
              const endHour = parseInt(endTimePart, 10);
              for (let h = startHour; h < endHour; h++) {
                booked.add(`${h.toString().padStart(2, "0")}:00`);
              }
            }
          });
        }
        setBookedSlots(booked);
      })
      .catch(() => setBookedSlots(new Set()))
      .finally(() => setLoadingAvailability(false));
  }, [selectedDate, selectedRoom, isGuest]);

  const handleOfficeClick = (office: Office) => {
    setSelectedOffice(office);
    fetchRooms(office.id);
  };

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setSelectedDate(null);
    setSelectedTimeSlot(null);
    setBookedSlots(new Set());
  };

  const handleBookRoom = async () => {
    if (!selectedRoom || !selectedDate || !selectedTimeSlot) return;
    const timeSlot = TIME_SLOTS.find((slot) => slot.label === selectedTimeSlot);
    if (!timeSlot) return;
    const now = new Date();
    const isDateToday = isSameDay(selectedDate, now);
    const slotDateTime = new Date(selectedDate);
    const [hour] = timeSlot.start.split(':');
    slotDateTime.setHours(parseInt(hour), 0, 0, 0);
    if (isDateToday && slotDateTime < now) {
      alert("Нельзя бронировать время, которое уже прошло");
      return;
    }
    setIsBooking(true);
    try {
      if (isGuest && selectedRoom) {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const startTime = `${dateStr}T${timeSlot.start}:00`;
        const endTime = `${dateStr}T${timeSlot.end}:00`;
        const newBookingId = addGuestBooking({
          meeting_room_id: selectedRoom.id,
          start_time: startTime,
          end_time: endTime,
          status: "scheduled",
          company_name: bookingComment || null,
          meeting_room: { id: selectedRoom.id, name: selectedRoom.name },
        });
        toast({ title: "Демо", description: "Бронирование создано локально" });
        setSelectedRoom(null);
        setSelectedOffice(null);
        setSelectedDate(null);
        setSelectedTimeSlot(null);
        setBookingComment("");
        setActiveTab("my-bookings");
        router.push(`/booking/${newBookingId}`);
        setIsBooking(false);
        return;
      }
      const response = await api.post("/meeting-room-bookings", {
        meeting_room_id: selectedRoom.id,
        date: format(selectedDate, "yyyy-MM-dd"),
        start_time: `${timeSlot.start}:00`,
        end_time: `${timeSlot.end}:00`,
        company_name: bookingComment || null,
      });
      const booking = response.data;
      setSelectedRoom(null);
      setSelectedOffice(null);
      setSelectedDate(null);
      setSelectedTimeSlot(null);
      setBookingComment("");
      router.push(`/booking/${booking.id}`);
    } catch (error: any) {
      console.error("Error booking room:", error);
      const errorMessage = error.response?.data?.message || "Ошибка при бронировании";
      alert(errorMessage);
    } finally {
      setIsBooking(false);
    }
  };

  const closeOfficeModal = () => {
    setSelectedOffice(null);
    setRooms([]);
  };

  const closeRoomModal = () => {
    setSelectedRoom(null);
    setSelectedDate(null);
    setSelectedTimeSlot(null);
  };
  
  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return eachDayOfInterval({ start, end });
  };
  
  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = startOfMonth(date).getDay();
    // Convert Sunday=0 to Monday=0 format
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const calculateDeskHeight = () => {
    const h = parseFloat(height);
    if (isNaN(h) || h < 100 || h > 250) return;
    
    // Formulas from old component:
    // Sitting: Height × 0.29 + 20
    // Standing: Height × 0.62 - 2
    const sitting = Math.round(h * 0.29 + 20);
    let standing = Math.round(h * 0.62 - 2);
    
    // Weight adjustment for standing desk
    const w = parseFloat(weight);
    if (!isNaN(w) && w > 0) {
      let adj = 0;
      if (w <= 64) adj = -2;
      else if (w <= 69) adj = -1;
      else if (w <= 79) adj = 0;
      else if (w <= 89) adj = 1;
      else adj = 2;
      standing = standing + adj;
    }
    
    setCalculatedHeight({ sitting, standing });
  };

  const subTabs = [
    { key: "offices" as SubTab, label: "Офисы" },
    { key: "rooms" as SubTab, label: "Свободные комнаты" },
    { key: "calculator" as SubTab, label: "Калькулятор высоты стола" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Header */}
      <div className="pt-12 px-3">
        <h1 className="text-xl font-bold text-white mb-4">Бронь</h1>
      </div>

      {/* Main Tabs */}
      <div className="px-3 mb-4">
        <div className="flex bg-[#262626] rounded-[10px] overflow-hidden">
          <button
            onClick={() => setActiveTab("book")}
            className={`flex-1 py-2.5 px-4 text-[8px] font-medium transition-all ${
              activeTab === "book"
                ? "bg-[#909090] text-white"
                : "text-white"
            }`}
            style={{ borderRadius: "10px" }}
          >
            Забронировать комнату
          </button>
          <button
            onClick={() => setActiveTab("my-bookings")}
            className={`flex-1 py-2.5 px-4 text-[8px] font-medium transition-all ${
              activeTab === "my-bookings"
                ? "bg-[#909090] text-white"
                : "text-white"
            }`}
            style={{ borderRadius: "10px" }}
          >
            Мои бронирования
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      {activeTab === "book" && (
        <div className="px-3 mb-6">
          <div className="flex gap-3">
            {subTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className="flex flex-col gap-3"
              >
                <span
                  className={`text-[10px] font-medium ${
                    activeSubTab === tab.key ? "text-[#FE7F47]" : "text-[#7C7C7C]"
                  }`}
                >
                  {tab.label}
                </span>
                <div
                  className={`h-[1px] w-full ${
                    activeSubTab === tab.key ? "bg-[#F35713]" : "bg-transparent"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-3 pb-24 overflow-y-auto">
        {activeTab === "book" ? (
          <>
            {activeSubTab === "offices" && (
              <div className="grid grid-cols-3 gap-2">
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex flex-col gap-2 animate-pulse">
                      <div className="w-full aspect-[112/145] bg-gray-800 rounded" />
                      <div className="space-y-1">
                        <div className="h-2 bg-gray-800 rounded w-3/4" />
                        <div className="h-2 bg-gray-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))
                ) : (
                  offices.map((office) => (
                    <button
                      key={office.id}
                      onClick={() => handleOfficeClick(office)}
                      className="flex flex-col gap-2 text-left"
                    >
                      <div className="w-full aspect-[112/145] bg-gray-800 rounded overflow-hidden relative">
                        {office.photo ? (
                          <Image
                            src={office.photo}
                            alt={office.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 33vw, 112px"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#262626] to-[#1a1a1a] flex items-center justify-center">
                            <MapPin className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-medium text-white leading-[8px]">
                          {office.name}
                        </span>
                        <span className="text-[8px] text-[#8C8C8C] leading-[9px]">
                          {office.address}
                        </span>
                        <div className="flex items-center gap-[2px]">
                          <MapPin className="w-2 h-2 text-[#8C8C8C]" />
                          <span className="text-[8px] text-[#8C8C8C] leading-[6px]">
                            {office.city}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {activeSubTab === "rooms" && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">
                  Выберите офис для просмотра свободных комнат
                </p>
              </div>
            )}

            {activeSubTab === "calculator" && (
              <div className="space-y-6">
                {/* Description */}
                <p className="text-[#D5D5D5] text-xs leading-4">
                  Введите ваш рост и вес (опционально), чтобы получить рекомендации по высоте стола
                </p>

                {/* Height Input with Dropdown */}
                <div className="space-y-2">
                  <label className="text-white font-medium text-base">Ваш рост (в см)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => {
                        setHeight(e.target.value);
                        // Auto-calculate when height changes
                        const h = parseFloat(e.target.value);
                        if (!isNaN(h) && h >= 100 && h <= 250) {
                          const sitting = Math.round(h * 0.29 + 20);
                          let standing = Math.round(h * 0.62 - 2);
                          const w = parseFloat(weight);
                          if (!isNaN(w) && w > 0) {
                            // Weight adjustment
                            let adj = 0;
                            if (w <= 64) adj = -2;
                            else if (w <= 69) adj = -1;
                            else if (w <= 79) adj = 0;
                            else if (w <= 89) adj = 1;
                            else adj = 2;
                            standing = standing + adj;
                          }
                          setCalculatedHeight({ sitting, standing });
                        }
                      }}
                      placeholder="175"
                      className="flex-1 bg-transparent border border-[#3A3A3A] rounded-lg px-4 py-3 text-white text-xs placeholder-[#6E6E6E] focus:outline-none focus:border-[#F35713]"
                    />
                    {/* Dropdown Select */}
                    <div className="relative">
                      <button
                        onClick={() => setShowHeightDropdown(!showHeightDropdown)}
                        className="h-full px-4 bg-transparent border border-[#3A3A3A] rounded-lg text-white text-xs flex items-center gap-2 min-w-[100px]"
                      >
                        <span className="text-[#6E6E6E]">Выбрать</span>
                        <ChevronRight className={`w-3 h-3 text-[#6E6E6E] transition-transform ${showHeightDropdown ? 'rotate-90' : ''}`} />
                      </button>
                      {showHeightDropdown && (
                        <div className="absolute top-full mt-1 right-0 bg-[#1C1C1E] border border-[#3A3A3A] rounded-lg overflow-hidden z-10 max-h-[200px] overflow-y-auto w-[100px]">
                          {HEIGHT_OPTIONS.map((option) => (
                            <button
                              key={option}
                              onClick={() => {
                                setHeight(option.toString());
                                setShowHeightDropdown(false);
                                // Calculate
                                const sitting = Math.round(option * 0.29 + 20);
                                let standing = Math.round(option * 0.62 - 2);
                                const w = parseFloat(weight);
                                if (!isNaN(w) && w > 0) {
                                  let adj = 0;
                                  if (w <= 64) adj = -2;
                                  else if (w <= 69) adj = -1;
                                  else if (w <= 79) adj = 0;
                                  else if (w <= 89) adj = 1;
                                  else adj = 2;
                                  standing = standing + adj;
                                }
                                setCalculatedHeight({ sitting, standing });
                              }}
                              className={`w-full px-4 py-2 text-left text-xs hover:bg-[#F35713]/20 ${
                                height === option.toString() ? 'bg-[#F35713]/30 text-[#F35713]' : 'text-white'
                              }`}
                            >
                              {option} см
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Weight Input */}
                <div className="space-y-1">
                  <div className="space-y-2">
                    <label className="text-white font-medium text-base">Ваш вес (в кг)</label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => {
                        setWeight(e.target.value);
                        // Auto-calculate when weight changes
                        const h = parseFloat(height);
                        if (!isNaN(h) && h >= 100 && h <= 250) {
                          const sitting = Math.round(h * 0.29 + 20);
                          let standing = Math.round(h * 0.62 - 2);
                          const w = parseFloat(e.target.value);
                          if (!isNaN(w) && w > 0) {
                            let adj = 0;
                            if (w <= 64) adj = -2;
                            else if (w <= 69) adj = -1;
                            else if (w <= 79) adj = 0;
                            else if (w <= 89) adj = 1;
                            else adj = 2;
                            standing = standing + adj;
                          }
                          setCalculatedHeight({ sitting, standing });
                        }
                      }}
                      placeholder="70"
                      className="w-full bg-transparent border border-[#3A3A3A] rounded-lg px-4 py-3 text-white text-xs placeholder-[#6E6E6E] focus:outline-none focus:border-[#F35713]"
                    />
                  </div>
                  <p className="text-[#8D8D8D] text-[8px] leading-[14px]">
                    Укажите вес для более точного расчёта высоты стола в положении стоя
                  </p>
                </div>

                {/* Results */}
                {calculatedHeight && (
                  <div className="flex gap-4">
                    {/* Sitting Card */}
                    <div className="flex-1 bg-[#E25B21] rounded-[10px] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium text-[15px]">Сидя</span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5.25 1.75C5.25 2.7165 4.4665 3.5 3.5 3.5C2.5335 3.5 1.75 2.7165 1.75 1.75C1.75 0.7835 2.5335 0 3.5 0C4.4665 0 5.25 0.7835 5.25 1.75Z" fill="white"/>
                          <path d="M7 5.25H4.375C3.89175 5.25 3.5 5.64175 3.5 6.125V10.5H5.25V14H7V5.25Z" fill="white"/>
                          <path d="M3.5 6.125V8.75H1.75L0 14H1.75L3.5 8.75" fill="white"/>
                        </svg>
                      </div>
                      <span className="text-white font-medium text-xl">{calculatedHeight.sitting} см</span>
                    </div>

                    {/* Standing Card */}
                    <div className="flex-1 bg-[#E25B21] rounded-[10px] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium text-[15px]">Стоя</span>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7 3.5C8.10457 3.5 9 2.60457 9 1.5C9 0.395431 8.10457 -0.5 7 -0.5C5.89543 -0.5 5 0.395431 5 1.5C5 2.60457 5.89543 3.5 7 3.5Z" fill="white"/>
                          <path d="M5.5 4.5H8.5V8.5H10V10H8.5V14H5.5V10H4V8.5H5.5V4.5Z" fill="white"/>
                        </svg>
                      </div>
                      <span className="text-white font-medium text-xl">{calculatedHeight.standing} см</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // My Bookings Tab Content
          <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[
                { key: "upcoming" as const, label: "Предстоящие", count: bookings.filter(isUpcoming).length },
                { key: "active" as const, label: "Активные", count: bookings.filter(isActive).length },
                { key: "completed" as const, label: "Завершенные", count: bookings.filter(b => isPastBooking(b) && !isCancelled(b)).length },
                { key: "cancelled" as const, label: "Отмененные", count: bookings.filter(isCancelled).length },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setBookingFilter(filter.key)}
                  className={`px-4 py-2 rounded-[10px] text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                    bookingFilter === filter.key
                      ? "bg-[#F35713] text-white"
                      : "bg-[#262626] text-[#7C7C7C]"
                  }`}
                >
                  {filter.label}
                  {filter.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      bookingFilter === filter.key ? "bg-white/20" : "bg-white/10"
                    }`}>
                      {filter.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loadingBookings ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-8 h-8 border-2 border-[#F35713] border-t-transparent rounded-full animate-spin" />
                <p className="text-white/60 text-sm">Загрузка бронирований...</p>
              </div>
            ) : (
              <>
                {/* Filtered Bookings */}
                {(() => {
                  let filteredBookings: MeetingRoomBooking[] = [];
                  if (bookingFilter === "upcoming") {
                    filteredBookings = bookings.filter(isUpcoming);
                  } else if (bookingFilter === "active") {
                    filteredBookings = bookings.filter(isActive);
                  } else if (bookingFilter === "completed") {
                    filteredBookings = bookings.filter(b => isPastBooking(b) && !isCancelled(b));
                  } else if (bookingFilter === "cancelled") {
                    filteredBookings = bookings.filter(isCancelled);
                  }
                  
                  if (filteredBookings.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                          <Calendar className="w-8 h-8 text-white/40" />
                        </div>
                        <div className="text-center">
                          <h3 className="text-white font-medium mb-1">Нет бронирований</h3>
                          <p className="text-white/50 text-sm">
                            {bookingFilter === "upcoming" && "Нет предстоящих бронирований"}
                            {bookingFilter === "active" && "Нет активных бронирований"}
                            {bookingFilter === "completed" && "Нет завершенных бронирований"}
                            {bookingFilter === "cancelled" && "Нет отмененных бронирований"}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-3">
                      {filteredBookings.map((booking) => {
                        const statusInfo = getStatusInfo(booking.status || 'scheduled');
                        const StatusIcon = statusInfo.icon;
                        const isCancelledBooking = isCancelled(booking);
                        const isCompletedBooking = isPastBooking(booking) && !isCancelledBooking;
                        
                        return (
                          <div
                            key={booking.id}
                            className={`rounded-[10px] p-4 ${
                              isCancelledBooking 
                                ? "bg-[#1C1C1E]/50 opacity-70" 
                                : isCompletedBooking 
                                  ? "bg-[#1C1C1E]/70" 
                                  : isActive(booking)
                                    ? "bg-[#1C1C1E] border border-blue-500/30"
                                    : "bg-[#1C1C1E]"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className={`font-medium text-sm ${isCancelledBooking ? "text-white/70 line-through" : "text-white"}`}>
                                  {booking.meetingRoom?.name || booking.meeting_room?.name || `Комната #${booking.meeting_room_id}`}
                                </h4>
                                {booking.company_name && (
                                  <p className="text-white/50 text-xs mt-1">{booking.company_name}</p>
                                )}
                              </div>
                              <span className={`${statusInfo.color} text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusInfo.text}
                              </span>
                            </div>
                            
                            <div className={`space-y-2 text-xs ${isCancelledBooking || isCompletedBooking ? "text-white/50" : "text-white/70"}`}>
                              <div className="flex items-center gap-2">
                                <Calendar className={`w-3.5 h-3.5 ${isCancelledBooking || isCompletedBooking ? "" : "text-[#F35713]"}`} />
                                <span>
                                  {typeof booking.start_time === 'string' 
                                    ? format(new Date(booking.start_time.substring(0, 10) + 'T00:00:00'), "dd MMMM yyyy", { locale: ru })
                                    : format(new Date(booking.start_time), "dd MMMM yyyy", { locale: ru })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className={`w-3.5 h-3.5 ${isCancelledBooking || isCompletedBooking ? "" : "text-[#F35713]"}`} />
                                <span>
                                  {typeof booking.start_time === 'string'
                                    ? `${booking.start_time.substring(11, 16)} - ${booking.end_time.toString().substring(11, 16)}`
                                    : `${format(new Date(booking.start_time), "HH:mm")} - ${format(new Date(booking.end_time), "HH:mm")}`}
                                </span>
                              </div>
                              {(booking.meetingRoom?.office || booking.office) && (
                                <div className="flex items-center gap-2">
                                  <MapPin className={`w-3.5 h-3.5 ${isCancelledBooking || isCompletedBooking ? "" : "text-[#F35713]"}`} />
                                  <span>{(booking.meetingRoom?.office || booking.office)?.name}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Actions */}
                            {!isCancelledBooking && (
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => router.push(`/booking/${booking.id}`)}
                                  className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 ${
                                    isCompletedBooking 
                                      ? "bg-white/10 text-white/70" 
                                      : "bg-[#F35713] text-white"
                                  }`}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  {isCompletedBooking ? "Просмотреть" : "Открыть"}
                                </button>
                                {!isCompletedBooking && (
                                  <button
                                    onClick={() => handleCancelBooking(booking.id)}
                                    disabled={cancellingId === booking.id}
                                    className="flex-1 bg-red-500/20 text-red-400 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    {cancellingId === booking.id ? "Отмена..." : "Отменить"}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>

      {/* Office Rooms Modal */}
      {selectedOffice && !selectedRoom && (
        <div 
          className="fixed inset-0 z-50"
          style={{ background: "linear-gradient(169.92deg, #F35713 -3.47%, #281504 104.23%)" }}
        >
          <div className="flex flex-col h-full pt-9 px-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-white">{selectedOffice.name}</h2>
              <button onClick={closeOfficeModal} className="p-1">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            
            <p className="text-white text-sm font-medium mb-4">
              Доступные: {rooms.length}
            </p>

            {/* Rooms Grid */}
            <div className="flex gap-2 overflow-x-auto pb-4">
              {loadingRooms ? (
                Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="w-[112px] flex-shrink-0 animate-pulse">
                    <div className="w-full h-[145px] bg-white/10 rounded" />
                    <div className="mt-2 h-3 bg-white/10 rounded w-3/4" />
                  </div>
                ))
              ) : (
                rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomClick(room)}
                    className="w-[112px] flex-shrink-0 text-left"
                  >
                    <div className="w-full h-[145px] bg-white/20 rounded overflow-hidden relative">
                      {room.photos && room.photos.length > 0 ? (
                        <Image 
                          src={room.photos[0]} 
                          alt={room.name} 
                          fill 
                          className="object-cover"
                          sizes="112px"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-white/40" />
                        </div>
                      )}
                      {room.photos && room.photos.length > 1 && (
                        <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[8px] text-white">
                          +{room.photos.length - 1}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] font-medium text-white leading-[9px]">{room.name}</p>
                      <div className="flex items-center gap-1">
                        <Building2 className="w-2 h-2 text-[#C1C1C1]" />
                        <span className="text-[8px] text-[#C1C1C1]">{room.floor} этаж</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-2 h-2 text-[#C1C1C1]" />
                        <span className="text-[8px] text-[#C1C1C1]">до {room.capacity} человек</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          {!isDesktop && <BottomNav activeTab="booking" />}
        </div>
      )}

      {/* Room Booking Modal */}
      {selectedRoom && (
        <div 
          className="fixed inset-0 z-50"
          style={{ background: "linear-gradient(169.92deg, #F35713 -3.47%, #281504 104.23%)" }}
        >
          <div className="flex flex-col h-full pt-9 px-3 pb-24 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-white">{selectedOffice?.name}</h2>
              <button onClick={closeRoomModal} className="p-1">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Room Image */}
            <div className="w-full h-[185px] bg-white/20 rounded-[10px] overflow-hidden relative mb-4">
              {selectedRoom.photos && selectedRoom.photos.length > 0 ? (
                <Image 
                  src={selectedRoom.photos[0]} 
                  alt={selectedRoom.name} 
                  fill 
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 100%"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5 flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="w-12 h-12 text-white/40" />
                  <span className="text-sm text-white/40">Фото не загружено</span>
                </div>
              )}
              {selectedRoom.photos && selectedRoom.photos.length > 1 && (
                <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                  +{selectedRoom.photos.length - 1} фото
                </div>
              )}
            </div>

            {/* Room Info */}
            <div className="mb-4">
              <h3 className="text-base font-medium text-white mb-2">{selectedRoom.name}</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[#C1C1C1]" />
                  <span className="text-xs text-[#C1C1C1]">{selectedRoom.floor} этаж</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#C1C1C1]" />
                  <span className="text-xs text-[#C1C1C1]">до {selectedRoom.capacity} человек</span>
                </div>
              </div>
            </div>

            {/* Booking Form */}
            <div className="space-y-4">
              {/* Date Picker */}
              <div>
                <label className="text-base font-medium text-white mb-2 block">Дата</label>
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full bg-[#953F15] rounded-[10px] px-4 py-3 text-left flex items-center justify-between"
                >
                  <span className={selectedDate ? "text-white text-sm" : "text-[#D1D1D1] text-sm"}>
                    {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: ru }) : "Выберите дату"}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-[#D1D1D1] transition-transform ${showCalendar ? 'rotate-90' : ''}`} />
                </button>
                
                {/* Custom Calendar */}
                {showCalendar && (
                  <div className="mt-2 bg-[#1C1C1E] rounded-[10px] p-4">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-2 text-white hover:bg-white/10 rounded-lg"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-white font-medium">
                        {format(currentMonth, "LLLL yyyy", { locale: ru })}
                      </span>
                      <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-2 text-white hover:bg-white/10 rounded-lg"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
                        <div key={day} className="text-center text-xs text-[#C1C1C1] py-1">
                          {day}
                        </div>
                      ))}
                    </div>
                    
                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* Empty cells for days before the first day of month */}
                      {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-10" />
                      ))}
                      
                      {getDaysInMonth(currentMonth).map((day) => {
                        const isPast = isBefore(day, startOfDay(new Date()));
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isTodayDate = isToday(day);
                        
                        return (
                          <button
                            key={day.toISOString()}
                            onClick={() => {
                              if (!isPast) {
                                setSelectedDate(day);
                                setSelectedTimeSlot(null);
                                setShowCalendar(false);
                              }
                            }}
                            disabled={isPast}
                            className={`
                              h-10 rounded-lg text-sm font-medium transition-all
                              ${isPast ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:bg-white/10'}
                              ${isSelected ? 'bg-[#F35713] hover:bg-[#F35713]' : ''}
                              ${isTodayDate && !isSelected ? 'border border-[#F35713]' : ''}
                            `}
                          >
                            {format(day, 'd')}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div>
                  <label className="text-base font-medium text-white mb-2 block">Время</label>
                  {loadingAvailability ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="ml-2 text-sm text-white/60">Загрузка...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                      {TIME_SLOTS.map((slot) => {
                        const now = new Date();
                        const isDateToday = isSameDay(selectedDate, now);
                        const slotDateTime = new Date(selectedDate);
                        const [hour] = slot.start.split(':');
                        slotDateTime.setHours(parseInt(hour), 0, 0, 0);
                        
                        const isPast = isDateToday && slotDateTime < now;
                        const isBooked = bookedSlots.has(slot.start);
                        const isDisabled = isPast || isBooked;
                        const isSelected = selectedTimeSlot === slot.label;
                        
                        return (
                          <button
                            key={slot.label}
                            onClick={() => !isDisabled && setSelectedTimeSlot(slot.label)}
                            disabled={isDisabled}
                            className={`
                              flex items-center justify-between px-3 py-3 rounded-[10px] text-sm font-medium transition-all
                              ${isDisabled ? 'bg-[#953F15]/30 text-white/30 cursor-not-allowed' : 'bg-[#953F15] text-white'}
                              ${isSelected ? 'bg-[#F35713] ring-2 ring-white' : ''}
                              ${isBooked && !isSelected ? 'bg-red-900/40 text-red-300' : ''}
                            `}
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{slot.label}</span>
                            </div>
                            {isBooked && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/30 text-red-200">
                                Занято
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Date/Time Summary */}
              {selectedDate && selectedTimeSlot && (
                <div className="flex items-center gap-2 p-3 bg-white/10 rounded-[10px]">
                  <Clock className="w-4 h-4 text-white" />
                  <span className="text-sm text-white">
                    {format(selectedDate, "dd MMMM yyyy", { locale: ru })} • {selectedTimeSlot}
                  </span>
                </div>
              )}

              {/* Comment */}
              <div>
                <label className="text-base font-medium text-white mb-2 block">
                  Название компании (необязательно)
                </label>
                <textarea
                  value={bookingComment}
                  onChange={(e) => setBookingComment(e.target.value)}
                  placeholder="Название компании"
                  className="w-full bg-[#953F15] rounded-[10px] px-4 py-3 text-white text-sm placeholder-[#D1D1D1] focus:outline-none min-h-[73px] resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleBookRoom}
                disabled={!selectedDate || !selectedTimeSlot || isBooking}
                className="w-full bg-[#F35713] text-white py-4 rounded-[10px] font-medium text-base disabled:opacity-50"
              >
                {isBooking ? "Бронирование..." : "Забронировать"}
              </button>
            </div>
          </div>
          {!isDesktop && <BottomNav activeTab="booking" />}
        </div>
      )}

      {/* Bottom Navigation */}
      {!selectedOffice && !isDesktop && <BottomNav activeTab="booking" />}
    </div>
  );
}
