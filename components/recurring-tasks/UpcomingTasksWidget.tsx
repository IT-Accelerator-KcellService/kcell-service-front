'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getUpcomingTasks, TaskInstance } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface UpcomingTasksWidgetProps {
  refreshTrigger?: number;
  variant?: 'default' | 'themed';
}

export function UpcomingTasksWidget({ refreshTrigger = 0, variant = 'default' }: UpcomingTasksWidgetProps) {
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUpcomingTasks = async () => {
    try {
      const response = await getUpcomingTasks(5); // Получаем 5 ближайших задач
      setTasks(response.data);
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить предстоящие задачи",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingTasks();
  }, [refreshTrigger]);

  const getDateText = (date: string) => {
    const taskDate = new Date(date);
    
    if (isToday(taskDate)) {
      return 'Сегодня';
    } else if (isTomorrow(taskDate)) {
      return 'Завтра';
    } else if (isYesterday(taskDate)) {
      return 'Вчера';
    } else {
      return format(taskDate, 'dd.MM.yyyy', { locale: ru });
    }
  };

  const getPriorityColor = (date: string) => {
    const taskDate = new Date(date);
    const today = new Date();
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'text-red-600'; // Просрочено
    } else if (diffDays === 0) {
      return 'text-orange-600'; // Сегодня
    } else if (diffDays === 1) {
      return 'text-yellow-600'; // Завтра
    } else {
      return 'text-gray-600'; // Обычная
    }
  };

  const getPriorityIcon = (date: string) => {
    const taskDate = new Date(date);
    const today = new Date();
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    } else if (diffDays <= 1) {
      return <Clock className="h-4 w-4 text-orange-500" />;
    } else {
      return <Calendar className="h-4 w-4 text-blue-500" />;
    }
  };

  const getCleanLocation = (location: string) => {
    // Убираем координаты из локации, оставляем только описание места
    if (location.includes('Широта:') && location.includes('Долгота:')) {
      // Ищем текст до координат
      const beforeCoords = location.split('Широта:')[0].trim();
      return beforeCoords || 'Локация не указана';
    }
    return location;
  };

  const themed = variant === 'themed';

  if (loading) {
    return themed ? (
      <div className="rounded-2xl overflow-hidden p-6" style={{ background: '#D94F15' }}>
        <h3 className="flex items-center gap-2 font-bold mb-4 text-white">
          <Calendar className="h-5 w-5" />
          Предстоящие задачи
        </h3>
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-white/80">
            <div className="w-4 h-4 border-2 border-[#E25B21] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Загрузка...</span>
          </div>
        </div>
      </div>
    ) : (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Предстоящие задачи
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-[#114A65] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Загрузка...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (themed) {
    return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#D94F15' }}>
      <div className="p-6 text-white">
        <h3 className="flex items-center gap-2 font-bold mb-4">
          <Calendar className="h-5 w-5" />
          Предстоящие задачи
          {tasks.length > 0 && (
            <Badge variant="secondary" className="ml-auto bg-white/20 text-white">
              {tasks.length}
            </Badge>
          )}
        </h3>
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-white/40" />
            <p className="text-white/80">Предстоящих задач нет</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg transition-colors bg-white/10 hover:bg-white/20"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getPriorityIcon(task.due_date)}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-medium truncate text-white">
                        {task.recurringTaskGroup?.recurrence_type === 'weekly' && 'Еженедельная задача'}
                        {task.recurringTaskGroup?.recurrence_type === 'daily' && 'Ежедневная задача'}
                        {task.recurringTaskGroup?.recurrence_type === 'monthly' && 'Ежемесячная задача'}
                        {task.recurringTaskGroup?.recurrence_type === 'yearly' && 'Ежегодная задача'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3 w-3 text-white/70" />
                      <span className="text-white/80">
                        {getDateText(task.due_date)}
                      </span>
                    </div>
                  </div>
                </div>
                                 <div className="flex items-center gap-2">
                   <Badge variant="outline" className="text-xs hidden sm:inline-flex border-white/30 text-white">
                     {task.recurringTaskGroup?.recurrence_type === 'weekly' && 'Еженедельно'}
                     {task.recurringTaskGroup?.recurrence_type === 'daily' && 'Ежедневно'}
                     {task.recurringTaskGroup?.recurrence_type === 'monthly' && 'Ежемесячно'}
                     {task.recurringTaskGroup?.recurrence_type === 'yearly' && 'Ежегодно'}
                   </Badge>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Предстоящие задачи
          {tasks.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {tasks.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">Предстоящих задач нет</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getPriorityIcon(task.due_date)}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-medium truncate">
                        {task.recurringTaskGroup?.recurrence_type === 'weekly' && 'Еженедельная задача'}
                        {task.recurringTaskGroup?.recurrence_type === 'daily' && 'Ежедневная задача'}
                        {task.recurringTaskGroup?.recurrence_type === 'monthly' && 'Ежемесячная задача'}
                        {task.recurringTaskGroup?.recurrence_type === 'yearly' && 'Ежегодная задача'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className={getPriorityColor(task.due_date)}>
                        {getDateText(task.due_date)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                    {task.recurringTaskGroup?.recurrence_type === 'weekly' && 'Еженедельно'}
                    {task.recurringTaskGroup?.recurrence_type === 'daily' && 'Ежедневно'}
                    {task.recurringTaskGroup?.recurrence_type === 'monthly' && 'Ежемесячно'}
                    {task.recurringTaskGroup?.recurrence_type === 'yearly' && 'Ежегодно'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
