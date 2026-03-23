"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

/**
 * @param {{ cycle: string, startDate: string, endDate: string, semesterIds: number[], fixedAssignments: { date: string, slot: string, subjectCode: string }[] }} payload
 */
async function generateSchedule(payload) {
  const res = await apiClient.post("/schedules/generate", {
    cycle: payload.cycle,
    startDate: payload.startDate,
    endDate: payload.endDate,
    semesterIds: payload.semesterIds,
    fixedAssignments: (payload.fixedAssignments || []).map((a) => ({
      date: a.date,
      slot: a.slot,
      subjectCode: a.subjectCode,
    })),
  });
  return res?.data;
}

export function useGenerateSchedule() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: generateSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
      toast.success("Schedule generated");
    },
    onError: (err) => {
      toast.error(err.message || "Generation failed");
    },
  });
  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
