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
  MapPin,
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
  showOffice?: boolean;
  /** Dark theme for admin mobile */
  darkTheme?: boolean;
}

const statusVariant: Record<MeetingRoom["status"], string> = {
  available: "bg-gradient-to-r from-[#114A65] to-[#114A65]/90 text-white backdrop-blur-md border border-[#114A65]/50 shadow-lg font-bold",
  booked: "bg-gradient-to-r from-[#B8400E] to-[#B8400E]/90 text-white backdrop-blur-md border border-[#B8400E]/50 shadow-lg font-bold",
};

export function MeetingRoomCard({
  room,
  className,
  footer,
  highlightInactive = true,
  isExpanded = false,
  onToggleExpand,
  showOffice = false,
  darkTheme = false,
}: MeetingRoomCardProps) {
  const coverPhoto = room.photos?.[0];
  const extraPhotos = room.photos?.length ? room.photos.length - 1 : 0;
  const hasExpandableContent = (room.description || footer) && onToggleExpand;

  return (
    <Card
      className={cn(
        "overflow-hidden h-full flex flex-col backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300",
        darkTheme
          ? "bg-[#2C2C2E] border-[#3A3A3C]"
          : "bg-gradient-to-br from-white via-[#F3F3F3] to-white",
        highlightInactive && !room.isActive && "opacity-70",
        className,
      )}
    >
      <div className={cn("relative aspect-[4/3]", darkTheme ? "bg-[#1C1C1E]" : "bg-muted")}>
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
          <div className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-2",
            darkTheme ? "text-[#8E8E93]" : "text-muted-foreground"
          )}>
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
          <div className="absolute bottom-3 left-3 rounded-full bg-[#040404]/80 px-3 py-1 text-xs font-medium text-white">
            На ремонте
          </div>
        )}

        {extraPhotos > 0 && (
          <div className="absolute bottom-3 right-3 rounded-full bg-[#040404]/75 px-3 py-1 text-xs font-medium text-white">
            +{extraPhotos} фото
          </div>
        )}
      </div>

      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className={cn("text-lg font-semibold flex-1", darkTheme && "text-white")}>{room.name}</CardTitle>
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
          <p className={cn("text-sm", darkTheme ? "text-[#8E8E93]" : "text-muted-foreground")}>{room.description}</p>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className={cn("flex flex-wrap items-center gap-4 text-sm", darkTheme ? "text-[#8E8E93]" : "text-muted-foreground")}>
          <span className="flex items-center gap-2">
            <Building2 className={cn("h-4 w-4", darkTheme ? "text-[#F35713]" : "text-primary")} />
            {room.floor} этаж
          </span>
          {room.room_type !== "cabinet" && (
            <span className="flex items-center gap-2">
              <Users className={cn("h-4 w-4", darkTheme ? "text-[#F35713]" : "text-primary")} />
              до {room.capacity} человек
            </span>
          )}
          {showOffice && room.office && (
            <span className="flex items-center gap-2">
              <MapPin className={cn("h-4 w-4", darkTheme ? "text-[#F35713]" : "text-primary")} />
              {room.office.name}
            </span>
          )}
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

