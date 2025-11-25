import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  ImageIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  MeetingRoom,
} from "@/stores/meetingRoomsStore";
import React from "react";

interface MeetingRoomCardProps {
  room: MeetingRoom;
  className?: string;
  footer?: React.ReactNode;
  highlightInactive?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
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
  isExpanded = false,
  onToggleExpand,
}: MeetingRoomCardProps) {
  const coverPhoto = room.photos?.[0];
  const extraPhotos = room.photos?.length ? room.photos.length - 1 : 0;
  const hasExpandableContent = (room.description || footer) && onToggleExpand;

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
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg font-semibold flex-1">{room.name}</CardTitle>
          {hasExpandableContent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="h-8 w-8 p-0"
              aria-label={isExpanded ? "Свернуть" : "Развернуть"}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        {isExpanded && room.description && (
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

      </CardContent>

      {isExpanded && footer ? (
        <div className="px-6 pb-6 pt-0">
          <Separator className="mb-4" />
          {footer}
        </div>
      ) : null}
    </Card>
  );
}

