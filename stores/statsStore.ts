import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

// === Интерфейсы (скопируй из твоего компонента) ===
export interface ClientStats {
    totalRequests: number;
    activeRequests: number;
    doneRequests: number;
    averageRating: string;
}

export interface AdminWorkerStats {
    totalRequests: number;
    statusCounts: {
        new: number;
        inWork: number;
        completed: number;
        overdue: number;
    };
    requestTypeSummary: {
        urgent: number;
        planned: number;
        normal: number;
    };
}

export interface DepHeadStats {
    totalRequests: number;
    statusCounts: {
        new: number;
        inWork: number;
        completed: number;
        overdue: number;
    };
    requestTypeSummary: {
        urgent: number;
        planned: number;
        normal: number;
    };
}

export interface ExecutorStats {
    totalRequests: number;
    urgent: number;
    inWork: number;
    completed: number;
    onTime: number;
    late: number;
    averageExecutionHours: string;
    averageRating: string;
}

export interface ManagerStats {
    officeId: number;
    data: {
        [date: string]: {
            totalRequests: number;
            completedRequests: number;
            overdueUrgentRequests: number;
            normalRequests: number;
            urgentRequests: number;
            plannedRequests: number;
        };
    };
}

// === Типы для Zustand хранилища ===
export type StatsState = {
    clientStats: ClientStats | null;
    adminWorkerStats: AdminWorkerStats | null;
    depHeadStats: DepHeadStats | null;
    executorStats: ExecutorStats | null;
    managerStats: ManagerStats[] | null;
    myRating: number | null;

    // Временные метки последнего обновления (для кэширования)
    lastUpdated: number | null;

    // Загрузка и ошибки
    loading: boolean;
    error: string | null;
};

type StatsActions = {
    fetchStats: (role: string) => Promise<void>;
    resetStats: () => void;
    clearCache: () => void;
};

// === Zustand Store с persist ===
export const useStatsStore = create<StatsState & StatsActions>()(
    persist(
        (set, get) => ({
            // Начальное состояние
            clientStats: null,
            adminWorkerStats: null,
            depHeadStats: null,
            executorStats: null,
            managerStats: null,
            myRating: null,
            lastUpdated: null,
            loading: false,
            error: null,

            // === Основной метод загрузки ===
            fetchStats: async (role: string) => {
                if (get().loading) return; // Защита от дублирования запроса

                set({ loading: true, error: null });

                try {
                    const response = await api.get(`/analytics/stats/${role}`);
                    let data = response.data;

                    // Для исполнителя — отдельно получаем рейтинг
                    let myRating = null;
                    if (role === "executor") {
                        const ratingRes = await api.get("/executors/average-rating");
                        myRating = ratingRes.data.average_rating;
                    }

                    // Обновляем состояние в зависимости от роли
                    switch (role) {
                        case "client":
                            set({ clientStats: data });
                            break;
                        case "admin-worker":
                            set({ adminWorkerStats: data });
                            break;
                        case "department-head":
                            set({ depHeadStats: data });
                            break;
                        case "executor":
                            set({ executorStats: data, myRating });
                            break;
                        case "manager":
                            set({ managerStats: data });
                            break;
                        default:
                            console.warn(`Unknown role: ${role}`);
                    }

                    // Обновляем время последнего обновления
                    set({ lastUpdated: Date.now() });
                } catch (err: any) {
                    const errorMsg = err.response?.data?.message || err.message || "Ошибка загрузки статистики";
                    set({ error: errorMsg });
                    console.error("Zustand fetchStats error:", errorMsg);
                } finally {
                    set({ loading: false });
                }
            },

            // Полный сброс (например, при logout)
            resetStats: () => {
                set({
                    clientStats: null,
                    adminWorkerStats: null,
                    depHeadStats: null,
                    executorStats: null,
                    managerStats: null,
                    myRating: null,
                    lastUpdated: null,
                    loading: false,
                    error: null,
                });
            },

            // Можно вызвать, если нужно принудительно обновить
            clearCache: () => {
                set({ lastUpdated: null });
            },
        }),
        {
            name: "kcell-stats-storage", // ключ в localStorage
            version: 1,
            partialize: (state) => ({
                // Сохраняем только данные, а не loading/error
                clientStats: state.clientStats,
                adminWorkerStats: state.adminWorkerStats,
                depHeadStats: state.depHeadStats,
                executorStats: state.executorStats,
                managerStats: state.managerStats,
                myRating: state.myRating,
                lastUpdated: state.lastUpdated,
            }),
        }
    )
);