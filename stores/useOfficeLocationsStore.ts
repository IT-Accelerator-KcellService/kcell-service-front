import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface OfficeLocation {
  id: number;
  office_id: number;
  parent_id: number | null;
  type: 'address' | 'block' | 'location' | 'room';
  name: string;
  order: number;
  office?: {
    id: number;
    name: string;
    address: string;
    city?: string | null;
  };
  parent?: OfficeLocation | null;
  children?: OfficeLocation[];
}

interface OfficeLocationsState {
  locations: OfficeLocation[];
  fetchLocations: (token?: string, officeId?: number) => Promise<void>;
  clearLocations: () => void;
  createLocation: (token: string, locationData: Omit<OfficeLocation, 'id'>) => Promise<void>;
  updateLocation: (token: string, id: number, locationData: Partial<OfficeLocation>) => Promise<void>;
  deleteLocation: (token: string, id: number) => Promise<void>;
}

export const useOfficeLocationsStore = create<OfficeLocationsState>()(
  persist(
    (set) => ({
      locations: [],

      fetchLocations: async (token, officeId) => {
        try {
          const url = officeId 
            ? `https://kcell-service.onrender.com/api/office-locations?office_id=${officeId}`
            : "https://kcell-service.onrender.com/api/office-locations";
          
          const headers: HeadersInit = {
            "Content-Type": "application/json",
          };
          
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          const res = await fetch(url, {
            method: "GET",
            headers,
          });

          if (!res.ok) {
            throw new Error(`Ошибка при загрузке локаций: ${res.status}`);
          }

          const data = await res.json();
          set({ locations: data });
        } catch (error) {
          console.error("Ошибка загрузки локаций:", error);
          throw error;
        }
      },

      clearLocations: () => {
        set({ locations: [] });
      },

      createLocation: async (token, locationData) => {
        try {
          const res = await fetch("https://kcell-service.onrender.com/api/office-locations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(locationData)
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || `Ошибка при создании локации: ${res.status}`);
          }

          // Обновляем локации после создания
          const locationsRes = await fetch("https://kcell-service.onrender.com/api/office-locations", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
          });

          if (locationsRes.ok) {
            const locationsData = await locationsRes.json();
            set({ locations: locationsData });
          }
        } catch (error) {
          console.error("Ошибка создания локации:", error);
          throw error;
        }
      },

      updateLocation: async (token, id, locationData) => {
        try {
          const res = await fetch(`https://kcell-service.onrender.com/api/office-locations/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(locationData)
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || `Ошибка при обновлении локации: ${res.status}`);
          }

          // Обновляем локации после обновления
          const locationsRes = await fetch("https://kcell-service.onrender.com/api/office-locations", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
          });

          if (locationsRes.ok) {
            const locationsData = await locationsRes.json();
            set({ locations: locationsData });
          }
        } catch (error) {
          console.error("Ошибка обновления локации:", error);
          throw error;
        }
      },

      deleteLocation: async (token, id) => {
        try {
          const res = await fetch(`https://kcell-service.onrender.com/api/office-locations/${id}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            }
          });

          if (!res.ok) {
            const errorData = await res.json();
            console.error(errorData.error);
            throw new Error(errorData.error || `Ошибка при удалении локации: ${res.status}`);
          }

          // Обновляем локации после удаления
          const locationsRes = await fetch("https://kcell-service.onrender.com/api/office-locations", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
          });

          if (locationsRes.ok) {
            const locationsData = await locationsRes.json();
            set({ locations: locationsData });
          }
        } catch (error) {
          console.error("Ошибка удаления локации:", error);
          throw error;
        }
      },
    }),
    {
      name: "office-locations-storage",
    }
  )
);


