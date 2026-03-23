"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

async function fetchSchedules() {
  const res = await apiClient.get("/schedules");
  const list = res?.data;
  return Array.isArray(list) ? list : [];
}

export function useSchedules() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.schedules.all,
    queryFn: fetchSchedules,
  });
  return {
    data: data ?? [],
    isLoading,
    refetch,
  };
}
