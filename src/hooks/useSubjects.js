"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

async function fetchSubjects(semesterId) {
  const url =
    semesterId != null && semesterId !== ""
      ? `/api/subjects?semesterId=${semesterId}`
      : "/api/subjects";
  const res = await fetch(url);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to list subjects");
  }
  const list = await res.json();
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
