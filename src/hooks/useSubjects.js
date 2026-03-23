"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

async function fetchSubjects(semesterId) {
  const url =
    semesterId != null && semesterId !== ""
      ? `/subjects?semesterId=${semesterId}`
      : "/subjects";
  const res = await apiClient.get(url);
  const list = res?.data;
  return Array.isArray(list) ? list : [];
}

export function useSubjects(semesterId) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.subjects.list(semesterId),
    queryFn: () => fetchSubjects(semesterId),
  });
  return {
    data: data ?? [],
    isLoading,
  };
}
