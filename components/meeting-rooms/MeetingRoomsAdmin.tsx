import { useState, useMemo, useEffect, ChangeEvent } from "react";
import {
  MeetingRoom,
  MeetingRoomStatus,
  useMeetingRoomsStore,
} from "@/stores/meetingRoomsStore";
import { MeetingRoomCard } from "@/components/meeting-rooms/MeetingRoomCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface RoomFormState {
  id?: number;
  name: string;
  floor: number | "";
  capacity: number | "";
  status: MeetingRoomStatus;
  isActive: boolean;
  photos: string[];
  description: string;
}

const EMPTY_FORM: RoomFormState = {
  name: "",
  floor: "",
  capacity: "",
  status: "available",
  isActive: true,
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
  photos: [...(room.photos ?? [])],
  description: room.description ?? "",
});

const floorsRange = Array.from({ length: 10 }, (_, index) => index + 1);
const capacities = [2, 4, 6, 8, 10, 12];
const MAX_PHOTOS = 3;
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png"];
const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024; // 2MB per file

export function MeetingRoomsAdmin() {
  const { toast } = useToast();
  const rooms = useMeetingRoomsStore((state) => state.rooms);
  const loading = useMeetingRoomsStore((state) => state.loading);
  const fetchRooms = useMeetingRoomsStore((state) => state.fetchRooms);
  const addRoom = useMeetingRoomsStore((state) => state.addRoom);
  const updateRoom = useMeetingRoomsStore((state) => state.updateRoom);
  const removeRoom = useMeetingRoomsStore((state) => state.removeRoom);
  const toggleRoomActive = useMeetingRoomsStore((state) => state.toggleRoomActive);
  const duplicateRoom = useMeetingRoomsStore((state) => state.duplicateRoom);
  const setRoomStatus = useMeetingRoomsStore((state) => state.setRoomStatus);

  const [open, setOpen] = useState(false);
  const [formState, setFormState] = useState<RoomFormState>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingDeleteRoom, setPendingDeleteRoom] = useState<MeetingRoom | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<{ name?: string; floor?: string; capacity?: string; photos?: string }>({});

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);


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
      const msg = `Нельзя добавить больше ${MAX_PHOTOS} фото`;
      setErrors((e) => ({ ...e, photos: msg }));
      toast({ title: msg, variant: "destructive" });
      return;
    }

    const fileArray = Array.from(files);
    const unsupported = fileArray.filter((file) => !ACCEPTED_FILE_TYPES.includes(file.type));
    const oversize = fileArray.filter((file) => file.size > MAX_PHOTO_SIZE_BYTES);

    if (unsupported.length) {
      const msg = "Неподдерживаемый формат. Загружайте JPG или PNG.";
      setErrors((e) => ({ ...e, photos: msg }));
      toast({ title: "Неподдерживаемый формат", description: msg, variant: "destructive" });
    } else if (oversize.length) {
      const msg = "Каждое фото должно быть не больше 2MB";
      setErrors((e) => ({ ...e, photos: msg }));
      toast({ title: "Слишком большой файл", description: msg, variant: "destructive" });
    }

    const allowedFiles = fileArray
      .filter((file) => ACCEPTED_FILE_TYPES.includes(file.type) && file.size <= MAX_PHOTO_SIZE_BYTES)
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
      setErrors((e) => ({ ...e, photos: undefined }));
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
    setErrors((e) => ({ ...e, photos: undefined }));
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      resetForm();
    }
  };

  const handleAddRoomClick = () => {
    resetForm();
    setOpen(true);
  };

  const handleCancel = () => {
    handleOpenChange(false);
  };

  const handleEdit = (room: MeetingRoom) => {
    setIsEditing(true);
    setFormState(toFormState(room));
    setOpen(true);
  };

  const handleDuplicate = async (id: number) => {
    try {
      await duplicateRoom(id);
      toast({ title: "Комната скопирована", description: "Создана копия переговорной" });
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось скопировать переговорную", variant: "destructive" });
    }
  };

  const requestDeleteRoom = (room: MeetingRoom) => {
    setPendingDeleteRoom(room);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteRoom) {
      return;
    }

    try {
      await removeRoom(pendingDeleteRoom.id);
      toast({
        title: "Переговорная удалена",
        description: `Переговорная ${pendingDeleteRoom.name} удалена из справочника`,
      });

      if (formState.id === pendingDeleteRoom.id) {
        handleOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить переговорную",
        variant: "destructive",
      });
    } finally {
      setPendingDeleteRoom(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteDialogOpenChange = (openState: boolean) => {
    setDeleteDialogOpen(openState);
    if (!openState) {
      setPendingDeleteRoom(null);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      await toggleRoomActive(id);
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось изменить статус переговорной", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: number, status: MeetingRoomStatus) => {
    try {
      await setRoomStatus(id, status);
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить статус переговорной", variant: "destructive" });
    }
  };

  const toggleRoomExpand = (roomId: number) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  };

  const isFormValid = useMemo(() => {
    const next: typeof errors = {};
    if (!formState.name.trim()) next.name = "Введите название комнаты";
    if (!formState.floor || Number(formState.floor) < 1) next.floor = "Выберите этаж";
    if (!formState.capacity || Number(formState.capacity) < 1) next.capacity = "Укажите вместимость";
    if (!formState.photos.length) next.photos = "Добавьте минимум одно фото";
    setErrors((prev) => ({ ...prev, ...next }));
    return Object.keys(next).length === 0;
  }, [formState.name, formState.floor, formState.capacity, formState.photos]);

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast({ title: "Заполните обязательные поля", variant: "destructive" });
      return;
    }

    const payload = {
      name: formState.name.trim(),
      floor: Number(formState.floor),
      capacity: Number(formState.capacity),
      status: formState.status,
      isActive: formState.isActive,
      photos: formState.photos,
      description: formState.description.trim(),
    } satisfies Omit<MeetingRoom, "id">;

    try {
      if (isEditing && formState.id) {
        await updateRoom(formState.id, payload);
        toast({ title: "Переговорная обновлена" });
      } else {
        await addRoom(payload);
        toast({ title: "Переговорная добавлена" });
      }
      handleOpenChange(false);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: isEditing ? "Не удалось обновить переговорную" : "Не удалось добавить переговорную",
        variant: "destructive",
      });
    }
  };

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
          <Button className="gap-2" onClick={handleAddRoomClick}>
            <Plus className="h-4 w-4" />
            Добавить комнату
          </Button>
        </div>
      </div>

      {/* Форма создания/редактирования комнаты */}
      {open && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isEditing ? "Редактирование переговорной" : "Новая переговорная"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4 px-2">
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
                      {errors.name ? (
                        <p className="text-xs text-red-500">{errors.name}</p>
                      ) : null}
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
                        {errors.floor ? (
                          <p className="text-xs text-red-500">{errors.floor}</p>
                        ) : null}
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
                        {errors.capacity ? (
                          <p className="text-xs text-red-500">{errors.capacity}</p>
                        ) : null}
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

                  </div>
                </ScrollArea>
                <div className="flex flex-col gap-4 px-2">
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
                          Поддерживаются форматы JPG и PNG. Максимум {MAX_PHOTOS} фото, размер каждого ≤ 2MB.
                        </p>
                        {errors.photos ? (
                          <p className="text-xs text-red-500">{errors.photos}</p>
                        ) : null}
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
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
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
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Отмена
                </Button>
                <Button type="button" onClick={handleSubmit} className="gap-2" disabled={loading}>
                  <Save className="h-4 w-4" />
                  Сохранить
                </Button>
              </div>
            </CardContent>
          </Card>
      )}

      <div className="space-y-4">
        {rooms.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <h3 className="text-lg font-semibold">Комнаты не найдены</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Добавьте новую переговорную комнату.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rooms.map((room) => (
              <MeetingRoomCard
                key={room.id}
                room={room}
                highlightInactive
                isExpanded={expandedRooms.has(room.id)}
                onToggleExpand={() => toggleRoomExpand(room.id)}
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

