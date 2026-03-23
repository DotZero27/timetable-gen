"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

async function fetchScheduleDetail(versionId) {
  const res = await apiClient.get(`/schedules/${versionId}`);
  return res?.data;
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
