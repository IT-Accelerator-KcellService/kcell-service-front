"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { getMeetingRoomStats, MeetingRoomStats } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { MeetingRoomCalendar } from "./MeetingRoomCalendar";

export function MeetingRoomStatistics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<MeetingRoomStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getMeetingRoomStats();
      setStats(response.data);
    } catch (err: any) {
      console.error("Ошибка загрузки статистики:", err);
      setError(err.response?.data?.message || "Не удалось загрузить статистику");
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить статистику",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} ч ${mins} мин`;
    }
    return `${mins} мин`;
  };

  const getPeakHoursText = () => {
    if (!stats?.peakHours || stats.peakHours.length === 0) return "Нет данных";
    const sorted = [...stats.peakHours].sort((a, b) => b.booking_count - a.booking_count);
    const peak = sorted[0];
    return `Пик в ${peak.hour}:00 (${peak.booking_count} бронирований)`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Загрузка статистики...</p>
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

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground">Нет данных</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Самые загруженные комнаты */}
      <Card>
        <CardHeader>
          <CardTitle>Самые загруженные комнаты</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.mostLoadedRooms && stats.mostLoadedRooms.length > 0 ? (
            <div className="space-y-4">
              {stats.mostLoadedRooms.slice(0, 3).map((room) => (
                <div
                  key={room.room_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{room.room_name}</p>
                    <p className="text-sm text-muted-foreground">{room.office_name}</p>
                  </div>
                  <div className="flex flex-col items-center ml-4">
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{
                        backgroundColor: "#114A65",
                        transform: `rotate(${(room.occupancy_percentage / 100) * 360}deg)`,
                      }}
                    >
                      {room.occupancy_percentage}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">загрузки за месяц</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Нет данных</p>
          )}
        </CardContent>
      </Card>

      {/* Самые свободные комнаты */}
      <Card>
        <CardHeader>
          <CardTitle>Самые свободные комнаты</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.mostFreeRooms && stats.mostFreeRooms.length > 0 ? (
            <div className="space-y-4">
              {stats.mostFreeRooms.slice(0, 3).map((room) => (
                <div
                  key={room.room_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{room.room_name}</p>
                    <p className="text-sm text-muted-foreground">{room.office_name}</p>
                  </div>
                  <div className="flex flex-col items-center ml-4">
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{
                        backgroundColor: "#B8400E",
                        transform: `rotate(${(room.occupancy_percentage / 100) * 360}deg)`,
                      }}
                    >
                      {room.occupancy_percentage}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">используется только</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Нет данных</p>
          )}
        </CardContent>
      </Card>

      {/* Пиковые часы */}
      <Card>
        <CardHeader>
          <CardTitle>Пиковые часы</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.peakHours && stats.peakHours.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">{getPeakHoursText()}</p>
                {stats.peakHours
                  .sort((a, b) => b.booking_count - a.booking_count)
                  .slice(0, 5)
                  .map((hour) => {
                    const maxCount = Math.max(...stats.peakHours.map((h) => h.booking_count));
                    const width = (hour.booking_count / maxCount) * 100;
                    return (
                      <div key={hour.hour} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{hour.hour}:00</span>
                          <span className="text-sm text-muted-foreground">
                            {hour.booking_count} бронирований
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-6 relative overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${width}%` }}
                          >
                            <span className="text-xs font-semibold text-white">
                              {hour.booking_count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </>
            ) : (
              <p className="text-muted-foreground">Нет данных</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Общее количество броней за месяц */}
      <Card>
        <CardHeader>
          <CardTitle>Общее количество броней за месяц</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">{stats.totalBookingsThisMonth || 0}</p>
        </CardContent>
      </Card>

      {/* Средняя продолжительность брони */}
      <Card>
        <CardHeader>
          <CardTitle>Средняя продолжительность брони</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">
            {formatDuration(stats.averageBookingDuration || 0)}
          </p>
        </CardContent>
      </Card>

      {/* Количество отмен / неявок */}
      <Card>
        <CardHeader>
          <CardTitle>Кол-во отмен / неявок</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-destructive">
            {stats.cancellationsAndNoShows || 0}
          </p>
        </CardContent>
      </Card>

      {/* Кнопка для показа календаря */}
      <Button
        onClick={() => setShowCalendar(!showCalendar)}
        className="w-full"
        variant="default"
      >
        {showCalendar ? (
          <>
            <ChevronUp className="mr-2 h-4 w-4" />
            Скрыть календарь
          </>
        ) : (
          <>
            <ChevronDown className="mr-2 h-4 w-4" />
            Показать календарь загрузки
          </>
        )}
      </Button>

      {/* Календарь загрузки */}
      {showCalendar && <MeetingRoomCalendar />}
    </div>
  );
}

