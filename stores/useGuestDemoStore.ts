import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GuestBooking {
  id: number;
  meeting_room_id: number;
  start_time: string;
  end_time: string;
  status: string;
  company_name?: string | null;
  meeting_room?: { id: number; name: string };
}

interface GuestDemoState {
  guestBookings: GuestBooking[];
  addGuestBooking: (booking: Omit<GuestBooking, "id">) => number;
  removeGuestBooking: (id: number) => void;
  clearGuestBookings: () => void;
}

let nextGuestBookingId = -1;

export const useGuestDemoStore = create<GuestDemoState>()(
  persist(
    (set, get) => ({
      guestBookings: [],

      addGuestBooking: (booking) => {
        const id = nextGuestBookingId--;
        const newBooking: GuestBooking = { ...booking, id };
        set((state) => ({
          guestBookings: [...state.guestBookings, newBooking].sort(
            (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          ),
        }));
        return id;
      },

      removeGuestBooking: (id) =>
        set((state) => ({
          guestBookings: state.guestBookings.filter((b) => b.id !== id),
        })),

      clearGuestBookings: () => set({ guestBookings: [] }),
    }),
    { name: "guest-demo-bookings" }
  )
);
