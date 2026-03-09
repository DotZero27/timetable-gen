"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CalendarIcon } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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

const SLOTS = [
  { value: "FORENOON", label: "Forenoon" },
  { value: "AFTERNOON", label: "Afternoon" },
];

function buildByDate(examSlots) {
  const byDate = new Map();
  for (const s of examSlots || []) {
    if (!byDate.has(s.date)) byDate.set(s.date, {});
    byDate.get(s.date)[s.slot] = s;
  }
  return byDate;
}

function AddAssignmentForm({ date, subjects, fixedAssignments, onAdd, onClose }) {
  const [subjectId, setSubjectId] = React.useState("");
  const [slot, setSlot] = React.useState("FORENOON");

  const used = React.useMemo(() => {
    const set = new Set();
    for (const a of fixedAssignments) {
      if (a.date === date) set.add(`${a.slot}:${a.subjectId}`);
    }
    return set;
  }, [date, fixedAssignments]);

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!subjectId) return;
    const key = `${slot}:${subjectId}`;
    if (used.has(key)) return;
    const sub = subjects.find((s) => s.id === Number(subjectId));
    if (!sub) return;
    onAdd({
      date,
      slot,
      subjectId: sub.id,
      subjectCode: sub.code,
      subjectName: sub.name,
    });
    onClose?.();
  };

  const slotTaken = (s) => {
    for (const a of fixedAssignments) {
      if (a.date === date && a.slot === s) return true;
    }
    return false;
  };

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3" noValidate>
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded-md">
        <CalendarIcon className="size-4" />
        <span>{date}</span>
      </div>
      <div>
        <Label className="block mb-1">Subject</Label>
        <Select value={subjectId || undefined} onValueChange={setSubjectId}>
          <SelectTrigger className="w-full" aria-label="Select subject">
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.code} — {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="block mb-1">Slot</Label>
        <Select value={slot} onValueChange={setSlot}>
          <SelectTrigger className="w-full" aria-label="Select slot">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SLOTS.map((s) => (
              <SelectItem key={s.value} value={s.value} disabled={slotTaken(s.value)}>
                {s.label}
                {slotTaken(s.value) ? " (taken)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="sm" disabled={!subjectId}>
        Add
      </Button>
    </form>
  );
}

/**
 * Single calendar component with mode-driven behavior.
 * Composes CalendarComposite primitives; one grid, mode-specific cell content.
 */
export function UnifiedCalendar({
  mode = "view",
  examSlots = [],
  startDate,
  endDate,
  onRangeChange,
  holidayDates = new Set(),
  subjects = [],
  fixedAssignments = [],
  onAdd,
  className,
}) {
  const initialView = React.useMemo(() => {
    if (mode === "view" && examSlots?.length) {
      const first = examSlots[0].date;
      const d = new Date(first + "T12:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    if (mode === "range" || mode === "assign") {
      const d = startDate
        ? new Date(startDate + "T12:00:00")
        : new Date();
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, [mode, examSlots?.[0]?.date, startDate]);

  const [viewDate, setViewDate] = React.useState(initialView);
  const [popoverOpenDate, setPopoverOpenDate] = React.useState(null);

  React.useEffect(() => {
    if (mode === "view" && examSlots?.length) {
      const first = examSlots[0].date;
      const d = new Date(first + "T12:00:00");
      setViewDate({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [mode, examSlots]);

  React.useEffect(() => {
    if ((mode === "range" || mode === "assign") && startDate) {
      const d = new Date(startDate + "T12:00:00");
      setViewDate({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [mode, startDate]);

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
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: prev.month - 1 }
    );
  };

  const goNext = () => {
    setViewDate((prev) =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: prev.month + 1 }
    );
  };

  const byDate = React.useMemo(
    () => (mode === "view" ? buildByDate(examSlots) : new Map()),
    [mode, examSlots]
  );

  const assignmentsByDate = React.useMemo(() => {
    const m = new Map();
    for (const a of fixedAssignments || []) {
      if (!m.has(a.date)) m.set(a.date, []);
      m.get(a.date).push(a);
    }
    return m;
  }, [fixedAssignments]);

  const handleDayClickRange = (date) => {
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

  const assignInRange = (iso) => {
    if (!startDate || !endDate) return true;
    return iso >= startDate && iso <= endDate;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn("", className)}
      role="application"
      aria-label={
        mode === "view"
          ? "Schedule calendar"
          : mode === "range"
            ? "Date range picker"
            : "Assign subject to date"
      }
    >
      <CalendarNav
        monthLabel={monthLabel}
        onPrev={goPrev}
        onNext={goNext}
      />
      <CalendarFrame>
        <CalendarWeekdayRow />
        <CalendarDayGrid>
          {grid.map((date, idx) => {
            if (!date) {
              return <CalendarEmptyCell key={`empty-${idx}`} />;
            }
            const iso = toISODate(date);
            const dayNum = date.getDate();
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            if (mode === "view") {
              const daySlots = byDate.get(iso) || {};
              const forenoon = daySlots.FORENOON;
              const afternoon = daySlots.AFTERNOON;
              const hasExams = forenoon || afternoon;
              return (
                <div
                  key={iso}
                  className={calendarDayCellStyles({
                    isWeekend,
                    hasHighlight: hasExams,
                  })}
                >
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      hasExams ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {dayNum}
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
            }

            if (mode === "range") {
              const isHoliday = holidayDates.has(iso);
              const isStart = iso === startDate;
              const isEnd = iso === endDate;
              const inRange = isInRange(iso);
              return (
                <motion.button
                  key={iso}
                  type="button"
                  onClick={() => handleDayClickRange(date)}
                  initial={false}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    calendarDayCellStyles({ isWeekend, hasHighlight: false }),
                    "cursor-pointer items-center justify-start transition-colors text-left",
                    isHoliday &&
                    !inRange &&
                    !isStart &&
                    !isEnd &&
                    "bg-destructive/10 text-destructive/80",
                    inRange && "bg-primary/10",
                    (isStart || isEnd) && "bg-primary/50 font-semibold",
                    (isStart || isEnd) && "ring-2 ring-primary/40 ring-inset"
                  )}
                  title={
                    isHoliday
                      ? `Holiday: ${iso}`
                      : isWeekend
                        ? "Weekend"
                        : iso
                  }
                  aria-label={`Select date ${iso}`}
                >
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      (isStart || isEnd) && "text-primary-foreground",
                      inRange && !isStart && !isEnd && "text-primary"
                    )}
                  >
                    {dayNum}
                  </span>
                </motion.button>
              );
            }

            if (mode === "assign") {
              const isHoliday = holidayDates.has(iso);
              const hasAssignment = (assignmentsByDate.get(iso) || []).length > 0;
              const inRangeDay = assignInRange(iso);
              const canAssign = inRangeDay && !isWeekend && !isHoliday;
              const isStart = iso === startDate;
              const isEnd = iso === endDate;
              const inRange = isInRange(iso);

              return (
                <Popover
                  key={iso}
                  modal={false}
                  open={popoverOpenDate === iso}
                  onOpenChange={(open) => {
                    if (!open) setPopoverOpenDate(null);
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={!canAssign}
                      className={cn(
                        calendarDayCellStyles({
                          isWeekend,
                          hasHighlight: hasAssignment,
                        }),
                        canAssign &&
                        "hover:bg-primary/40 cursor-pointer transition-colors",
                        !canAssign && "cursor-not-allowed opacity-60",
                        isHoliday && "bg-destructive/10 text-destructive/80",
                        inRange && !isHoliday && "bg-primary/10",
                        (isStart || isEnd) &&
                        !isHoliday &&
                        "bg-primary/50 font-semibold ring-2 ring-primary/40 ring-inset hover:bg-primary/90"
                      )}
                      onClick={() => canAssign && setPopoverOpenDate(iso)}
                      aria-label={
                        canAssign
                          ? `Assign subject to ${iso}`
                          : `Date ${iso} (weekend or holiday)`
                      }
                    >
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          hasAssignment
                            ? "text-primary"
                            : (isStart || isEnd)
                              ? "text-primary-foreground"
                              : inRange
                                ? "text-primary"
                                : "text-muted-foreground"
                        )}
                      >
                        {dayNum}
                      </span>
                      {hasAssignment && (
                        <span className="text-[10px] text-primary font-normal">
                          {(assignmentsByDate.get(iso) || []).length}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72" align="start">
                    <PopoverHeader>
                      <PopoverTitle>Assign subject</PopoverTitle>
                      <PopoverDescription>
                        Add an exam for {iso}. Choose subject and slot.
                      </PopoverDescription>
                    </PopoverHeader>
                    <AddAssignmentForm
                      date={iso}
                      subjects={subjects}
                      fixedAssignments={fixedAssignments}
                      onAdd={(payload) => {
                        onAdd?.(payload);
                        setPopoverOpenDate(null);
                      }}
                      onClose={() => setPopoverOpenDate(null)}
                    />
                  </PopoverContent>
                </Popover>
              );
            }

            return null;
          })}
        </CalendarDayGrid>
      </CalendarFrame>
      <div className="space-y-2 mt-4">
        {mode === "range" && (
          <>
            <p className="text-xs text-muted-foreground">
              Click a date for the first exam day, then click the last exam day.
              Weekends and holidays are marked; exams are only on working days.
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
          </>
        )}
        {mode === "assign" && startDate && endDate && (
          <p className="text-sm">
            <span className="font-medium">Range: </span>
            <span className="text-muted-foreground">
              {startDate} — {endDate}
            </span>
          </p>
        )}
      </div>

    </motion.div>
  );
}

/** Alias for public API */
export { UnifiedCalendar as ScheduleCalendar };
