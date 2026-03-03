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
    if (!byDate.has(s.date)) byDate.set(s.date, {});
    byDate.get(s.date)[s.slot] = s;
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
            const daySlots = byDate.get(iso) || {};
            const forenoon = daySlots.FORENOON;
            const afternoon = daySlots.AFTERNOON;
            const hasExams = forenoon || afternoon;
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
                {forenoon && (
                  <div
                    className="text-[10px] truncate rounded-md bg-primary/15 px-1.5 py-0.5 text-primary font-medium"
                    title={forenoon.subjectName}
                  >
                    FN: {forenoon.subjectCode}
                  </div>
                )}
                {afternoon && (
                  <div
                    className="text-[10px] truncate rounded-md bg-primary/15 px-1.5 py-0.5 text-primary font-medium"
                    title={afternoon.subjectName}
                  >
                    AN: {afternoon.subjectCode}
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
