"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

async function saveExportTemplate(payload) {
  const res = await apiClient.post("/export-templates", payload);
  return res?.data;
}

export function useSaveExportTemplate() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: saveExportTemplate,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.exportTemplates.detail(variables.scheduleVersionId),
      });
      toast.success("Export template saved");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save export template");
    },
  });
  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
