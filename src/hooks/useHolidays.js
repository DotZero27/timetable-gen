"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

async function fetchHolidays(from, to) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const url = `/holidays${params.toString() ? `?${params}` : ""}`;
  const res = await apiClient.get(url);
  const list = res?.data;
  return Array.isArray(list) ? list : [];
}

export function useHolidays(options = {}) {
  const { from, to } = options;
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.holidays.range(from, to),
    queryFn: () => fetchHolidays(from, to),
  });
  return {
    data: data ?? [],
    isLoading,
  };
}
