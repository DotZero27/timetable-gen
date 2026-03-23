"use client";

import * as React from "react";
import { useHolidays } from "@/hooks/useHolidays";
import { useSubjects } from "@/hooks/useSubjects";
import { useGenerateSchedule } from "@/hooks/useGenerateSchedule";

const GenerateContext = React.createContext(null);

export function useGenerate() {
  const ctx = React.useContext(GenerateContext);
  if (!ctx) throw new Error("useGenerate must be used within GenerateProvider");
  return ctx;
}

function useCalendarHolidaysRange() {
  const from = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const to = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 120);
    return d.toISOString().slice(0, 10);
  }, []);
  return useHolidays({ from, to });
}

function countWorkingDays(startDate, endDate, holidaySet) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    const iso = cursor.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidaySet.has(iso)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function GenerateProvider({ children, semesters = [], onSuccess }) {
  const [step, setStep] = React.useState(1);
  const [cycle, setCycle] = React.useState("EVEN");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [semesterIds, setSemesterIds] = React.useState([]);
  const [semesterGapDays, setSemesterGapDays] = React.useState(1);
  const [pairRotationMode, setPairRotationMode] = React.useState("AVAILABLE_ONLY");
  const [error, setError] = React.useState(null);
  const [rule, setRule] = React.useState(null);
  const [fixedAssignments, setFixedAssignments] = React.useState([]);

  const { data: calendarHolidaysList } = useCalendarHolidaysRange();
  const calendarHolidays = React.useMemo(
    () => new Set(Array.isArray(calendarHolidaysList) ? calendarHolidaysList.map((x) => x.date) : []),
    [calendarHolidaysList]
  );

  const { data: subjects } = useSubjects();
  const { mutate: generateScheduleMutate, isPending: loading } = useGenerateSchedule();

  const holidaysInRange = useHolidays({
    from: step === 2 && startDate ? startDate : undefined,
    to: step === 2 && endDate ? endDate : undefined,
  });
  const holidayDates = React.useMemo(
    () =>
      (error || rule) && holidaysInRange.data
        ? holidaysInRange.data.map((h) => h.date)
        : [],
    [error, rule, holidaysInRange.data]
  );

  const subjectsInScope = React.useMemo(() => {
    if (semesterIds.length === 0) return [];
    return (subjects ?? []).filter((s) => semesterIds.includes(s.semesterId));
  }, [subjects, semesterIds]);

  const canGoNext = startDate && endDate && semesterIds.length > 0;

  const goNext = React.useCallback(() => {
    setError(null);
    setRule(null);
    if (!startDate || !endDate) {
      setError("Please select a date range in the calendar.");
      return;
    }
    if (semesterIds.length === 0) {
      setError("Please select at least one semester.");
      return;
    }
    const workingDays = countWorkingDays(startDate, endDate, calendarHolidays || new Set());
    if (workingDays <= 0) {
      setError("No working days in selected range. Please pick a valid range excluding weekends/holidays.");
      return;
    }
    const minRequiredDays = Math.ceil(subjectsInScope.length / 2);
    if (workingDays < minRequiredDays) {
      setError("Not enough working days. Try a longer date range or fewer semesters.");
      return;
    }
    setStep(2);
  }, [startDate, endDate, semesterIds, calendarHolidays, subjectsInScope.length]);

  const goBack = React.useCallback(() => setStep(1), []);

  const resetForm = React.useCallback(() => {
    setStep(1);
    setStartDate("");
    setEndDate("");
    setSemesterIds([]);
    setSemesterGapDays(1);
    setPairRotationMode("AVAILABLE_ONLY");
    setFixedAssignments([]);
    setError(null);
    setRule(null);
  }, []);

  const handleSubmit = React.useCallback(
    (e) => {
      e?.preventDefault?.();
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
      if (!Number.isInteger(semesterGapDays) || semesterGapDays < 0) {
        setError("Semester gap must be a non-negative whole number.");
        return;
      }
      generateScheduleMutate(
        {
          cycle,
          startDate,
          endDate,
          semesterIds,
          semesterGapDays,
          pairRotationMode,
          fixedAssignments: fixedAssignments.map((a) => ({
            date: a.date,
            slot: a.slot,
            subjectCode: a.subjectCode,
            departmentId: a.departmentId,
          })),
        },
        {
          onSuccess: (data) => {
            onSuccess?.(data?.versionId, data);
            resetForm();
          },
          onError: (err) => {
            setError(err.message || "Generation failed");
            setRule(err.data?.rule ?? null);
          },
        }
      );
    },
    [
      step,
      cycle,
      startDate,
      endDate,
      semesterIds,
      semesterGapDays,
      pairRotationMode,
      fixedAssignments,
      onSuccess,
      generateScheduleMutate,
      resetForm,
    ]
  );

  const value = React.useMemo(
    () => ({
      step,
      setStep,
      cycle,
      setCycle,
      startDate,
      endDate,
      setStartDate,
      setEndDate,
      semesterIds,
      setSemesterIds,
      semesterGapDays,
      setSemesterGapDays,
      pairRotationMode,
      setPairRotationMode,
      semesters,
      loading,
      error,
      setError,
      rule,
      setRule,
      holidayDates,
      calendarHolidays,
      subjects: subjects ?? [],
      subjectsInScope,
      fixedAssignments,
      setFixedAssignments,
      canGoNext,
      onSuccess,
      goNext,
      goBack,
      handleSubmit,
    }),
    [
      step,
      cycle,
      startDate,
      endDate,
      semesterIds,
      semesterGapDays,
      pairRotationMode,
      semesters,
      loading,
      error,
      rule,
      holidayDates,
      calendarHolidays,
      subjects,
      subjectsInScope,
      fixedAssignments,
      canGoNext,
      onSuccess,
      goNext,
      goBack,
      handleSubmit,
    ]
  );

  return (
    <GenerateContext.Provider value={value}>{children}</GenerateContext.Provider>
  );
}
