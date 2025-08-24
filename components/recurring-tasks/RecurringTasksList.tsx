'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Clock, Calendar, User, CheckCircle, Pause, Play, History } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getRecurringTasks, toggleRecurringTask, RecurringTask } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { TaskInstancesList } from './TaskInstancesList';

export const RecurringTasksList: React.FC = () => {
  const [tasks, setTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInstances, setShowInstances] = useState(false);
  const [selectedTask, setSelectedTask] = useState<RecurringTask | null>(null);
  const { toast } = useToast();

  const fetchTasks = async () => {
    try {
      const response = await getRecurringTasks();
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить повторяющиеся задачи',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggleTask = async (taskId: number, action: 'pause' | 'resume') => {
    try {
      await toggleRecurringTask(taskId, action);
      toast({
        title: 'Успешно',
        description: `Задача ${action === 'pause' ? 'приостановлена' : 'возобновлена'}`,
      });
      fetchTasks();
    } catch (error) {
      console.error('Ошибка переключения статуса:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус задачи',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (task: RecurringTask) => {
    // Используем recurring_status для отображения
    switch (task.recurring_status) {
      case 'pending_assignment':
        return <Badge className="bg-orange-100 text-orange-800">Ожидает назначения</Badge>;
      case 'assigned':
        return <Badge className="bg-blue-100 text-blue-800">Назначена</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-100 text-green-800">В работе</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Завершена</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800">Приостановлена</Badge>;
      default:
        return <Badge variant="secondary">{task.recurring_status}</Badge>;
    }
  };

  const getRecurrenceText = (type: string, interval: number) => {
    switch (type) {
      case 'daily':
        return interval === 1 ? 'Ежедневно' : `Каждые ${interval} дней`;
      case 'weekly':
        return interval === 1 ? 'Еженедельно' : `Каждые ${interval} недель`;
      case 'monthly':
        return interval === 1 ? 'Ежемесячно' : `Каждые ${interval} месяцев`;
      case 'yearly':
        return interval === 1 ? 'Ежегодно' : `Каждые ${interval} лет`;
      default:
        return `${type} каждые ${interval}`;
    }
  };

  const getNextDueDate = (task: RecurringTask) => {
    if (!task.next_due_date) return 'Не установлена';
    return format(new Date(task.next_due_date), 'dd.MM.yyyy', { locale: ru });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Загрузка задач...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2 text-lg">Повторяющихся задач пока нет</p>
              <p className="text-sm text-muted-foreground">Создавайте повторяющиеся задачи через форму создания заявок</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base sm:text-lg break-words flex-1">{task.location}</CardTitle>
                  <div className="flex-shrink-0">
                    {getStatusBadge(task)}
                  </div>
                </div>
                {task.location_detail && (
                  <p className="text-sm text-muted-foreground break-words">{task.location_detail}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="break-words">{getRecurrenceText(task.recurrence_type, task.recurrence_interval)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="break-words">Следующая дата: {getNextDueDate(task)}</span>
                </div>

                {task.client && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="break-words">{task.client.name}</span>
                  </div>
                )}

                {task.taskInstances && task.taskInstances.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="break-words">
                      {task.taskInstances.filter(i => i.status === 'completed').length} из {task.taskInstances.length} выполнено
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTask(task);
                      setShowInstances(true);
                    }}
                    className="w-full"
                  >
                    История
                  </Button>

                  {task.status === 'recurring_active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleTask(task.id, 'pause')}
                      className="w-full"
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Приостановить
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleTask(task.id, 'resume')}
                      className="w-full"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Возобновить
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Модальное окно с историей экземпляров */}
      <Dialog open={showInstances} onOpenChange={setShowInstances}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              История выполнения: {selectedTask?.location}
            </DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <TaskInstancesList taskId={selectedTask.id} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
