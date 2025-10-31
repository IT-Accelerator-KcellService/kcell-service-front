import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ServiceSubcategory {
  id: number;
  name: string;
  category_id: number;
}

interface Category {
  id: number;
  name: string;
  subcategories?: ServiceSubcategory[];
}

interface CategoryState {
  categories: Category[];
  fetchCategories: (token: string) => Promise<void>;
  clearCategories: () => void;
  updateCategories: (
    updater: Category[] | ((prev: Category[]) => Category[])
  ) => void;
  // Методы для работы с подкатегориями
  createSubcategory: (token: string, subcategoryData: { name: string; category_id: number }) => Promise<void>;
  deleteSubcategory: (token: string, subcategoryId: number) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set) => ({
      categories: [],

      fetchCategories: async (token) => {
        try {
          const res = await fetch("https://workflow-back-zpk4.onrender.com/api/service-categories", {
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

      // Методы для работы с подкатегориями
      createSubcategory: async (token, subcategoryData) => {
        try {
          const res = await fetch("https://workflow-back-zpk4.onrender.com/api/service-categories/subcategories", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(subcategoryData)
          });

          if (!res.ok) {
            throw new Error(`Ошибка при создании подкатегории: ${res.status}`);
          }

          // Обновляем категории после создания подкатегории
          const categoriesRes = await fetch("https://workflow-back-zpk4.onrender.com/api/service-categories", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
          });

          if (categoriesRes.ok) {
            const categoriesData = await categoriesRes.json();
            set({ categories: categoriesData });
          }
        } catch (error) {
          console.error("Ошибка создания подкатегории:", error);
          throw error;
        }
      },

      deleteSubcategory: async (token, subcategoryId) => {
        try {
          const res = await fetch(`https://workflow-back-zpk4.onrender.com/api/service-categories/subcategories/${subcategoryId}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            }
          });

          if (!res.ok) {
            throw new Error(`Ошибка при удалении подкатегории: ${res.status}`);
          }

          // Обновляем категории после удаления подкатегории
          const categoriesRes = await fetch("https://workflow-back-zpk4.onrender.com/api/service-categories", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
          });

          if (categoriesRes.ok) {
            const categoriesData = await categoriesRes.json();
            set({ categories: categoriesData });
          }
        } catch (error) {
          console.error("Ошибка удаления подкатегории:", error);
          throw error;
        }
      },
    }),
    {
      name: "categories-storage", // ключ для localStorage
    }
  )
);