"use client";

import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
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
import { CalendarIcon } from "lucide-react";
import { Label } from "@/components/ui/label";

const SLOTS = [
  { value: "FORENOON", label: "Forenoon" },
  { value: "AFTERNOON", label: "Afternoon" },
];

/**
 * Calendar that shows a month; clicking a date opens a popover to assign a subject.
 * Uses shared Calendar composite (same styling as schedule calendar).
 */
export function AssignmentCalendar({
  startDate,
  endDate,
  subjects = [],
  fixedAssignments = [],
  onAdd,
  holidayDates = new Set(),
  className,
}) {
  const [viewMonth, setViewMonth] = React.useState(() => {
    if (startDate) {
      const d = new Date(startDate + "T12:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [popoverOpenDate, setPopoverOpenDate] = React.useState(null);

  React.useEffect(() => {
    if (startDate) {
      const d = new Date(startDate + "T12:00:00");
      setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [startDate]);

  const grid = React.useMemo(
    () => getMonthGrid(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month]
  );

  const monthLabel = new Date(viewMonth.year, viewMonth.month, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const goPrev = () => {
    setViewMonth((prev) =>
      prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }
    );
  };

  const goNext = () => {
    setViewMonth((prev) =>
      prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }
    );
  };

  const assignmentsByDate = React.useMemo(() => {
    const m = new Map();
    for (const a of fixedAssignments) {
      if (!m.has(a.date)) m.set(a.date, []);
      m.get(a.date).push(a);
    }
    return m;
  }, [fixedAssignments]);

  const inRange = (iso) => {
    if (!startDate || !endDate) return true;
    return iso >= startDate && iso <= endDate;
  };

  return (
    <div className={cn("space-y-4", className)}>
      <CalendarNav monthLabel={monthLabel} onPrev={goPrev} onNext={goNext} />
      <CalendarFrame>
        <CalendarWeekdayRow />
        <CalendarDayGrid>
          {grid.map((date, idx) => {
            if (!date) {
              return <CalendarEmptyCell key={`e-${idx}`} />;
            }
            const iso = toISODate(date);
            const dayNum = date.getDate();
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isHoliday = holidayDates.has(iso);
            const hasAssignment = (assignmentsByDate.get(iso) || []).length > 0;
            const inRangeDay = inRange(iso);
            const canAssign = inRangeDay && !isWeekend && !isHoliday;

            return (
              <Popover
                key={iso}
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
                      calendarDayCellStyles({ isWeekend, hasHighlight: hasAssignment }),
                      canAssign && "hover:bg-accent cursor-pointer transition-colors",
                      !canAssign && "cursor-not-allowed opacity-60",
                      isHoliday && "bg-destructive/10 text-destructive/80"
                    )}
                    onClick={() => canAssign && setPopoverOpenDate(iso)}
                  >
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        hasAssignment ? "text-primary" : "text-muted-foreground"
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
                      onAdd(payload);
                      setPopoverOpenDate(null);
                    }}
                  />
                </PopoverContent>
              </Popover>
            );
          })}
        </CalendarDayGrid>
      </CalendarFrame>
    </div>
  );
}

function AddAssignmentForm({ date, subjects, fixedAssignments, onAdd }) {
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
  };

  const slotTaken = (s) => {
    for (const a of fixedAssignments) {
      if (a.date === date && a.slot === s) return true;
    }
    return false;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 space-y-3"
      noValidate
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-2 rounded-md">
        <CalendarIcon className="size-4" />
        <span>{date}</span>
      </div>
      <div>
        <Label className="block mb-1">Subject</Label>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Select subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} — {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label className="block mb-1">Slot</Label>
        <select
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {SLOTS.map((s) => (
            <option key={s.value} value={s.value} disabled={slotTaken(s.value)}>
              {s.label}
              {slotTaken(s.value) ? " (taken)" : ""}
            </option>
          ))}
        </select>
      </div>
      <Button type="button" size="sm" disabled={!subjectId} onClick={handleSubmit}>
        Add
      </Button>
    </form>
  );
}
