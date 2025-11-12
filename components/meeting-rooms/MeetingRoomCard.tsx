import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Building2,
  Camera,
  Monitor,
  Presentation,
  Snowflake,
  Tv,
  Users,
  ImageIcon,
} from "lucide-react";
import {
  MEETING_ROOM_EQUIPMENT,
  MeetingRoom,
  MeetingRoomEquipment,
} from "@/stores/meetingRoomsStore";
import React from "react";

const EQUIPMENT_ICONS: Record<MeetingRoomEquipment, React.ElementType> = {
  tv: Tv,
  camera: Camera,
  computer: Monitor,
  board: Presentation,
  "air-conditioner": Snowflake,
};

interface MeetingRoomCardProps {
  room: MeetingRoom;
  className?: string;
  footer?: React.ReactNode;
  highlightInactive?: boolean;
}

const statusVariant: Record<MeetingRoom["status"], string> = {
  available: "bg-green-100 text-green-700",
  booked: "bg-amber-100 text-amber-700",
};

export function MeetingRoomCard({
  room,
  className,
  footer,
  highlightInactive = true,
}: MeetingRoomCardProps) {
  const equipment = room.equipment ?? [];
  const coverPhoto = room.photos?.[0];
  const extraPhotos = room.photos?.length ? room.photos.length - 1 : 0;

  return (
    <Card
      className={cn(
        "overflow-hidden h-full flex flex-col",
        highlightInactive && !room.isActive && "opacity-70",
        className,
      )}
    >
      <div className="relative aspect-[4/3] bg-muted">
        {coverPhoto ? (
          <Image
            src={coverPhoto}
            alt={room.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={false}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <ImageIcon className="h-10 w-10" />
            <span className="text-sm">Фото не загружено</span>
          </div>
        )}

        <Badge
          className={cn(
            "absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold",
            statusVariant[room.status],
          )}
        >
          {room.status === "available" ? "Доступна" : "Забронирована"}
        </Badge>

        {!room.isActive && (
          <div className="absolute bottom-3 left-3 rounded-full bg-gray-900/80 px-3 py-1 text-xs font-medium text-white">
            На ремонте
          </div>
        )}

        {extraPhotos > 0 && (
          <div className="absolute bottom-3 right-3 rounded-full bg-gray-900/75 px-3 py-1 text-xs font-medium text-white">
            +{extraPhotos} фото
          </div>
        )}
      </div>

      <CardHeader className="space-y-2">
        <CardTitle className="text-lg font-semibold">{room.name}</CardTitle>
        {room.description && (
          <p className="text-sm text-muted-foreground">{room.description}</p>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {room.floor} этаж
          </span>
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            до {room.capacity} человек
          </span>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Оборудование
          </p>
          {equipment.length ? (
            <div className="flex flex-wrap gap-2">
              {equipment.map((item) => {
                const Icon = EQUIPMENT_ICONS[item];
                return (
                  <Badge
                    key={`${room.id}-${item}`}
                    variant="secondary"
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {MEETING_ROOM_EQUIPMENT[item].label}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Оборудование не указано
            </p>
          )}
        </div>
      </CardContent>

      {footer ? (
        <div className="px-6 pb-6 pt-0">
          <Separator className="mb-4" />
          {footer}
        </div>
      ) : null}
    </Card>
  );
}

