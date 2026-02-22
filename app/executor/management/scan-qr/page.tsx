"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCode, Camera } from "lucide-react";
import { ExecutorMobilePageLayout } from "@/components/executor-mobile/ExecutorMobilePageLayout";
import { QRScanner } from "@/components/QRScanner";

export default function ExecutorScanQrPage() {
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleRefresh = async () => {
    setShowQRScanner(false);
  };

  return (
    <ExecutorMobilePageLayout title="QR сканер" onRefresh={handleRefresh}>
      <div className="space-y-4">
        <div className="rounded-2xl p-6" style={{ background: "#D94F15" }}>
          <h3 className="flex items-center gap-2 text-white font-semibold mb-2">
            <QrCode className="h-5 w-5" />
            Сканирование QR кода
          </h3>
          <p className="text-white/80 text-sm mb-4">
            Отсканируйте QR код бронирования для уменьшения количества столов
          </p>
          <div className="flex flex-col items-center gap-4">
            <Button
              onClick={() => setShowQRScanner(true)}
              className="bg-white text-[#D94F15] hover:bg-white/90"
              size="lg"
            >
              <Camera className="mr-2 h-5 w-5" />
              Открыть сканер
            </Button>
            <p className="text-sm text-white/70 text-center">
              Отсканируйте QR код бронирования, чтобы уменьшить количество доступных столов
            </p>
          </div>
        </div>

        {showQRScanner && (
          <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
            <QRScanner isOpen={showQRScanner} onClose={() => setShowQRScanner(false)} />
          </div>
        )}
      </div>
    </ExecutorMobilePageLayout>
  );
}