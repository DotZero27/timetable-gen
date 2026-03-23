"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useSemesters } from "@/hooks/useSemesters";
import { useSubjects } from "@/hooks/useSubjects";
import { useAddSubject } from "@/hooks/useAddSubject";
import { useDeleteSubject } from "@/hooks/useDeleteSubject";

/**
 * Composite: form to add a subject (code, name, semester) + list of subjects with optional semester filter.
 */
export function SubjectsManager({ semesters: initialSemesters, className }) {
  const [filterSemesterId, setFilterSemesterId] = React.useState("");
  const [code, setCode] = React.useState("");
  const [name, setName] = React.useState("");
  const [semesterId, setSemesterId] = React.useState("");
  const [error, setError] = React.useState(null);

  const { data: semestersFromApi } = useSemesters();
  const semesters = initialSemesters?.length ? initialSemesters : (semestersFromApi ?? []);
  const { data: subjects, isLoading: listLoading } = useSubjects(filterSemesterId || undefined);
  const { mutate: addSubjectMutate, isPending } = useAddSubject();
  const { mutate: deleteSubject, isPending: isDeleting, pendingCode: deletingCode } = useDeleteSubject();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!code.trim() || !name.trim() || !semesterId) {
      setError("Code, name, and semester are required.");
      return;
    }
    addSubjectMutate(
      { code: code.trim(), name: name.trim(), semesterId: Number(semesterId) },
      {
        onSuccess: () => {
          setCode("");
          setName("");
          setSemesterId("");
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
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add subject"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Subjects</CardTitle>
            <CardDescription>All subjects; filter by semester below.</CardDescription>
          </div>
          <div>
            <Label className="text-sm font-medium sr-only">Filter by semester</Label>
            <Select value={filterSemesterId || "all"} onValueChange={(v) => setFilterSemesterId(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue />
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
          </div>
        </CardHeader>
        <CardContent>
          {listLoading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : (subjects ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No subjects yet. Add one above.</p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left font-medium p-3">Code</th>
                    <th className="text-left font-medium p-3">Name</th>
                    <th className="text-left font-medium p-3">Semester</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {(subjects ?? []).map((sub) => {
                    const sem = semesters.find((s) => s.id === sub.semesterId);
                    return (
                      <motion.tr
                        key={sub.code}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-b last:border-0"
                      >
                        <td className="p-3 font-mono">{sub.code}</td>
                        <td className="p-3">{sub.name}</td>
                        <td className="p-3 text-muted-foreground">
                          {sem ? `${sem.name}` : sub.semesterId}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={isDeleting && deletingCode === sub.code}
                            onClick={() => deleteSubject(sub.code)}
                          >
                            {isDeleting && deletingCode === sub.code ? "Deleting…" : "Delete"}
                          </Button>
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
    </motion.div>
  );
}
