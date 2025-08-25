'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, MapPin, Repeat, User } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { RecurringTask } from '@/lib/api';

interface RecurringTaskCardProps {
  task: RecurringTask;
  onViewDetails: (task: RecurringTask) => void;
  onStartTask?: (task: RecurringTask) => void;
  onCompleteTask?: (task: RecurringTask) => void;
}

export const RecurringTaskCard: React.FC<RecurringTaskCardProps> = ({
  task,
  onViewDetails,
  onStartTask,
  onCompleteTask
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'awaiting_assignment':
        return <Badge className="bg-orange-100 text-orange-800">Ожидает назначения</Badge>;
      case 'assigned':
        return <Badge className="bg-blue-100 text-blue-800">Назначена</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-100 text-green-800">В работе</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Завершена</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-base sm:text-lg break-words flex-1">
            {task.location}
            <Badge className="ml-2 bg-blue-100 text-blue-800">
              <Repeat className="h-3 w-3 mr-1" />
              Повторяющаяся
            </Badge>
          </CardTitle>
          <div className="flex-shrink-0">
            {getStatusBadge(task.status)}
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
            <MapPin className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="break-words">
              {task.taskInstances.filter(i => i.status === 'completed').length} из {task.taskInstances.length} выполнено
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(task)}
            className="w-full"
          >
            Подробности
          </Button>

          {task.status === 'assigned' && onStartTask && (
            <Button
              size="sm"
              onClick={() => onStartTask(task)}
              className="w-full"
            >
              Начать выполнение
            </Button>
          )}

          {task.status === 'in_progress' && onCompleteTask && (
            <Button
              size="sm"
              onClick={() => onCompleteTask(task)}
              className="w-full"
            >
              Завершить
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
