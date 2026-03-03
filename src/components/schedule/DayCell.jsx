"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { SlotCard } from "./SlotCard";
import { cn } from "@/lib/utils";

const SLOT_ORDER = ["FORENOON", "AFTERNOON"];

/**
 * Composite: one day cell with date and up to two slot cards (Forenoon, Afternoon).
 * Children of CalendarGrid.
 */
export function DayCell({ date, slots, index }) {
  const forenoon = slots.find((s) => s.slot === "FORENOON");
  const afternoon = slots.find((s) => s.slot === "AFTERNOON");
  const dayLabel = React.useMemo(() => {
    const d = new Date(date + "T12:00:00");
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  }, [date]);

  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={cn(
        "rounded-lg border bg-card p-3 flex flex-col gap-2 min-h-[120px]",
        "shadow-sm hover:shadow-md transition-shadow"
      )}
    >
      <header className="text-xs font-semibold text-muted-foreground border-b pb-1.5">
        {dayLabel}
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
        {SLOT_ORDER.map((slotType) => {
          const exam = slotType === "FORENOON" ? forenoon : afternoon;
          if (!exam) {
            return (
              <div
                key={slotType}
                className="rounded border border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground py-2"
              >
                No exam
              </div>
            );
          }
          return (
            <SlotCard
              key={exam.id}
              subjectName={exam.subjectName}
              subjectCode={exam.subjectCode}
              semesterNumber={exam.semesterNumber}
              slot={exam.slot}
            />
          );
        })}
      </div>
    </motion.article>
  );
}
