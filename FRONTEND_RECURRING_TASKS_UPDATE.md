# Обновления фронтенда для повторяющихся задач

## Обзор

Фронтенд обновлен для соответствия новой логике повторяющихся задач.

## Основные изменения

### 1. Обновленные типы данных

**API типы (`lib/api.ts`):**
```typescript
// Обновленные статусы
recurring_status: 'active' | 'paused' | 'completed';

// Добавлена информация об исполнителях
executors?: {
    id: number;
    full_name: string;
    email: string;
}[];
```

### 2. Новые API методы

```typescript
// Назначение исполнителя
export const assignRecurringTaskExecutor = (id: number, executorId: number) =>
    api.patch<RecurringTask>(`/recurring-tasks/${id}/assign-executor`, { executor_id: executorId });

// Изменение исполнителя
export const changeRecurringTaskExecutor = (id: number, executorId: number) =>
    api.patch<RecurringTask>(`/recurring-tasks/${id}/change-executor`, { executor_id: executorId });
```

### 3. Новые компоненты

#### AssignExecutorModal
- Модальное окно для назначения/изменения исполнителей
- Доступно только для руководителей (department-head)
- Фильтрация пользователей по роли "executor"

#### RecurringTaskCard
- Карточка для отображения повторяющихся задач как обычных заявок
- Используется для исполнителей
- Показывает флаг "Повторяющаяся"
- Кнопки "Начать выполнение" и "Завершить"

### 4. Обновленные компоненты

#### RecurringTasksList
- Обновлены статусы: `active`, `paused`, `completed`
- Добавлены кнопки назначения исполнителей
- Условное отображение кнопок по статусу задачи
- Интеграция с AssignExecutorModal

#### CreateRecurringTaskModal
- Без изменений (уже соответствовал новой логике)

## Логика отображения

### Для руководителей (Department Head)
- Полный доступ к управлению повторяющимися задачами
- Кнопки назначения/изменения исполнителей
- Просмотр истории выполнения
- Приостановка/возобновление задач

### Для исполнителей (Executor)
- Повторяющиеся задачи отображаются как обычные заявки
- Флаг "Повторяющаяся" для идентификации
- Обычный процесс выполнения
- Автоматическое создание нового экземпляра после завершения

### Для админов (Admin)
- Создание и удаление задач
- Просмотр всех задач
- Отсутствие возможности назначения исполнителей

## Условное отображение кнопок

### Кнопка "Назначить исполнителя"
```typescript
{task.recurring_status === 'active' && task.status === 'awaiting_assignment' && (
  <Button onClick={() => handleAssignExecutor(task, 'assign')}>
    <UserPlus className="h-4 w-4 mr-1" />
    Назначить исполнителя
  </Button>
)}
```

### Кнопка "Изменить исполнителя"
```typescript
{task.recurring_status === 'active' && task.status === 'assigned' && task.executors && task.executors.length > 0 && (
  <Button onClick={() => handleAssignExecutor(task, 'change')}>
    <UserCog className="h-4 w-4 mr-1" />
    Изменить исполнителя
  </Button>
)}
```

### Кнопки приостановки/возобновления
```typescript
{task.recurring_status === 'active' ? (
  <Button onClick={() => handleToggleTask(task.id, 'pause')}>
    <Pause className="h-4 w-4 mr-1" />
    Приостановить
  </Button>
) : (
  <Button onClick={() => handleToggleTask(task.id, 'resume')}>
    <Play className="h-4 w-4 mr-1" />
    Возобновить
  </Button>
)}
```

## Интеграция с существующими страницами

### Страница исполнителя
- Повторяющиеся задачи отображаются в общем списке заявок
- Используется компонент `RecurringTaskCard`
- Обычный процесс выполнения

### Страница руководителя
- Отдельная вкладка "Повторяющиеся задачи"
- Используется компонент `RecurringTasksList`
- Полное управление задачами

### Страница админа
- Отдельная вкладка "Повторяющиеся задачи"
- Используется компонент `RecurringTasksList`
- Ограниченные права (без назначения исполнителей)

## Стилизация

### Флаг "Повторяющаяся"
```typescript
<Badge className="ml-2 bg-blue-100 text-blue-800">
  <Repeat className="h-3 w-3 mr-1" />
  Повторяющаяся
</Badge>
```

### Карточка повторяющейся задачи
```typescript
<Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
```

### Статусы
- `active` - зеленый бейдж
- `paused` - желтый бейдж
- `completed` - серый бейдж

## Обработка ошибок

### API ошибки
- Toast уведомления для всех операций
- Проверка прав доступа
- Валидация данных

### Состояния загрузки
- Loading состояния для всех асинхронных операций
- Блокировка кнопок во время выполнения
- Индикаторы прогресса

## Тестирование

### Ручное тестирование
1. Создание повторяющейся задачи (админ/руководитель)
2. Назначение исполнителя (руководитель)
3. Выполнение задачи (исполнитель)
4. Проверка автоматического создания нового экземпляра
5. Просмотр истории выполнения

### Автоматическое тестирование
- Проверка прав доступа
- Валидация форм
- Обработка ошибок API
- Состояния загрузки
