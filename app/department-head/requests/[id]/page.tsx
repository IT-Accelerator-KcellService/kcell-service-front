"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { RequestGroup } from "@/stores/useRequestStore";
import { AdminRequestDetailsModal } from "@/components/AdminRequestDetailsModal";
import { AssignExecutorsModal } from "@/components/AssignExecutorsModal";
import { ChangeExecutorsModal } from "@/components/ChangeExecutorsModal";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCategoryStore } from "@/stores/useCategoryStore";
import { useToast } from "@/hooks/use-toast";

interface Executor {
  id: number;
  executor_id: number;
  user: { id: number; full_name: string; phone?: string; role: string };
  specialty: string;
  rating: number;
  workload: number;
}

export default function DepartmentHeadRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { user, token } = useAuthStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { toast } = useToast();

  const [request, setRequest] = useState<RequestGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executors, setExecutors] = useState<Executor[]>([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [subRequestForAssign, setSubRequestForAssign] = useState<any>(null);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [subRequestForChange, setSubRequestForChange] = useState<any>(null);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [requestForRedirect, setRequestForRedirect] = useState<any>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [redirectError, setRedirectError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const fetchRequest = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.get(`/request-groups/${id}`);
      setRequest(response.data);
    } catch (err) {
      console.error("Ошибка загрузки заявки:", err);
      setError("Не удалось загрузить заявку");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isDesktop) {
      router.replace(`/department-head?tab=incoming&requestId=${id}`);
      return;
    }
  }, [isDesktop, router, id]);

  useEffect(() => {
    if (!id || isDesktop) return;
    setLoading(true);
    setError(null);
    fetchRequest();
  }, [id, isDesktop, fetchRequest]);

  useEffect(() => {
    if (token) fetchCategories(token);
  }, [token, fetchCategories]);

  useEffect(() => {
    const loadExecutors = async () => {
      try {
        const res = await api.get("/executors");
        setExecutors(res.data || []);
      } catch (e) {
        console.error("Ошибка загрузки исполнителей:", e);
      }
    };
    if (!isDesktop) loadExecutors();
  }, [isDesktop]);

  const handleClose = () => {
    router.push("/department-head/requests");
  };

  const handleRequestUpdated = () => {
    fetchRequest();
  };

  const handleAssignExecutors = (subRequest: any) => {
    setSubRequestForAssign(subRequest);
    setShowAssignModal(true);
  };

  const handleCloseAssignModal = () => {
    setShowAssignModal(false);
    setSubRequestForAssign(null);
  };

  const handleAssignSuccess = () => {
    toast({ title: "Исполнители назначены", description: "Исполнители успешно назначены на заявку" });
    handleCloseAssignModal();
    fetchRequest();
  };

  const handleChangeExecutors = (subRequest: any) => {
    setSubRequestForChange(subRequest);
    setShowChangeModal(true);
  };

  const handleCloseChangeModal = () => {
    setShowChangeModal(false);
    setSubRequestForChange(null);
  };

  const handleChangeSuccess = () => {
    toast({ title: "Исполнители изменены", description: "Исполнители успешно изменены для подзаявки" });
    handleCloseChangeModal();
    fetchRequest();
  };

  const handleOpenRedirectModal = (subRequest: any) => {
    setRequestForRedirect({ ...subRequest, requestGroup: request });
    setSelectedCategoryId(null);
    setRedirectError(null);
    setShowRedirectModal(true);
  };

  const handleCloseRedirectModal = () => {
    setShowRedirectModal(false);
    setRequestForRedirect(null);
    setSelectedCategoryId(null);
    setRedirectError(null);
  };

  const handleRedirectRequest = async () => {
    if (!requestForRedirect || !selectedCategoryId) return;
    setIsRedirecting(true);
    setRedirectError(null);
    try {
      await api.patch(`/requests/${requestForRedirect.id}`, {
        status: "awaiting_assignment",
        executor_id: null,
        actual_completion_date: null,
        category_id: selectedCategoryId,
        patch_code: 1,
      });
      const categoryName = categories.find((c) => c.id === selectedCategoryId)?.name;
      toast({
        title: "Подзаявка перенаправлена",
        description: `Подзаявка успешно перенаправлена руководителям категории "${categoryName}"`,
      });
      handleCloseRedirectModal();
      fetchRequest();
    } catch (err: any) {
      console.error("Ошибка при перенаправлении заявки:", err);
      setRedirectError(err.response?.data?.error || "Не удалось перенаправить заявку");
    } finally {
      setIsRedirecting(false);
    }
  };

  if (isDesktop) return null;

  if (loading && !request) {
    return (
      <div className="min-h-screen bg-[#1C1C1E] flex items-center justify-center">
        <p className="text-gray-400">Загрузка...</p>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-[#1C1C1E] p-4">
        <Button
          variant="ghost"
          className="text-white mb-4"
          onClick={() => router.push("/department-head/requests")}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Назад
        </Button>
        <p className="text-red-400">{error || "Заявка не найдена"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1C1C1E]">
      <AdminRequestDetailsModal
        request={request}
        onClose={handleClose}
        onRequestUpdated={handleRequestUpdated}
        sourceTab="incoming"
        hideFullModeButton
        userRole="department-head"
        fullModeRedirectBase="/department-head"
        onAssignExecutor={handleAssignExecutors}
        onRedirectToOtherDepartment={handleOpenRedirectModal}
        onChangeExecutors={handleChangeExecutors}
      />

      <AssignExecutorsModal
        isOpen={showAssignModal}
        onClose={handleCloseAssignModal}
        subRequest={subRequestForAssign}
        executors={executors}
        userServiceCategoryId={user?.service_category_id}
        onSuccess={handleAssignSuccess}
      />

      <ChangeExecutorsModal
        isOpen={showChangeModal}
        onClose={handleCloseChangeModal}
        subRequest={subRequestForChange}
        executors={executors}
        userServiceCategoryId={user?.service_category_id}
        onSuccess={handleChangeSuccess}
      />

      {showRedirectModal && requestForRedirect && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100]">
          <Card className="w-full max-w-md bg-[#2C2C2E] border-[#3A3A3C]">
            <CardHeader>
              <CardTitle className="text-white">Перенаправить заявку #{requestForRedirect.id}</CardTitle>
              <CardDescription className="text-gray-400">
                Выберите категорию, к которой нужно перенаправить заявку
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="category" className="text-gray-300">Категория</Label>
                <Select
                  value={selectedCategoryId?.toString() ?? ""}
                  onValueChange={(value) => setSelectedCategoryId(parseInt(value, 10))}
                >
                  <SelectTrigger className="bg-[#1C1C1E] border-[#3A3A3C] text-white mt-1">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent className="z-[110] bg-[#2C2C2E] border-[#3A3A3C]">
                    {categories
                      .filter((category) => category.id !== requestForRedirect.category_id)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()} className="text-white">
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-[#114A65]/20 border border-[#114A65]/40 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#114A65] shrink-0" />
                  <span className="text-sm text-gray-300">
                    Подзаявка будет перенаправлена всем руководителям с категорией &quot;{categories.find((c) => c.id === selectedCategoryId)?.name || "выбранная категория"}&quot;
                  </span>
                </div>
              </div>
              {redirectError && <p className="text-sm text-red-400">{redirectError}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseRedirectModal} className="border-gray-500 text-white">
                  Отмена
                </Button>
                <Button
                  onClick={handleRedirectRequest}
                  disabled={!selectedCategoryId || isRedirecting}
                  className="bg-[#E25B21] hover:bg-[#D94F15] text-white"
                >
                  {isRedirecting ? "Перенаправление..." : "Перенаправить"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
