"use client"

import React, { useMemo, useState } from "react"
import { Building2, FileText, ChevronDown, ChevronRight } from "lucide-react"
import { RequestGroup } from "@/stores/useRequestStore"
import { Office } from "@/lib/api"
import Image from "next/image"

interface ExecutorRoomsRequestsViewProps {
  offices: Office[]
  myRequests: RequestGroup[]
  assignedRequests: RequestGroup[]
  completedRequests: RequestGroup[]
  onRequestClick: (request: RequestGroup) => void
}

// Проверяет, связана ли заявка с офисом (по office_id или location_detail)
function requestMatchesOffice(req: RequestGroup, office: Office): boolean {
  if (req.office_id === office.id || req.office?.id === office.id) return true
  const location = (req.location_detail || req.location || "").toLowerCase()
  const officeName = (office.name || "").toLowerCase()
  const officeCity = (office.city || "").toLowerCase()
  return (
    location.includes(officeName) ||
    location.includes(officeCity) ||
    req.requests?.some(
      (sr) => {
        const srLoc = (sr.location_detail || sr.location || "").toLowerCase()
        return srLoc.includes(officeName) || srLoc.includes(officeCity)
      }
    )
  )
}

export function ExecutorRoomsRequestsView({
  offices,
  myRequests,
  assignedRequests,
  completedRequests,
  onRequestClick,
}: ExecutorRoomsRequestsViewProps) {
  const [expandedOfficeId, setExpandedOfficeId] = useState<number | null>(null)
  const allRequests = useMemo(
    () => [...myRequests, ...assignedRequests, ...completedRequests],
    [myRequests, assignedRequests, completedRequests]
  )

  const officeWithRequests = useMemo(
    () =>
      offices.map((office) => ({
        office,
        requests: allRequests.filter((r) => requestMatchesOffice(r, office)),
      })),
    [offices, allRequests]
  )

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "in_progress":
        return "В обработке"
      case "execution":
        return "Исполнение"
      case "completed":
        return "Завершено"
      case "assigned":
        return "Назначено"
      case "awaiting_assignment":
        return "Ожидает назначения"
      default:
        return status
    }
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Сервисные заявки по офисам</h2>
        <p className="text-sm text-white/80 mt-1">
          Просмотр заявок, связанных с офисами и переговорными комнатами
        </p>
      </div>

      {officeWithRequests.map(({ office, requests }) => {
        const isExpanded = expandedOfficeId === office.id
        return (
          <div
            key={office.id}
            className="rounded-2xl overflow-hidden"
            style={{ background: "#D94F15" }}
          >
            <button
              onClick={() =>
                setExpandedOfficeId(isExpanded ? null : office.id)
              }
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-white/10">
                {office.photo ? (
                  <Image
                    src={office.photo}
                    alt={office.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white">{office.name}</h3>
                <p className="text-sm text-white/80 truncate">
                  {office.city}
                  {requests.length > 0 && ` • ${requests.length} заявок`}
                </p>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-white flex-shrink-0" />
              ) : (
                <ChevronRight className="w-5 h-5 text-white flex-shrink-0" />
              )}
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 space-y-2">
                {requests.length === 0 ? (
                  <p className="text-white/70 text-sm py-2">
                    Нет заявок по этому офису
                  </p>
                ) : (
                  requests.map((req) => (
                    <button
                      key={req.id}
                      onClick={() => onRequestClick(req)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-left transition-colors"
                    >
                      <FileText className="w-5 h-5 text-white flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          Заявка #{req.id}
                        </p>
                        <p className="text-xs text-white/70 truncate">
                          {req.location_detail || req.location || "—"}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white flex-shrink-0">
                        {getStatusLabel(req.status)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
