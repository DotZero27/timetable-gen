"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

/**
 * @param {{ code: string, name: string, semesterId: number, departmentIds: number[], isElective?: boolean, electiveGroupId?: string }} payload
 */
async function addSubject(payload) {
  const res = await apiClient.post("/subjects", {
    code: payload.code.trim(),
    name: payload.name.trim(),
    semesterId: Number(payload.semesterId),
    departmentIds: (payload.departmentIds || []).map((id) => Number(id)),
    isElective: payload.isElective === true,
    electiveGroupId: String(payload.electiveGroupId ?? "").trim(),
  });
  return res?.data;
}

export function useAddSubject() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: addSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all });
      toast.success("Subject added");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add subject");
    },
  });
  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
