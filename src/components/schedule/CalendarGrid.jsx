"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { SlotCard } from "./SlotCard";
import { UnifiedCalendar } from "./UnifiedCalendar";
import { cn } from "@/lib/utils";
import { canCoexistInSlot } from "@/lib/schedule/slotRules";

const SLOT_ORDER = ["FORENOON", "AFTERNOON"];

/**
 * Build sorted list of dates and a map: date -> slot -> examSlot[].
 */
function buildCalendarData(examSlots) {
  const byDate = new Map();
  for (const s of examSlots || []) {
    if (!byDate.has(s.date)) byDate.set(s.date, { FORENOON: [], AFTERNOON: [] });
    byDate.get(s.date)[s.slot].push(s);
  }
  const dates = Array.from(byDate.keys()).sort();
  return { dates, byDate };
}

function hasSlotConflict(entries) {
  const placed = [];
  for (const entry of entries || []) {
    const result = canCoexistInSlot(placed, entry);
    if (!result.ok) return true;
    placed.push(entry);
  }
  return false;
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
                const daySlots = byDate.get(date) || { FORENOON: [], AFTERNOON: [] };
                const exams = daySlots[slotType] || [];
                const showConflict = hasSlotConflict(exams);
                return (
                  <td
                    key={date}
                    className="p-2.5 align-top min-w-[140px] border-r border-border/40"
                  >
                    {exams.length > 0 ? (
                      <div className="space-y-2">
                        {exams.map((exam) => (
                          <SlotCard
                            key={`${exam.subjectCode}:${exam.departmentId}:${exam.slot}:${exam.date}`}
                            subjectName={exam.subjectName}
                            subjectCode={exam.subjectCode}
                            semesterNumber={exam.semesterNumber}
                            slot={exam.slot}
                            departmentName={exam.departmentName}
                            isElective={exam.isElective}
                            electiveGroupId={exam.electiveGroupId}
                          />
                        ))}
                        {showConflict && (
                          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                            Invalid: slot conflict
                          </div>
                        )}
                      </div>
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
export function CalendarGrid({ examSlots, viewMode = "day", onDayClick, selectedDay, className }) {
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
      <UnifiedCalendar
        mode="view"
        examSlots={examSlots}
        onDayClick={onDayClick}
        selectedDay={selectedDay}
        className={className}
      />
    );
  }

  return <ScheduleTable examSlots={examSlots} className={className} />;
}
