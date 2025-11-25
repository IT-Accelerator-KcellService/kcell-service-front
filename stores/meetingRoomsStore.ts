import { create } from "zustand";
import {
  getMeetingRooms,
  createMeetingRoom,
  updateMeetingRoom,
  deleteMeetingRoom,
  toggleMeetingRoomActive,
  updateMeetingRoomStatus,
  duplicateMeetingRoom,
  type MeetingRoom as ApiMeetingRoom,
} from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";

export type MeetingRoomStatus = "available" | "booked";

export interface MeetingRoom {
  id: number;
  name: string;
  floor: number;
  capacity: number;
  photos: string[];
  status: MeetingRoomStatus;
  isActive: boolean;
  description?: string;
  office_id?: number | null;
}

interface MeetingRoomsState {
  rooms: MeetingRoom[];
  loading: boolean;
  error: string | null;
  fetchRooms: (officeId?: number) => Promise<void>;
  addRoom: (room: Omit<MeetingRoom, "id">) => Promise<void>;
  updateRoom: (id: number, room: Partial<Omit<MeetingRoom, "id">>) => Promise<void>;
  removeRoom: (id: number) => Promise<void>;
  toggleRoomActive: (id: number) => Promise<void>;
  setRoomStatus: (id: number, status: MeetingRoomStatus) => Promise<void>;
  duplicateRoom: (id: number) => Promise<void>;
}

const convertApiRoomToStoreRoom = (apiRoom: ApiMeetingRoom): MeetingRoom => ({
  id: apiRoom.id,
  name: apiRoom.name,
  floor: apiRoom.floor,
  capacity: apiRoom.capacity,
  photos: apiRoom.photos || [],
  status: apiRoom.status as MeetingRoomStatus,
  isActive: apiRoom.isActive,
  description: apiRoom.description || undefined,
  office_id: apiRoom.office_id || null,
});

export const useMeetingRoomsStore = create<MeetingRoomsState>((set, get) => ({
  rooms: [],
  loading: false,
  error: null,

  fetchRooms: async (officeId?: number) => {
    set({ loading: true, error: null });
    try {
      const response = await getMeetingRooms(officeId);
      const rooms = response.data.map(convertApiRoomToStoreRoom);
      set({ rooms, loading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Ошибка при загрузке переговорных комнат",
        loading: false,
      });
    }
  },

  addRoom: async (room) => {
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      const response = await createMeetingRoom({
        ...room,
        office_id: user?.office_id || null,
      });
      const newRoom = convertApiRoomToStoreRoom(response.data);
      set((state) => ({
        rooms: [...state.rooms, newRoom],
        loading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Ошибка при создании переговорной комнаты",
        loading: false,
      });
      throw error;
    }
  },

  updateRoom: async (id, room) => {
    set({ loading: true, error: null });
    try {
      const response = await updateMeetingRoom(id, room);
      const updatedRoom = convertApiRoomToStoreRoom(response.data);
      set((state) => ({
        rooms: state.rooms.map((existing) =>
          existing.id === id ? updatedRoom : existing
        ),
        loading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Ошибка при обновлении переговорной комнаты",
        loading: false,
      });
      throw error;
    }
  },

  removeRoom: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteMeetingRoom(id);
      set((state) => ({
        rooms: state.rooms.filter((room) => room.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Ошибка при удалении переговорной комнаты",
        loading: false,
      });
      throw error;
    }
  },

  toggleRoomActive: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await toggleMeetingRoomActive(id);
      const updatedRoom = convertApiRoomToStoreRoom(response.data);
      set((state) => ({
        rooms: state.rooms.map((room) =>
          room.id === id ? updatedRoom : room
        ),
        loading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Ошибка при изменении статуса переговорной комнаты",
        loading: false,
      });
      throw error;
    }
  },

  setRoomStatus: async (id, status) => {
    set({ loading: true, error: null });
    try {
      const response = await updateMeetingRoomStatus(id, status);
      const updatedRoom = convertApiRoomToStoreRoom(response.data);
      set((state) => ({
        rooms: state.rooms.map((room) =>
          room.id === id ? updatedRoom : room
        ),
        loading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Ошибка при обновлении статуса переговорной комнаты",
        loading: false,
      });
      throw error;
    }
  },

  duplicateRoom: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await duplicateMeetingRoom(id);
      const newRoom = convertApiRoomToStoreRoom(response.data);
      set((state) => ({
        rooms: [...state.rooms, newRoom],
        loading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || "Ошибка при дублировании переговорной комнаты",
        loading: false,
      });
      throw error;
    }
  },
}));

export const MEETING_ROOM_CAPACITIES = [2, 4, 6, 8, 10, 12] as const;
export const MEETING_ROOM_FLOORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

