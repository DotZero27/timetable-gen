"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

async function fetchSemesters() {
  const res = await fetch("/api/semesters");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to list semesters");
  }
  const list = await res.json();
  return Array.isArray(list) ? list : [];
}

export function useSemesters() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.semesters.all,
    queryFn: fetchSemesters,
  });
  return {
    data: data ?? [],
    isLoading,
  };
}
