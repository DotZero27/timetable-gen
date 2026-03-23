"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "./queryKeys";
import { apiClient } from "@/lib/apiClient";

/**
 * @param {{ date: string, label?: string | null }} payload
 */
async function addHoliday(payload) {
  const res = await apiClient.post("/holidays", {
    date: payload.date,
    label: payload.label?.trim() || null,
  });
  return res?.data;
}

export function useAddHoliday() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: addHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.holidays.all });
      toast.success("Date added");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add date");
    },
  });
  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
