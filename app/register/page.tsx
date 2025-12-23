'use client';

import React, { useState } from 'react';
import RegistrationRequestModal from '@/components/RegistrationRequestModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, UserPlus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#114A65] via-[#114A65] to-[#B8400E] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <span className="text-[#114A65] font-bold text-2xl">W</span>
            </div>
            <span className="text-white font-bold text-2xl">WorkFlow</span>
          </div>
          <p className="text-[#C4C4CE]">Система управления сервисными заявками</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Регистрация в системе
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Для создания аккаунта заполните форму запроса на регистрацию
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={() => setShowModal(true)}
              className="w-full bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D] text-white py-3 rounded-xl text-lg font-semibold"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Заполнить форму регистрации
            </Button>

            <div className="text-center">
              <Link href="/login">
                <Button
                  variant="outline"
                  className="w-full text-[#114A65] border-[#114A65] hover:bg-[#114A65]/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Вернуться к входу
                </Button>
              </Link>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2 text-sm md:text-base">Как это работает?</h3>
              <ol className="text-xs md:text-sm text-blue-800 space-y-1">
                <li>1. Заполните форму с вашими данными</li>
                <li>2. Администратор проверит информацию</li>
                <li>3. После одобрения вы сможете войти в систему</li>
                <li>4. Обработка занимает до 24 часов</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardContent className="p-4 text-center">
              <Building2 className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">2 офиса</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">5 ролей</p>
            </CardContent>
          </Card>
        </div>

        <RegistrationRequestModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      </div>
    </div>
  );
}
