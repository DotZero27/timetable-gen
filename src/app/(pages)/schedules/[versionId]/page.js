"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Plus, Save, SquarePen, X } from "lucide-react";
import { useScheduleDetail } from "@/hooks/useScheduleDetail";
import { useUpdateSchedule } from "@/hooks/useUpdateSchedule";
import { useExportTemplate } from "@/hooks/useExportTemplate";
import { useSaveExportTemplate } from "@/hooks/useSaveExportTemplate";
import { useSubjects } from "@/hooks/useSubjects";
import { CalendarView } from "@/components/schedule/CalendarView";
import { SlotCard } from "@/components/schedule/SlotCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SELECT_NAV_KEYS = ["ArrowDown", "ArrowUp", "Enter", "Escape"];
const stopSelectKeyUnlessNav = (e) => {
  if (!SELECT_NAV_KEYS.includes(e.key)) e.stopPropagation();
};

const PARITY_FILTERS = [
  { id: "ALL", label: "All semesters" },
  { id: "EVEN", label: "Even semesters" },
  { id: "ODD", label: "Odd semesters" },
];

const TEMPLATE_DEFAULTS = {
  collegeName: "Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam - 603110",
  examTitle: "End Semester Theory Examinations, April / May 2026 - Time Table",
  regulation: "2021",
  creditSystem: "(An Autonomous Institution, Affiliated to Anna University, Chennai)",
  degree: "B.E. / B.Tech.",
  batchYears: "2022-2026",
  fnTiming: "09.30 am to 12.30 pm",
  anTiming: "01.30 pm to 04.30 pm",
  publishedDate: "",
  controllerName: "",
  principalName: "",
};

const TEMPLATE_FIELDS = [
  { key: "collegeName", label: "College Name", required: true },
  { key: "examTitle", label: "Exam Title", required: true },
  { key: "regulation", label: "Regulation", required: true },
  { key: "creditSystem", label: "Institution Subtitle", required: true },
  { key: "degree", label: "Degree", required: true },
  { key: "batchYears", label: "Batch Years", required: true },
  { key: "fnTiming", label: "FN Timing", required: false },
  { key: "anTiming", label: "AN Timing", required: false },
  { key: "publishedDate", label: "Published Date", required: false },
  { key: "controllerName", label: "Controller Name", required: false },
  { key: "principalName", label: "Principal Name", required: false },
];

function ExportTemplateDialog({ open, onOpenChange, versionId, exportFormat = "docx" }) {
  const { data: template } = useExportTemplate(versionId);
  const { mutate: saveTemplate, isPending } = useSaveExportTemplate();
  const [form, setForm] = React.useState(TEMPLATE_DEFAULTS);

  React.useEffect(() => {
    if (!open) return;
    if (template) {
      setForm({
        collegeName: template.collegeName ?? "",
        examTitle: template.examTitle ?? "",
        regulation: template.regulation ?? "",
        creditSystem: template.creditSystem ?? "",
        degree: template.degree ?? "",
        batchYears: template.batchYears ?? "",
        fnTiming: template.fnTiming ?? TEMPLATE_DEFAULTS.fnTiming,
        anTiming: template.anTiming ?? TEMPLATE_DEFAULTS.anTiming,
        publishedDate: template.publishedDate ?? "",
        controllerName: template.controllerName ?? "",
        principalName: template.principalName ?? "",
      });
    } else {
      setForm(TEMPLATE_DEFAULTS);
    }
  }, [open, template]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const requiredFilled = TEMPLATE_FIELDS.filter((f) => f.required).every(
    (f) => form[f.key]?.trim()
  );

  const handleSaveAndDownload = () => {
    saveTemplate(
      { scheduleVersionId: versionId, ...form },
      {
        onSuccess: () => {
          window.open(`/api/schedules/${versionId}/export/${exportFormat}`, "_blank");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Template</DialogTitle>
          <DialogDescription>
            Configure the header and footer fields for the exported DOCX document.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          {TEMPLATE_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <Input
                value={form[field.key]}
                onChange={(e) => update(field.key, e.target.value)}
                placeholder={field.label}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSaveAndDownload} disabled={isPending || !requiredFilled}>
            <Download className="size-4 mr-1.5" />
            {isPending ? "Saving..." : "Save & Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ScheduleDetailPage() {
  const { versionId } = useParams();
  const numericId = Number(versionId);
  const { data: schedule, isLoading } = useScheduleDetail(numericId);
  const { data: allSubjects = [] } = useSubjects();
  const { mutate: updateSchedule, isPending: saving } = useUpdateSchedule();
  const [selectedDay, setSelectedDay] = React.useState(null);
  const [selectedSemesters, setSelectedSemesters] = React.useState([]);
  const [parityFilter, setParityFilter] = React.useState("ALL");
  const [departmentFilter, setDepartmentFilter] = React.useState("ALL");
  const [editMode, setEditMode] = React.useState(false);
  const [draftName, setDraftName] = React.useState("");
  const [draftExamSlots, setDraftExamSlots] = React.useState([]);
  const [saveError, setSaveError] = React.useState("");
  const [subjectSelectOpenKey, setSubjectSelectOpenKey] = React.useState(null);
  const [subjectSearchQuery, setSubjectSearchQuery] = React.useState("");
  const [debouncedSubjectSearch, setDebouncedSubjectSearch] = React.useState("");
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState("docx");
  const editable = schedule?.status === "draft";

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSubjectSearch(subjectSearchQuery.trim().toLowerCase());
    }, 250);
    return () => clearTimeout(timer);
  }, [subjectSearchQuery]);

  React.useEffect(() => {
    if (!schedule) return;
    setDraftName(schedule.name || `Schedule ${schedule.versionNumber}`);
    setDraftExamSlots(schedule.examSlots || []);
    setEditMode(false);
    setSaveError("");
  }, [schedule]);

  const availableSemesters = React.useMemo(() => {
    if (!draftExamSlots.length) return [];
    return Array.from(new Set(draftExamSlots.map((s) => s.semesterNumber))).sort((a, b) => a - b);
  }, [draftExamSlots]);

  const availableDepartments = React.useMemo(() => {
    if (!draftExamSlots.length) return [];
    const map = new Map();
    for (const slot of draftExamSlots) {
      if (!slot.departmentId) continue;
      if (!map.has(slot.departmentId)) {
        map.set(slot.departmentId, {
          id: slot.departmentId,
          name: slot.departmentName || slot.departmentCode || `Dept ${slot.departmentId}`,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [draftExamSlots]);

  const filteredExamSlots = React.useMemo(() => {
    return draftExamSlots.filter((slot) => {
      const parityMatch =
        parityFilter === "ALL" ||
        (parityFilter === "EVEN" ? slot.semesterNumber % 2 === 0 : slot.semesterNumber % 2 === 1);
      const semesterMatch =
        selectedSemesters.length === 0 || selectedSemesters.includes(slot.semesterNumber);
      const departmentMatch =
        departmentFilter === "ALL" || String(slot.departmentId) === departmentFilter;
      return parityMatch && semesterMatch && departmentMatch;
    });
  }, [draftExamSlots, parityFilter, selectedSemesters, departmentFilter]);

  const filteredSchedule = React.useMemo(() => {
    if (!schedule) return null;
    return { ...schedule, name: draftName, examSlots: filteredExamSlots };
  }, [schedule, draftName, filteredExamSlots]);

  const filteredSubjects = React.useMemo(() => {
    if (!debouncedSubjectSearch) return allSubjects;
    return allSubjects.filter((subject) => {
      const haystack = [
        subject.code,
        subject.name,
        subject.departmentName,
        subject.departmentCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(debouncedSubjectSearch);
    });
  }, [allSubjects, debouncedSubjectSearch]);

  const toggleSemesterFilter = (semesterNumber) => {
    setSelectedSemesters((prev) =>
      prev.includes(semesterNumber)
        ? prev.filter((s) => s !== semesterNumber)
        : [...prev, semesterNumber].sort((a, b) => a - b)
    );
  };

  const clearFilters = () => {
    setSelectedSemesters([]);
    setParityFilter("ALL");
    setDepartmentFilter("ALL");
  };

  const updateDraftSlot = (slotKey, updates) => {
    setDraftExamSlots((prev) =>
      prev.map((slot) => {
        const key = `${slot.date}-${slot.slot}-${slot.subjectCode}-${slot.departmentId}`;
        if (key !== slotKey) return slot;
        const next = { ...slot, ...updates };
        if (updates.subjectRef) {
          const [code, departmentIdRaw] = String(updates.subjectRef).split("::");
          const departmentId = Number(departmentIdRaw);
          const subject = allSubjects.find(
            (s) => s.code === code && Number(s.departmentId) === departmentId
          );
          if (subject) {
            next.subjectCode = subject.code;
            next.subjectName = subject.name;
            next.semesterNumber = subject.semesterNumber;
            next.departmentId = subject.departmentId;
            next.departmentCode = subject.departmentCode;
            next.departmentName = subject.departmentName;
            next.isElective = subject.isElective;
          }
        }
        return next;
      })
    );
  };

  const removeDraftSlot = (slotKey) => {
    setDraftExamSlots((prev) =>
      prev.filter((slot) => `${slot.date}-${slot.slot}-${slot.subjectCode}-${slot.departmentId}` !== slotKey)
    );
  };

  const addDraftSlotForDay = () => {
    if (!selectedDay || allSubjects.length === 0) return;
    const first = allSubjects[0];
    setDraftExamSlots((prev) => [
      ...prev,
      {
        date: selectedDay,
        slot: "FORENOON",
        subjectCode: first.code,
        subjectName: first.name,
        semesterNumber: first.semesterNumber,
        departmentId: first.departmentId,
        departmentCode: first.departmentCode,
        departmentName: first.departmentName,
        isElective: first.isElective,
      },
    ]);
  };

  const submitEdits = () => {
    if (!editable) return;
    setSaveError("");
    updateSchedule(
      {
        versionId: numericId,
        name: draftName.trim(),
        examSlots: draftExamSlots.map((slot) => ({
          date: slot.date,
          slot: slot.slot,
          subjectCode: slot.subjectCode,
          departmentId: slot.departmentId,
        })),
      },
      {
        onSuccess: (updated) => {
          setDraftName(updated.name || `Schedule ${updated.versionNumber}`);
          setDraftExamSlots(updated.examSlots || []);
          setEditMode(false);
        },
        onError: (err) => {
          setSaveError(err.message || "Failed to update schedule");
        },
      }
    );
  };

  const daySlots = React.useMemo(() => {
    if (!selectedDay || !filteredSchedule?.examSlots) return [];
    return filteredSchedule.examSlots.filter((s) => s.date === selectedDay).sort((a, b) => b.slot.localeCompare(a.slot));
  }, [selectedDay, filteredSchedule]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-96 rounded-lg border bg-muted/30 animate-pulse" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="space-y-4">
        <Link href="/schedules" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to schedules
        </Link>
        <p className="text-sm text-muted-foreground">Schedule not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/schedules"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to schedules
        </Link>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setExportFormat("docx");
              setExportDialogOpen(true);
            }}
          >
            <Download className="size-4 mr-1.5" />
            Download DOCX
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setExportFormat("pdf");
              setExportDialogOpen(true);
            }}
          >
            <Download className="size-4 mr-1.5" />
            Download PDF
          </Button>
          {editable && (
            <>
              {!editMode ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <SquarePen className="size-4 mr-1.5" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditMode(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" onClick={submitEdits} disabled={saving}>
                    <Save className="size-4 mr-1.5" />
                    {saving ? "Saving..." : "Submit"}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-2">
        <Label className="text-xs">Schedule name</Label>
        {editMode && editable ? (
          <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder={`Schedule ${schedule.versionNumber}`} />
        ) : (
          <p className="text-sm font-medium">{draftName || `Schedule ${schedule.versionNumber}`}</p>
        )}
        {saveError && <p className="text-xs text-destructive">{saveError}</p>}
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <div className="mb-4 rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Filters</h3>
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-full space-y-1.5">
                <Label className="text-xs">Semesters</Label>
                <div className="flex flex-wrap gap-2">
                  {availableSemesters.map((sem) => {
                    const active = selectedSemesters.includes(sem);
                    return (
                      <button
                        key={sem}
                        type="button"
                        onClick={() => toggleSemesterFilter(sem)}
                        className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        Sem {sem}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Semester parity</Label>
                <Select value={parityFilter} onValueChange={setParityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARITY_FILTERS.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Department</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All departments</SelectItem>
                    {availableDepartments.map((dept) => (
                      <SelectItem key={dept.id} value={String(dept.id)}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
            <p className="text-xs text-muted-foreground">
              Showing {filteredExamSlots.length} of {draftExamSlots.length} exams
            </p>
          </div>
          <CalendarView
            schedule={filteredSchedule}
            onDayClick={setSelectedDay}
            selectedDay={selectedDay}
          />
        </div>

        <AnimatePresence>
          {selectedDay && (
            <motion.aside
              initial={{ opacity: 0, x: 20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 320 }}
              exit={{ opacity: 0, x: 20, width: 0 }}
              transition={{ duration: 0.25 }}
              className="shrink-0 overflow-hidden"
            >
              <div className="w-80 rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{selectedDay}</h3>
                  <div className="flex items-center gap-1">
                    {editMode && editable && (
                      <Button variant="ghost" size="icon" className="size-7" onClick={addDraftSlotForDay}>
                        <Plus className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setSelectedDay(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
                {daySlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No exams on this day.</p>
                ) : (
                  <div className="space-y-2">
                    {daySlots.map((slot) => (
                      editMode && editable ? (
                        (() => {
                          const slotKey = `${slot.date}-${slot.slot}-${slot.subjectCode}-${slot.departmentId}`;
                          const selectedSubject = allSubjects.find(
                            (subject) =>
                              subject.code === slot.subjectCode &&
                              Number(subject.departmentId) === Number(slot.departmentId)
                          );
                          const subjectOptions = selectedSubject &&
                            !filteredSubjects.some(
                              (subject) =>
                                subject.code === selectedSubject.code &&
                                Number(subject.departmentId) === Number(selectedSubject.departmentId)
                            )
                            ? [selectedSubject, ...filteredSubjects]
                            : filteredSubjects;

                          return (
                            <div
                              key={slotKey}
                              className="space-y-2 rounded-lg border p-2"
                            >
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  type="date"
                                  value={slot.date}
                                  onChange={(e) =>
                                    updateDraftSlot(slotKey, { date: e.target.value })
                                  }
                                />
                                <Select
                                  value={slot.slot}
                                  onValueChange={(value) =>
                                    updateDraftSlot(slotKey, { slot: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="FORENOON">FORENOON</SelectItem>
                                    <SelectItem value="AFTERNOON">AFTERNOON</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Select
                                open={subjectSelectOpenKey === slotKey}
                                onOpenChange={(isOpen) => {
                                  setSubjectSelectOpenKey(isOpen ? slotKey : null);
                                  if (!isOpen) setSubjectSearchQuery("");
                                }}
                                value={`${slot.subjectCode}::${slot.departmentId}`}
                                onValueChange={(value) => {
                                  updateDraftSlot(slotKey, { subjectRef: value });
                                  setSubjectSelectOpenKey(null);
                                  setSubjectSearchQuery("");
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="top-20 p-0">
                                  <div
                                    data-slot="select-content-header"
                                    className="flex items-center gap-1 border-b bg-popover p-2 -m-1 -mt-1.5"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onKeyDown={stopSelectKeyUnlessNav}
                                  >
                                    <Input
                                      placeholder="Search by subject code or name..."
                                      value={subjectSearchQuery}
                                      onChange={(e) => setSubjectSearchQuery(e.target.value)}
                                      onKeyDown={stopSelectKeyUnlessNav}
                                      className="h-8 flex-1 min-w-0"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 shrink-0"
                                      aria-label="Close"
                                      onClick={() => setSubjectSelectOpenKey(null)}
                                      onPointerDown={(e) => e.stopPropagation()}
                                    >
                                      <X className="size-4" />
                                    </Button>
                                  </div>
                                  {subjectOptions.length === 0 ? (
                                    <div className="py-4 text-center text-sm text-muted-foreground">
                                      {debouncedSubjectSearch
                                        ? "No subjects found. Try a different search."
                                        : "Type to search for a subject."}
                                    </div>
                                  ) : subjectOptions.map((subject) => (
                                    <SelectItem
                                      key={`${subject.code}::${subject.departmentId}`}
                                      value={`${subject.code}::${subject.departmentId}`}
                                    >
                                      {subject.code} - {subject.name} ({subject.departmentCode ?? `Dept ${subject.departmentId}`})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => removeDraftSlot(slotKey)}
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <SlotCard
                          key={`${slot.date}-${slot.slot}-${slot.subjectCode}-${slot.departmentId}`}
                          subjectName={slot.subjectName}
                          subjectCode={slot.subjectCode}
                          semesterNumber={slot.semesterNumber}
                          slot={slot.slot}
                          departmentName={slot.departmentName}
                          isElective={slot.isElective}
                          electiveGroupId={slot.electiveGroupId}
                        />
                      )
                    ))}
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <ExportTemplateDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        versionId={numericId}
        exportFormat={exportFormat}
      />
    </div>
  );
}
