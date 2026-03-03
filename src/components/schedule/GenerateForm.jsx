"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronRightIcon, ChevronLeftIcon } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "./ErrorAlert";
import { DateRangeCalendar } from "./DateRangeCalendar";
import { AssignmentCalendar } from "./AssignmentCalendar";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const CYCLES = [
  { value: "EVEN", label: "EVEN" },
  { value: "ODD", label: "ODD" },
];

const STEPS = [
  {
    id: 1,
    title: "Select date range",
    description: "Cycle, date range, and semesters",
  },
  {
    id: 2,
    title: "Manual date add (optional)",
    description: "Assign subjects to specific dates",
  },
];

/**
 * Multi-step form: Step 1 = date range + semesters, Step 2 = optional manual date assignments, then generate.
 */
export function GenerateForm({ semesters, onSuccess, className }) {
  const [step, setStep] = React.useState(1);
  const [cycle, setCycle] = React.useState("EVEN");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [semesterIds, setSemesterIds] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [rule, setRule] = React.useState(null);
  const [holidayDates, setHolidayDates] = React.useState([]);
  const [calendarHolidays, setCalendarHolidays] = React.useState(new Set());
  const [subjects, setSubjects] = React.useState([]);
  const [fixedAssignments, setFixedAssignments] = React.useState([]);

  React.useEffect(() => {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 120);
    fetch(
      `/api/holidays?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`,
    )
      .then((r) => r.json())
      .then((list) => {
        const set = new Set(Array.isArray(list) ? list.map((x) => x.date) : []);
        setCalendarHolidays(set);
      })
      .catch(() => setCalendarHolidays(new Set()));
  }, []);

  React.useEffect(() => {
    fetch("/api/subjects")
      .then((r) => r.json())
      .then((list) => setSubjects(Array.isArray(list) ? list : []))
      .catch(() => setSubjects([]));
  }, []);

  const subjectsInScope = React.useMemo(() => {
    if (semesterIds.length === 0) return [];
    return subjects.filter((s) => semesterIds.includes(s.semesterId));
  }, [subjects, semesterIds]);

  const toggleSemester = (id) => {
    setSemesterIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleRangeChange = React.useCallback(
    ({ startDate: start, endDate: end }) => {
      setStartDate(start || "");
      setEndDate(end || "");
    },
    [],
  );

  const handleAddAssignment = React.useCallback((payload) => {
    setFixedAssignments((prev) => [...prev, payload]);
  }, []);

  const removeAssignment = React.useCallback((index) => {
    setFixedAssignments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const canGoNext = startDate && endDate && semesterIds.length > 0;

  const goNext = () => {
    setError(null);
    setRule(null);
    if (!canGoNext) return;
    setStep(2);
  };

  const goBack = () => {
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setRule(null);
    if (step !== 2) return;
    if (!startDate || !endDate) {
      setError("Select a date range.");
      return;
    }
    if (semesterIds.length === 0) {
      setError("Select at least one semester.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/schedules/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycle,
          startDate,
          endDate,
          semesterIds,
          fixedAssignments: fixedAssignments.map((a) => ({
            date: a.date,
            slot: a.slot,
            subjectId: a.subjectId,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        setRule(data.rule ?? null);
        if (startDate && endDate) {
          const hRes = await fetch(
            `/api/holidays?from=${startDate}&to=${endDate}`,
          );
          const hList = await hRes.json();
          setHolidayDates(Array.isArray(hList) ? hList.map((x) => x.date) : []);
        }
        return;
      }
      onSuccess?.(data.versionId, data);
    } catch (err) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("space-y-4", className)}
    >
      <ErrorAlert
        error={error}
        rule={rule}
        startDate={startDate}
        endDate={endDate}
        holidayDates={holidayDates}
        onDismiss={() => {
          setError(null);
          setRule(null);
        }}
      />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-border bg-muted/30 p-1">
              {STEPS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => s.id <= step && setStep(s.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    step === s.id
                      ? "bg-background text-foreground shadow-sm"
                      : s.id < step
                        ? "text-muted-foreground hover:text-foreground"
                        : "text-muted-foreground/70 cursor-default",
                  )}
                >
                  {s.id}. {s.title}
                </button>
              ))}
            </div>
          </div>
          <CardTitle className="text-xl">Generate new schedule</CardTitle>
          <CardDescription>
            {STEPS[step - 1].description}. Exams are placed on weekdays only;
            holidays are excluded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: step === 2 ? 8 : -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 xl:grid-cols-3 gap-4"
            >
              {/* Same layout for both steps: calendar left, controls right */}
              <div className="flex gap-4 items-start col-span-2">
                <div className="w-full">
                  <Label className="block mb-2">
                    {step === 1 ? "Date range" : "Assign subject to date (optional)"}
                  </Label>
                  {step === 1 ? (
                    <DateRangeCalendar
                      startDate={startDate || null}
                      endDate={endDate || null}
                      onRangeChange={handleRangeChange}
                      holidayDates={calendarHolidays}
                    />
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">
                        Click a weekday in the calendar to assign a subject to that date and slot.
                      </p>
                      <AssignmentCalendar
                        startDate={startDate}
                        endDate={endDate}
                        subjects={subjectsInScope}
                        fixedAssignments={fixedAssignments}
                        onAdd={handleAddAssignment}
                        holidayDates={calendarHolidays}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 col-span-1">
                {step === 1 ? (
                  <>
                    <div>
                      <Label className="block mb-2">
                        Cycle
                      </Label>
                      <select
                        value={cycle}
                        onChange={(e) => setCycle(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        {CYCLES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="block mb-2">
                        Semesters
                      </Label>
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
                            <span className="text-sm">{s.name} </span>
                        </Label>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end col-span-1">
                      <Button
                        type="button"
                        onClick={goNext}
                        disabled={!canGoNext}
                        className="gap-2"
                      >
                        Next: Manual date add
                        <ChevronRightIcon className="size-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
                      <p className="font-medium text-muted-foreground mb-1">
                        Summary
                      </p>
                      <p>
                        Cycle: {cycle} · {startDate} — {endDate} · Semesters:{" "}
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
                                {a.date} {a.slot === "FORENOON" ? "FN" : "AN"}:{" "}
                                {a.subjectCode}
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
                    <div className="flex flex-col gap-2 mt-auto">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goBack}
                        className="gap-2"
                      >
                        <ChevronLeftIcon className="size-4" />
                        Back
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? "Generating…" : "Generate schedule"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
