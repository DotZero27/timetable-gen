"use client";

import * as React from "react";

const GenerateContext = React.createContext(null);

export function useGenerate() {
  const ctx = React.useContext(GenerateContext);
  if (!ctx) throw new Error("useGenerate must be used within GenerateProvider");
  return ctx;
}

export function GenerateProvider({ children, semesters = [], onSuccess }) {
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
      `/api/holidays?from=${from.toISOString().slice(0, 10)}&to=${to.toISOString().slice(0, 10)}`
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
    setStep(2);
  }, [startDate, endDate, semesterIds]);

  const goBack = React.useCallback(() => setStep(1), []);

  const handleSubmit = React.useCallback(
    async (e) => {
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
              `/api/holidays?from=${startDate}&to=${endDate}`
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
    },
    [step, cycle, startDate, endDate, semesterIds, fixedAssignments, onSuccess]
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
      semesters,
      loading,
      setLoading,
      error,
      setError,
      rule,
      setRule,
      holidayDates,
      setHolidayDates,
      calendarHolidays,
      subjects,
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
