"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, CalendarDays } from "lucide-react";
import { useSchedules } from "@/hooks/useSchedules";
import { useDeleteSchedule } from "@/hooks/useDeleteSchedule";
import { VersionSelector } from "@/components/schedule/VersionSelector";
import { Button } from "@/components/ui/button";

export default function SchedulesPage() {
  const { data: versions = [], isLoading } = useSchedules();
  const { mutate: deleteSchedule, isPending: deleteLoading } = useDeleteSchedule();

  const handleDelete = React.useCallback(
    (v) => {
      if (!confirm(`Delete ${v.name || `Schedule ${v.versionNumber}`}?`)) return;
      deleteSchedule(v.id);
    },
    [deleteSchedule]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Schedules</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage generated exam schedules.
          </p>
        </div>
        <Button asChild>
          <Link href="/create">
            <Plus className="size-4 mr-2" />
            Create new
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : versions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center"
        >
          <CalendarDays className="size-10 text-muted-foreground/50 mb-3" />
          <p className="font-medium">No schedules yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create your first exam schedule to get started.
          </p>
          <Button asChild>
            <Link href="/create">
              <Plus className="size-4 mr-2" />
              Create schedule
            </Link>
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {versions.map((v, index) => (
            <Link key={v.id} href={`/schedules/${v.id}`} className="block">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                className="rounded-lg border bg-card px-4 py-4 transition-all hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{v.name || `Schedule ${v.versionNumber}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.cycle === "EVEN" ? "Even semesters" : "Odd semesters"} · {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${v.status === "published" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {v.status === "published" ? "Final" : "Draft"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(v);
                    }}
                    disabled={deleteLoading}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
