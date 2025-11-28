"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Edit2, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useOfficeLocationsStore, OfficeLocation } from "@/stores/useOfficeLocationsStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSuccessModal } from "@/hooks/use-success-modal";

type ManagedLocationType = Extract<OfficeLocation["type"], 'block' | 'location' | 'room'>;

interface Office {
  id: number;
  name: string;
  address: string;
  city?: string;
}

interface OfficeLocationsManagerProps {
  offices: Office[];
}

export const OfficeLocationsManager: React.FC<OfficeLocationsManagerProps> = ({ offices }) => {
  const { token } = useAuthStore();
  const { locations, fetchLocations, createLocation, updateLocation, deleteLocation } = useOfficeLocationsStore();
  const successModal = useSuccessModal();

  const [selectedOfficeId, setSelectedOfficeId] = useState<number | null>(null);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationType, setNewLocationType] = useState<ManagedLocationType>('block');
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<number | null>(null);
  const [locationToEdit, setLocationToEdit] = useState<OfficeLocation | null>(null);
  const [editLocationName, setEditLocationName] = useState("");
  const [editLocationType, setEditLocationType] = useState<ManagedLocationType>('block');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<ManagedLocationType, boolean>>({
    block: false,
    location: false,
    room: false,
  });

  useEffect(() => {
    if (token) {
      fetchLocations(token, selectedOfficeId || undefined);
    }
  }, [token, selectedOfficeId]);

  const officeLocations = useMemo(
    () => (selectedOfficeId ? locations.filter(loc => loc.office_id === selectedOfficeId) : []),
    [locations, selectedOfficeId]
  );

  const blocks = useMemo(
    () => officeLocations.filter(loc => loc.type === 'block'),
    [officeLocations]
  );

  const availableLocations = useMemo(
    () => officeLocations.filter(loc => loc.type === 'location'),
    [officeLocations]
  );
  const getLocationsForBlock = (blockId: number): OfficeLocation[] =>
    availableLocations.filter(loc => loc.parent_id === blockId);

  const rooms = useMemo(
    () => officeLocations.filter(loc => loc.type === 'room'),
    [officeLocations]
  );

  const typeTitles: Record<ManagedLocationType, string> = {
    block: "Блоки",
    location: "Местонахождения",
    room: "Помещения",
  };

  const getParentDescription = (location: OfficeLocation): string => {
    const office = offices.find(o => o.id === location.office_id);
    if (location.type === 'block') {
      return office ? `Офис: ${office.name}` : "Без офиса";
    }
    const parent = locations.find(loc => loc.id === location.parent_id);
    if (!parent) return "Без родителя";
    if (location.type === 'location') {
      return `Блок: ${parent.name}`;
    }
    return parent.type === 'location'
      ? `Местонахождение: ${parent.name}`
      : `Блок: ${parent.name}`;
  };

  const renderManagedList = (type: ManagedLocationType, items: OfficeLocation[]) => {
    if (items.length === 0) {
      return (
        <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded p-2">
          Пока нет записей типа "{typeTitles[type]}".
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded border px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-gray-500">{getParentDescription(item)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  setLocationToEdit(item);
                  setEditLocationName(item.name);
                  setEditLocationType(item.type as ManagedLocationType);
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                onClick={() => setLocationToDelete(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const toggleSection = (type: ManagedLocationType) => {
    setCollapsedSections(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  useEffect(() => {
    setSelectedBlockId(null);
    setSelectedLocationId(null);
  }, [selectedOfficeId]);

  useEffect(() => {
    if (newLocationType === 'block') {
      setSelectedBlockId(null);
      setSelectedLocationId(null);
    }
    if (newLocationType === 'location') {
      setSelectedLocationId(null);
    }
  }, [newLocationType]);

  useEffect(() => {
    setSelectedLocationId(null);
  }, [selectedBlockId]);

  const handleCreateLocation = async () => {
    if (!selectedOfficeId) {
      setError("Чтобы создать локацию, выберите офис.");
      return;
    }
    if (!newLocationName.trim()) return;

    if (newLocationType === 'location' && !selectedBlockId) {
      setError("Чтобы создать местонахождение, выберите блок.");
      return;
    }

    if (newLocationType === 'room' && !selectedBlockId) {
      setError("Чтобы создать помещение, выберите блок.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      let parentId: number | null = null;
      if (newLocationType === 'location') {
        parentId = selectedBlockId!;
      } else if (newLocationType === 'room') {
        parentId = selectedLocationId ?? selectedBlockId!;
      }

      await createLocation(token!, {
        office_id: selectedOfficeId,
        parent_id: parentId,
        type: newLocationType,
        name: newLocationName.trim(),
        order: 0
      });

      successModal.showSuccess({
        title: "Локация создана",
        message: `Локация "${newLocationName}" успешно создана`
      });

      setNewLocationName("");
      setNewLocationType('block');
      setSelectedBlockId(null);
      setSelectedLocationId(null);
    } catch (error: any) {
      console.error("Ошибка при создании локации:", error);
      setError(error.message || "Ошибка при создании локации");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!locationToEdit || !editLocationName.trim()) return;

    setIsUpdating(true);
    setError(null);

    try {
      await updateLocation(token!, locationToEdit.id, {
        name: editLocationName.trim(),
        type: editLocationType
      });

      successModal.showSuccess({
        title: "Локация обновлена",
        message: `Локация успешно обновлена`
      });

      setLocationToEdit(null);
      setEditLocationName("");
    } catch (error: any) {
      console.error("Ошибка при обновлении локации:", error);
      setError(error.message || "Ошибка при обновлении локации");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteLocation = async () => {
    if (!locationToDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      await deleteLocation(token!, locationToDelete);

      successModal.showSuccess({
        title: "Локация удалена",
        message: "Локация успешно удалена"
      });

      setLocationToDelete(null);
    } catch (error: any) {
      console.error("Ошибка при удалении локации:", error);
      setError(error.message || "Ошибка при удалении локации");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-base sm:text-lg">Управление локациями офисов</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Выбор офиса */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Выберите офис</Label>
          <Select 
            value={selectedOfficeId?.toString() || ""} 
            onValueChange={(value) => setSelectedOfficeId(value ? parseInt(value) : null)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Все офисы" />
            </SelectTrigger>
            <SelectContent>
              {offices.map(office => (
                <SelectItem key={office.id} value={office.id.toString()}>
                  {office.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Создание новой локации */}
        <div className="space-y-2 border-t pt-4">
          <Label className="text-sm font-medium">Создать новую локацию</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Select 
              value={newLocationType} 
              onValueChange={(value) => setNewLocationType(value as ManagedLocationType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="block">Блок</SelectItem>
                <SelectItem value="location">Местонахождение</SelectItem>
                <SelectItem value="room">Помещение</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="text"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              placeholder="Название локации"
              disabled={isCreating}
            />
          </div>
          <div className="text-xs text-gray-500">
            {newLocationType === 'block' && "Для создания блока достаточно выбрать офис."}
            {newLocationType === 'location' && "Местонахождение создаётся внутри выбранного блока."}
            {newLocationType === 'room' && "Помещение создаётся внутри выбранного блока, местонахождение можно выбрать дополнительно."}
          </div>
          {!selectedOfficeId && (
            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
              Сначала выберите офис выше, чтобы продолжить.
            </div>
          )}
          {selectedOfficeId && newLocationType !== 'block' && (
            <Select 
              value={selectedBlockId?.toString() || ""} 
              onValueChange={(value) => setSelectedBlockId(value ? parseInt(value) : null)}
              disabled={isCreating}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите блок" />
              </SelectTrigger>
              <SelectContent>
                {blocks.map(block => (
                  <SelectItem key={block.id} value={block.id.toString()}>
                    {block.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedOfficeId && newLocationType !== 'block' && blocks.length === 0 && (
            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
              В выбранном офисе пока нет блоков. Создайте блок, чтобы продолжить.
            </div>
          )}
          {selectedOfficeId && newLocationType === 'room' && selectedBlockId && (
            <Select 
              value={selectedLocationId?.toString() || ""} 
              onValueChange={(value) => setSelectedLocationId(value ? parseInt(value) : null)}
              disabled={isCreating}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Местонахождение (необязательно)" />
              </SelectTrigger>
              <SelectContent>
                {getLocationsForBlock(selectedBlockId).map(location => (
                  <SelectItem key={location.id} value={location.id.toString()}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedOfficeId && newLocationType === 'room' && selectedBlockId && getLocationsForBlock(selectedBlockId).length === 0 && (
            <div className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded p-2">
              В выбранном блоке пока нет местонахождений. Можно создать помещение напрямую.
            </div>
          )}
          <Button
            onClick={handleCreateLocation}
            disabled={
              !selectedOfficeId ||
              !newLocationName.trim() ||
              isCreating ||
              (newLocationType === 'location' && !selectedBlockId) ||
              (newLocationType === 'room' && !selectedBlockId)
            }
            className="bg-green-600 hover:bg-green-700 text-white w-full"
          >
            {isCreating ? "Создание..." : "Создать локацию"}
          </Button>
        </div>

        {/* Список существующих локаций */}
        <div className="space-y-3 border-t pt-4">
          <Label className="text-sm font-medium">Существующие локации</Label>
          {!selectedOfficeId ? (
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded p-2">
              Выберите офис выше, чтобы увидеть связанные локации.
            </div>
          ) : (
            (['block', 'location', 'room'] as ManagedLocationType[]).map((type) => {
              const items =
                type === 'block' ? blocks : type === 'location' ? availableLocations : rooms;
              const isCollapsed = collapsedSections[type];
              const Icon = isCollapsed ? ChevronRight : ChevronDown;

              return (
                <div key={type} className="border rounded-lg">
                  <button
                    type="button"
                    onClick={() => toggleSection(type)}
                    className="flex w-full items-center justify-between px-3 py-2 hover:bg-gray-50"
                    aria-expanded={!isCollapsed}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">{typeTitles[type]}</span>
                      <span className="text-xs text-gray-500">({items.length})</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {isCollapsed ? "Развернуть" : "Свернуть"}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="px-3 pb-3 pt-1">
                      {renderManagedList(type, items)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Редактирование локации */}
        {locationToEdit && (
          <div className="space-y-2 border-t pt-4">
            <Label className="text-sm font-medium">Редактировать локацию</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select 
                value={editLocationType} 
                onValueChange={(value) => setEditLocationType(value as ManagedLocationType)}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="block">Блок</SelectItem>
                  <SelectItem value="location">Местонахождение</SelectItem>
                  <SelectItem value="room">Помещение</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="text"
                value={editLocationName}
                onChange={(e) => setEditLocationName(e.target.value)}
                placeholder="Название локации"
                disabled={isUpdating}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUpdateLocation}
                disabled={!editLocationName.trim() || isUpdating}
                className="flex-1"
              >
                {isUpdating ? "Обновление..." : "Сохранить"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setLocationToEdit(null);
                  setEditLocationName("");
                }}
                disabled={isUpdating}
              >
                Отмена
              </Button>
            </div>
          </div>
        )}

        {/* Удаление локации */}
        {locationToDelete && (
          <div className="space-y-2 border-t pt-4">
            <Label className="text-sm font-medium">Удалить локацию</Label>
            <p className="text-sm text-gray-600">
              Вы уверены, что хотите удалить эту локацию?
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDeleteLocation}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? "Удаление..." : "Удалить"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocationToDelete(null)}
                disabled={isDeleting}
              >
                Отмена
              </Button>
            </div>
          </div>
        )}

        {/* Ошибки */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-red-800 min-w-0 flex-1">{error}</p>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};


