"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "./queryKeys";

/**
 * @param {{ date: string, label?: string | null }} payload
 */
async function addHoliday(payload) {
  const res = await fetch("/api/holidays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: payload.date,
      label: payload.label?.trim() || null,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Failed to add date");
    throw err;
  }
  return data;
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
