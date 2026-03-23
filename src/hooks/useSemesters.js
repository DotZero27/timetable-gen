"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

async function fetchSemesters() {
  const res = await apiClient.get("/semesters");
  const list = res?.data;
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
