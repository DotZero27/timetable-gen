"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Calendar, CalendarDays } from "lucide-react";
import { CalendarGrid } from "./CalendarGrid";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VIEW_MODES = [
  { id: "day", label: "By day", icon: Calendar },
  { id: "month", label: "Month", icon: CalendarDays },
];

/** Shared calendar view toggle styles (day/month) */
const toggleContainerClass =
  "inline-flex rounded-lg border border-input bg-muted/30 p-1 shadow-inner";
const toggleButtonClass = (selected) =>
  cn(
    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
    selected
      ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
  );

/**
 * Composite: header (version info) + view mode toggle (by day / month) + CalendarGrid.
 * Used when a schedule version is selected.
 */
export function CalendarView({ schedule, className }) {
  if (!schedule) return null;

  const [viewMode, setViewMode] = React.useState("day");
  const { id, versionNumber, cycle, createdAt, status, examSlots } = schedule;

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("w-full", className)}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="text-xl">Schedule v{versionNumber}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cycle: {cycle} · Created {new Date(createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={toggleContainerClass} role="tablist">
              {VIEW_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    role="tab"
                    aria-selected={viewMode === mode.id}
                    onClick={() => setViewMode(mode.id)}
                    className={toggleButtonClass(viewMode === mode.id)}
                  >
                    <Icon className="size-4 shrink-0" />
                    {mode.label}
                  </button>
                );
              })}
            </div>
            <Badge variant={status === "published" ? "default" : "secondary"}>
              {status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <CalendarGrid examSlots={examSlots} viewMode={viewMode} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
