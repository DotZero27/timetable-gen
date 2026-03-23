"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

async function fetchDepartments() {
  const res = await apiClient.get("/departments");
  const list = res?.data;
  return Array.isArray(list) ? list : [];
}

export function useDepartments() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.departments.all,
    queryFn: fetchDepartments,
  });
  return {
    data: data ?? [],
    isLoading,
  };
}
