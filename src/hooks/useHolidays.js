"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

async function fetchHolidays(from, to) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const url = `/api/holidays${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to list holidays");
  }
  const list = await res.json();
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
