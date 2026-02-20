"use client";

import React, { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Building2 } from "lucide-react";
import { sortRequests, useRequestStore } from "@/stores/useRequestStore";
import { RequestGroup } from "@/stores/useRequestStore";
import { RequestCard } from "@/components/RequestCard";
import { RecurringTasksList } from "@/components/recurring-tasks";
import PullToRefresh from "@/components/pull-to-refresh";
import api, { deleteRecurringTask } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useToast } from "@/hooks/use-toast";

export default function AdminRequestsPage() {
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
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RequestGroup | null>(null);
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
      router.push("/admin-worker");
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
    setSelectedRequest(request);
    router.push(`/admin-worker?tab=incoming&requestId=${request.id}`);
  };

  if (isDesktop) return null;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-[#040404]">Заявки</h1>
        <Link href="/create-request">
          <Button className="bg-gradient-to-r from-[#114A65] to-[#B8400E] hover:from-[#0d3a4f] hover:to-[#A3390D]">
            <Plus className="h-4 w-4 mr-2" />
            Создать
          </Button>
        </Link>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        <Tabs defaultValue="incoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="incoming">Входящие</TabsTrigger>
            <TabsTrigger value="my-requests">Мои</TabsTrigger>
            <TabsTrigger value="recurring">Повторяющиеся</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming">
            <div className="flex flex-wrap gap-2 mb-4">
              <Select value={filterIncomingStatus} onValueChange={setFilterIncomingStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="in_progress">В обработке</SelectItem>
                  <SelectItem value="awaiting_assignment">Ожидает</SelectItem>
                  <SelectItem value="execution">Исполнение</SelectItem>
                  <SelectItem value="completed">Завершено</SelectItem>
                  <SelectItem value="overdue">Просрочено</SelectItem>
                  <SelectItem value="rejected">Отклонено</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterIncomingType} onValueChange={setFilterIncomingType}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="normal">Обычная</SelectItem>
                  <SelectItem value="urgent">Экстренная</SelectItem>
                  <SelectItem value="planned">Плановая</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Загрузка...</div>
              ) : (
                filteredIncomingRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onCardClick={handleCardClick}
                    renderCardHeader={renderCardHeader}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-requests">
            <div className="flex flex-wrap gap-2 mb-4">
              <Select value={filterMyStatus} onValueChange={setFilterMyStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="in_progress">В обработке</SelectItem>
                  <SelectItem value="awaiting_assignment">Ожидает</SelectItem>
                  <SelectItem value="execution">Исполнение</SelectItem>
                  <SelectItem value="completed">Завершено</SelectItem>
                  <SelectItem value="overdue">Просрочено</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterMyType} onValueChange={setFilterMyType}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="normal">Обычная</SelectItem>
                  <SelectItem value="urgent">Экстренная</SelectItem>
                  <SelectItem value="planned">Плановая</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Загрузка...</div>
              ) : (
                filteredMyRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onCardClick={handleCardClick}
                    renderCardHeader={renderCardHeader}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="recurring">
            <RecurringTasksList
              userRole="admin-worker"
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
          </TabsContent>
        </Tabs>
      </PullToRefresh>
    </div>
  );
}
