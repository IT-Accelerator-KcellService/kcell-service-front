"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getMeetingRoomDailyCalendar,
  getMeetingRoomWeeklyCalendar,
  DailyCalendarData,
  WeeklyCalendarData,
} from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { format, startOfWeek, addDays, addWeeks, subWeeks, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

type CalendarMode = "day" | "week";

export function MeetingRoomCalendar() {
  const { toast } = useToast();
  const [mode, setMode] = useState<CalendarMode>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyCalendarData | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyCalendarData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCalendarData();
  }, [mode, selectedDate]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (mode === "day") {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const response = await getMeetingRoomDailyCalendar(dateStr);
        setDailyData(response.data);
      } else {
        const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
        const weekEnd = addDays(weekStart, 6);
        const startStr = format(weekStart, "yyyy-MM-dd");
        const endStr = format(weekEnd, "yyyy-MM-dd");
        const response = await getMeetingRoomWeeklyCalendar(startStr, endStr);
        setWeeklyData(response.data);
      }
    } catch (err: any) {
      console.error("Ошибка загрузки календаря:", err);
      setError(err.response?.data?.message || "Не удалось загрузить календарь");
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить календарь",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 70) return "bg-destructive"; // Красный - высокая загрузка
    if (percentage >= 40) return "bg-yellow-500"; // Желтый - средняя загрузка
    return "bg-green-500"; // Зеленый - низкая загрузка
  };

  const navigateWeek = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setSelectedDate((prev) => subWeeks(prev, 1));
    } else {
      setSelectedDate((prev) => addWeeks(prev, 1));
    }
  };

  const navigateDay = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setSelectedDate((prev) => addDays(prev, -1));
    } else {
      setSelectedDate((prev) => addDays(prev, 1));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Загрузка календаря...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-destructive text-center">{error}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Календарь загрузки комнат</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={mode} onValueChange={(value) => setMode(value as CalendarMode)}>
          <TabsList className="mb-4">
            <TabsTrigger value="day">День</TabsTrigger>
            <TabsTrigger value="week">Неделя</TabsTrigger>
          </TabsList>

          <TabsContent value="day" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="sm" onClick={() => navigateDay("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {format(selectedDate, "d MMMM yyyy", { locale: ru })}
              </h3>
              <Button variant="outline" size="sm" onClick={() => navigateDay("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {dailyData && dailyData.rooms.length > 0 ? (
              <div className="space-y-4">
                {dailyData.rooms.map((room) => (
                  <div key={room.room_id} className="border rounded-lg p-4">
                    <div className="mb-2">
                      <p className="font-medium">{room.room_name}</p>
                      <p className="text-sm text-muted-foreground">{room.office_name}</p>
                    </div>
                    <div className="grid grid-cols-12 gap-1">
                      {Array.from({ length: 24 }, (_, i) => {
                        const slot = room.slots.find((s) => {
                          if (s.hour !== undefined) return s.hour === i;
                          // Если hour нет, вычисляем из start_time
                          if (s.start_time) {
                            const slotDate = new Date(s.start_time);
                            return slotDate.getHours() === i;
                          }
                          return false;
                        });
                        const isBooked = slot?.isBooked || slot?.is_available === false;
                        const userInfo = slot?.booking_user;
                        const companyName = slot?.company_name;
                        
                        let tooltipText = `${i}:00 - ${isBooked ? "Занято" : "Свободно"}`;
                        if (isBooked && userInfo) {
                          tooltipText += `\nЗабронировал: ${userInfo.full_name}`;
                          if (userInfo.phone) {
                            tooltipText += `\nТелефон: ${userInfo.phone}`;
                          }
                          if (companyName) {
                            tooltipText += `\nКомпания: ${companyName}`;
                          }
                        }
                        
                        return (
                          <div
                            key={i}
                            className={`h-8 rounded text-xs flex flex-col items-center justify-center relative group ${
                              isBooked ? "bg-primary text-white" : "bg-muted"
                            }`}
                            title={tooltipText}
                          >
                            <span>{i}</span>
                            {isBooked && userInfo && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                                <div className="font-semibold">{userInfo.full_name}</div>
                                {companyName && <div className="text-xs opacity-90">{companyName}</div>}
                                {userInfo.phone && <div className="text-xs opacity-75">{userInfo.phone}</div>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Нет данных</p>
            )}
          </TabsContent>

          <TabsContent value="week" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "d MMM", { locale: ru })}{" "}
                - {format(addDays(startOfWeek(selectedDate, { weekStartsOn: 1 }), 6), "d MMM yyyy", { locale: ru })}
              </h3>
              <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {weeklyData && weeklyData.rooms.length > 0 ? (
              <div className="space-y-4">
                {weeklyData.rooms.map((room) => (
                  <div key={room.room_id} className="border rounded-lg p-4">
                    <div className="mb-4">
                      <p className="font-medium">{room.room_name}</p>
                      <p className="text-sm text-muted-foreground">{room.office_name}</p>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {room.days.map((day, index) => {
                        const date = parseISO(day.date);
                        const bookings = day.bookings || [];
                        const hasBookings = bookings.length > 0;
                        
                        let tooltipText = `${format(date, "d MMMM", { locale: ru })} - ${day.occupancy_percentage}%`;
                        if (hasBookings) {
                          tooltipText += `\nБронирований: ${bookings.length}`;
                          bookings.forEach((booking, idx) => {
                            if (booking.user) {
                              tooltipText += `\n${idx + 1}. ${booking.user.full_name}`;
                              if (booking.company_name) {
                                tooltipText += ` (${booking.company_name})`;
                              }
                            }
                          });
                        }
                        
                        return (
                          <div key={index} className="space-y-2 relative group">
                            <p className="text-xs font-medium text-center">
                              {format(date, "EEE", { locale: ru })}
                            </p>
                            <p className="text-xs text-muted-foreground text-center">
                              {format(date, "d")}
                            </p>
                            <div
                              className={`h-12 rounded flex flex-col items-center justify-center text-white text-xs font-semibold cursor-pointer ${getOccupancyColor(day.occupancy_percentage)}`}
                              title={tooltipText}
                            >
                              <span>{day.occupancy_percentage}%</span>
                              {hasBookings && (
                                <span className="text-[10px] opacity-90">{bookings.length}</span>
                              )}
                            </div>
                            {hasBookings && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded px-3 py-2 min-w-[200px] max-w-[300px]">
                                <div className="font-semibold mb-2">{format(date, "d MMMM", { locale: ru })}</div>
                                {bookings.map((booking, idx) => (
                                  <div key={booking.id} className="mb-1 pb-1 border-b border-gray-700 last:border-0">
                                    {booking.user && (
                                      <>
                                        <div className="font-medium">{booking.user.full_name}</div>
                                        {booking.company_name && (
                                          <div className="text-xs opacity-90">{booking.company_name}</div>
                                        )}
                                        {booking.user.phone && (
                                          <div className="text-xs opacity-75">{booking.user.phone}</div>
                                        )}
                                        <div className="text-xs opacity-60">
                                          {(() => {
                                            // Конвертируем время в местное время Алматы
                                            let startTime = new Date(booking.start_time);
                                            let endTime = new Date(booking.end_time);
                                            
                                            // Если время приходит в UTC (с Z), конвертируем в местное время
                                            if (booking.start_time.endsWith('Z')) {
                                              // Время приходит как UTC, но на самом деле это время Алматы
                                              // Вычитаем 5 часов для правильного отображения
                                              const ALMATY_OFFSET_MS = 5 * 60 * 60 * 1000;
                                              startTime = new Date(startTime.getTime() - ALMATY_OFFSET_MS);
                                              endTime = new Date(endTime.getTime() - ALMATY_OFFSET_MS);
                                            }
                                            
                                            return `${format(startTime, "HH:mm")} - ${format(endTime, "HH:mm")}`;
                                          })()}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">Нет данных</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

