import { useState, useMemo, ChangeEvent } from "react";
import {
  MeetingRoom,
  MeetingRoomEquipment,
  MeetingRoomStatus,
  MEETING_ROOM_EQUIPMENT,
  useMeetingRoomsStore,
} from "@/stores/meetingRoomsStore";
import {
  MeetingRoomsFilters,
  MeetingRoomsFiltersState,
} from "@/components/meeting-rooms/MeetingRoomsFilters";
import { MeetingRoomCard } from "@/components/meeting-rooms/MeetingRoomCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileImage,
  Plus,
  Save,
  Trash2,
  Copy,
  RefreshCcw,
  X,
} from "lucide-react";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ADMIN_FILTERS_DEFAULT: MeetingRoomsFiltersState = {
  floor: "all",
  capacity: null,
  equipment: [],
  status: "all",
  showInactive: true,
};

interface RoomFormState {
  id?: string;
  name: string;
  floor: number | "";
  capacity: number | "";
  status: MeetingRoomStatus;
  isActive: boolean;
  equipment: MeetingRoomEquipment[];
  photos: string[];
  description: string;
}

const EMPTY_FORM: RoomFormState = {
  name: "",
  floor: "",
  capacity: "",
  status: "available",
  isActive: true,
  equipment: [],
  photos: [],
  description: "",
};

const toFormState = (room: MeetingRoom): RoomFormState => ({
  id: room.id,
  name: room.name,
  floor: room.floor,
  capacity: room.capacity,
  status: room.status,
  isActive: room.isActive,
  equipment: [...(room.equipment ?? [])],
  photos: [...(room.photos ?? [])],
  description: room.description ?? "",
});

const floorsRange = Array.from({ length: 10 }, (_, index) => index + 1);
const capacities = [2, 4, 6, 8, 10, 12];
const MAX_PHOTOS = 3;
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png"];

export function MeetingRoomsAdmin() {
  const { toast } = useToast();
  const rooms = useMeetingRoomsStore((state) => state.rooms);
  const addRoom = useMeetingRoomsStore((state) => state.addRoom);
  const updateRoom = useMeetingRoomsStore((state) => state.updateRoom);
  const removeRoom = useMeetingRoomsStore((state) => state.removeRoom);
  const toggleRoomActive = useMeetingRoomsStore((state) => state.toggleRoomActive);
  const duplicateRoom = useMeetingRoomsStore((state) => state.duplicateRoom);
  const setRoomStatus = useMeetingRoomsStore((state) => state.setRoomStatus);

  const [filters, setFilters] = useState<MeetingRoomsFiltersState>(ADMIN_FILTERS_DEFAULT);
  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState<RoomFormState>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingDeleteRoom, setPendingDeleteRoom] = useState<MeetingRoom | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const availableFloors = useMemo(
    () => Array.from(new Set(rooms.map((room) => room.floor))).sort((a, b) => a - b),
    [rooms],
  );

  const filteredRooms = useMemo(() => {
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
        !filters.equipment.every((equipment) => room.equipment?.includes(equipment))
      ) {
        return false;
      }

      return true;
    });
  }, [rooms, filters]);

  const resetForm = () => {
    setFormState(EMPTY_FORM);
    setIsEditing(false);
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files) {
      return;
    }

    const remainingSlots = MAX_PHOTOS - formState.photos.length;
    if (remainingSlots <= 0) {
      toast({
        title: `Нельзя добавить больше ${MAX_PHOTOS} фото`,
        variant: "destructive",
      });
      return;
    }

    const fileArray = Array.from(files);
    const unsupported = fileArray.filter(
      (file) => !ACCEPTED_FILE_TYPES.includes(file.type),
    );

    if (unsupported.length) {
      toast({
        title: "Неподдерживаемый формат",
        description: "Загружайте файлы в форматах JPG или PNG.",
        variant: "destructive",
      });
    }

    const allowedFiles = fileArray
      .filter((file) => ACCEPTED_FILE_TYPES.includes(file.type))
      .slice(0, remainingSlots);

    if (!allowedFiles.length) {
      return;
    }

    try {
      const dataUrls = await Promise.all(
        allowedFiles.map((file) => readFileAsDataUrl(file)),
      );
      setFormState((prev) => ({
        ...prev,
        photos: [...prev.photos, ...dataUrls],
      }));
    } catch (error) {
      console.error(error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось прочитать выбранные файлы.",
        variant: "destructive",
      });
    }
  };

  const handlePhotoInputChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    await handlePhotoFiles(event.target.files);
    event.target.value = "";
  };

  const handleRemovePhoto = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, photoIndex) => photoIndex !== index),
    }));
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      resetForm();
    }
  };

  const handleEdit = (room: MeetingRoom) => {
    setIsEditing(true);
    setFormState(toFormState(room));
    setOpen(true);
  };

  const handleDuplicate = (id: string) => {
    duplicateRoom(id);
    toast({ title: "Комната скопирована", description: "Создана копия переговорной" });
  };

  const requestDeleteRoom = (room: MeetingRoom) => {
    setPendingDeleteRoom(room);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!pendingDeleteRoom) {
      return;
    }

    removeRoom(pendingDeleteRoom.id);
    toast({
      title: "Переговорная удалена",
      description: `Переговорная ${pendingDeleteRoom.name} удалена из справочника`,
    });

    if (formState.id === pendingDeleteRoom.id) {
      handleOpenChange(false);
    }

    setPendingDeleteRoom(null);
    setDeleteDialogOpen(false);
  };

  const handleDeleteDialogOpenChange = (openState: boolean) => {
    setDeleteDialogOpen(openState);
    if (!openState) {
      setPendingDeleteRoom(null);
    }
  };

  const handleToggleActive = (id: string) => {
    toggleRoomActive(id);
  };

  const handleStatusChange = (id: string, status: MeetingRoomStatus) => {
    setRoomStatus(id, status);
  };

  const validateForm = () => {
    if (!formState.name.trim()) {
      toast({ title: "Введите название комнаты", variant: "destructive" });
      return false;
    }

    if (!formState.floor || Number(formState.floor) < 1) {
      toast({ title: "Выберите этаж", variant: "destructive" });
      return false;
    }

    if (!formState.capacity || Number(formState.capacity) < 1) {
      toast({ title: "Укажите вместимость", variant: "destructive" });
      return false;
    }

    if (!formState.photos.length) {
      toast({ title: "Добавьте минимум одно фото", variant: "destructive" });
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const payload = {
      name: formState.name.trim(),
      floor: Number(formState.floor),
      capacity: Number(formState.capacity),
      status: formState.status,
      isActive: formState.isActive,
      equipment: formState.equipment,
      photos: formState.photos,
      description: formState.description.trim(),
    } satisfies Omit<MeetingRoom, "id">;

    if (isEditing && formState.id) {
      updateRoom(formState.id, payload);
      toast({ title: "Переговорная обновлена" });
    } else {
      addRoom(payload);
      toast({ title: "Переговорная добавлена" });
    }

    handleOpenChange(false);
  };

  const toggleEquipment = (value: MeetingRoomEquipment) => {
    setFormState((prev) => ({
      ...prev,
      equipment: prev.equipment.includes(value)
        ? prev.equipment.filter((item) => item !== value)
        : [...prev.equipment, value],
    }));
  };

  const resetFilters = () => setFilters(ADMIN_FILTERS_DEFAULT);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full px-4 py-1 text-sm">
            Всего: {rooms.length}
          </Badge>
          <Badge variant="outline" className="rounded-full px-4 py-1 text-sm">
            Активных: {rooms.filter((room) => room.isActive).length}
          </Badge>
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Добавить комнату
              </Button>
            </DialogTrigger>
            <DialogContent
              className="max-h-[90vh] overflow-hidden sm:max-w-3xl"
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? "Редактирование переговорной" : "Новая переговорная"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4 sm:grid-cols-[2fr_1fr]">
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="meeting-room-name">Название</Label>
                      <Input
                        id="meeting-room-name"
                        placeholder="Переговорная Астана"
                        value={formState.name}
                        onChange={(event) =>
                          setFormState((prev) => ({ ...prev, name: event.target.value }))
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="meeting-room-floor">Этаж</Label>
                        <Select
                          value={
                            formState.floor === "" ? undefined : String(formState.floor)
                          }
                          onValueChange={(value) =>
                            setFormState((prev) => ({ ...prev, floor: Number(value) }))
                          }
                        >
                          <SelectTrigger id="meeting-room-floor">
                            <SelectValue placeholder="Выберите этаж" />
                          </SelectTrigger>
                          <SelectContent>
                            {floorsRange.map((floor) => (
                              <SelectItem key={floor} value={String(floor)}>
                                {floor}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="meeting-room-capacity">Вместимость</Label>
                        <Input
                          id="meeting-room-capacity"
                          type="number"
                          min={1}
                          value={formState.capacity}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              capacity: event.target.value === "" ? "" : Number(event.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Статус</Label>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          variant={formState.status === "available" ? "default" : "outline"}
                          className="rounded-full"
                          onClick={() => setFormState((prev) => ({ ...prev, status: "available" }))}
                        >
                          Доступна
                        </Button>
                        <Button
                          type="button"
                          variant={formState.status === "booked" ? "default" : "outline"}
                          className="rounded-full"
                          onClick={() => setFormState((prev) => ({ ...prev, status: "booked" }))}
                        >
                          Забронирована
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Оборудование</Label>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {Object.entries(MEETING_ROOM_EQUIPMENT).map(([value, meta]) => {
                          const checked = formState.equipment.includes(
                            value as MeetingRoomEquipment,
                          );
                          return (
                            <Button
                              key={value}
                              type="button"
                              variant={checked ? "default" : "outline"}
                              className="justify-start gap-2"
                              onClick={() => toggleEquipment(value as MeetingRoomEquipment)}
                            >
                              {meta.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <div className="flex flex-col gap-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="meeting-room-photos">Фотографии (до 3 шт.)</Label>
                      <Input
                        id="meeting-room-photos"
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        multiple
                        onChange={handlePhotoInputChange}
                      />
                      <p className="text-xs text-muted-foreground">
                        Поддерживаются форматы JPG и PNG. Максимум {MAX_PHOTOS} фото.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {formState.photos.length ? (
                        formState.photos.map((photo, index) => (
                          <div
                            key={`${photo}-${index}`}
                            className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
                          >
                            <Image
                              src={photo}
                              alt={`${formState.name || "Фото переговорной"} ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 160px"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="absolute top-2 right-2 h-8 w-8 rounded-full"
                              onClick={() => handleRemovePhoto(index)}
                              aria-label="Удалить фото"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 py-8 text-sm text-muted-foreground">
                          <FileImage className="h-8 w-8" />
                          <span>Фотографии пока не выбраны</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meeting-room-description">Описание</Label>
                    <Textarea
                      id="meeting-room-description"
                      placeholder="Дополнительная информация о комнате"
                      value={formState.description}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, description: event.target.value }))
                      }
                      rows={5}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <p className="text-sm font-medium">Комната активна</p>
                      <p className="text-xs text-muted-foreground">
                        Используется в каталоге для клиентов
                      </p>
                    </div>
                    <Switch
                      checked={formState.isActive}
                      onCheckedChange={(checked) =>
                        setFormState((prev) => ({ ...prev, isActive: Boolean(checked) }))
                      }
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                {isEditing ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      if (formState.id) {
                        const roomToRemove =
                          rooms.find((room) => room.id === formState.id) ||
                          ({
                            id: formState.id,
                            name: formState.name,
                            floor: Number(formState.floor) || 0,
                            capacity: Number(formState.capacity) || 0,
                            equipment: formState.equipment,
                            photos: formState.photos,
                            status: formState.status,
                            isActive: formState.isActive,
                            description: formState.description,
                          } as MeetingRoom);
                        requestDeleteRoom(roomToRemove);
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить
                  </Button>
                ) : null}
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Отмена
                  </Button>
                </DialogClose>
                <Button type="button" onClick={handleSubmit} className="gap-2">
                  <Save className="h-4 w-4" />
                  Сохранить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_360px]">
        <div className="space-y-4">
          {filteredRooms.length === 0 ? (
            <div className="rounded-lg border border-dashed p-10 text-center">
              <h3 className="text-lg font-semibold">Комнаты не найдены</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Измените фильтры или добавьте новую переговорную комнату.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredRooms.map((room) => (
                <MeetingRoomCard
                  key={room.id}
                  room={room}
                  highlightInactive
                  footer={
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(room)}>
                        Редактировать
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleStatusChange(
                            room.id,
                            room.status === "available" ? "booked" : "available",
                          )
                        }
                      >
                        {room.status === "available" ? "Отметить как забронированную" : "Освободить"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleActive(room.id)}
                      >
                        {room.isActive ? "Отправить на ремонт" : "Сделать активной"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDuplicate(room.id)}>
                        <Copy className="mr-1 h-4 w-4" />
                        Дублировать
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => requestDeleteRoom(room)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Удалить
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </div>

        <MeetingRoomsFilters
          filters={filters}
          onChange={setFilters}
          availableFloors={availableFloors.length ? availableFloors : floorsRange}
          capacityOptions={capacities}
          showStatusFilter
          showInactiveToggle
          className="self-start"
        />
      </div>

      <Button
        type="button"
        variant="ghost"
        className="self-start gap-2"
        onClick={resetFilters}
      >
        <RefreshCcw className="h-4 w-4" />
        Сбросить фильтры
      </Button>

      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удаление переговорной</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить переговорную{" "}
              {pendingDeleteRoom ? `«${pendingDeleteRoom.name}»` : "эту комнату"}? Это
              действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

