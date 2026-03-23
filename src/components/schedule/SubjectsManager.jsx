"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatElectiveGroupLabel } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useSemesters } from "@/hooks/useSemesters";
import { useDepartments } from "@/hooks/useDepartments";
import { useSubjects } from "@/hooks/useSubjects";
import { useAddSubject } from "@/hooks/useAddSubject";
import { useDeleteSubject } from "@/hooks/useDeleteSubject";
import { useUpdateSubject } from "@/hooks/useUpdateSubject";

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

  const { data: semestersFromApi } = useSemesters();
  const { data: departmentsList } = useDepartments();
  const semesters = initialSemesters?.length ? initialSemesters : (semestersFromApi ?? []);
  const { data: subjects, isLoading: listLoading } = useSubjects(filterSemesterId || undefined);
  const { mutate: addSubjectMutate, isPending } = useAddSubject();
  const { mutate: deleteSubject, isPending: isDeleting, pendingCode: deletingCode } = useDeleteSubject();
  const { mutate: updateSubject, isPending: isUpdating } = useUpdateSubject();
  const [editingOfferingId, setEditingOfferingId] = React.useState(null);
  const [editingCode, setEditingCode] = React.useState(null);
  const [editValues, setEditValues] = React.useState({});
  const [editDepartmentPicker, setEditDepartmentPicker] = React.useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!code.trim() || !name.trim() || !semesterId || departmentIds.length === 0) {
      setError("Code, name, semester, and at least one department are required.");
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
        },
        onError: (err) => {
          setError(err.message || "Failed to add subject");
        },
      }
    );
  };

  const semestersSorted = React.useMemo(
    () => [...semesters].sort((a, b) => (a.semesterNumber ?? 0) - (b.semesterNumber ?? 0)),
    [semesters]
  );
  const semestersById = React.useMemo(
    () => new Map(semestersSorted.map((s) => [String(s.id), s])),
    [semestersSorted]
  );

  const selectedSemesterNumber = semestersById.get(String(semesterId))?.semesterNumber ?? null;
  const addGroupOptions = React.useMemo(() => {
    if (!Number.isInteger(selectedSemesterNumber)) return [];
    const base = [
      `SEM${selectedSemesterNumber}_core_elective`,
      `SEM${selectedSemesterNumber}_open_elective`,
      `SEM${selectedSemesterNumber}_honours`,
    ];
    if (electiveGroupId && !base.includes(electiveGroupId)) return [electiveGroupId, ...base];
    return base;
  }, [selectedSemesterNumber, electiveGroupId]);

  const editingSemesterNumber =
    semestersById.get(String(editValues.semesterId ?? ""))?.semesterNumber ?? null;
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
    if (!Array.isArray(editValues.departmentIds) || editValues.departmentIds.length === 0) return;
    updateSubject(
      {
        code: editingCode,
        name: editValues.name.trim(),
        semesterId: Number(editValues.semesterId),
        departmentIds: (editValues.departmentIds ?? []).map((id) => Number(id)),
        isElective: editValues.isElective,
        electiveGroupId: editValues.isElective ? String(editValues.electiveGroupId ?? "").trim() : "",
      },
      { onSuccess: () => cancelEditing() }
    );
  };

  const toggleDepartmentSelection = React.useCallback((deptId) => {
    setDepartmentIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  }, []);

  const toggleEditDepartmentSelection = React.useCallback((deptId) => {
    setEditValues((prev) => {
      const current = Array.isArray(prev.departmentIds) ? prev.departmentIds : [];
      return {
        ...prev,
        departmentIds: current.includes(deptId)
          ? current.filter((id) => id !== deptId)
          : [...current, deptId],
      };
    });
  }, []);

  const selectedDepartmentLabels = React.useMemo(() => {
    const byId = new Map((departmentsList ?? []).map((d) => [String(d.id), `${d.degreePrefix} ${d.name}`]));
    return departmentIds.map((id) => ({ id, label: byId.get(id) ?? id }));
  }, [departmentIds, departmentsList]);

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
      if (deptId && !current.departmentIds.includes(deptId)) current.departmentIds.push(deptId);
      if (sub.departmentName && !current.departmentNames.includes(sub.departmentName)) {
        current.departmentNames.push(sub.departmentName);
      }
    }
    return Array.from(grouped.values());
  }, [subjects]);

  const filteredGroupedSubjects = React.useMemo(() => {
    return groupedSubjects.filter((sub) => {
      if (filterDepartmentId) {
        const deptIds = Array.isArray(sub.departmentIds) ? sub.departmentIds.map((id) => String(id)) : [];
        if (!deptIds.includes(String(filterDepartmentId))) return false;
      }
      if (filterElectiveType === "elective" && !sub.isElective) return false;
      if (filterElectiveType === "non-elective" && sub.isElective) return false;
      return true;
    });
  }, [groupedSubjects, filterDepartmentId, filterElectiveType]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("space-y-6", className)}
    >
      <Card>
        <CardHeader>
          <CardTitle>Add a subject</CardTitle>
          <CardDescription>
            Add a subject with code, name, and semester. Semester is used to group exams (even/odd) when creating schedules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
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
                  <Select value={semesterId || undefined} onValueChange={setSemesterId}>
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
                  <span className="text-xs text-muted-foreground">No departments selected</span>
                ) : (
                  selectedDepartmentLabels.map((dept) => (
                    <span
                      key={dept.id}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
                    >
                      {dept.label}
                      <button
                        type="button"
                        aria-label={`Remove ${dept.label}`}
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => toggleDepartmentSelection(dept.id)}
                      >
                        x
                      </button>
                    </span>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Subjects</CardTitle>
            <CardDescription>All subjects; filter by semester, department, and type.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-sm font-medium sr-only">Filter by semester</Label>
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
            <Label className="text-sm font-medium sr-only">Filter by department</Label>
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
            <Label className="text-sm font-medium sr-only">Filter by subject type</Label>
            <Select value={filterElectiveType} onValueChange={setFilterElectiveType}>
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
            <p className="text-sm text-muted-foreground py-4">No subjects yet. Add one above.</p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium p-3">Code</th>
                    <th className="text-left font-medium p-3">Name</th>
                    <th className="text-left font-medium p-3">Semester</th>
                    <th className="text-left font-medium p-3">Department</th>
                    <th className="text-left font-medium p-3">Type</th>
                    <th className="text-left font-medium p-3">Elective Group</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredGroupedSubjects.map((sub) => {
                    const sem = semesters.find((s) => s.id === sub.semesterId);
                    return (
                      <motion.tr
                        key={`${sub.code}:${sub.semesterId}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b last:border-0"
                      >
                        <td className="p-3 font-mono">{sub.code}</td>
                        <td className="p-3">{sub.name}</td>
                        <td className="p-3 text-muted-foreground">
                          {sem ? `SEM ${String(sem.name).split(" ")[1]}` : sub.semesterId}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {sub.departmentNames?.length
                            ? sub.departmentNames.join(", ")
                            : (sub.departmentName ?? "—")}
                        </td>
                        <td className="p-3">
                          {sub.isElective ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              Elective
                            </span>
                          ) : null}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {sub.isElective ? (
                            <span
                              className="text-xs"
                              title={sub.electiveGroupId || undefined}
                            >
                              {sub.electiveGroupId
                                ? formatElectiveGroupLabel(sub.electiveGroupId)
                                : "—"}
                            </span>
                          ) : (
                            <span className="text-xs">—</span>
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
                              disabled={isDeleting && deletingCode === sub.code}
                              onClick={() => deleteSubject(sub.code)}
                            >
                              {isDeleting && deletingCode === sub.code ? "Deleting…" : "Delete"}
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={editingOfferingId != null} onOpenChange={(open) => !open && cancelEditing()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>Update subject details and offerings.</DialogDescription>
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
                onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))}
                className="h-9"
              />
            </div>
            <div>
              <Label className="block mb-1">Semester</Label>
              <Select
                value={editValues.semesterId}
                onValueChange={(v) => setEditValues((prev) => ({ ...prev, semesterId: v }))}
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
                      electiveGroupId: e.target.checked ? v.electiveGroupId : "",
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
                const current = Array.isArray(editValues.departmentIds) ? editValues.departmentIds : [];
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
              {(Array.isArray(editValues.departmentIds) ? editValues.departmentIds : []).map((deptId) => {
                const dept = (departmentsList ?? []).find((d) => String(d.id) === String(deptId));
                const label = dept ? `${dept.degreePrefix} ${dept.name}` : String(deptId);
                return (
                  <span key={deptId} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                    {label}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => toggleEditDepartmentSelection(String(deptId))}
                    >
                      x
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          {editValues.isElective && (
            <div>
              <Label className="block mb-1">Elective Group ID</Label>
              <Select
                value={editValues.electiveGroupId || undefined}
                onValueChange={(value) => setEditValues((v) => ({ ...v, electiveGroupId: value }))}
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
            <Button variant="ghost" onClick={cancelEditing} disabled={isUpdating}>
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
