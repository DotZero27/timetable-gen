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

/**
 * Composite: header (version info) + view mode toggle (by day / month) + CalendarGrid.
 * Used when a schedule version is selected.
 */
export function CalendarView({ schedule, onDayClick, selectedDay, className }) {
  if (!schedule) return null;

  const [viewMode, setViewMode] = React.useState("month");
  const { id, versionNumber, name, cycle, createdAt, status, examSlots } = schedule;

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
            <CardTitle className="text-lg font-semibold tracking-tight">{name || `Schedule ${versionNumber}`}</CardTitle>
            <p className="text-[13px] text-muted-foreground">
              {cycle === "EVEN" ? "Even semesters" : "Odd semesters"} · Created {new Date(createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={toggleContainerClass} role="tablist" aria-label="Calendar view mode">
              {VIEW_MODES.map((mode) => {
                const Icon = mode.icon;
                const selected = viewMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-label={mode.label}
                    onClick={() => setViewMode(mode.id)}
                    className={cn(
                      "relative inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      selected
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    {selected && (
                      <motion.div
                        layoutId="calViewToggle"
                        className="absolute inset-0 rounded-md bg-background shadow-sm ring-1 ring-border/50"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className="text-xs relative z-10 flex items-center gap-2">
                      <Icon className="size-4 shrink-0" />
                      {mode.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <Badge variant={status === "published" ? "default" : "secondary"} className="text-[11px]">
              {status === "published" ? "Final" : "Draft"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <CalendarGrid
            examSlots={examSlots}
            viewMode={viewMode}
            onDayClick={onDayClick}
            selectedDay={selectedDay}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
