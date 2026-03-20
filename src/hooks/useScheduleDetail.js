"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

async function fetchScheduleDetail(versionId) {
  const res = await fetch(`/api/schedules/${versionId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to get schedule");
  }
  return res.json();
}

export function useScheduleDetail(versionId) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.schedules.detail(versionId),
    queryFn: () => fetchScheduleDetail(versionId),
    enabled: !!versionId,
  });
  return {
    data: data ?? null,
    isLoading,
  };
}
