"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useRequestStore } from "@/stores/useRequestStore";
import { RequestCard } from "@/components/RequestCard";
import { ExecutorMobileCardHeader } from "@/components/executor-mobile/ExecutorMobileCardHeader";
import { ExecutorMobilePageLayout } from "@/components/executor-mobile/ExecutorMobilePageLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ExecutorCompletedPage() {
  const router = useRouter();
  const { completedRequests, setAssignedRequests, setCompletedRequests, setMyRequests, clearRequests } = useRequestStore();
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
      (response.data.completedRequests || []).forEach((rg: any) => {
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
    clearRequests();
    fetchRequests();
  }, [fetchRequests, clearRequests]);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchRequests();
  };

  const filtered = (completedRequests || []).filter(
    (t: any) => filterType === "all" || t.request_type === filterType
  );

  return (
    <ExecutorMobilePageLayout title="Завершенные" onRefresh={handleRefresh}>
      <div className="space-y-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Тип заявки" />
          </SelectTrigger>
          <SelectContent className="bg-[#2C2C2E] border-[#3A3A3C]">
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="normal">Обычная</SelectItem>
            <SelectItem value="urgent">Экстренная</SelectItem>
            <SelectItem value="planned">Плановая</SelectItem>
          </SelectContent>
        </Select>
        {loading ? (
          <div className="text-white/80 py-8 text-center">Загрузка...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map((request: any, index: number) => (
              <RequestCard
                key={request.id || index}
                request={request}
                onCardClick={() => router.push(`/executor?tab=completed&requestId=${request.id}`)}
                renderCardHeader={(rg) => <ExecutorMobileCardHeader requestGroup={rg} />}
                clientRating={clientRatings[request.id]}
                userRole="executor"
              />
            ))}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-white/80 py-8 text-center">Нет завершенных задач</div>
        )}
      </div>
    </ExecutorMobilePageLayout>
  );
}
