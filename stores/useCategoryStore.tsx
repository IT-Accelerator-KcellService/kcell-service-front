import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Category {
  id: number;
  name: string;
}

interface CategoryState {
  categories: Category[];
  fetchCategories: (token: string) => Promise<void>;
  clearCategories: () => void;
    updateCategories: (
        updater: Category[] | ((prev: Category[]) => Category[])
    ) => void;
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set) => ({
      categories: [],

      fetchCategories: async (token) => {
        try {
          const res = await fetch("http://localhost:8080/api/service-categories", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
          });

          if (!res.ok) {
            throw new Error(`Ошибка при загрузке категорий: ${res.status}`);
          }

          const data = await res.json();

          // Предполагаем, что API возвращает массив { id, name }
          set({ categories: data });
        } catch (error) {
          console.error("Ошибка загрузки категорий:", error);
        }
      },

      clearCategories: async () => {
        set({ categories: [] });
      },

        updateCategories: (updater) =>
            set((state) => ({
                categories:
                    typeof updater === "function"
                        ? updater(state.categories)
                        : updater,
            })),
    }),
    {
      name: "categories-storage", // ключ для localStorage
    }
  )
);