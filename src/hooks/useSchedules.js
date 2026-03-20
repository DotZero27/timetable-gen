"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

async function fetchSchedules() {
  const res = await fetch("/api/schedules");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to list schedules");
  }
  const list = await res.json();
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
