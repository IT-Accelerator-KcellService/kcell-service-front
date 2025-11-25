import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  MEETING_ROOM_CAPACITIES,
  MeetingRoomStatus,
} from "@/stores/meetingRoomsStore";
import { cn } from "@/lib/utils";

export interface MeetingRoomsFiltersState {
  floor: number | "all";
  capacity: number | null;
  status: MeetingRoomStatus | "all";
  showInactive: boolean;
}

interface MeetingRoomsFiltersProps {
  filters: MeetingRoomsFiltersState;
  onChange: (filters: MeetingRoomsFiltersState) => void;
  availableFloors: number[];
  capacityOptions?: readonly number[];
  showStatusFilter?: boolean;
  showInactiveToggle?: boolean;
  className?: string;
}

export function MeetingRoomsFilters({
  filters,
  onChange,
  availableFloors,
  capacityOptions = MEETING_ROOM_CAPACITIES,
  showStatusFilter = false,
  showInactiveToggle = false,
  className,
}: MeetingRoomsFiltersProps) {
  const updateFilters = (updates: Partial<MeetingRoomsFiltersState>) => {
    onChange({ ...filters, ...updates });
  };

  return (
    <Card className={cn("md:sticky md:top-28", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Фильтры</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">
            Этаж
          </Label>
          <Select
            value={filters.floor === "all" ? "all" : String(filters.floor)}
            onValueChange={(value) =>
              updateFilters({
                floor: value === "all" ? "all" : Number(value),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите этаж" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все этажи</SelectItem>
              {availableFloors.map((floor) => (
                <SelectItem key={floor} value={String(floor)}>
                  {floor} этаж
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">
            Вместимость
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {capacityOptions.map((capacity) => {
              const isActive = filters.capacity === capacity;
              return (
                <Button
                  key={capacity}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  className={cn(
                    "rounded-full text-sm font-medium",
                    isActive && "bg-primary text-primary-foreground",
                  )}
                  onClick={() =>
                    updateFilters({
                      capacity: isActive ? null : capacity,
                    })
                  }
                >
                  {capacity}
                </Button>
              );
            })}
          </div>
          {filters.capacity && (
            <Badge
              variant="secondary"
              className="cursor-pointer rounded-full px-3 py-1 text-xs"
              onClick={() => updateFilters({ capacity: null })}
            >
              Очистить вместимость
            </Badge>
          )}
        </div>

        {showStatusFilter ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Статус
            </Label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                updateFilters({
                  status: value as MeetingRoomsFiltersState["status"],
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="available">Доступна</SelectItem>
                <SelectItem value="booked">Забронирована</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {showInactiveToggle ? (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Показывать неактивные</p>
              <p className="text-xs text-muted-foreground">
                В ремонте или временно закрытые комнаты
              </p>
            </div>
            <Switch
              checked={filters.showInactive}
              onCheckedChange={(value) =>
                updateFilters({
                  showInactive: Boolean(value),
                })
              }
            />
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() =>
            onChange({
              floor: "all",
              capacity: null,
              status: "all",
              showInactive: showInactiveToggle ? filters.showInactive : false,
            })
          }
        >
          Сбросить фильтры
        </Button>
      </CardContent>
    </Card>
  );
}

