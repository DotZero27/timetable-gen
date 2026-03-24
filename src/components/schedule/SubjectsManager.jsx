"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatElectiveGroupLabel } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useSemesters } from "@/hooks/useSemesters";
import { useDepartments } from "@/hooks/useDepartments";
import { useSubjects } from "@/hooks/useSubjects";
import { useAddSubject } from "@/hooks/useAddSubject";
import { useDeleteSubject } from "@/hooks/useDeleteSubject";
import { useUpdateSubject } from "@/hooks/useUpdateSubject";
import { X } from "lucide-react";

const CANONICAL_DEPARTMENT_NAME_MAP = {
  CIVIL: "Civil",
  MECH: "Mechanical",
  CHEM: "Chemical",
  EEE: "Electrical and Electronics",
  ECE: "Electronics and Communication",
  BME: "Biomedical",
  CSE: "Computer Science",
  IT: "Information Technology",
};

const DEPARTMENT_SHORT_FORM_MAP = {
  CHEM: "CHEM",
  CSE: "CSE",
  IT: "IT",
  ECE: "ECE",
  EEE: "EEE",
  BME: "BME",
  MECH: "MECH",
  CIVIL: "CIVIL",
};

const DEPARTMENT_BADGE_CLASS_MAP = {
  CHEM: "bg-pink-100 text-pink-800 hover:bg-pink-200 border-pink-200",
  CSE: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200",
  IT: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border-cyan-200",
  ECE: "bg-violet-100 text-violet-800 hover:bg-violet-200 border-violet-200",
  EEE: "bg-yellow-100 text-yellow-900 hover:bg-yellow-200 border-yellow-200",
  BME: "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200 border-fuchsia-200",
  MECH: "bg-orange-100 text-orange-900 hover:bg-orange-200 border-orange-200",
  CIVIL:
    "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200",
};

const DEFAULT_DEPARTMENT_BADGE_CLASS =
  "bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200";

const DEPARTMENT_DISMISS_CLASS_MAP = {
  CHEM: "text-pink-700 hover:text-pink-900",
  CSE: "text-blue-700 hover:text-blue-900",
  IT: "text-cyan-700 hover:text-cyan-900",
  ECE: "text-violet-700 hover:text-violet-900",
  EEE: "text-yellow-800 hover:text-yellow-950",
  BME: "text-fuchsia-700 hover:text-fuchsia-900",
  MECH: "text-orange-700 hover:text-orange-900",
  CIVIL: "text-emerald-700 hover:text-emerald-900",
};

const DEFAULT_DEPARTMENT_DISMISS_CLASS = "text-slate-600 hover:text-slate-900";

function getDepartmentCode(value = "", departmentsByCode = new Map()) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  const upper = normalized.toUpperCase();
  if (departmentsByCode.has(upper) || CANONICAL_DEPARTMENT_NAME_MAP[upper]) {
    return upper;
  }

  for (const [code, dept] of departmentsByCode.entries()) {
    const deptName = String(dept?.name ?? "")
      .trim()
      .toUpperCase();
    const prefixed =
      `${String(dept?.degreePrefix ?? "").trim()} ${String(dept?.name ?? "").trim()}`
        .trim()
        .toUpperCase();
    if (upper === deptName || upper === prefixed) return code;
  }

  for (const [code, name] of Object.entries(CANONICAL_DEPARTMENT_NAME_MAP)) {
    if (upper === name.toUpperCase()) return code;
  }

  return "";
}

function getDepartmentShortForm(value = "", departmentsByCode = new Map()) {
  const code = getDepartmentCode(value, departmentsByCode);
  if (DEPARTMENT_SHORT_FORM_MAP[code]) return DEPARTMENT_SHORT_FORM_MAP[code];
  const fallback = String(value || "")
    .trim()
    .slice(0, 3)
    .toUpperCase();
  return fallback ? `${fallback}...` : "N/A";
}

function getDepartmentBadgeClass(value = "", departmentsByCode = new Map()) {
  const code = getDepartmentCode(value, departmentsByCode);
  return DEPARTMENT_BADGE_CLASS_MAP[code] ?? DEFAULT_DEPARTMENT_BADGE_CLASS;
}

function getDepartmentDismissClass(value = "", departmentsByCode = new Map()) {
  const code = getDepartmentCode(value, departmentsByCode);
  return DEPARTMENT_DISMISS_CLASS_MAP[code] ?? DEFAULT_DEPARTMENT_DISMISS_CLASS;
}

/**
 * Composite: form to add a subject (code, name, semester) + list of subjects with optional semester filter.
 */
export function SubjectsManager({ semesters: initialSemesters, className }) {
  const [filterSemesterId, setFilterSemesterId] = React.useState("");
  const [filterDepartmentId, setFilterDepartmentId] = React.useState("");
  const [filterElectiveType, setFilterElectiveType] = React.useState("all");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [semesterId, setSemesterId] = React.useState("");
  const [departmentIds, setDepartmentIds] = React.useState([]);
  const [isElective, setIsElective] = React.useState(false);
  const [electiveGroupId, setElectiveGroupId] = React.useState("");
  const [error, setError] = React.useState(null);
  const [departmentPicker, setDepartmentPicker] = React.useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [subjectPage, setSubjectPage] = React.useState(1);
  const SUBJECTS_PER_PAGE = 10;

  const { data: semestersFromApi } = useSemesters();
  const { data: departmentsList } = useDepartments();
  const semesters = initialSemesters?.length
    ? initialSemesters
    : (semestersFromApi ?? []);
  const { data: subjects, isLoading: listLoading } = useSubjects(
    filterSemesterId || undefined,
  );
  const { mutate: addSubjectMutate, isPending } = useAddSubject();
  const {
    mutate: deleteSubject,
    isPending: isDeleting,
    pendingCode: deletingCode,
  } = useDeleteSubject();
  const { mutate: updateSubject, isPending: isUpdating } = useUpdateSubject();
  const departmentsByCode = React.useMemo(() => {
    return new Map(
      (departmentsList ?? []).map((dept) => [
        String(dept.code ?? "").toUpperCase(),
        dept,
      ]),
    );
  }, [departmentsList]);

  const [editingOfferingId, setEditingOfferingId] = React.useState(null);
  const [editingCode, setEditingCode] = React.useState(null);
  const [editValues, setEditValues] = React.useState({});
  const [editDepartmentPicker, setEditDepartmentPicker] = React.useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (
      !code.trim() ||
      !name.trim() ||
      !semesterId ||
      departmentIds.length === 0
    ) {
      setError(
        "Code, name, semester, and at least one department are required.",
      );
      return;
    }
    addSubjectMutate(
      {
        code: code.trim(),
        name: name.trim(),
        semesterId: Number(semesterId),
        departmentIds: departmentIds.map((id) => Number(id)),
        isElective,
        electiveGroupId: isElective ? electiveGroupId.trim() : "",
      },
      {
        onSuccess: () => {
          setCode("");
          setName("");
          setSemesterId("");
          setDepartmentIds([]);
          setIsElective(false);
          setElectiveGroupId("");
          setDepartmentPicker("");
          setError(null);
          setIsAddDialogOpen(false);
        },
        onError: (err) => {
          setError(err.message || "Failed to add subject");
        },
      },
    );
  };

  const semestersSorted = React.useMemo(
    () =>
      [...semesters].sort(
        (a, b) => (a.semesterNumber ?? 0) - (b.semesterNumber ?? 0),
      ),
    [semesters],
  );
  const semestersById = React.useMemo(
    () => new Map(semestersSorted.map((s) => [String(s.id), s])),
    [semestersSorted],
  );

  const selectedSemesterNumber =
    semestersById.get(String(semesterId))?.semesterNumber ?? null;
  const addGroupOptions = React.useMemo(() => {
    if (!Number.isInteger(selectedSemesterNumber)) return [];
    const base = [
      `SEM${selectedSemesterNumber}_core_elective`,
      `SEM${selectedSemesterNumber}_open_elective`,
      `SEM${selectedSemesterNumber}_honours`,
    ];
    if (electiveGroupId && !base.includes(electiveGroupId))
      return [electiveGroupId, ...base];
    return base;
  }, [selectedSemesterNumber, electiveGroupId]);

  const editingSemesterNumber =
    semestersById.get(String(editValues.semesterId ?? ""))?.semesterNumber ??
    null;
  const editGroupOptions = React.useMemo(() => {
    if (!Number.isInteger(editingSemesterNumber)) return [];
    const base = [
      `SEM${editingSemesterNumber}_core_elective`,
      `SEM${editingSemesterNumber}_open_elective`,
      `SEM${editingSemesterNumber}_honours`,
    ];
    const current = String(editValues.electiveGroupId ?? "");
    if (current && !base.includes(current)) return [current, ...base];
    return base;
  }, [editingSemesterNumber, editValues.electiveGroupId]);

  const startEditing = (sub) => {
    const allDepartmentsForCode = Array.isArray(sub.departmentIds)
      ? sub.departmentIds.map((id) => String(id))
      : (subjects ?? [])
          .filter((item) => item.code === sub.code)
          .map((item) => String(item.departmentId));
    setEditingOfferingId(sub.offeringId);
    setEditingCode(sub.code);
    setEditValues({
      name: sub.name,
      semesterId: String(sub.semesterId),
      departmentIds: [...new Set(allDepartmentsForCode)],
      isElective: sub.isElective ?? false,
      electiveGroupId: sub.electiveGroupId ?? "",
    });
  };

  const cancelEditing = () => {
    setEditingOfferingId(null);
    setEditingCode(null);
    setEditValues({});
    setEditDepartmentPicker("");
  };

  const saveEdit = () => {
    if (!editValues.name?.trim()) return;
    if (
      !Array.isArray(editValues.departmentIds) ||
      editValues.departmentIds.length === 0
    )
      return;
    updateSubject(
      {
        code: editingCode,
        name: editValues.name.trim(),
        semesterId: Number(editValues.semesterId),
        departmentIds: (editValues.departmentIds ?? []).map((id) => Number(id)),
        isElective: editValues.isElective,
        electiveGroupId: editValues.isElective
          ? String(editValues.electiveGroupId ?? "").trim()
          : "",
      },
      { onSuccess: () => cancelEditing() },
    );
  };

  const toggleDepartmentSelection = React.useCallback((deptId) => {
    setDepartmentIds((prev) =>
      prev.includes(deptId)
        ? prev.filter((id) => id !== deptId)
        : [...prev, deptId],
    );
  }, []);

  const toggleEditDepartmentSelection = React.useCallback((deptId) => {
    setEditValues((prev) => {
      const current = Array.isArray(prev.departmentIds)
        ? prev.departmentIds
        : [];
      return {
        ...prev,
        departmentIds: current.includes(deptId)
          ? current.filter((id) => id !== deptId)
          : [...current, deptId],
      };
    });
  }, []);

  const selectedDepartmentLabels = React.useMemo(() => {
    const byId = new Map(
      (departmentsList ?? []).map((d) => [
        String(d.id),
        `${d.degreePrefix} ${d.name}`,
      ]),
    );
    return departmentIds.map((id) => {
      const label = byId.get(id) ?? id;
      return {
        id,
        label,
        shortLabel: getDepartmentShortForm(label, departmentsByCode),
        badgeClassName: getDepartmentBadgeClass(label, departmentsByCode),
      };
    });
  }, [departmentIds, departmentsList, departmentsByCode]);

  const groupedSubjects = React.useMemo(() => {
    const grouped = new Map();
    for (const sub of subjects ?? []) {
      const key = `${sub.code}::${sub.semesterId}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          ...sub,
          offeringId: sub.offeringId ?? sub.code,
          departmentIds: [],
          departmentNames: [],
        });
      }
      const current = grouped.get(key);
      const deptId = String(sub.departmentId ?? "");
      if (deptId && !current.departmentIds.includes(deptId))
        current.departmentIds.push(deptId);
      if (
        sub.departmentName &&
        !current.departmentNames.includes(sub.departmentName)
      ) {
        current.departmentNames.push(sub.departmentName);
      }
    }
    return Array.from(grouped.values());
  }, [subjects]);

  const filteredGroupedSubjects = React.useMemo(() => {
    return groupedSubjects.filter((sub) => {
      if (filterDepartmentId) {
        const deptIds = Array.isArray(sub.departmentIds)
          ? sub.departmentIds.map((id) => String(id))
          : [];
        if (!deptIds.includes(String(filterDepartmentId))) return false;
      }
      if (filterElectiveType === "elective" && !sub.isElective) return false;
      if (filterElectiveType === "non-elective" && sub.isElective) return false;
      return true;
    });
  }, [groupedSubjects, filterDepartmentId, filterElectiveType]);

  const subjectTotalPages = Math.max(
    1,
    Math.ceil(filteredGroupedSubjects.length / SUBJECTS_PER_PAGE),
  );
  const visiblePageNumbers = React.useMemo(() => {
    if (subjectTotalPages <= 7)
      return Array.from({ length: subjectTotalPages }, (_, i) => i + 1);
    if (subjectPage <= 3) return [1, 2, 3, 4, -1, subjectTotalPages];
    if (subjectPage >= subjectTotalPages - 2) {
      return [
        1,
        -1,
        subjectTotalPages - 3,
        subjectTotalPages - 2,
        subjectTotalPages - 1,
        subjectTotalPages,
      ];
    }
    return [
      1,
      -1,
      subjectPage - 1,
      subjectPage,
      subjectPage + 1,
      -2,
      subjectTotalPages,
    ];
  }, [subjectPage, subjectTotalPages]);

  React.useEffect(() => {
    setSubjectPage(1);
  }, [filterSemesterId, filterDepartmentId, filterElectiveType]);

  React.useEffect(() => {
    if (subjectPage > subjectTotalPages) {
      setSubjectPage(subjectTotalPages);
    }
  }, [subjectPage, subjectTotalPages]);

  const paginatedSubjects = React.useMemo(() => {
    const start = (subjectPage - 1) * SUBJECTS_PER_PAGE;
    return filteredGroupedSubjects.slice(start, start + SUBJECTS_PER_PAGE);
  }, [filteredGroupedSubjects, subjectPage, SUBJECTS_PER_PAGE]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("space-y-6", className)}
    >
      <div className="flex justify-end">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add subject</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add a subject</DialogTitle>
              <DialogDescription>
                Add a subject with code, name, and semester. Semester is used to
                group exams (even/odd) when creating schedules.
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <section className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Basic Information
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label className="block mb-1">Code</Label>
                    <Input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. CS101"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label className="block mb-1">Name</Label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Data Structures"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label className="block mb-1">Semester</Label>
                    <Select
                      value={semesterId || undefined}
                      onValueChange={setSemesterId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {semestersSorted.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Departments
                </p>
                <Label className="block mb-1">Applicable departments</Label>
                <Select
                  value={departmentPicker || undefined}
                  onValueChange={(value) => {
                    if (!departmentIds.includes(value)) {
                      toggleDepartmentSelection(value);
                    }
                    setDepartmentPicker("");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Add department" />
                  </SelectTrigger>
                  <SelectContent>
                    {(departmentsList ?? []).map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.degreePrefix} {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedDepartmentLabels.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      No departments selected
                    </span>
                  ) : (
                    selectedDepartmentLabels.map((dept) => (
                      <Badge
                        key={dept.id}
                        variant="outline"
                        className={cn("gap-1 pr-1", dept.badgeClassName)}
                      >
                        <span title={dept.label}>{dept.shortLabel}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${dept.label}`}
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => toggleDepartmentSelection(dept.id)}
                        >
                          x
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Elective Settings
                </p>
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={isElective}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsElective(checked);
                      if (!checked) setElectiveGroupId("");
                    }}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm font-medium">Elective subject</span>
                </label>
                {isElective && (
                  <div className="mt-2">
                    <Label className="block mb-1">Elective Group ID</Label>
                    <Select
                      value={electiveGroupId || undefined}
                      onValueChange={setElectiveGroupId}
                      disabled={!semesterId || addGroupOptions.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select elective group" />
                      </SelectTrigger>
                      <SelectContent>
                        {addGroupOptions.map((groupId) => (
                          <SelectItem key={groupId} value={groupId}>
                            {formatElectiveGroupLabel(groupId)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!semesterId && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Select semester first to choose an elective group.
                      </p>
                    )}
                  </div>
                )}
              </section>

              <div className="flex justify-end border-t pt-3">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Adding…" : "Add subject"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Subjects</CardTitle>
            <CardDescription>
              All subjects; filter by semester, department, and type.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-sm font-medium sr-only">
              Filter by semester
            </Label>
            <Select
              value={filterSemesterId || "all"}
              onValueChange={(v) => setFilterSemesterId(v === "all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All semesters</SelectItem>
                {semestersSorted.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="text-sm font-medium sr-only">
              Filter by department
            </Label>
            <Select
              value={filterDepartmentId || "all"}
              onValueChange={(v) => setFilterDepartmentId(v === "all" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {(departmentsList ?? []).map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.degreePrefix} {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="text-sm font-medium sr-only">
              Filter by subject type
            </Label>
            <Select
              value={filterElectiveType}
              onValueChange={setFilterElectiveType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="elective">Elective only</SelectItem>
                <SelectItem value="non-elective">Non-elective only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : filteredGroupedSubjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No subjects yet. Add one using the button.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left font-medium p-3">Code</th>
                      <th className="text-left font-medium p-3">Name</th>
                      <th className="text-left font-medium p-3">Semester</th>
                      <th className="text-left font-medium p-3">Department</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSubjects.map((sub) => {
                      const sem = semesters.find(
                        (s) => s.id === sub.semesterId,
                      );
                      const departmentsToShow = sub.departmentNames?.length
                        ? sub.departmentNames
                        : sub.departmentName
                          ? [sub.departmentName]
                          : [];
                      return (
                        <motion.tr
                          key={`${sub.code}:${sub.semesterId}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-b last:border-0"
                        >
                          <td className="p-3 font-mono">{sub.code}</td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <div>{sub.name}</div>
                              {sub.isElective ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                    Elective
                                  </span>
                                  <span
                                    className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground"
                                    title={sub.electiveGroupId || undefined}
                                  >
                                    {sub.electiveGroupId
                                      ? formatElectiveGroupLabel(
                                          sub.electiveGroupId,
                                        )
                                      : "Ungrouped elective"}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {sem
                              ? `SEM ${String(sem.name).split(" ")[1]}`
                              : sub.semesterId}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {departmentsToShow.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {departmentsToShow.map((deptName) => (
                                  <Badge
                                    key={`${sub.code}:${sub.semesterId}:${deptName}`}
                                    variant="outline"
                                    className={cn(
                                      "font-normal",
                                      getDepartmentBadgeClass(
                                        deptName,
                                        departmentsByCode,
                                      ),
                                    )}
                                    title={deptName}
                                  >
                                    {getDepartmentShortForm(
                                      deptName,
                                      departmentsByCode,
                                    )}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEditing(sub)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={
                                  isDeleting && deletingCode === sub.code
                                }
                                onClick={() => deleteSubject(sub.code)}
                              >
                                {isDeleting && deletingCode === sub.code
                                  ? "Deleting…"
                                  : "Delete"}
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {subjectTotalPages > 1 && (
                <Pagination className="justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setSubjectPage((p) => Math.max(1, p - 1));
                        }}
                        className={
                          subjectPage === 1
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                    {visiblePageNumbers.map((pageNum) => (
                      <PaginationItem key={`subject-page-${pageNum}`}>
                        {pageNum < 0 ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            href="#"
                            isActive={subjectPage === pageNum}
                            onClick={(e) => {
                              e.preventDefault();
                              setSubjectPage(pageNum);
                            }}
                          >
                            {pageNum}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setSubjectPage((p) =>
                            Math.min(subjectTotalPages, p + 1),
                          );
                        }}
                        className={
                          subjectPage === subjectTotalPages
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog
        open={editingOfferingId != null}
        onOpenChange={(open) => !open && cancelEditing()}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>
              Update subject details and offerings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="block mb-1">Code</Label>
              <Input value={editingCode ?? ""} disabled className="h-9" />
            </div>
            <div>
              <Label className="block mb-1">Name</Label>
              <Input
                value={editValues.name ?? ""}
                onChange={(e) =>
                  setEditValues((v) => ({ ...v, name: e.target.value }))
                }
                className="h-9"
              />
            </div>
            <div>
              <Label className="block mb-1">Semester</Label>
              <Select
                value={editValues.semesterId}
                onValueChange={(v) =>
                  setEditValues((prev) => ({ ...prev, semesterId: v }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {semestersSorted.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block mb-1">Type</Label>
              <label className="mt-2 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editValues.isElective ?? false}
                  onChange={(e) =>
                    setEditValues((v) => ({
                      ...v,
                      isElective: e.target.checked,
                      electiveGroupId: e.target.checked
                        ? v.electiveGroupId
                        : "",
                    }))
                  }
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">Elective</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="block mb-1">Departments</Label>
            <Select
              value={editDepartmentPicker || undefined}
              onValueChange={(value) => {
                const current = Array.isArray(editValues.departmentIds)
                  ? editValues.departmentIds
                  : [];
                if (!current.includes(value)) {
                  toggleEditDepartmentSelection(value);
                }
                setEditDepartmentPicker("");
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Add department" />
              </SelectTrigger>
              <SelectContent>
                {(departmentsList ?? []).map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.degreePrefix} {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-1.5">
              {(Array.isArray(editValues.departmentIds)
                ? editValues.departmentIds
                : []
              ).map((deptId) => {
                const dept = (departmentsList ?? []).find(
                  (d) => String(d.id) === String(deptId),
                );
                const label = dept
                  ? `${dept.degreePrefix} ${dept.name}`
                  : String(deptId);
                return (
                  <Badge
                    key={deptId}
                    variant="outline"
                    className={cn(
                      "gap-1 pr-1",
                      getDepartmentBadgeClass(label, departmentsByCode),
                    )}
                  >
                    <span title={label}>
                      {getDepartmentShortForm(label, departmentsByCode)}
                    </span>
                    <button
                      type="button"
                      className={cn(
                        "transition-colors",
                        getDepartmentDismissClass(label, departmentsByCode),
                      )}
                      onClick={() =>
                        toggleEditDepartmentSelection(String(deptId))
                      }
                    >
                      <X className="size-4" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          </div>

          {editValues.isElective && (
            <div>
              <Label className="block mb-1">Elective Group ID</Label>
              <Select
                value={editValues.electiveGroupId || undefined}
                onValueChange={(value) =>
                  setEditValues((v) => ({ ...v, electiveGroupId: value }))
                }
                disabled={editGroupOptions.length === 0}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {editGroupOptions.map((groupId) => (
                    <SelectItem key={groupId} value={groupId}>
                      {formatElectiveGroupLabel(groupId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="border-t pt-3">
            <Button
              variant="ghost"
              onClick={cancelEditing}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={isUpdating}>
              {isUpdating ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
