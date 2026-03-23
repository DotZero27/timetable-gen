"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

async function deleteSchedule(versionId) {
  await apiClient.delete(`/schedules/${versionId}`);
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.schedules.all });
      toast.success("Schedule deleted");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete schedule");
    },
  });
  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
  };
}
