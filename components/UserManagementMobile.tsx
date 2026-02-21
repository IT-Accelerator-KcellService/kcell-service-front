"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getOfficeUsers, changeUserPassword, getExecutorsByCategory, changeCategoryHead } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCategoryStore } from "@/stores/useCategoryStore";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";

interface Executor {
  id: number;
  specialty: string;
  department_id: number;
  user: { id: number; full_name: string; role: string };
}

interface OfficeUser {
  id: number;
  full_name: string;
  phone: string;
  role: string;
  office_id?: number;
}

const roleLabels: Record<string, string> = {
  client: "Клиент",
  "admin-worker": "Администратор офиса",
  "department-head": "Офис менеджер",
  executor: "Исполнитель",
  manager: "Руководитель",
};

export default function UserManagementMobile() {
  const { user, token } = useAuthStore();
  const { toast } = useToast();
  const { categories, fetchCategories } = useCategoryStore();
  const [officeUsers, setOfficeUsers] = useState<OfficeUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRoleUserId, setSelectedRoleUserId] = useState<number | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  // Смена руководителя категории
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedExecutorId, setSelectedExecutorId] = useState<number | null>(null);
  const [availableExecutors, setAvailableExecutors] = useState<Executor[]>([]);
  const [isLoadingExecutors, setIsLoadingExecutors] = useState(false);
  const [isChangingHead, setIsChangingHead] = useState(false);
  const [changeHeadError, setChangeHeadError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.office_id) {
      getOfficeUsers(user.office_id)
        .then((res) => setOfficeUsers(res.data || []))
        .catch(() => setOfficeUsers([]));
    }
  }, [user?.office_id]);

  useEffect(() => {
    if (token) fetchCategories(token);
  }, [token, fetchCategories]);

  const loadExecutorsForCategory = async (categoryId: number) => {
    setIsLoadingExecutors(true);
    setChangeHeadError(null);
    try {
      const response = await getExecutorsByCategory(categoryId);
      const executors = (response.data || []).filter(
        (e: Executor) => e.user?.role === "executor"
      );
      setAvailableExecutors(executors);
    } catch {
      setChangeHeadError("Не удалось загрузить исполнителей");
      setAvailableExecutors([]);
    } finally {
      setIsLoadingExecutors(false);
    }
  };

  const handleChangeCategoryHead = async () => {
    if (!selectedCategoryId || !selectedExecutorId) return;
    setIsChangingHead(true);
    setChangeHeadError(null);
    try {
      const response = await changeCategoryHead(selectedCategoryId, selectedExecutorId);
      let message = `Новый руководитель: ${response.data?.newHead?.name || "назначен"}`;
      if (response.data?.processedTasks?.message) {
        message += `\n\n${response.data.processedTasks.message}`;
      }
      toast({ title: "Руководитель изменён", description: message });
      setSelectedCategoryId(null);
      setSelectedExecutorId(null);
      setAvailableExecutors([]);
      if (token) fetchCategories(token);
    } catch (err: any) {
      setChangeHeadError(err?.response?.data?.message || "Не удалось сменить руководителя");
    } finally {
      setIsChangingHead(false);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUserId || !newPassword.trim()) return;
    if (newPassword !== confirmPassword) {
      setPasswordError("Пароли не совпадают");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Пароль должен содержать минимум 6 символов");
      return;
    }
    setPasswordError(null);
    setIsChangingPassword(true);
    try {
      await changeUserPassword(selectedUserId, newPassword);
      toast({
        title: "Пароль изменён",
        description: "Пароль пользователя успешно изменён",
      });
      setSelectedUserId(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message || "Ошибка при смене пароля");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedRoleUserId || !newRole) return;
    setRoleError(null);
    setIsChangingRole(true);
    try {
      await api.put(`/users/${selectedRoleUserId}`, { role: newRole });
      toast({
        title: "Роль изменена",
        description: "Роль пользователя успешно изменена",
      });
      setSelectedRoleUserId(null);
      setNewRole("");
      setOfficeUsers((prev) =>
        prev.map((u) =>
          u.id === selectedRoleUserId ? { ...u, role: newRole } : u
        )
      );
    } catch (err: any) {
      setRoleError(err?.response?.data?.error || "Ошибка при смене роли");
    } finally {
      setIsChangingRole(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Смена пароля */}
      <Card className="border-[#3A3A3C] bg-[#2C2C2E]">
        <CardHeader>
          <CardTitle className="text-white">Смена пароля</CardTitle>
          <p className="text-sm text-[#8E8E93]">
            Изменение пароля пользователей вашего офиса
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[#E5E5EA]">Пользователь</Label>
            <Select
              value={selectedUserId?.toString() || ""}
              onValueChange={(v) => setSelectedUserId(v ? parseInt(v) : null)}
            >
              <SelectTrigger className="bg-[#1C1C1E] border-[#3A3A3C] text-white">
                <SelectValue placeholder="Выберите пользователя" />
              </SelectTrigger>
              <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
                {officeUsers.map((u) => (
                  <SelectItem
                    key={u.id}
                    value={u.id.toString()}
                    className="text-white focus:bg-[#3A3A3C]"
                  >
                    {u.full_name} <span className="text-[#8E8E93]">({u.phone})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[#E5E5EA]">Новый пароль</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Введите новый пароль"
              className="bg-[#1C1C1E] border-[#3A3A3C] text-white"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[#E5E5EA]">Подтверждение</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Подтвердите пароль"
              className="bg-[#1C1C1E] border-[#3A3A3C] text-white"
            />
          </div>
          {passwordError && (
            <div className="flex items-center gap-2 text-[#F35713] text-sm">
              <AlertTriangle className="h-4 w-4" />
              {passwordError}
            </div>
          )}
          <Button
            onClick={handleChangePassword}
            disabled={!selectedUserId || !newPassword || !confirmPassword || isChangingPassword}
            className="w-full bg-[#F35713] hover:bg-[#e04f10] text-white"
          >
            {isChangingPassword ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {isChangingPassword ? "Сохранение..." : "Изменить пароль"}
          </Button>
        </CardContent>
      </Card>

      {/* Смена роли */}
      <Card className="border-[#3A3A3C] bg-[#2C2C2E]">
        <CardHeader>
          <CardTitle className="text-white">Смена роли</CardTitle>
          <p className="text-sm text-[#8E8E93]">
            Изменение роли пользователей вашего офиса
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[#E5E5EA]">Пользователь</Label>
            <Select
              value={selectedRoleUserId?.toString() || ""}
              onValueChange={(v) => setSelectedRoleUserId(v ? parseInt(v) : null)}
            >
              <SelectTrigger className="bg-[#1C1C1E] border-[#3A3A3C] text-white">
                <SelectValue placeholder="Выберите пользователя" />
              </SelectTrigger>
              <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
                {officeUsers.map((u) => (
                  <SelectItem
                    key={u.id}
                    value={u.id.toString()}
                    className="text-white focus:bg-[#3A3A3C]"
                  >
                    {u.full_name} — {roleLabels[u.role] || u.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[#E5E5EA]">Новая роль</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="bg-[#1C1C1E] border-[#3A3A3C] text-white">
                <SelectValue placeholder="Выберите роль" />
              </SelectTrigger>
              <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
                {Object.entries(roleLabels).map(([id, label]) => (
                  <SelectItem
                    key={id}
                    value={id}
                    className="text-white focus:bg-[#3A3A3C]"
                  >
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {roleError && (
            <div className="flex items-center gap-2 text-[#F35713] text-sm">
              <AlertTriangle className="h-4 w-4" />
              {roleError}
            </div>
          )}
          <Button
            onClick={handleChangeRole}
            disabled={!selectedRoleUserId || !newRole || isChangingRole}
            className="w-full bg-[#F35713] hover:bg-[#e04f10] text-white"
          >
            {isChangingRole ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            {isChangingRole ? "Сохранение..." : "Изменить роль"}
          </Button>
        </CardContent>
      </Card>

      {/* Смена руководителя категории */}
      <Card className="border-[#3A3A3C] bg-[#2C2C2E]">
        <CardHeader>
          <CardTitle className="text-white">Смена руководителя категории</CardTitle>
          <p className="text-sm text-[#8E8E93]">
            Назначение нового руководителя для категории услуг
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[#E5E5EA]">Категория</Label>
            <Select
              value={selectedCategoryId?.toString() || ""}
              onValueChange={(v) => {
                const id = parseInt(v);
                setSelectedCategoryId(id);
                setSelectedExecutorId(null);
                loadExecutorsForCategory(id);
              }}
              disabled={isLoadingExecutors || isChangingHead}
            >
              <SelectTrigger className="bg-[#1C1C1E] border-[#3A3A3C] text-white">
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()} className="text-white focus:bg-[#3A3A3C]">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCategoryId && (
            <div className="space-y-2">
              <Label className="text-[#E5E5EA]">Новый руководитель</Label>
              {isLoadingExecutors && (
                <div className="flex items-center gap-2 text-[#8E8E93] text-sm py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загрузка исполнителей...
                </div>
              )}
              <Select
                value={selectedExecutorId?.toString() || ""}
                onValueChange={(v) => setSelectedExecutorId(v ? parseInt(v) : null)}
                disabled={isLoadingExecutors}
              >
                <SelectTrigger className="bg-[#1C1C1E] border-[#3A3A3C] text-white">
                  <SelectValue placeholder={isLoadingExecutors ? "Загрузка..." : "Выберите исполнителя"} />
                </SelectTrigger>
                <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
                  {availableExecutors.length === 0 && !isLoadingExecutors ? (
                    <SelectItem value="none" disabled className="text-[#8E8E93]">
                      Нет доступных исполнителей
                    </SelectItem>
                  ) : (
                    availableExecutors.map((e) => (
                      <SelectItem key={e.id} value={e.id.toString()} className="text-white focus:bg-[#3A3A3C]">
                        {e.user?.full_name} — {e.specialty}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {changeHeadError && (
            <div className="flex items-center gap-2 text-[#F35713] text-sm">
              <AlertTriangle className="h-4 w-4" />
              {changeHeadError}
            </div>
          )}

          <Button
            onClick={handleChangeCategoryHead}
            disabled={!selectedCategoryId || !selectedExecutorId || isChangingHead}
            className="w-full bg-[#F35713] hover:bg-[#e04f10] text-white"
          >
            {isChangingHead ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isChangingHead ? "Смена..." : "Сменить руководителя"}
          </Button>
          {(selectedCategoryId || selectedExecutorId) && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedCategoryId(null);
                setSelectedExecutorId(null);
                setAvailableExecutors([]);
              }}
              disabled={isChangingHead}
              className="w-full border-[#3A3A3C] text-[#E5E5EA] hover:bg-[#3A3A3C]"
            >
              Сбросить
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl bg-[#2C2C2E] border border-[#3A3A3C] p-4">
        <div className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-[#F35713] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#8E8E93]">
            <p className="font-medium text-white mb-1">Важно:</p>
            <p>• Новый пароль должен содержать минимум 6 символов</p>
            <p>• Пользователь сможет войти с новым паролем сразу после изменения</p>
          </div>
        </div>
      </div>
    </div>
  );
}
