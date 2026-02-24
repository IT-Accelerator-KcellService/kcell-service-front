"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import api from "@/lib/api";
import { useRequestStore } from "@/stores/useRequestStore";
import { RequestGroup } from "@/stores/useRequestStore";
import { RequestCard } from "@/components/RequestCard";
import PullToRefresh from "@/components/pull-to-refresh";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function getTaskTypeOrder(type: string) {
  switch (type) {
    case "urgent":
      return 1;
    case "normal":
      return 2;
    case "planned":
      return 3;
    default:
      return 99;
  }
}

export default function ExecutorRequestsPage() {
  const router = useRouter();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const {
    assignedRequests,
    myRequests,
    completedRequests,
    setAssignedRequests,
    setCompletedRequests,
    setMyRequests,
    clearRequests,
  } = useRequestStore();

  const [activeTab, setActiveTab] = useState<"tasks" | "myTasks" | "completed">("tasks");
  const [filterType, setFilterType] = useState("all");
  const [filterMyStatus, setFilterMyStatus] = useState("all");
  const [filterMyType, setFilterMyType] = useState("all");
  const [clientRatings, setClientRatings] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await api.get("request-groups");
      const responseRating = await api.get("ratings/executor");
      const ratingsMap = new Map<number, any>();
      for (const r of responseRating.data) {
        ratingsMap.set(r.request_id, { rating: parseFloat(r.rating), comments: r.comments || [] });
      }
      const completed =
        response.data.completedRequests?.map((reqGroup: any) => ({
          ...reqGroup,
          requests: reqGroup.requests?.map((req: any) => {
            const ratingData = ratingsMap.get(req.id);
            return {
              ...req,
              rating: ratingData?.rating || null,
              ratings: ratingData ? [{ rating: ratingData.rating, comments: ratingData.comments }] : undefined,
            };
          }),
        })) || [];
      setCompletedRequests(completed);
      setAssignedRequests(response.data.assignedRequests || []);
      setMyRequests(response.data.myRequests || []);
      const newRatings: Record<number, any> = {};
      [
        ...(response.data.completedRequests || []),
        ...(response.data.assignedRequests || []),
        ...(response.data.myRequests || []),
      ].forEach((rg: any) => {
        if (rg.clientRatings?.length > 0) {
          const r = rg.clientRatings[0];
          newRatings[rg.id] = { id: r.id, rating: r.rating, comment: r.comment };
        }
      });
      setClientRatings(newRatings);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [setAssignedRequests, setCompletedRequests, setMyRequests]);

  useEffect(() => {
    if (isDesktop) {
      router.push("/executor");
      return;
    }
    clearRequests();
    fetchRequests();
  }, [isDesktop, router, fetchRequests, clearRequests]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchRequests();
  };

  const filteredTasks = useMemo(
    () =>
      (assignedRequests || [])
        .filter((t: any) => filterType === "all" || t.request_type === filterType)
        .sort(
          (a: any, b: any) =>
            getTaskTypeOrder(a.request_type || a.type) - getTaskTypeOrder(b.request_type || b.type)
        ),
    [assignedRequests, filterType]
  );

  const filteredMy = useMemo(
    () =>
      (myRequests || []).filter((request: any) => {
        const statusMatch =
          filterMyStatus === "all" ||
          (filterMyStatus === "long_term"
            ? request.requests?.some((req: any) => req.is_long_term && request.request_type !== "recurring")
            : request.status === filterMyStatus);
        const typeMatch = filterMyType === "all" || request.request_type === filterMyType;
        return statusMatch && typeMatch;
      }),
    [myRequests, filterMyStatus, filterMyType]
  );

  const filteredCompleted = useMemo(
    () =>
      (completedRequests || []).filter(
        (t: any) => filterType === "all" || t.request_type === filterType
      ),
    [completedRequests, filterType]
  );

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
              {requestGroup.request_type === "urgent"
                ? "Экстренная"
                : requestGroup.request_type === "planned"
                  ? "Плановая"
                  : "Обычная"}
            </span>
          </div>
        </div>
      </div>
    ),
    []
  );

  const handleCardClick = (request: RequestGroup) => {
    router.push(`/executor/requests/${request.id}`);
  };

  if (isDesktop) return null;

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
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                activeTab === "tasks" ? "bg-[#5A5A5A] text-white" : "bg-transparent text-gray-400"
              }`}
            >
              Мои задачи
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("myTasks")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                activeTab === "myTasks" ? "bg-[#5A5A5A] text-white" : "bg-transparent text-gray-400"
              }`}
            >
              Мои заявки
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-all duration-200 ${
                activeTab === "completed" ? "bg-[#5A5A5A] text-white" : "bg-transparent text-gray-400"
              }`}
            >
              Завершенные
            </button>
          </div>

          {activeTab === "tasks" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Мои задачи</h2>
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="flex-1 bg-[#2C2C2E] border-[#3A3A3C] text-white">
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent className="z-[110] bg-[#2C2C2E] border-[#3A3A3C]">
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
                  filteredTasks.map((request: any, index: number) => (
                    <RequestCard
                      key={request.id || index}
                      request={request}
                      onCardClick={() => handleCardClick(request)}
                      renderCardHeader={renderCardHeader}
                      clientRating={clientRatings[request.id]}
                      userRole="executor"
                      variant="compact"
                    />
                  ))
                )}
                {!loading && filteredTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-400">Нет назначенных задач</div>
                )}
              </div>
            </div>
          )}

          {activeTab === "myTasks" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Мои заявки</h2>
              <div className="flex gap-2">
                <Select value={filterMyStatus} onValueChange={setFilterMyStatus}>
                  <SelectTrigger className="flex-1 bg-[#2C2C2E] border-[#3A3A3C] text-white">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent className="z-[110] bg-[#2C2C2E] border-[#3A3A3C]">
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
                  <SelectContent className="z-[110] bg-[#2C2C2E] border-[#3A3A3C]">
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
                  filteredMy.map((request: any, index: number) => (
                    <RequestCard
                      key={request.id || index}
                      request={request}
                      onCardClick={() => handleCardClick(request)}
                      renderCardHeader={renderCardHeader}
                      clientRating={clientRatings[request.id]}
                      userRole="executor"
                      variant="compact"
                    />
                  ))
                )}
                {!loading && filteredMy.length === 0 && (
                  <div className="text-center py-8 text-gray-400">У вас пока нет заявок</div>
                )}
              </div>
            </div>
          )}

          {activeTab === "completed" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Завершенные</h2>
              <div className="flex gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="flex-1 bg-[#2C2C2E] border-[#3A3A3C] text-white">
                    <SelectValue placeholder="Тип" />
                  </SelectTrigger>
                  <SelectContent className="z-[110] bg-[#2C2C2E] border-[#3A3A3C]">
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
                  filteredCompleted.map((request: any, index: number) => (
                    <RequestCard
                      key={request.id || index}
                      request={request}
                      onCardClick={() => handleCardClick(request)}
                      renderCardHeader={renderCardHeader}
                      clientRating={clientRatings[request.id]}
                      userRole="executor"
                      variant="compact"
                    />
                  ))
                )}
                {!loading && filteredCompleted.length === 0 && (
                  <div className="text-center py-8 text-gray-400">Нет завершенных задач</div>
                )}
              </div>
            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
