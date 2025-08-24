'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { format, isToday, isTomorrow, addDays, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getUpcomingTasks, TaskInstance } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export const UpcomingTasksWidget: React.FC = () => {
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUpcomingTasks = async () => {
    try {
      const response = await getUpcomingTasks(5);
      setTasks(response.data || []);
    } catch (error) {
      console.error('Ошибка загрузки предстоящих задач:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить предстоящие задачи',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcomingTasks();
  }, []);

  const getPriorityIcon = (dueDate: string) => {
    const date = new Date(dueDate);
    const daysUntil = differenceInDays(date, new Date());
    
    if (isToday(date)) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    } else if (isTomorrow(date) || daysUntil <= 2) {
      return <Clock className="h-4 w-4 text-orange-500" />;
    } else {
      return <Calendar className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (dueDate: string) => {
    const date = new Date(dueDate);
    const daysUntil = differenceInDays(date, new Date());
    
    if (isToday(date)) {
      return 'text-red-600 font-semibold';
    } else if (isTomorrow(date) || daysUntil <= 2) {
      return 'text-orange-600';
    } else {
      return 'text-gray-600';
    }
  };

  const getDateText = (dueDate: string) => {
    const date = new Date(dueDate);
    
    if (isToday(date)) {
      return 'Сегодня';
    } else if (isTomorrow(date)) {
      return 'Завтра';
    } else {
      const daysUntil = differenceInDays(date, new Date());
      if (daysUntil <= 7) {
        return format(date, 'EEEE, dd MMMM', { locale: ru });
      } else {
        return format(date, 'dd MMMM yyyy', { locale: ru });
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Предстоящие задачи</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Предстоящие задачи</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-4">
            <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Предстоящих задач нет</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getPriorityIcon(task.due_date)}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="font-medium truncate">
                        {task.recurringTaskGroup?.location}
                      </span>
                      {task.recurringTaskGroup?.location_detail && (
                        <span className="text-sm text-muted-foreground truncate">
                          ({task.recurringTaskGroup.location_detail})
                        </span>
                      )}
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
};
