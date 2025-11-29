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
                        const slot = room.slots.find((s) => s.hour === i);
                        const isBooked = slot?.isBooked || slot?.is_available === false;
                        return (
                          <div
                            key={i}
                            className={`h-8 rounded text-xs flex items-center justify-center ${
                              isBooked ? "bg-primary text-white" : "bg-muted"
                            }`}
                            title={`${i}:00 - ${isBooked ? "Занято" : "Свободно"}`}
                          >
                            {i}
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
                        return (
                          <div key={index} className="space-y-2">
                            <p className="text-xs font-medium text-center">
                              {format(date, "EEE", { locale: ru })}
                            </p>
                            <p className="text-xs text-muted-foreground text-center">
                              {format(date, "d")}
                            </p>
                            <div
                              className={`h-12 rounded flex items-center justify-center text-white text-xs font-semibold ${getOccupancyColor(day.occupancy_percentage)}`}
                            >
                              {day.occupancy_percentage}%
                            </div>
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

