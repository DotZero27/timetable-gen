"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

/**
 * @param {{ versionId: number, name?: string, semesterGapDays?: number, examSlots: { date: string, slot: "FORENOON" | "AFTERNOON", subjectCode: string, departmentId: number }[] }} payload
 */
async function updateSchedule(payload) {
  const res = await apiClient.put(`/schedules/${payload.versionId}`, {
    name: payload.name,
    semesterGapDays: payload.semesterGapDays,
    examSlots: payload.examSlots,
  });
  return res?.data;
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: updateSchedule,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.detail(variables.versionId) });
      toast.success("Schedule updated");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update schedule");
    },
  });
  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
