"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { RequestGroup } from "@/stores/useRequestStore";
import { SubRequest } from "@/stores/useRequestStore";
import { RequestDetails } from "@/components/RequestDetails";

export default function ClientRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [request, setRequest] = useState<RequestGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDesktop) {
      router.replace(`/client?tab=requests&requestId=${id}`);
      return;
    }
  }, [isDesktop, router, id]);

  useEffect(() => {
    if (!id || isDesktop) return;
    const fetchRequest = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/request-groups/${id}`);
        setRequest(response.data);
      } catch (err) {
        console.error("Ошибка загрузки заявки:", err);
        setError("Не удалось загрузить заявку");
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [id, isDesktop]);

  const handleClose = () => {
    router.push("/client?tab=requests");
  };

  const handleRequestUpdated = () => {
    router.push("/client?tab=requests");
  };

  const handleDelete = useCallback(async (subRequest: SubRequest) => {
    try {
      await api.delete(`/requests/${subRequest.id}`);
      router.push("/client?tab=requests");
    } catch {
      // ошибка обрабатывается в RequestDetails / toast
    }
  }, [router]);

  if (isDesktop) return null;

  if (loading) {
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
          onClick={() => router.push("/client?tab=requests")}
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
      <RequestDetails
        request={request}
        onClose={handleClose}
        onRequestUpdated={handleRequestUpdated}
        sourceTab="my-requests"
        hideFullModeButton
        userRole="client"
        fullModeRedirectBase="/client"
        onDelete={handleDelete}
      />
    </div>
  );
}
