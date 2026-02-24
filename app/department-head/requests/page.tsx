"use client";

import React, { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { sortRequests, useRequestStore } from "@/stores/useRequestStore";
import { RequestGroup } from "@/stores/useRequestStore";
import { RequestCard } from "@/components/RequestCard";
import { RecurringTasksList } from "@/components/recurring-tasks";
import PullToRefresh from "@/components/pull-to-refresh";
import api, { deleteRecurringTask } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useToast } from "@/hooks/use-toast";

export default function DepartmentHeadRequestsPage() {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { token } = useAuthStore();
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
  const [activeTab, setActiveTab] = useState<"incoming" | "my-requests" | "recurring">("incoming");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const lastElementRef = useRef<HTMLDivElement | null>(null);

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
    if (isDesktop) {
      router.push("/department-head");
      return;
    }
    fetchRequests(1);
  }, [isDesktop, router]);

  useEffect(() => {
    if (isDesktop) return;
    fetchRequests(1);
  }, [filterIncomingStatus, filterIncomingType]);

  const filteredMyRequests = useMemo(
    () =>
      sortRequests(
        myRequests.filter((r) => {
          const statusMatch =
            filterMyStatus === "all" ||
            (filterMyStatus === "long_term" ? r.requests.some((req) => req.is_long_term) : r.status === filterMyStatus);
          const typeMatch = filterMyType === "all" || r.request_type === filterMyType;
          return statusMatch && typeMatch;
        })
      ),
    [myRequests, filterMyStatus, filterMyType]
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
          return statusMatch && typeMatch;
        })
      ),
    [incomingRequests, filterIncomingStatus, filterIncomingType]
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

  if (isDesktop) return null;

  const handleMyCardClick = (request: RequestGroup) => {
    router.push(`/department-head/requests/${request.id}`);
  };

  return (
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
          <div className="flex rounded-xl overflow-hidden bg-[#3D3D3D]">
            <button
              onClick={() => setActiveTab("incoming")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                activeTab === "incoming"
                  ? "bg-[#5A5A5A] text-white"
                  : "bg-transparent text-gray-400"
              }`}
            >
              Входящие
            </button>
            <button
              onClick={() => setActiveTab("my-requests")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                activeTab === "my-requests"
                  ? "bg-[#5A5A5A] text-white"
                  : "bg-transparent text-gray-400"
              }`}
            >
              Мои
            </button>
            <button
              onClick={() => setActiveTab("recurring")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                activeTab === "recurring"
                  ? "bg-[#5A5A5A] text-white"
                  : "bg-transparent text-gray-400"
              }`}
            >
              Повторяющиеся
            </button>
          </div>

          {activeTab === "incoming" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Входящие заявки</h2>
              <div className="flex gap-2">
                <Select value={filterIncomingStatus} onValueChange={setFilterIncomingStatus}>
                  <SelectTrigger className="flex-1 bg-[#2C2C2E] border-[#3A3A3C] text-white">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
                    <SelectItem value="all" className="text-white">Все</SelectItem>
                    <SelectItem value="in_progress" className="text-white">В обработке</SelectItem>
                    <SelectItem value="awaiting_assignment" className="text-white">Ожидает</SelectItem>
                    <SelectItem value="execution" className="text-white">Исполнение</SelectItem>
                    <SelectItem value="completed" className="text-white">Завершено</SelectItem>
                    <SelectItem value="overdue" className="text-white">Просрочено</SelectItem>
                    <SelectItem value="rejected" className="text-white">Отклонено</SelectItem>
                    <SelectItem value="long_term" className="text-white">Долгосрочные</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterIncomingType} onValueChange={setFilterIncomingType}>
                  <SelectTrigger className="flex-1 bg-[#2C2C2E] border-[#3A3A3C] text-white">
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
                    <SelectItem value="all" className="text-white">Все</SelectItem>
                    <SelectItem value="normal" className="text-white">Обычная</SelectItem>
                    <SelectItem value="urgent" className="text-white">Экстренная</SelectItem>
                    <SelectItem value="planned" className="text-white">Плановая</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4 pb-40">
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
                    <SelectItem value="all" className="text-white">Все</SelectItem>
                    <SelectItem value="in_progress" className="text-white">В обработке</SelectItem>
                    <SelectItem value="awaiting_assignment" className="text-white">Ожидает</SelectItem>
                    <SelectItem value="execution" className="text-white">Исполнение</SelectItem>
                    <SelectItem value="completed" className="text-white">Завершено</SelectItem>
                    <SelectItem value="overdue" className="text-white">Просрочено</SelectItem>
                    <SelectItem value="long_term" className="text-white">Долгосрочные</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterMyType} onValueChange={setFilterMyType}>
                  <SelectTrigger className="flex-1 bg-[#2C2C2E] border-[#3A3A3C] text-white">
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
                    <SelectItem value="all" className="text-white">Все</SelectItem>
                    <SelectItem value="normal" className="text-white">Обычная</SelectItem>
                    <SelectItem value="urgent" className="text-white">Экстренная</SelectItem>
                    <SelectItem value="planned" className="text-white">Плановая</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4 pb-40">
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
            <div className="space-y-4 pb-40">
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
      </PullToRefresh>
    </div>
  );
}
