import axios from 'axios';

const API_BASE_URL = 'https://kcell-service.onrender.com/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});


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