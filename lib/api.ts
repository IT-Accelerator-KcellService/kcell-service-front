import axios from 'axios';
import {useAuthStore} from "@/stores/useAuthStore";

const API_BASE_URL = 'https://workflow-back-zpk4.onrender.com/api';

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

// Обработка ответов - если получаем 401, очищаем токен и перенаправляем на логин (кроме гостевого демо)
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401 && !useAuthStore.getState().isGuest) {
            useAuthStore.getState().clearAuth();
            if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);



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

// Получить исполнителей по категории
export const getExecutorsByCategory = (categoryId: number) =>
    api.get(`/service-categories/${categoryId}/executors`);

// Получить исполнителей по специальности
export const getExecutorsBySpecialty = (specialty: string) =>
    api.get(`/service-categories/specialty/${encodeURIComponent(specialty)}/executors`);

// Назначить исполнителя к категории
export const assignExecutorToCategory = (categoryId: number, executorId: number) =>
    api.post(`/service-categories/${categoryId}/assign-executor`, { executorId });

// Сменить руководителя категории
export const changeCategoryHead = (categoryId: number, newHeadUserId: number) =>
    api.post(`/service-categories/${categoryId}/change-head`, { newHeadUserId });


// ==================== Offices ====================
export interface Office {
    id: number;
    name: string;
    city: string;
    address: string;
    lat?: number | null;
    lon?: number | null;
    photo?: string | null;
    working_hours_start?: string | null; // формат "HH:mm:ss"
    working_hours_end?: string | null; // формат "HH:mm:ss"
    auto_track_enabled?: boolean;
}

// Получить все офисы
export const getOffices = () => api.get<Office[]>('/offices');

// Обновить рабочие часы офиса
export const updateOfficeWorkingHours = (
    officeId: number,
    data: {
        working_hours_start: string; // формат "HH:mm:ss"
        working_hours_end: string; // формат "HH:mm:ss"
        auto_track_enabled: boolean;
    }
) => api.patch(`/offices/${officeId}/working-hours`, data);





// ==================== Users ====================

// Получить всех пользователей (для админа)
export const getUsers = (page = 1, limit = 1000) => 
    api.get(`/users?page=${page}&limit=${limit}`);

export const getAllUsers = () => 
    api.get('/users?page=1&limit=10000');

// Обновить пользователя
export const updateUser = (
    id: number,
    data: { email: string; password: string; full_name: string; office_id: number }
) => api.put(`/users/${id}`, data);

// Получить пользователей офиса (для админа офиса)
export const getOfficeUsers = (officeId: number) =>
    api.get(`/users/office/${officeId}`);

// Изменить пароль пользователя (только для админа офиса)
export const changeUserPassword = (userId: number, newPassword: string) =>
    api.patch(`/users/${userId}/change-password`, { new_password: newPassword });

// Отправить код верификации email
export const sendEmailVerificationCode = (email: string) =>
    api.post('/users/send-email-verification', { email });

// Верифицировать email по коду
export const verifyEmail = (code: string) =>
    api.post('/users/verify-email', { code });





// ==================== Executors ====================

// Получить всех исполнителей
export const getExecutors = () => api.get('/executors');

// Получить всех исполнителей для менеджера/админа
export const getAllExecutorsForAdmin = () => api.get('/executors/all');


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
        phone: string;
    };
    office?: {
        id: number;
        name: string;
    };
    executors?: {
        id: number;
        full_name: string;
        phone: string;
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
                    phone: string;
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
        phone: string;
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

// ==================== Meeting Rooms ====================

// Типы для переговорных комнат
export interface MeetingRoom {
    id: number;
    name: string;
    floor: number;
    capacity: number;
    room_type?: 'meeting' | 'cabinet'; // optional for backward compatibility
    photos: string[];
    status: 'available' | 'booked';
    isActive: boolean;
    description?: string | null;
    office_id?: number | null;
    office?: {
        id: number;
        name: string;
        city: string;
    };
    created_at?: string;
    updated_at?: string;
}

// Получить все переговорные комнаты
export const getMeetingRooms = (officeId?: number) => {
    const params = officeId ? `?office_id=${officeId}` : '';
    return api.get<MeetingRoom[]>(`/meeting-rooms${params}`);
};

// Получить переговорную комнату по ID
export const getMeetingRoomById = (id: number) =>
    api.get<MeetingRoom>(`/meeting-rooms/${id}`);

// Создать переговорную комнату
export const createMeetingRoom = (data: Omit<MeetingRoom, 'id' | 'created_at' | 'updated_at'>) =>
    api.post<MeetingRoom>('/meeting-rooms', data);

// Обновить переговорную комнату
export const updateMeetingRoom = (id: number, data: Partial<Omit<MeetingRoom, 'id' | 'created_at' | 'updated_at'>>) =>
    api.put<MeetingRoom>(`/meeting-rooms/${id}`, data);

// Удалить переговорную комнату
export const deleteMeetingRoom = (id: number) =>
    api.delete(`/meeting-rooms/${id}`);

// Переключить активность переговорной комнаты
export const toggleMeetingRoomActive = (id: number) =>
    api.patch<MeetingRoom>(`/meeting-rooms/${id}/toggle-active`);

// Обновить статус переговорной комнаты
export const updateMeetingRoomStatus = (id: number, status: 'available' | 'booked') =>
    api.patch<MeetingRoom>(`/meeting-rooms/${id}/status`, { status });

// Дублировать переговорную комнату
export const duplicateMeetingRoom = (id: number) =>
    api.post<MeetingRoom>(`/meeting-rooms/${id}/duplicate`);

// ==================== Meeting Room Bookings ====================

export interface MeetingRoomBooking {
    id: number;
    meeting_room_id: number;
    user_id?: number;
    client_id?: number;
    start_time: string | Date;
    end_time: string | Date;
    status?: string;
    company_name?: string | null;
    created_at?: string;
    updated_at?: string;
    tables_remaining?: number;
    meetingRoom?: {
        id: number;
        name: string;
        floor: number;
        capacity: number;
        office_id?: number | null;
        office?: {
            id: number;
            name: string;
            city: string;
            address: string;
        };
    };
    meeting_room?: {
        id: number;
        name: string;
        floor: number;
        capacity: number;
        office_id?: number | null;
        office?: {
            id: number;
            name: string;
            city: string;
            address: string;
        };
    };
    office?: {
        id: number;
        name: string;
        city: string;
        address: string;
    };
}

// Создать бронирование переговорной комнаты
export const createMeetingRoomBooking = (data: {
    meeting_room_id: number;
    booking_date: string;
    start_time: string;
    end_time: string;
    company_name?: string | null;
}) => api.post<MeetingRoomBooking>('/meeting-room-bookings', data);

// Получить бронирования переговорной комнаты
export const getMeetingRoomBookings = (meetingRoomId?: number) => {
    const params = meetingRoomId ? `?meeting_room_id=${meetingRoomId}` : '';
    return api.get<MeetingRoomBooking[]>(`/meeting-room-bookings${params}`);
};

// Получить мои бронирования
export const getMyBookings = () => 
    api.get<MeetingRoomBooking[]>('/meeting-room-bookings/my');

// Отменить бронирование
export const cancelMeetingRoomBooking = (id: number) =>
    api.delete(`/meeting-room-bookings/${id}`);

// Сканировать QR код бронирования (для исполнителя)
export const scanBookingQRCode = (bookingId: number) =>
    api.post<{ booking: MeetingRoomBooking; tables_remaining: number }>('/meeting-room-bookings/scan-qr', { bookingId });

// Получить публичную информацию о бронировании (без аутентификации)
export const getPublicBooking = (bookingId: number) => {
    const publicApi = axios.create({
        baseURL: API_BASE_URL,
        headers: {
            'Content-Type': 'application/json'
        }
    });
    return publicApi.get<MeetingRoomBooking>(`/meeting-room-bookings/${bookingId}/public`);
};

// Получить доступность комнаты на конкретную дату
export const getRoomDailyAvailability = (roomId: number, date: string, slotMinutes?: number) => {
    const params = new URLSearchParams({ date });
    if (slotMinutes) params.append('slot_minutes', slotMinutes.toString());
    return api.get<{
        room: MeetingRoom;
        bookings: MeetingRoomBooking[];
        slots: Array<{
            start_time: string;
            end_time: string;
            is_available: boolean;
            booking_id: number | null;
            booking_status: string | null;
        }>;
    }>(`/meeting-room-bookings/rooms/${roomId}/availability?${params.toString()}`);
};

// ==================== Meeting Room Statistics ====================

// Получить статистику переговорных комнат
export interface MeetingRoomStats {
    mostLoadedRooms: Array<{
        room_id: number;
        room_name: string;
        office_name: string;
        occupancy_percentage: number;
    }>;
    mostFreeRooms: Array<{
        room_id: number;
        room_name: string;
        office_name: string;
        occupancy_percentage: number;
    }>;
    peakHours: Array<{
        hour: number;
        booking_count: number;
    }>;
    averageBookingDuration: number; // в минутах
    totalBookingsThisMonth: number;
    cancellationsAndNoShows: number;
}

export const getMeetingRoomStats = () => 
    api.get<MeetingRoomStats>('/meeting-room-bookings/statistics');

// Получить дневной календарь загрузки комнат
export interface DailyCalendarData {
    date: string;
    rooms: Array<{
        room_id: number;
        room_name: string;
        office_name: string;
        slots: Array<{
            hour?: number;
            isBooked?: boolean;
            start_time?: string;
            end_time?: string;
            is_available?: boolean;
            booking_id?: number | null;
            booking_status?: string | null;
            booking_user?: {
                id: number;
                full_name: string;
                phone?: string;
            } | null;
            company_name?: string | null;
        }>;
    }>;
}

export const getMeetingRoomDailyCalendar = (date: string) =>
    api.get<DailyCalendarData>(`/meeting-room-bookings/calendar/daily?date=${date}`);

// Получить недельный календарь загрузки комнат
export interface WeeklyCalendarData {
    start_date: string;
    end_date: string;
    rooms: Array<{
        room_id: number;
        room_name: string;
        office_name: string;
        days: Array<{
            date: string;
            occupancy_percentage: number;
            bookings?: Array<{
                id: number;
                start_time: string;
                end_time: string;
                status: string;
                company_name?: string | null;
                user: {
                    id: number;
                    full_name: string;
                    phone?: string;
                } | null;
            }>;
        }>;
    }>;
}

export const getMeetingRoomWeeklyCalendar = (startDate: string, endDate: string) =>
    api.get<WeeklyCalendarData>(`/meeting-room-bookings/calendar/weekly?start_date=${startDate}&end_date=${endDate}`);

// ==================== Yandex Smart Home ====================
// Все запросы к Яндекс умному дому обрабатываются через бэкенд
// Бэкенд отправляет запросы на Яндекс и возвращает результат на фронтенд

// Получить информацию о токенах (без самих токенов)
export const getYandexTokens = () =>
    api.get('/yandex-smart-home/tokens');

// Удалить токены
export const deleteYandexTokens = () =>
    api.delete('/yandex-smart-home/tokens');

// Обновить токены через refresh_token
export const refreshYandexTokens = () =>
    api.post('/yandex-smart-home/tokens/refresh');

// ==================== Управление устройствами для комнат ====================

// Интерфейсы для устройств
export interface YandexDevice {
    id: string;
    name: string;
    aliases?: string[];
    type?: string;
    external_id?: string;
    skill_id?: string;
    household_id?: string;
    room?: string;
    groups?: string[];
    capabilities?: any[];
    properties?: any[];
}

export interface RoomDevice {
    id: number;
    meeting_room_id: number;
    device_id: string;
    device_name: string;
    device_type: string | null;
    created_at: string;
    updated_at: string;
    meetingRoom?: {
        id: number;
        name: string;
        office_id: number | null;
        office?: {
            id: number;
            name: string;
        };
    };
}

// Получить список устройств из Яндекс API
export const getYandexDevicesList = () =>
    api.get<{ success: boolean; devices: YandexDevice[] }>('/yandex-smart-home/devices/list');

// Создать связь устройства с комнатой
export const createRoomDevice = (data: {
    meeting_room_id: number;
    device_id: string;
    device_name: string;
    device_type?: string;
}) =>
    api.post<{ success: boolean; message: string; data: RoomDevice }>('/yandex-smart-home/room-devices', data);

// Получить все связи устройств с комнатами
export const getAllRoomDevices = () =>
    api.get<{ success: boolean; devices: RoomDevice[] }>('/yandex-smart-home/room-devices');

// Получить устройства для конкретной комнаты
export const getRoomDevices = (meeting_room_id: number) =>
    api.get<{ success: boolean; devices: RoomDevice[] }>(`/yandex-smart-home/room-devices/room/${meeting_room_id}`);

// Удалить связь устройства с комнатой
export const deleteRoomDevice = (id: number) =>
    api.delete<{ success: boolean; message: string }>(`/yandex-smart-home/room-devices/${id}`);

// ==================== Управление устройствами для клиентов ====================

// Получить устройства для забронированной комнаты (для клиента)
export const getRoomDevicesForClient = (meeting_room_id: number) =>
    api.get<{ success: boolean; devices: YandexDevice[] }>(`/yandex-smart-home/room-devices/room/${meeting_room_id}/client`);

// Управление устройством
export interface ControlDeviceRequest {
    device_id: string;
    action_type: string;
    action_state: {
        instance: string;
        value: any;
    };
}

export const controlDevice = (data: ControlDeviceRequest) =>
    api.post<{ success: boolean; message: string; data: any }>('/yandex-smart-home/devices/control', data);

// ==================== Управление подписками клиентов на комнаты ====================

export interface ClientRoomSubscription {
    id: number;
    client_id: number;
    meeting_room_id: number;
    created_at: string;
    updated_at: string;
    subscribedClient?: {
        id: number;
        full_name: string;
        phone: string;
    };
    // Для обратной совместимости
    client?: {
        id: number;
        full_name: string;
        phone: string;
    };
    meetingRoom?: {
        id: number;
        name: string;
        office_id: number | null;
        room_type?: 'meeting' | 'cabinet';
        office?: {
            id: number;
            name: string;
        };
    };
}

// Создать подписку клиента на комнату
export const createClientRoomSubscription = (data: {
    client_id: number;
    meeting_room_id: number;
}) =>
    api.post<{ success: boolean; message: string; data: ClientRoomSubscription }>('/client-room-subscriptions', data);

// Удалить подписку
export const deleteClientRoomSubscription = (id: number) =>
    api.delete<{ success: boolean; message: string }>(`/client-room-subscriptions/${id}`);

// Получить все подписки (для админа)
export const getAllClientRoomSubscriptions = () =>
    api.get<{ success: boolean; subscriptions: ClientRoomSubscription[] }>('/client-room-subscriptions');

// Получить подписки конкретного клиента
export const getClientRoomSubscriptions = (client_id: number) =>
    api.get<{ success: boolean; subscriptions: ClientRoomSubscription[] }>(`/client-room-subscriptions/client/${client_id}`);

// Получить подписки для конкретной комнаты
export const getRoomSubscriptions = (meeting_room_id: number) =>
    api.get<{ success: boolean; subscriptions: ClientRoomSubscription[] }>(`/client-room-subscriptions/room/${meeting_room_id}`);

// ==================== Поддержка (Support Chat) ====================

export interface SupportTicket {
    id: number;
    user_id: number;
    message?: string;
    status: 'open' | 'in_progress' | 'closed';
    created_at: string;
    updated_at?: string;
    assigned_admin_id?: number | null;
    client_name?: string;
    assigned_admin_name?: string;
    client?: { id: number; full_name: string };
}

export interface SupportMessage {
    id: number;
    ticket_id: number;
    sender: 'user' | 'admin';
    message: string;
    created_at: string;
}

// Создать заявку в поддержку
export const createSupportTicket = (message: string) =>
    api.post<{ ticket: SupportTicket }>('/support-tickets', { message });

// Получить мои заявки (клиент) или чаты клиентов (админ — только клиенты, без бота)
export const getMySupportTickets = () =>
    api.get<{ tickets: SupportTicket[] }>('/support-tickets');

export const getSupportTickets = getMySupportTickets;

// Получить сообщения чата поддержки
export const getSupportTicketMessages = (ticketId: number) =>
    api.get<{ messages: SupportMessage[] }>(`/support-tickets/${ticketId}/messages`);

// Отправить сообщение в чат поддержки
export const sendSupportMessage = (ticketId: number, message: string) =>
    api.post<{ message: SupportMessage }>(`/support-tickets/${ticketId}/messages`, { message });