"use client"

import { QRCodeSVG } from "qrcode.react"
import { QrCode, ArrowLeft } from "lucide-react"
import Link from "next/link"

const DEMO_QR_PAYLOAD = JSON.stringify({
  bookingId: -1,
  demo: true,
  roomId: 1,
  tablesRemaining: 6,
})

export default function DemoQRPage() {
  return (
    <div className="flex flex-col min-h-screen bg-black">
      <div className="pt-12 px-3 pb-4">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-medium">Назад</span>
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <QrCode className="h-6 w-6 text-[#F35713]" />
          <h1 className="text-xl font-bold text-white">Демо QR код</h1>
        </div>
        <p className="text-sm text-white/60">
          Отсканируйте этот QR в разделе «Сканировать QR» для проверки работы сканера (демо-режим).
        </p>
      </div>

      <div className="flex-1 px-3 pb-24 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4 bg-[#1C1C1E] rounded-[10px] p-6 w-full max-w-sm">
          <div className="p-4 bg-white rounded-[10px] border-2 border-[#F35713]/30">
            <QRCodeSVG
              value={DEMO_QR_PAYLOAD}
              size={220}
              level="H"
              includeMargin={true}
            />
          </div>
          <p className="text-sm text-center text-white/60">
            Демо QR для тестирования сканирования бронирований
          </p>
          <p className="text-xs text-center text-white/40">
            В приложении: Заявки → Сканировать QR → откройте сканер и наведите на этот код
          </p>
        </div>
      </div>
    </div>
  )
}
