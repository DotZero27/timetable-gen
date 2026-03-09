"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { SlotCard } from "./SlotCard";
import { UnifiedCalendar } from "./UnifiedCalendar";
import { cn } from "@/lib/utils";

const SLOT_ORDER = ["FORENOON", "AFTERNOON"];

/**
 * Build sorted list of dates and a map: date -> { FORENOON?: examSlot, AFTERNOON?: examSlot }.
 */
function buildCalendarData(examSlots) {
  const byDate = new Map();
  for (const s of examSlots || []) {
    if (!byDate.has(s.date)) byDate.set(s.date, {});
    byDate.get(s.date)[s.slot] = s;
  }
  const dates = Array.from(byDate.keys()).sort();
  return { dates, byDate };
}

/**
 * Individual-day table: columns = dates, rows = Forenoon / Afternoon.
 */
function ScheduleTable({ examSlots, className }) {
  const { dates, byDate } = React.useMemo(
    () => buildCalendarData(examSlots),
    [examSlots]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm", className)}
    >
      <table className="w-full border-collapse text-sm min-w-[400px] [&_td:last-child]:border-r-0">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left font-medium text-muted-foreground uppercase tracking-wider p-3 w-28 sticky left-0 bg-muted/50 z-10">
              Slot
            </th>
            {dates.map((date) => {
              const d = new Date(date + "T12:00:00");
              const label = d.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              });
              return (
                <th
                  key={date}
                  className="font-medium text-muted-foreground uppercase tracking-wider p-3 text-center min-w-[140px]"
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {SLOT_ORDER.map((slotType) => (
            <tr key={slotType} className="border-b border-border last:border-b-0">
              <td className="p-2.5 font-medium text-muted-foreground sticky left-0 bg-background z-10 w-28 border-r border-border/40">
                {slotType === "FORENOON" ? "Forenoon" : "Afternoon"}
              </td>
              {dates.map((date) => {
                const daySlots = byDate.get(date) || {};
                const exam = daySlots[slotType];
                return (
                  <td
                    key={date}
                    className="p-2.5 align-top min-w-[140px] border-r border-border/40"
                  >
                    {exam ? (
                      <SlotCard
                        subjectName={exam.subjectName}
                        subjectCode={exam.subjectCode}
                        semesterNumber={exam.semesterNumber}
                        slot={exam.slot}
                      />
                    ) : (
                      <div className="rounded-lg border border-dashed border-muted-foreground/30 py-5 flex items-center justify-center text-muted-foreground text-xs bg-muted/10">
                        —
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

/**
 * Renders schedule in either "day" (table by day) or "month" (monthly calendar) mode.
 */
export function CalendarGrid({ examSlots, viewMode = "day", className }) {
  if (!examSlots?.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-8 text-center text-muted-foreground text-sm",
          className
        )}
      >
        No exams in this schedule.
      </motion.div>
    );
  }

  if (viewMode === "month") {
    return (
      <UnifiedCalendar mode="view" examSlots={examSlots} className={className} />
    );
  }

  return <ScheduleTable examSlots={examSlots} className={className} />;
}
