"use client";

import { RequestDetails, type RequestDetailsProps, type RequestDetailsUserRole } from "@/components/RequestDetails";

export type { RequestDetailsUserRole };

/** @deprecated Используйте RequestDetails с userRole для всех ролей. Оставлен для обратной совместимости. */
export function AdminRequestDetailsModal(
  props: Omit<RequestDetailsProps, "userRole"> & {
    userRole?: "admin-worker" | "department-head";
  }
) {
  return (
    <RequestDetails
      {...props}
      userRole={props.userRole ?? "admin-worker"}
      hideFullModeButton={props.hideFullModeButton ?? true}
    />
  );
}
