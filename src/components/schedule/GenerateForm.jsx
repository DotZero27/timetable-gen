"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRightIcon, ChevronLeftIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "./ErrorAlert";
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
  } = ctx;

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
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border/40 bg-muted/30 px-4 py-2.5">
        <FormProgressStepper />
      </div>
      <div className="rounded-2xl border border-border/60 bg-background p-4">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
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
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                <p className="font-medium text-muted-foreground mb-1">Summary</p>
                <p>
                  Batch: {cycle === "EVEN" ? "Even semesters" : "Odd semesters"} ·{" "}
                  {startDate} — {endDate} · Semesters:{" "}
                  {(semesters || [])
                    .filter((s) => semesterIds.includes(s.id))
                    .map((s) => s.name)
                    .join(", ")}
                </p>
              </div>
              {fixedAssignments.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Pre-assigned ({fixedAssignments.length})
                  </p>
                  <ul className="space-y-1 text-sm">
                    {fixedAssignments.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-2"
                      >
                        <span>
                          {a.date} {a.slot === "FORENOON" ? "FN" : "AN"}: {a.subjectCode}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeAssignment(i)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
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
