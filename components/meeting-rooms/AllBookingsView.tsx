"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, Building2, Users, Loader2, Filter } from "lucide-react";
import { getMeetingRoomBookings, MeetingRoomBooking } from "@/lib/api";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Office } from "@/lib/api";

interface AllBookingsViewProps {
  offices: Office[];
  variant?: "default" | "dark";
}

export function AllBookingsView({ offices, variant = "default" }: AllBookingsViewProps) {
  const themed = variant === "dark";
  const [bookings, setBookings] = useState<MeetingRoomBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOfficeId, setFilterOfficeId] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterClient, setFilterClient] = useState<string>("");

  useEffect(() => {
    fetchBookings();
  }, [filterOfficeId, filterDateFrom, filterDateTo, filterClient]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const params: Parameters<typeof getMeetingRoomBookings>[0] = {};
      if (filterOfficeId && filterOfficeId !== "all") {
        params.office_id = parseInt(filterOfficeId);
      }
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      if (filterClient.trim()) params.company_name = filterClient.trim();
      const res = await getMeetingRoomBookings(Object.keys(params).length > 0 ? params : undefined);
      let data = Array.isArray(res.data) ? res.data : [];
      // Клиентская фильтрация на случай, если бэкенд не поддерживает параметры
      if (filterOfficeId && filterOfficeId !== "all") {
        const officeId = parseInt(filterOfficeId);
        data = data.filter((b) => {
          const room = b.meetingRoom || b.meeting_room;
          const office = room?.office || b.office;
          return office?.id === officeId;
        });
      }
      if (filterDateFrom) {
        const from = new Date(filterDateFrom);
        data = data.filter((b) => new Date(b.start_time) >= from);
      }
      if (filterDateTo) {
        const to = new Date(filterDateTo);
        to.setHours(23, 59, 59, 999);
        data = data.filter((b) => new Date(b.start_time) <= to);
      }
      if (filterClient.trim()) {
        const q = filterClient.trim().toLowerCase();
        data = data.filter((b) => (b.company_name || "").toLowerCase().includes(q));
      }
      const sorted = [...data].sort((a, b) => {
        const dA = new Date(a.start_time).getTime();
        const dB = new Date(b.start_time).getTime();
        return dB - dA;
      });
      setBookings(sorted);
    } catch (err) {
      console.error("Ошибка загрузки бронирований:", err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const cardClass = themed ? "rounded-xl bg-[#2C2C2E] border-[#3A3A3C]" : "";
  const cardHeaderClass = themed ? "text-white" : "";
  const mutedClass = themed ? "text-white/60" : "text-muted-foreground";
  const borderClass = themed ? "border-[#3A3A3C]" : "";

  return (
    <div className="space-y-6">
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${cardHeaderClass}`}>
            <Filter className="w-5 h-5" />
            Фильтры
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className={`text-sm font-medium ${themed ? "text-white/80" : ""}`}>Офис</label>
              <Select value={filterOfficeId} onValueChange={setFilterOfficeId}>
                <SelectTrigger className={themed ? "bg-[#3A3A3C] border-white/10 text-white" : ""}>
                  <SelectValue placeholder="Все офисы" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все офисы</SelectItem>
                  {offices.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className={`text-sm font-medium ${themed ? "text-white/80" : ""}`}>Дата с</label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className={themed ? "bg-[#3A3A3C] border-white/10 text-white" : ""}
              />
            </div>
            <div className="space-y-2">
              <label className={`text-sm font-medium ${themed ? "text-white/80" : ""}`}>Дата по</label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className={themed ? "bg-[#3A3A3C] border-white/10 text-white" : ""}
              />
            </div>
            <div className="space-y-2">
              <label className={`text-sm font-medium ${themed ? "text-white/80" : ""}`}>Клиент / Компания</label>
              <Input
                placeholder="Поиск по названию"
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                className={themed ? "bg-[#3A3A3C] border-white/10 text-white placeholder:text-white/40" : ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className={cardHeaderClass}>
            Все бронирования {bookings.length > 0 && `(${bookings.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className={`w-10 h-10 animate-spin mb-4 ${themed ? "text-[#E85D2B]" : ""}`} />
              <p className={mutedClass}>Загрузка бронирований...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className={`w-16 h-16 mx-auto mb-4 ${themed ? "text-white/30" : "text-muted-foreground"}`} />
              <p className={mutedClass}>Нет бронирований по заданным фильтрам</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {bookings.map((b) => {
                const room = b.meetingRoom || b.meeting_room;
                const office = room?.office || b.office;
                return (
                  <div
                    key={b.id}
                    className={`flex flex-wrap items-center gap-3 p-4 rounded-xl border ${borderClass} ${
                      themed ? "bg-[#3A3A3C]/50" : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className={`w-4 h-4 shrink-0 ${themed ? "text-[#E85D2B]" : "text-primary"}`} />
                      <span className={`font-medium truncate ${themed ? "text-white" : ""}`}>
                        {room?.name || `Комната #${b.meeting_room_id}`}
                      </span>
                    </div>
                    {office && (
                      <div className={`flex items-center gap-1.5 text-sm ${mutedClass}`}>
                        <Building2 className="w-3.5 h-3.5" />
                        {office.name}
                      </div>
                    )}
                    {b.company_name && (
                      <div className={`flex items-center gap-1.5 text-sm ${mutedClass}`}>
                        <Users className="w-3.5 h-3.5" />
                        {b.company_name}
                      </div>
                    )}
                    <div className={`flex items-center gap-1.5 text-sm ${mutedClass}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(b.start_time), "dd MMM yyyy", { locale: ru })}
                    </div>
                    <div className={`flex items-center gap-1.5 text-sm ${mutedClass}`}>
                      <Clock className="w-3.5 h-3.5" />
                      {format(new Date(b.start_time), "HH:mm", { locale: ru })} -{" "}
                      {format(new Date(b.end_time), "HH:mm", { locale: ru })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
