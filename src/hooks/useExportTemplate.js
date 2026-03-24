"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

async function fetchExportTemplate(versionId) {
  const res = await apiClient.get(`/export-templates?scheduleVersionId=${versionId}`);
  return res?.data;
}

export function useExportTemplate(versionId) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.exportTemplates.detail(versionId),
    queryFn: () => fetchExportTemplate(versionId),
    enabled: !!versionId,
  });
  return {
    data: data ?? null,
    isLoading,
  };
}
