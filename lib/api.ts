import axios from 'axios';
import {useAuthStore} from "@/stores/useAuthStore";

const API_BASE_URL = 'https://kcell-service.onrender.com/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

if (typeof window !== 'undefined') {
    api.interceptors.request.use(config => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    }, error => Promise.reject(error));
}

// Обработка ответов - если получаем 401, очищаем токен и перенаправляем на логин
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            // Очищаем store
            useAuthStore.getState().clearAuth();

            // Перенаправляем на страницу входа, если мы не уже на ней
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);


export const getUsers = () => api.get('/users');

export const getUserById = (id: string) => api.get(`/users/${id}`);

// Создать пользователя
export const createUser = (data: { email: string; password: string }) =>
    api.post('/users', data);

// Логин
export const login = (data: { email: string; password: string }) =>
    api.post('/auth/login', data);

// Выход
export const logout = () => api.post('/auth/logout');

// Обновить токен
export const refreshToken = () => api.post('/auth/refresh-token');

export default api;

// ==================== Service Categories ====================

// Получить все категории
export const getServiceCategories = () => api.get('/service-categories');

// Получить категорию по ID
export const getServiceCategoryById = (id: number) =>
    api.get(`/service-categories/${id}`);

// Создать новую категорию
export const createServiceCategory = (data: { name: string }) =>
    api.post('/service-categories', data);

// Обновить категорию
export const updateServiceCategory = (id: number, data: { name: string }) =>
    api.put(`/service-categories/${id}`, data);

// Удалить категорию
export const deleteServiceCategory = (id: number) =>
    api.delete(`/service-categories/${id}`);


// ==================== Offices ====================

// Получить все офисы
export const getOffices = () => api.get('/offices');

// Получить офис по ID
export const getOfficeById = (id: number) => api.get(`/offices/${id}`);

// Создать офис
export const createOffice = (data: { name: string; address: string; city: string }) =>
    api.post('/offices', data);

// Обновить офис
export const updateOffice = (id: number, data: { name: string; address: string; city: string }) =>
    api.put(`/offices/${id}`, data);

// Удалить офис
export const deleteOffice = (id: number) => api.delete(`/offices/${id}`);


// ==================== Users ====================

// Обновить пользователя
export const updateUser = (
    id: number,
    data: { email: string; password: string; full_name: string; office_id: number }
) => api.put(`/users/${id}`, data);

// Удалить пользователя
export const deleteUser = (id: number) => api.delete(`/users/${id}`);


// ==================== Chat Messages ====================



// Получить сообщения чата по requestId
export const getChatMessagesByRequestId = (requestId: number) =>
    api.get(`/chat-messages/request/${requestId}`);


// ==================== Executors ====================

// Получить всех исполнителей
export const getExecutors = () => api.get('/executors');

// ==================== Recurring Tasks ====================

// Типы для повторяющихся задач
// Интерфейс для повторяющихся задач с подзаявками
export interface RecurringTask {
    id: number;
    location: string;
    location_detail?: string;
    description?: string;
    request_type: 'recurring';
    recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    recurrence_interval: number;
    next_due_date: string;
    last_completed_date?: string;
    status: string;
    recurring_status: 'active' | 'paused' | 'completed';
    created_date: string;
    planned_date?: string;
    client?: {
        id: number;
        name: string;
        email: string;
    };
    office?: {
        id: number;
        name: string;
    };
    executors?: {
        id: number;
        full_name: string;
        email: string;
    }[];
    taskInstances?: TaskInstance[];
    // Подзаявки повторяющейся задачи
    requests?: Array<{
        id: number;
        title: string;
        description: string;
        status: string;
        category_id: number;
        is_long_term?: boolean;
        category?: {
            id: number;
            name: string;
        };
        requestExecutors?: Array<{
            id: number;
            request_id: number;
            executor_id: number;
            role: string;
            executor?: {
                id: number;
                user_id: number;
                department_id: number;
                specialty: string;
                user?: {
                    id: number;
                    full_name: string;
                    email: string;
                };
            };
        }>;
    }>;
    photos?: Array<{
        id: number;
        photo_url: string;
        type: 'before' | 'after';
    }>;
}

export interface TaskInstance {
    id: number;
    due_date: string;
    completed_date?: string;
    status: 'pending' | 'completed' | 'overdue' | 'skipped';
    notes?: string;
    taskCompletedByUser?: {
        id: number;
        name: string;
        email: string;
    };
    recurringTaskGroup?: {
        id: number;
        location: string;
        location_detail?: string;
        recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
        recurrence_interval: number;
    };
}

export interface TaskStats {
    total_instances: number;
    completed_instances: number;
    pending_instances: number;
    overdue_instances: number;
    completion_rate: number;
}

// Создать повторяющуюся задачу
export const createRecurringTask = (data: {
    location: string;
    location_detail?: string;
    recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
    recurrence_interval: number;
    start_date: string;
    request_type?: string;
}) => api.post<RecurringTask>('/recurring-tasks', data);

// Получить все повторяющиеся задачи
export const getRecurringTasks = (page = 1, pageSize = 10) =>
    api.get<{ tasks: RecurringTask[]; pagination: any }>(`/recurring-tasks?page=${page}&pageSize=${pageSize}`);

// Получить повторяющуюся задачу по ID
export const getRecurringTaskById = (id: number) =>
    api.get<RecurringTask>(`/recurring-tasks/${id}`);

// Обновить повторяющуюся задачу
export const updateRecurringTask = (id: number, data: Partial<RecurringTask>) =>
    api.put<RecurringTask>(`/recurring-tasks/${id}`, data);

// Удалить повторяющуюся задачу
export const deleteRecurringTask = (id: number) =>
    api.delete(`/recurring-tasks/${id}`);

// Приостановить/возобновить задачу
export const toggleRecurringTask = (id: number, action: 'pause' | 'resume') =>
    api.patch<RecurringTask>(`/recurring-tasks/${id}/toggle`, { action });

// Обновить статус повторяющейся задачи
export const updateRecurringTaskStatus = (id: number, recurringStatus: 'active' | 'paused' | 'completed') =>
    api.patch<RecurringTask>(`/recurring-tasks/${id}/status`, { recurring_status: recurringStatus });

// Назначить исполнителя для повторяющейся задачи
export const assignRecurringTaskExecutor = (id: number, executorId: number) =>
    api.patch<RecurringTask>(`/recurring-tasks/${id}/assign-executor`, { executor_id: executorId });

// Изменить исполнителя для повторяющейся задачи
export const changeRecurringTaskExecutor = (id: number, executorId: number) =>
    api.patch<RecurringTask>(`/recurring-tasks/${id}/change-executor`, { executor_id: executorId });

// Получить статистику задачи
export const getTaskStats = (id: number) =>
    api.get<TaskStats>(`/recurring-tasks/${id}/stats`);

// Получить экземпляры задачи
export const getTaskInstances = (requestGroupId: number, page = 1, pageSize = 10) =>
    api.get<{ instances: TaskInstance[]; pagination: any }>(`/recurring-tasks/${requestGroupId}/instances?page=${page}&pageSize=${pageSize}`);

// Отметить экземпляр как выполненный
export const completeTaskInstance = (instanceId: number, notes?: string) =>
    api.patch<TaskInstance>(`/recurring-tasks/instances/${instanceId}/complete`, { notes });

// Пропустить экземпляр
export const skipTaskInstance = (instanceId: number, notes?: string) =>
    api.patch<TaskInstance>(`/recurring-tasks/instances/${instanceId}/skip`, { notes });

// Получить предстоящие задачи
export const getUpcomingTasks = (limit = 10) =>
    api.get<{ data: TaskInstance[] }>(`/recurring-tasks/upcoming?limit=${limit}`);

// Получить календарь задач
export const getTaskCalendar = (startDate: string, endDate: string) =>
    api.get<{ data: TaskInstance[] }>(`/recurring-tasks/calendar?start_date=${startDate}&end_date=${endDate}`);

// Импорт повторяющихся задач через Excel
export const importRecurringTasksFromExcel = (formData: FormData) =>
    api.post('/recurring-tasks/import-excel', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });