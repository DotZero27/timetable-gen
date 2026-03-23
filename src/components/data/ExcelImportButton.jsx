"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function parseDepartmentCodes(value) {
  if (!value) return [];
  return String(value)
    .split(/[;,/|]/)
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
}

function isTruthyElective(value) {
  if (value === true) return true;
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "yes" || normalized === "true" || normalized === "1";
}

async function parseSubjectsPreview(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames?.[0];

  if (!firstSheetName) {
    return {
      subjectCount: 0,
      uniqueDepartments: [],
      rowErrors: ["No worksheet found in the uploaded file."],
      unknownDepartments: [],
    };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  let subjectCount = 0;
  const departmentSet = new Set();
  const rowErrors = [];
  const previewRows = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const code = String(row.code ?? "").trim();
    const name = String(row.name ?? "").trim();
    const semesterRaw = String(row.semester ?? "").trim();
    const departmentsRaw = row.departments ?? row.department ?? "";
    const departments = parseDepartmentCodes(departmentsRaw);
    const isEmptyRow = !code && !name && !semesterRaw && departments.length === 0;

    if (isEmptyRow) return;
    subjectCount += 1;
    previewRows.push({
      rowNumber,
      code,
      name,
      semester: semesterRaw,
      departments,
      elective: isTruthyElective(row.elective),
    });

    if (!code) rowErrors.push(`Row ${rowNumber}: Missing subject code.`);
    if (!name) rowErrors.push(`Row ${rowNumber}: Missing subject name.`);

    const semester = Number.parseInt(semesterRaw, 10);
    if (!semesterRaw || Number.isNaN(semester)) {
      rowErrors.push(`Row ${rowNumber}: Semester must be an integer.`);
    }

    if (departments.length === 0) {
      rowErrors.push(`Row ${rowNumber}: At least one department code is required.`);
    }

    departments.forEach((depCode) => departmentSet.add(depCode));

    if (isTruthyElective(row.elective)) {
      const electiveGroupId = String(
        row.electiveGroupId ?? row.elective_group_id ?? ""
      ).trim();
      if (!electiveGroupId) {
        rowErrors.push(
          `Row ${rowNumber}: electiveGroupId is required when elective is true.`
        );
      }
    }
  });

  let unknownDepartments = [];
  try {
    const res = await fetch("/api/departments");
    const data = await res.json();

    if (!res.ok) {
      rowErrors.push(
        `Unable to validate department codes from server: ${data.error || "Unknown error"}.`
      );
    } else {
      const knownCodes = new Set(
        (Array.isArray(data) ? data : [])
          .map((d) => String(d?.code ?? "").trim().toUpperCase())
          .filter(Boolean)
      );
      unknownDepartments = Array.from(departmentSet).filter((code) => !knownCodes.has(code));
    }
  } catch (err) {
    rowErrors.push(
      `Unable to validate department codes from server: ${err.message || "Network error"}.`
    );
  }

  return {
    subjectCount,
    uniqueDepartments: Array.from(departmentSet).sort(),
    rowErrors,
    unknownDepartments,
    previewRows,
  };
}

export function ExcelImportButton({
  endpoint,
  queryKey,
  label = "Import from Excel",
  enablePreview = false,
  previewType = "subjects",
}) {
  const fileRef = React.useRef(null);
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [preview, setPreview] = React.useState({
    subjectCount: 0,
    uniqueDepartments: [],
    rowErrors: [],
    unknownDepartments: [],
    previewRows: [],
  });
  const previewListRef = React.useRef(null);
  const errorListRef = React.useRef(null);
  const queryClient = useQueryClient();

  const resetSelection = React.useCallback(() => {
    setDialogOpen(false);
    setSelectedFile(null);
    setCurrentPage(1);
    setPreview({
      subjectCount: 0,
      uniqueDepartments: [],
      rowErrors: [],
      unknownDepartments: [],
      previewRows: [],
    });
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const uploadFile = React.useCallback(
    async (file) => {
      if (!file) return;

      setLoading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(endpoint, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || "Import failed");
          return;
        }

        toast.success(data.message || "Import successful");
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        resetSelection();
      } catch (err) {
        toast.error(err.message || "Import failed");
      } finally {
        setLoading(false);
      }
    },
    [endpoint, queryClient, queryKey, resetSelection]
  );

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const shouldPreview = enablePreview && previewType === "subjects";
    if (!shouldPreview) {
      await uploadFile(file);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setLoading(true);
    try {
      const parsed = await parseSubjectsPreview(file);
      setSelectedFile(file);
      setPreview(parsed);
      setCurrentPage(1);
      setDialogOpen(true);
    } catch (err) {
      toast.error(err.message || "Failed to parse Excel file");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setLoading(false);
    }
  };

  const hasBlockingIssues =
    preview.rowErrors.length > 0 || preview.unknownDepartments.length > 0;
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(preview.previewRows.length / pageSize));
  const boundedPage = Math.min(currentPage, totalPages);
  const pageStart = (boundedPage - 1) * pageSize;
  const pageRows = React.useMemo(
    () => preview.previewRows.slice(pageStart, pageStart + pageSize),
    [preview.previewRows, pageStart, pageSize]
  );

  const visiblePageNumbers = React.useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (boundedPage <= 3) return [1, 2, 3, 4, -1, totalPages];
    if (boundedPage >= totalPages - 2) {
      return [1, -1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, -1, boundedPage - 1, boundedPage, boundedPage + 1, -1, totalPages];
  }, [boundedPage, totalPages]);

  const allErrors = React.useMemo(() => {
    const depMismatchErrors = preview.unknownDepartments.map(
      (code) => `Unknown department code: ${code}`
    );
    return [...depMismatchErrors, ...preview.rowErrors];
  }, [preview.unknownDepartments, preview.rowErrors]);

  const previewVirtualizer = useVirtualizer({
    count: pageRows.length,
    getScrollElement: () => previewListRef.current,
    estimateSize: () => 44,
    overscan: 8,
  });

  const errorVirtualizer = useVirtualizer({
    count: allErrors.length,
    getScrollElement: () => errorListRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });
  const previewItems = previewVirtualizer.getVirtualItems();
  const errorItems = errorVirtualizer.getVirtualItems();
  const previewGridCols = "80px 140px minmax(260px,1fr) 110px minmax(220px,1.2fr) 90px";

  const handleConfirmUpload = async () => {
    if (!selectedFile || hasBlockingIssues || loading) return;
    await uploadFile(selectedFile);
  };

  const handleDialogOpenChange = (open) => {
    if (loading) return;
    if (!open) {
      resetSelection();
      return;
    }
    setDialogOpen(true);
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="size-4 mr-2" />
        {loading ? "Importing..." : label}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Confirm subject upload</DialogTitle>
            <DialogDescription>
              Review summary and resolve mismatches before final upload.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto px-6 py-4">
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">File</p>
              <p className="text-muted-foreground">
                {selectedFile?.name || "Not selected"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-medium">Subjects found</p>
                <p className="text-muted-foreground">{preview.subjectCount}</p>
              </div>
              <div>
                <p className="font-medium">Unique departments</p>
                <p className="text-muted-foreground">{preview.uniqueDepartments.length}</p>
              </div>
            </div>

            <div>
              <p className="font-medium">Department codes</p>
              <p className="text-muted-foreground wrap-break-word">
                {preview.uniqueDepartments.length > 0
                  ? preview.uniqueDepartments.join(", ")
                  : "None"}
              </p>
            </div>

            <div>
              <p className="font-medium">Subjects preview</p>
              {/* Mobile: horizontal scroll for wide grid; sm+: wider dialog (max-w-3xl) + same overflow fallback */}
              <div className="mt-2 overflow-x-auto rounded-md border bg-background [-webkit-overflow-scrolling:touch]">
                <div className="min-w-[900px]">
                  <div
                    ref={previewListRef}
                    className="h-64 overflow-y-auto overflow-x-hidden"
                  >
                {pageRows.length > 0 && (
                  <div
                    className="sticky top-0 z-10 grid border-b bg-muted text-[11px] font-semibold uppercase tracking-wide text-foreground"
                    style={{ gridTemplateColumns: previewGridCols }}
                  >
                    <div className="border-r px-2 py-2">Row</div>
                    <div className="border-r px-2 py-2">Code</div>
                    <div className="border-r px-2 py-2">Name</div>
                    <div className="border-r px-2 py-2">Semester</div>
                    <div className="border-r px-2 py-2">Departments</div>
                    <div className="px-2 py-2">Elective</div>
                  </div>
                )}
                {preview.previewRows.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No subject rows found
                  </div>
                ) : previewItems.length === 0 ? (
                  <div className="divide-y font-mono text-xs">
                    {pageRows.slice(0, 25).map((row) => (
                      <div
                        key={`${row.rowNumber}-${row.code}-fallback`}
                        className="grid odd:bg-background even:bg-muted/20"
                        style={{ gridTemplateColumns: previewGridCols }}
                      >
                        <div className="border-r px-2 py-2 text-foreground">{row.rowNumber}</div>
                        <div className="border-r px-2 py-2 text-foreground">
                          {row.code || "(missing)"}
                        </div>
                        <div className="border-r px-2 py-2 text-foreground">
                          {row.name || "(missing)"}
                        </div>
                        <div className="border-r px-2 py-2 text-foreground">{row.semester || "-"}</div>
                        <div className="border-r px-2 py-2 text-foreground">
                          {row.departments.length > 0 ? row.departments.join(", ") : "-"}
                        </div>
                        <div className="px-2 py-2 text-foreground">{row.elective ? "Yes" : "No"}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="relative w-full font-mono text-xs"
                    style={{ height: `${previewVirtualizer.getTotalSize()}px` }}
                  >
                    {previewItems.map((item) => {
                      const row = pageRows[item.index];
                      return (
                        <div
                          key={`${row.rowNumber}-${row.code}-${item.key}`}
                          className="absolute left-0 top-0 grid w-full border-b text-foreground odd:bg-background even:bg-muted/20"
                          style={{
                            transform: `translateY(${item.start}px)`,
                            gridTemplateColumns: previewGridCols,
                          }}
                        >
                          <div className="border-r px-2 py-2">{row.rowNumber}</div>
                          <div className="border-r px-2 py-2">{row.code || "(missing)"}</div>
                          <div className="border-r px-2 py-2">{row.name || "(missing)"}</div>
                          <div className="border-r px-2 py-2">{row.semester || "-"}</div>
                          <div className="border-r px-2 py-2">
                            {row.departments.length > 0 ? row.departments.join(", ") : "-"}
                          </div>
                          <div className="px-2 py-2">{row.elective ? "Yes" : "No"}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {preview.previewRows.length === 0
                    ? "Showing 0 of 0"
                    : `Showing ${pageStart + 1}-${Math.min(pageStart + pageSize, preview.previewRows.length)} of ${preview.previewRows.length}`}
                </span>
                {totalPages > 1 && (
                  <Pagination className="mx-0 w-auto justify-end">
                    <PaginationContent className="gap-0.5">
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (boundedPage > 1) setCurrentPage((p) => p - 1);
                          }}
                          className={boundedPage <= 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                      {visiblePageNumbers.map((page, index) => (
                        <PaginationItem key={`page-${page}-${index}`}>
                          {page === -1 ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              href="#"
                              size="icon"
                              isActive={boundedPage === page}
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                            >
                              {page}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (boundedPage < totalPages) setCurrentPage((p) => p + 1);
                          }}
                          className={
                            boundedPage >= totalPages ? "pointer-events-none opacity-50" : ""
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </div>

            {(preview.unknownDepartments.length > 0 || preview.rowErrors.length > 0) && (
              <div className="space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="font-medium text-destructive">Errors or mismatches found</p>
                <div
                  ref={errorListRef}
                  className="h-40 overflow-auto rounded-md border border-destructive/30 bg-background/80"
                >
                  <div
                    className="relative w-full"
                    style={{ height: `${errorVirtualizer.getTotalSize()}px` }}
                  >
                    {errorItems.map((item) => {
                      const error = allErrors[item.index];
                      return (
                        <div
                          key={`${item.key}-${error}`}
                          className="absolute left-0 top-0 w-full border-b border-destructive/10 bg-background px-3 py-1 text-destructive"
                          style={{ transform: `translateY(${item.start}px)` }}
                        >
                          {error}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-3 sm:justify-end">
            <Button variant="outline" onClick={resetSelection} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUpload} disabled={loading || hasBlockingIssues}>
              {loading ? "Uploading..." : "Confirm upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
