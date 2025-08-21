import React from "react";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Hourglass,
} from "lucide-react";

interface IconInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  iconInfo: {
    type: 'status' | 'longTerm';
    value: string;
  } | null;
  isDesktop: boolean;
}

export const IconInfoModal: React.FC<IconInfoModalProps> = ({
  isOpen,
  onClose,
  iconInfo,
  isDesktop,
}) => {
  if (!isOpen || !iconInfo || isDesktop) return null;

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <CheckCircle className="w-3 h-3" />
      case "in_progress":
      case "execution":
        return <Loader2 className="w-3 h-3" />
      case "awaiting_assignment":
      case "awaiting_sla":
        return <Clock className="w-3 h-3" />
      case "assigned":
        return <Clock className="w-3 h-3" />
      case "rejected":
        return <XCircle className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          {iconInfo.type === 'status' ? (
            <div className="p-2 bg-gray-100 rounded-lg">
              {getStatusIcon(iconInfo.value === 'Ожидание' ? 'pending' :
                             iconInfo.value === 'В работе' ? 'in_progress' :
                             iconInfo.value === 'Завершено' ? 'completed' :
                             iconInfo.value === 'Отклонено' ? 'rejected' : 'pending')}
            </div>
          ) : (
            <div className="p-2 bg-blue-100 rounded-lg">
              <Hourglass className="w-5 h-5 text-blue-600" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-lg text-gray-900">
              {iconInfo.type === 'status' ? 'Статус заявки' : 'Тип задачи'}
            </h3>
            <p className="text-gray-600">{iconInfo.value}</p>
          </div>
        </div>

        <div className="space-y-3">
          {iconInfo.type === 'status' && (
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Все статусы:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>Ожидание - заявка ожидает обработки</span>
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-500" />
                  <span>В работе - заявка выполняется</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Завершено - работа выполнена</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span>Отклонено - заявка отклонена</span>
                </div>
              </div>
            </div>
          )}

          {iconInfo.type === 'longTerm' && (
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Долгосрочная задача:</p>
              <p>Задача, требующая длительного времени выполнения.</p>
            </div>
          )}
        </div>

        <Button
          className="w-full mt-6"
          onClick={onClose}
        >
          Понятно
        </Button>
      </div>
    </div>
  );
};
