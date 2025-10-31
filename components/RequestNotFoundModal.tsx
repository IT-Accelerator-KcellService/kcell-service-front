'use client'

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowDown, RefreshCw } from "lucide-react";

interface RequestNotFoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
}

export function RequestNotFoundModal({ isOpen, onClose, requestId }: RequestNotFoundModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <DialogTitle className="text-lg font-semibold text-gray-900">
              Заявка не найдена
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 leading-relaxed">
            Заявка <span className="font-semibold text-blue-600">№ {requestId}</span> не отображается в текущем списке.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <ArrowDown className="w-3 h-3 text-blue-600" />
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-900">Как найти заявку:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Прокрутите список заявок вниз</li>
                  <li>Нажмите кнопку "Загрузить еще" внизу страницы</li>
                  <li>Заявка может появиться в следующих страницах</li>
                </ol>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <RefreshCw className="w-3 h-3 text-gray-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Альтернативный способ:</h4>
                <p className="text-sm text-gray-600">
                  Обновите страницу, чтобы загрузить все заявки заново
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="px-6"
          >
            Понятно
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
