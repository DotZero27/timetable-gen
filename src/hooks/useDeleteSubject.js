"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

async function deleteSubject(code) {
  await apiClient.delete(`/subjects?code=${encodeURIComponent(code)}`);
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all });
      toast.success("Subject deleted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete subject");
    },
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    pendingCode: mutation.variables,
  };
}
