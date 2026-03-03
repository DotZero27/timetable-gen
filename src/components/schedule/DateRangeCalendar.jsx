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

/**
 * Calendar view for selecting a date range by clicking.
 * Same styling as schedule MonthCalendar: bordered cells, min-h-[88px], shared composite.
 */
export function DateRangeCalendar({
  startDate,
  endDate,
  onRangeChange,
  holidayDates = new Set(),
  className,
}) {
  const [currentMonth, setCurrentMonth] = React.useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const days = React.useMemo(() => getMonthGrid(year, month), [year, month]);

  const handleDayClick = (date) => {
    if (!date || !onRangeChange) return;
    const iso = toISODate(date);
    if (!startDate) {
      onRangeChange({ startDate: iso, endDate: null });
      return;
    }
    if (startDate && !endDate) {
      if (iso < startDate) {
        onRangeChange({ startDate: iso, endDate: null });
      } else {
        onRangeChange({ startDate, endDate: iso });
      }
      return;
    }
    onRangeChange({ startDate: iso, endDate: null });
  };

  const isInRange = (iso) => {
    if (!startDate) return false;
    if (!endDate) return iso === startDate;
    return iso >= startDate && iso <= endDate;
  };

  const goPrev = () => {
    setCurrentMonth((m) => {
      const next = new Date(m);
      next.setMonth(next.getMonth() - 1);
      next.setDate(1);
      return next;
    });
  };

  const goNext = () => {
    setCurrentMonth((m) => {
      const next = new Date(m);
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      return next;
    });
  };

  const monthLabel = currentMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className={cn("space-y-4", className)}>
      <CalendarNav monthLabel={monthLabel} onPrev={goPrev} onNext={goNext} />
      <CalendarFrame>
        <CalendarWeekdayRow />
        <CalendarDayGrid>
          {days.map((date, idx) => {
            if (!date) {
              return <CalendarEmptyCell key={`empty-${idx}`} />;
            }
            const iso = toISODate(date);
            const day = date.getDate();
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isHoliday = holidayDates.has(iso);
            const isStart = iso === startDate;
            const isEnd = iso === endDate;
            const inRange = isInRange(iso);
            const hasHighlight = inRange || isStart || isEnd;

            return (
              <motion.button
                key={iso}
                type="button"
                onClick={() => handleDayClick(date)}
                initial={false}
                animate={{
                  backgroundColor: isStart || isEnd
                    ? "hsl(var(--primary))"
                    : inRange
                      ? "hsl(var(--primary) / 0.5)"
                      : "transparent",
                  color: isStart || isEnd ? "hsl(var(--primary-foreground))" : inRange ? "hsl(var(--primary))" : "inherit",
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  calendarDayCellStyles({ isWeekend, hasHighlight: false }),
                  "cursor-pointer items-start justify-start transition-colors",
                  isHoliday && !inRange && !isStart && !isEnd && "bg-destructive/10 text-destructive/80",
                  // Entire range start→end: one continuous highlight (every date in [start, end])
                  inRange && "bg-primary/10!",
                  (isStart || isEnd) && "bg-primary/50!",
                  (isStart || isEnd) && "font-semibold",
                  isStart && "ring-2 ring-primary/40 ring-inset",
                  isEnd && "ring-2 ring-primary/40 ring-inset"
                )}
                title={isHoliday ? `Holiday: ${iso}` : isWeekend ? "Weekend" : iso}
              >
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    (isStart || isEnd) && "text-primary-foreground",
                    inRange && !isStart && !isEnd && "text-primary"
                  )}
                >
                  {day}
                </span>
              </motion.button>
            );
          })}
        </CalendarDayGrid>
      </CalendarFrame>
      <p className="text-xs text-muted-foreground">
        Click a date to set start, then click a later date to set end. Weekends and holidays are shown; exams are only scheduled on weekdays excluding holidays.
      </p>
      {startDate && (
        <p className="text-sm">
          <span className="font-medium">Range: </span>
          <span className="text-muted-foreground">
            {startDate}
            {endDate ? ` — ${endDate}` : " (click end date)"}
          </span>
        </p>
      )}
    </div>
  );
}
