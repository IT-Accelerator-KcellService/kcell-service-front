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
import { RefreshCcw, Filter, ChevronUp } from "lucide-react";

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

export function MeetingRoomsCatalog() {
  const rooms = useMeetingRoomsStore((state) => state.rooms);
  const fetchRooms = useMeetingRoomsStore((state) => state.fetchRooms);
  const [filters, setFilters] = useState<MeetingRoomsFiltersState>(
    DEFAULT_FILTERS,
  );

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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

  return (
    <div className="flex flex-col gap-6">
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
                <MeetingRoomCard key={room.id} room={room} />
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
    </div>
  );
}

