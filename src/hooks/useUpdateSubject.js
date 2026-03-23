"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

/**
 * @param {{ code: string, name?: string, semesterId?: number, departmentIds?: number[], isElective?: boolean, electiveGroupId?: string }} payload
 */
async function updateSubject(payload) {
  const res = await apiClient.put("/subjects", {
    ...payload,
    electiveGroupId:
      payload.electiveGroupId === undefined
        ? undefined
        : String(payload.electiveGroupId).trim(),
  });
  return res?.data;
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: updateSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all });
      toast.success("Subject updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update subject");
    },
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
  };
}
