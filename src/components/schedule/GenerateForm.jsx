"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRightIcon, ChevronLeftIcon, Check, CalendarRange, BookOpen, Pin, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "./ErrorAlert";
import { toISODate } from "./CalendarComposite";
import { UnifiedCalendar } from "./UnifiedCalendar";
import { useGenerate } from "./GenerateContext";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const CYCLES = [
  { value: "EVEN", label: "Even semesters (2, 4, 6, 8)" },
  { value: "ODD", label: "Odd semesters (1, 3, 5, 7)" },
];

const STEPS = [
  { id: 1, title: "Choose dates and semesters" },
  { id: 2, title: "Fix specific dates (optional)" },
];

const FORM_ID = "generate-schedule-form";

/** Count working days (exclude weekends and holidays) in [start, end] inclusive. */
function countWorkingDays(startDate, endDate, holidaySet) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    const iso = toISODate(d);
    if (day !== 0 && day !== 6 && !holidaySet.has(iso)) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/**
 * Form progress: stepper with step labels.
 */
function FormProgressStepper() {
  const { step } = useGenerate();
  return (
    <div
      className="flex items-center gap-2"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={2}
      aria-label={`Step ${step} of 2`}
    >
      {STEPS.map((s, idx) => {
        const isActive = step === s.id;
        const isComplete = step > s.id;
        return (
          <React.Fragment key={s.id}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors",
                  isComplete && "border-primary bg-primary text-primary-foreground",
                  isActive && !isComplete && "border-primary bg-background text-foreground",
                  !isActive && !isComplete && "border-muted-foreground/40 bg-muted/30 text-muted-foreground"
                )}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : s.id}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:inline",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.title}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-4 sm:w-6 shrink-0 rounded-full transition-colors",
                  isComplete ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * Create Schedule properties panel content (exam batch, semesters, stepper, summary, fixed assignments).
 * Rendered in the right-side properties panel when activeSection === "generate".
 * Uses full panel height with a persistent summary and scrollable detail.
 */
export function CreateScheduleProperties() {
  const ctx = useGenerate();
  const {
    step,
    cycle,
    setCycle,
    startDate,
    endDate,
    semesterIds,
    setSemesterIds,
    semesters,
    fixedAssignments,
    setFixedAssignments,
    calendarHolidays,
    subjectsInScope,
  } = ctx;

  const workingDays = React.useMemo(
    () => countWorkingDays(startDate, endDate, calendarHolidays || new Set()),
    [startDate, endDate, calendarHolidays]
  );

  const selectedSemesters = React.useMemo(
    () => (semesters || []).filter((s) => semesterIds.includes(s.id)),
    [semesters, semesterIds]
  );

  const toggleSemester = (id) => {
    setSemesterIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const removeAssignment = React.useCallback(
    (index) => setFixedAssignments((prev) => prev.filter((_, i) => i !== index)),
    [setFixedAssignments]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Stepper — always visible */}
      <div className="shrink-0 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 mb-4">
        <FormProgressStepper />
      </div>

      {/* Summary card — always visible, fills width */}
      <div className="shrink-0 rounded-xl border-2 border-border/60 bg-card mb-4">
        <div className="flex items-center gap-2 text-sm bg-muted font-semibold text-muted-foreground px-4 py-1.5 rounded-t-xl border-b border-border/60 mb-2">
          <CalendarRange className="size-4" />
          <span>Summary</span>
        </div>
        <dl className="grid grid-cols-1 gap-3 text-sm px-4 pb-4">
          <div>
            <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Batch</dt>
            <dd className="font-medium text-foreground mt-0.5">
              {cycle === "EVEN" ? "Even semesters (2, 4, 6, 8)" : "Odd semesters (1, 3, 5, 7)"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Date range</dt>
            <dd className="font-medium text-foreground mt-0.5">
              {startDate && endDate ? (
                <span>{startDate} — {endDate}</span>
              ) : (
                <span className="text-muted-foreground italic">Select in calendar</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Semesters</dt>
            <dd className="font-medium text-foreground mt-0.5">
              {selectedSemesters.length > 0
                ? selectedSemesters.map((s) => s.name).join(", ")
                : <span className="text-muted-foreground italic">None selected</span>}
            </dd>
          </div>
          {step === 2 && startDate && endDate && (
            <>
              <div>
                <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Working days</dt>
                <dd className="font-medium text-foreground mt-0.5">{workingDays} days</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Subjects in scope</dt>
                <dd className="font-medium text-foreground mt-0.5">{subjectsInScope?.length ?? 0} subjects</dd>
              </div>
            </>
          )}
        </dl>
      </div>

      {/* Scrollable form / pre-assigned list */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="rounded-xl border-2 border-border/60 bg-background">
                <div className="flex items-center gap-2 text-sm bg-muted font-semibold text-muted-foreground px-4 py-1.5 rounded-t-xl border-b border-border/60 mb-2">
                  <BookOpen className="size-4" />
                  <span>Exam batch & semesters</span>
                </div>
                <div className="space-y-4 px-4 pb-4">
                  <div>
                    <Label className="block mb-2">Exam batch</Label>
                    <p className="text-xs text-muted-foreground mb-1">
                      Exams are grouped by even or odd semester.
                    </p>
                    <Select value={cycle} onValueChange={setCycle}>
                      <SelectTrigger className="w-full" aria-label="Exam batch">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CYCLES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="block mb-2">Semesters</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {(semesters || []).map((s) => (
                        <Label
                          key={s.id}
                          className="inline-flex items-center gap-2 cursor-pointer"
                        >
                          <Input
                            type="checkbox"
                            checked={semesterIds.includes(s.id)}
                            onChange={() => toggleSemester(s.id)}
                            className="rounded border-input w-4 h-4"
                          />
                          <span className="text-sm">{s.name}</span>
                        </Label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {fixedAssignments.length > 0 ? (
                <div className="rounded-xl border-2 border-border/60 bg-background">
                  <div className="flex items-center gap-2 text-sm bg-muted font-semibold text-muted-foreground px-4 py-1.5 rounded-t-xl border-b border-border/60 mb-2">
                    <ListChecks className="size-4" />
                    <span>Pre-assigned exams</span>
                    <span className="ml-auto text-xs font-normal rounded-full bg-primary/10 text-primary px-2 py-0.5">
                      {fixedAssignments.length}
                    </span>
                  </div>
                  <ul className="space-y-2 px-2 pb-4">
                    {fixedAssignments.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-sm"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Pin className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">
                            {a.date} {a.slot === "FORENOON" ? "FN" : "AN"}: {a.subjectCode}
                          </span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeAssignment(i)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2 px-4 pb-4">
                    Click a weekday in the calendar to add more. Remove above to clear.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-6 text-center">
                  <ListChecks className="size-8 mx-auto text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-medium text-foreground">No pre-assigned exams</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click a weekday in the calendar to assign a subject to a date and slot.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Island-based generate form. Calendar only in artboard; config is in CreateScheduleProperties (right panel).
 * Action bar portals into `actionBarRef` (provided by Canvas fixed UI layer).
 */
export function GenerateForm({ className, isActive = true, actionBarRef }) {
  const ctx = useGenerate();
  const {
    step,
    setStartDate,
    setEndDate,
    setError,
    setRule,
    calendarHolidays,
    subjectsInScope,
    fixedAssignments,
    setFixedAssignments,
    loading,
    error,
    rule,
    holidayDates,
    goNext,
    goBack,
    handleSubmit,
  } = ctx;

  const handleRangeChange = React.useCallback(({ startDate: start, endDate: end }) => {
    setStartDate(start || "");
    setEndDate(end || "");
  }, [setStartDate, setEndDate]);

  const handleAddAssignment = React.useCallback(
    (payload) => setFixedAssignments((prev) => [...prev, payload]),
    [setFixedAssignments]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("space-y-4", className)}
    >
      <ErrorAlert
        error={error}
        rule={rule}
        startDate={ctx.startDate}
        endDate={ctx.endDate}
        holidayDates={holidayDates}
        onDismiss={() => {
          setError(null);
          setRule(null);
        }}
      />

      <form id={FORM_ID} onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-border/60 bg-background shadow-sm p-5">
          <div className="space-y-2">
            <Label className="block text-sm font-medium">
              {step === 1 ? "Date range" : "Assign subject to date (optional)"}
            </Label>
            {step === 2 && (
              <p className="text-xs text-muted-foreground">
                Click a weekday in the calendar to assign a subject to that date and slot.
              </p>
            )}
            <UnifiedCalendar
              key="generate-calendar"
              mode={step === 1 ? "range" : "assign"}
              startDate={ctx.startDate || undefined}
              endDate={ctx.endDate || undefined}
              onRangeChange={handleRangeChange}
              holidayDates={calendarHolidays}
              examSlots={[]}
              subjects={step === 2 ? subjectsInScope : []}
              fixedAssignments={step === 2 ? fixedAssignments : []}
              onAdd={step === 2 ? handleAddAssignment : undefined}
            />
          </div>
        </div>
      </form>

      {/* Action bar — portal into Canvas fixed UI layer ref */}
      {isActive &&
        actionBarRef?.current &&
        createPortal(
          <footer
            role="toolbar"
            aria-label="Schedule actions"
            className="grid grid-cols-2 items-center gap-2 justify-between"
          >
            {step === 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={goNext}
                className="gap-2 w-full col-span-2"
              >
                Next: Fix specific dates
                <ChevronRightIcon className="size-4" />
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={goBack}
                >
                  Back
                </Button>
                <Button type="submit" form={FORM_ID} disabled={loading} size="sm" className="w-full">
                  {loading ? "Generating…" : "Generate schedule"}
                </Button>
              </>
            )}
          </footer>,
          actionBarRef.current
        )}
    </motion.div>
  );
}
