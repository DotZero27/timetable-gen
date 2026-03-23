"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  CalendarNav,
  CalendarFrame,
  CalendarWeekdayRow,
  CalendarDayGrid,
  CalendarEmptyCell,
  calendarDayCellStyles,
  toISODate,
  getMonthGrid,
} from "@/components/schedule/CalendarComposite";
import { cn } from "@/lib/utils";

function buildByDate(examSlots) {
  const byDate = new Map();
  for (const s of examSlots || []) {
    if (!byDate.has(s.date)) byDate.set(s.date, { FORENOON: [], AFTERNOON: [] });
    byDate.get(s.date)[s.slot].push(s);
  }
  return byDate;
}

/**
 * Monthly calendar view: one month grid (Sun–Sat), each cell shows day number and exams.
 * Uses shared Calendar composite (same styling as schedule calendar).
 */
export function MonthCalendar({ examSlots, className }) {
  const byDate = React.useMemo(() => buildByDate(examSlots), [examSlots]);

  const [viewDate, setViewDate] = React.useState(() => {
    if (examSlots?.length) {
      const first = examSlots[0].date;
      const d = new Date(first + "T12:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  React.useEffect(() => {
    if (examSlots?.length) {
      const first = examSlots[0].date;
      const d = new Date(first + "T12:00:00");
      setViewDate({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [examSlots]);

  const grid = React.useMemo(
    () => getMonthGrid(viewDate.year, viewDate.month),
    [viewDate.year, viewDate.month]
  );

  const monthLabel = React.useMemo(
    () =>
      new Date(viewDate.year, viewDate.month, 1).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
    [viewDate.year, viewDate.month]
  );

  const goPrev = () => {
    setViewDate((prev) =>
      prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }
    );
  };

  const goNext = () => {
    setViewDate((prev) =>
      prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }
    );
  };

  if (!examSlots?.length) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("w-full", className)}
    >
      <CalendarNav monthLabel={monthLabel} onPrev={goPrev} onNext={goNext} className="mb-4" />
      <CalendarFrame>
        <CalendarWeekdayRow />
        <CalendarDayGrid>
          {grid.map((date, idx) => {
            if (!date) {
              return <CalendarEmptyCell key={`empty-${idx}`} />;
            }
            const iso = toISODate(date);
            const daySlots = byDate.get(iso) || { FORENOON: [], AFTERNOON: [] };
            const forenoons = daySlots.FORENOON || [];
            const afternoons = daySlots.AFTERNOON || [];
            const hasExams = forenoons.length > 0 || afternoons.length > 0;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <div
                key={iso}
                className={calendarDayCellStyles({ isWeekend, hasHighlight: hasExams })}
              >
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    hasExams ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {date.getDate()}
                </span>
                {forenoons.length > 0 && (
                  <div
                    className="text-[10px] truncate rounded-md bg-primary/15 px-1.5 py-0.5 text-primary font-medium"
                    title={forenoons.map((s) => s.subjectName).join(", ")}
                  >
                    FN: {forenoons[0].subjectCode}
                    {forenoons.length > 1 ? ` +${forenoons.length - 1}` : ""}
                  </div>
                )}
                {afternoons.length > 0 && (
                  <div
                    className="text-[10px] truncate rounded-md bg-primary/15 px-1.5 py-0.5 text-primary font-medium"
                    title={afternoons.map((s) => s.subjectName).join(", ")}
                  >
                    AN: {afternoons[0].subjectCode}
                    {afternoons.length > 1 ? ` +${afternoons.length - 1}` : ""}
                  </div>
                )}
                {(forenoons.length > 1 || afternoons.length > 1) && (
                  <div className="text-[10px] rounded-md border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-destructive">
                    Invalid duplicate slot exams
                  </div>
                )}
              </div>
            );
          })}
        </CalendarDayGrid>
      </CalendarFrame>
    </motion.div>
  );
}
