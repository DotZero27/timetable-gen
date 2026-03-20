"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "./queryKeys";

/**
 * @param {{ code: string, name: string, semesterId: number }} payload
 */
async function addSubject(payload) {
  const res = await fetch("/api/subjects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: payload.code.trim(),
      name: payload.name.trim(),
      semesterId: Number(payload.semesterId),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Failed to add subject");
    throw err;
  }
  return data;
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
