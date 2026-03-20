"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "./queryKeys";

async function deleteSchedule(versionId) {
  const res = await fetch(`/api/schedules/${versionId}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete schedule");
  }
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
