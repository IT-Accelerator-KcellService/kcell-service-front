"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useRequestStore } from "@/stores/useRequestStore";
import { RequestCard } from "@/components/RequestCard";
import { ExecutorMobileCardHeader } from "@/components/executor-mobile/ExecutorMobileCardHeader";
import { ExecutorMobilePageLayout } from "@/components/executor-mobile/ExecutorMobilePageLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ExecutorMyTasksPage() {
  const router = useRouter();
  const { myRequests, setAssignedRequests, setCompletedRequests, setMyRequests, clearRequests } = useRequestStore();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
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
      const completed = response.data.completedRequests?.map((reqGroup: any) => ({
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
      [...(response.data.completedRequests || []), ...(response.data.assignedRequests || []), ...(response.data.myRequests || [])].forEach(
        (rg: any) => {
          if (rg.clientRatings?.length > 0) {
            const r = rg.clientRatings[0];
            newRatings[rg.id] = { id: r.id, rating: r.rating, comment: r.comment };
          }
        }
      );
      setClientRatings(newRatings);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [setAssignedRequests, setCompletedRequests, setMyRequests]);

  useEffect(() => {
    clearRequests();
    fetchRequests();
  }, [fetchRequests, clearRequests]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchRequests();
  };

  const filtered = useMemo(() => {
    return (myRequests || []).filter((request: any) => {
      const statusMatch =
        filterStatus === "all" ||
        (filterStatus === "long_term"
          ? request.requests?.some((req: any) => req.is_long_term && request.request_type !== "recurring")
          : request.status === filterStatus);
      const typeMatch = filterType === "all" || request.request_type === filterType;
      return statusMatch && typeMatch;
    });
  }, [myRequests, filterStatus, filterType]);

  return (
    <ExecutorMobilePageLayout title="Мои заявки" onRefresh={handleRefresh}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="flex-1 min-w-[140px] bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="in_progress">В обработке</SelectItem>
              <SelectItem value="awaiting_assignment">Ожидает назначения</SelectItem>
              <SelectItem value="assigned">Назначен</SelectItem>
              <SelectItem value="execution">Исполнение</SelectItem>
              <SelectItem value="completed">Завершено</SelectItem>
              <SelectItem value="long_term">Долгосрочные</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="flex-1 min-w-[140px] bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Тип заявки" />
            </SelectTrigger>
            <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="normal">Обычная</SelectItem>
              <SelectItem value="urgent">Экстренная</SelectItem>
              <SelectItem value="planned">Плановая</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {loading ? (
          <div className="text-white/80 py-8 text-center">Загрузка...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((request: any, index: number) => (
              <RequestCard
                key={request.id || index}
                request={request}
                onCardClick={() => router.push(`/executor?tab=myTasks&requestId=${request.id}`)}
                renderCardHeader={(rg) => <ExecutorMobileCardHeader requestGroup={rg} />}
                clientRating={clientRatings[request.id]}
                userRole="executor"
              />
            ))}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-white/80 py-8 text-center">Нет заявок</div>
        )}
      </div>
    </ExecutorMobilePageLayout>
  );
}
