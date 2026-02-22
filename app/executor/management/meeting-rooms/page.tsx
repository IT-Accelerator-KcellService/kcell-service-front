"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api, { getOffices } from "@/lib/api";
import { useRequestStore } from "@/stores/useRequestStore";
import { ExecutorRoomsRequestsView } from "@/components/meeting-rooms/ExecutorRoomsRequestsView";
import { ExecutorMobilePageLayout } from "@/components/executor-mobile/ExecutorMobilePageLayout";

export default function ExecutorMeetingRoomsPage() {
  const router = useRouter();
  const { myRequests, assignedRequests, completedRequests, setAssignedRequests, setCompletedRequests, setMyRequests, clearRequests } =
    useRequestStore();
  const [offices, setOffices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const [response, officesRes] = await Promise.all([api.get("request-groups"), getOffices()]);
      setOffices(officesRes.data || []);
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

  return (
    <ExecutorMobilePageLayout title="Переговорные" onRefresh={handleRefresh}>
      {loading ? (
        <div className="text-white/80 py-8 text-center">Загрузка...</div>
      ) : (
        <ExecutorRoomsRequestsView
          offices={offices}
          myRequests={myRequests || []}
          assignedRequests={assignedRequests || []}
          completedRequests={completedRequests || []}
          onRequestClick={(request) => router.push(`/executor?tab=meeting-rooms&requestId=${request.id}`)}
        />
      )}
    </ExecutorMobilePageLayout>
  );
}
