import { create } from "zustand";

export type MeetingRoomStatus = "available" | "booked";

export type MeetingRoomEquipment =
  | "tv"
  | "computer"
  | "board"
  | "camera"
  | "air-conditioner";

export interface MeetingRoom {
  id: string;
  name: string;
  floor: number;
  capacity: number;
  equipment: MeetingRoomEquipment[];
  photos: string[];
  status: MeetingRoomStatus;
  isActive: boolean;
  description?: string;
}

const initialRooms: MeetingRoom[] = [
  {
    id: "room-astana",
    name: "Переговорная Астана",
    floor: 3,
    capacity: 8,
    equipment: ["tv", "camera", "board"],
    photos: [
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80",
    ],
    status: "available",
    isActive: true,
    description: "Светлая комната, подходит для видеоконференций до 8 человек.",
  },
  {
    id: "room-issyk-kul",
    name: "Переговорная Иссык-Куль",
    floor: 2,
    capacity: 6,
    equipment: ["tv", "board"],
    photos: [
      "https://images.unsplash.com/photo-1507209696998-3c532be9b2b1?auto=format&fit=crop&w=800&q=80",
    ],
    status: "booked",
    isActive: true,
    description: "Комната для команд до 6 человек, оснащена TV и флипчартом.",
  },
  {
    id: "room-almaty",
    name: "Переговорная Алматы",
    floor: 4,
    capacity: 10,
    equipment: ["tv", "computer", "board", "air-conditioner"],
    photos: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    ],
    status: "available",
    isActive: true,
    description: "Большая переговорная с кондиционером и компьютером для презентаций.",
  },
  {
    id: "room-turkestan",
    name: "Переговорная Туркестан",
    floor: 1,
    capacity: 4,
    equipment: ["board"],
    photos: [
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=800&q=80",
    ],
    status: "available",
    isActive: false,
    description: "Компактная комната для быстрых встреч до 4 человек.",
  },
];

interface MeetingRoomsState {
  rooms: MeetingRoom[];
  addRoom: (room: Omit<MeetingRoom, "id">) => void;
  updateRoom: (id: string, room: Partial<Omit<MeetingRoom, "id">>) => void;
  removeRoom: (id: string) => void;
  toggleRoomActive: (id: string) => void;
  setRoomStatus: (id: string, status: MeetingRoomStatus) => void;
  duplicateRoom: (id: string) => void;
}

const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `room-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

export const useMeetingRoomsStore = create<MeetingRoomsState>((set) => ({
  rooms: initialRooms,
  addRoom: (room) =>
    set((state) => ({
      rooms: [
        ...state.rooms,
        {
          ...room,
          id: generateId(),
        },
      ],
    })),
  updateRoom: (id, room) =>
    set((state) => ({
      rooms: state.rooms.map((existing) =>
        existing.id === id ? { ...existing, ...room } : existing
      ),
    })),
  removeRoom: (id) =>
    set((state) => ({
      rooms: state.rooms.filter((room) => room.id !== id),
    })),
  toggleRoomActive: (id) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === id ? { ...room, isActive: !room.isActive } : room
      ),
    })),
  setRoomStatus: (id, status) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === id ? { ...room, status } : room
      ),
    })),
  duplicateRoom: (id) =>
    set((state) => {
      const target = state.rooms.find((room) => room.id === id);
      if (!target) {
        return state;
      }

      return {
        rooms: [
          ...state.rooms,
          {
            ...target,
            id: generateId(),
            name: `${target.name} (копия)`,
            status: "available",
            isActive: false,
          },
        ],
      };
    }),
}));

export const MEETING_ROOM_EQUIPMENT: Record<
  MeetingRoomEquipment,
  { label: string; shortLabel: string }
> = {
  tv: { label: "TV", shortLabel: "TV" },
  computer: { label: "Компьютер", shortLabel: "ПК" },
  board: { label: "Доска", shortLabel: "Доска" },
  camera: { label: "Камера", shortLabel: "Камера" },
  "air-conditioner": { label: "Кондиционер", shortLabel: "AC" },
};

export const MEETING_ROOM_CAPACITIES = [2, 4, 6, 8, 10, 12] as const;
export const MEETING_ROOM_FLOORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

