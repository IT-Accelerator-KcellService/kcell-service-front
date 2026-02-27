"use client";

import React, { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Header from "@/app/header/Header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { sortRequests, useRequestStore } from "@/stores/useRequestStore";
import { RequestGroup } from "@/stores/useRequestStore";
import { RequestCard } from "@/components/RequestCard";
import { RecurringTasksList } from "@/components/recurring-tasks";
import PullToRefresh from "@/components/pull-to-refresh";
import api, { deleteRecurringTask, getOffices, type Office } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useToast } from "@/hooks/use-toast";

export default function DepartmentHeadRequestsPage() {
  const router = useRouter();
  const { token, clearAuth } = useAuthStore();
  const { toast } = useToast();

  const {
    incomingRequests,
    setIncomingRequests,
    myRequests,
    setMyRequests,
  } = useRequestStore();

  const [filterMyStatus, setFilterMyStatus] = useState("all");
  const [filterMyType, setFilterMyType] = useState("all");
  const [filterIncomingStatus, setFilterIncomingStatus] = useState("all");
  const [filterIncomingType, setFilterIncomingType] = useState("all");
  const [filterOfficeId, setFilterOfficeId] = useState<string>("all");
  const [filterClient, setFilterClient] = useState("");
  const [filterExecutor, setFilterExecutor] = useState("");
  const [activeTab, setActiveTab] = useState<"incoming" | "my-requests" | "recurring">("incoming");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const lastElementRef = useRef<HTMLDivElement | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);

  const fetchRequests = useCallback(
    async (currentPage = 1) => {
      if (!token) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          pageSize: "10",
        });
        if (filterIncomingStatus !== "all" && filterIncomingStatus !== "long_term") {
          params.append("status", filterIncomingStatus);
        }
        if (filterIncomingType !== "all") {
          params.append("priority", filterIncomingType);
        }

        const response = await api.get(`/request-groups?${params.toString()}`);
        const sortedIncoming = sortRequests(response.data.otherRequests || []);
        const sortedMy = sortRequests(response.data.myRequests || []);

        setIncomingRequests((prev) =>
          currentPage === 1 ? sortedIncoming : [...prev, ...sortedIncoming.filter((i) => !prev.some((p) => p.id === i.id))]
        );
        setMyRequests((prev) =>
          currentPage === 1 ? sortedMy : [...prev, ...sortedMy.filter((i) => !prev.some((p) => p.id === i.id))]
        );
        setHasMore((response.data.otherRequests?.length || 0) + (response.data.myRequests?.length || 0) >= 10);
        setPage(currentPage);
      } catch (error) {
        console.error("Ошибка при загрузке заявок:", error);
      } finally {
        setLoading(false);
      }
    },
    [token, filterIncomingStatus, filterIncomingType, setIncomingRequests, setMyRequests]
  );

  useEffect(() => {
    if (token) fetchRequests(1);
  }, [token]);

  useEffect(() => {
    if (token) fetchRequests(1);
  }, [filterIncomingStatus, filterIncomingType, token]);

  // Загружаем список офисов для глобального фильтра
  useEffect(() => {
    const loadOffices = async () => {
      try {
        const res = await getOffices();
        setOffices(res.data || []);
      } catch (error) {
        console.error("Ошибка при загрузке офисов:", error);
      }
    };
    loadOffices();
  }, []);

  const filteredMyRequests = useMemo(
    () =>
      sortRequests(
        myRequests.filter((r) => {
          const statusMatch =
            filterMyStatus === "all" ||
            (filterMyStatus === "long_term" ? r.requests.some((req) => req.is_long_term) : r.status === filterMyStatus);
          const typeMatch = filterMyType === "all" || r.request_type === filterMyType;
          const officeMatch =
            filterOfficeId === "all" || r.office_id === Number(filterOfficeId) || r.office?.id === Number(filterOfficeId);

          const clientQuery = filterClient.trim().toLowerCase();
          const clientMatch =
            !clientQuery ||
            r.client?.full_name?.toLowerCase().includes(clientQuery) ||
            String(r.client_id).includes(clientQuery);

          const executorQuery = filterExecutor.trim().toLowerCase();
          const executorMatch =
            !executorQuery ||
            r.requests.some((sr) => {
              const executors = sr.executors || (sr.executor ? [sr.executor] : []);
              return executors.some((ex) =>
                String(ex.user?.full_name || "")
                  .toLowerCase()
                  .includes(executorQuery)
              );
            });

          return statusMatch && typeMatch && officeMatch && clientMatch && executorMatch;
        })
      ),
    [myRequests, filterMyStatus, filterMyType, filterOfficeId, filterClient, filterExecutor]
  );

  const filteredIncomingRequests = useMemo(
    () =>
      sortRequests(
        incomingRequests.filter((r) => {
          const statusMatch =
            filterIncomingStatus === "all" ||
            (filterIncomingStatus === "long_term"
              ? r.requests.some((req) => req.is_long_term)
              : r.status === filterIncomingStatus);
          const typeMatch = filterIncomingType === "all" || r.request_type === filterIncomingType;
          const officeMatch =
            filterOfficeId === "all" || r.office_id === Number(filterOfficeId) || r.office?.id === Number(filterOfficeId);

          const clientQuery = filterClient.trim().toLowerCase();
          const clientMatch =
            !clientQuery ||
            r.client?.full_name?.toLowerCase().includes(clientQuery) ||
            String(r.client_id).includes(clientQuery);

          const executorQuery = filterExecutor.trim().toLowerCase();
          const executorMatch =
            !executorQuery ||
            r.requests.some((sr) => {
              const executors = sr.executors || (sr.executor ? [sr.executor] : []);
              return executors.some((ex) =>
                String(ex.user?.full_name || "")
                  .toLowerCase()
                  .includes(executorQuery)
              );
            });

          return statusMatch && typeMatch && officeMatch && clientMatch && executorMatch;
        })
      ),
    [incomingRequests, filterIncomingStatus, filterIncomingType, filterOfficeId, filterClient, filterExecutor]
  );

  const handleRefresh = async () => {
    await fetchRequests(1);
  };

  const renderCardHeader = useCallback(
    (requestGroup: RequestGroup) => (
      <div className="pb-3 px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base leading-tight line-clamp-2 text-gray-900">
              Заявка #{requestGroup.id}
            </h3>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                requestGroup.request_type === "urgent"
                  ? "text-white bg-[#B8400E]"
                  : requestGroup.request_type === "planned"
                    ? "text-white bg-[#114A65]"
                    : "text-white bg-[#114A65]"
              }`}
            >
              {requestGroup.request_type === "urgent" ? "Экстренная" : requestGroup.request_type === "planned" ? "Плановая" : "Обычная"}
            </span>
          </div>
        </div>
      </div>
    ),
    []
  );

  const handleCardClick = (request: RequestGroup) => {
    router.push(`/department-head/requests/${request.id}`);
  };

  const handleMyCardClick = (request: RequestGroup) => {
    router.push(`/department-head/requests/${request.id}`);
  };

  const handleLogout = async () => {
    try {
      clearAuth();
      router.push("/login");
    } catch {
      // ignore
    }
  };

  return (
    <>
      <Header handleLogout={handleLogout} notificationCount={0} role="Офис менеджер" theme="dark" />
      <div
        className="min-h-screen pb-20"
        style={{ background: "linear-gradient(180deg, #1C1C1E 0%, #2C2C2E 50%, #1C1C1E 100%)" }}
      >
        <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-white">Заявки</h1>
        <Link href="/create-request">
          <Button className="h-12 px-5 bg-[#E25B21] hover:bg-[#D94F15] text-white font-semibold rounded-2xl">
            <Plus className="h-4 w-4 mr-2" />
            Создать
          </Button>
        </Link>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-4">
          {/* Глобальные фильтры: офис, клиент, исполнитель */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">Офис</p>
              <Select value={filterOfficeId} onValueChange={setFilterOfficeId}>
                <SelectTrigger className="h-10 bg-[#2C2C2E] border-[#3A3A3C] text-white text-sm rounded-lg">
                  <SelectValue placeholder="Все офисы" />
                </SelectTrigger>
                <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C] text-white">
                  <SelectItem value="all" className="text-white">
                    Все офисы
                  </SelectItem>
                  {offices.map((office) => (
                    <SelectItem key={office.id} value={office.id.toString()} className="text-white">
                      {office.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Клиент</p>
              <input
                type="text"
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
                placeholder="ФИО или ID"
                className="w-full h-10 px-3 rounded-lg bg-[#2C2C2E] border border-[#3A3A3C] text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#E85D2B]"
              />
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-gray-400 mb-1">Исполнитель</p>
              <input
                type="text"
                value={filterExecutor}
                onChange={(e) => setFilterExecutor(e.target.value)}
                placeholder="Имя исполнителя"
                className="w-full h-10 px-3 rounded-lg bg-[#2C2C2E] border border-[#3A3A3C] text-sm text-white placeholder:text-gray-500 outline-none focus:border-[#E85D2B]"
              />
            </div>
          </div>

          {/* Переключатель вкладок (фиксирован) */}
          <div className="flex rounded-xl overflow-hidden bg-[#3D3D3D]">
            <button
              onClick={() => setActiveTab("incoming")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                activeTab === "incoming" ? "bg-[#5A5A5A] text-white" : "bg-transparent text-gray-400"
              }`}
            >
              Входящие
            </button>
            <button
              onClick={() => setActiveTab("my-requests")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                activeTab === "my-requests" ? "bg-[#5A5A5A] text-white" : "bg-transparent text-gray-400"
              }`}
            >
              Мои
            </button>
            <button
              onClick={() => setActiveTab("recurring")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                activeTab === "recurring" ? "bg-[#5A5A5A] text-white" : "bg-transparent text-gray-400"
              }`}
            >
              Повторяющиеся
            </button>
          </div>

          {/* Скролл только для списка заявок */}
          <div className="rounded-2xl border border-white/10 bg-black/20 max-h-[calc(100vh-260px)] overflow-y-auto custom-scrollbar-dark p-4 space-y-4">
            {activeTab === "incoming" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">Входящие заявки</h2>
                <div className="flex gap-2">
                  <Select value={filterIncomingStatus} onValueChange={setFilterIncomingStatus}>
                    <SelectTrigger className="flex-1 bg-[#2C2C2E] border-[#3A3A3C] text-white">
                      <SelectValue placeholder="Статус" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
                      <SelectItem value="all" className="text-white">
                        Все
                      </SelectItem>
                      <SelectItem value="in_progress" className="text-white">
                        В обработке
                      </SelectItem>
                      <SelectItem value="awaiting_assignment" className="text-white">
                        Ожидает
                      </SelectItem>
                      <SelectItem value="execution" className="text-white">
                        Исполнение
                      </SelectItem>
                      <SelectItem value="completed" className="text-white">
                        Завершено
                      </SelectItem>
                      <SelectItem value="overdue" className="text-white">
                        Просрочено
                      </SelectItem>
                      <SelectItem value="rejected" className="text-white">
                        Отклонено
                      </SelectItem>
                      <SelectItem value="long_term" className="text-white">
                        Долгосрочные
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterIncomingType} onValueChange={setFilterIncomingType}>
                    <SelectTrigger className="flex-1 bg-[#2C2C2E] border-[#3A3A3C] text-white">
                      <SelectValue placeholder="Тип" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
                      <SelectItem value="all" className="text-white">
                        Все
                      </SelectItem>
                      <SelectItem value="normal" className="text-white">
                        Обычная
                      </SelectItem>
                      <SelectItem value="urgent" className="text-white">
                        Экстренная
                      </SelectItem>
                      <SelectItem value="planned" className="text-white">
                        Плановая
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4 pb-4">
                  {loading ? (
                    <div className="text-center py-8 text-gray-400">Загрузка...</div>
                  ) : (
                    filteredIncomingRequests.map((request, index) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        onCardClick={handleCardClick}
                        renderCardHeader={renderCardHeader}
                        isLast={index === filteredIncomingRequests.length - 1}
                        lastElementRef={lastElementRef}
                        userRole="department-head"
                        variant="compact"
                      />
                    ))
                  )}
                  {!loading && filteredIncomingRequests.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <p>Нет входящих заявок</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "my-requests" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">Мои заявки</h2>
                <div className="flex gap-2">
                  <Select value={filterMyStatus} onValueChange={setFilterMyStatus}>
                    <SelectTrigger className="flex-1 bg-[#2C2C2E] border-[#3A3A3C] text-white">
                      <SelectValue placeholder="Статус" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
                      <SelectItem value="all" className="text-white">
                        Все
                      </SelectItem>
                      <SelectItem value="in_progress" className="text-white">
                        В обработке
                      </SelectItem>
                      <SelectItem value="awaiting_assignment" className="text-white">
                        Ожидает
                      </SelectItem>
                      <SelectItem value="execution" className="text-white">
                        Исполнение
                      </SelectItem>
                      <SelectItem value="completed" className="text-white">
                        Завершено
                      </SelectItem>
                      <SelectItem value="overdue" className="text-white">
                        Просрочено
                      </SelectItem>
                      <SelectItem value="long_term" className="text-white">
                        Долгосрочные
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterMyType} onValueChange={setFilterMyType}>
                    <SelectTrigger className="flex-1 bg-[#2C2C2E] border-[#3A3A3C] text-white">
                      <SelectValue placeholder="Тип" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
                      <SelectItem value="all" className="text-white">
                        Все
                      </SelectItem>
                      <SelectItem value="normal" className="text-white">
                        Обычная
                      </SelectItem>
                      <SelectItem value="urgent" className="text-white">
                        Экстренная
                      </SelectItem>
                      <SelectItem value="planned" className="text-white">
                        Плановая
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-4 pb-4">
                  {loading ? (
                    <div className="text-center py-8 text-gray-400">Загрузка...</div>
                  ) : (
                    filteredMyRequests.map((request, index) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        onCardClick={handleMyCardClick}
                        renderCardHeader={renderCardHeader}
                        isLast={index === filteredMyRequests.length - 1}
                        lastElementRef={lastElementRef}
                        userRole="department-head"
                        variant="compact"
                      />
                    ))
                  )}
                  {!loading && filteredMyRequests.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <p>У вас пока нет заявок</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "recurring" && (
              <div className="space-y-4 pb-4">
                <h2 className="text-lg font-bold text-white">Повторяющиеся задачи</h2>
                <RecurringTasksList
                  userRole="department-head"
                  isDesktop={false}
                  onShowMap={() => {}}
                  onDeleteTask={async (id) => {
                    try {
                      await deleteRecurringTask(id);
                      toast({ title: "Задача удалена" });
                    } catch {
                      toast({ title: "Ошибка", variant: "destructive" });
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>
        </div>
      </div>
    </>
  );
}
