import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getDb } from "@/db";
import { subjects, semesters, departments, subjectDepartments } from "@/db/schema";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    if (rows.length === 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    const db = getDb();

    // Build semesterNumber → semesterId lookup
    const allSemesters = await db.select().from(semesters);
    const semesterMap = new Map(
      allSemesters.map((s) => [s.semesterNumber, s.id])
    );

    // Build departmentCode → departmentId lookup
    const allDepartments = await db.select().from(departments);
    const departmentMap = new Map(
      allDepartments.map((d) => [d.code.toUpperCase(), d.id])
    );

    const errors = [];
    const toInsert = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header row + 0-index
      const code = String(row.code ?? "").trim();
      const name = String(row.name ?? "").trim();
      const semNum = Number(row.semester);
      const rawDepartments = String(row.departments ?? row.department ?? "");
      const deptCodes = rawDepartments
        .split(/[;,/|]/)
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean);

      if (!code) {
        errors.push(`Row ${rowNum}: missing code`);
        continue;
      }
      if (!name) {
        errors.push(`Row ${rowNum}: missing name`);
        continue;
      }
      if (!semNum || !Number.isInteger(semNum)) {
        errors.push(`Row ${rowNum}: invalid semester "${row.semester}"`);
        continue;
      }

      const semesterId = semesterMap.get(semNum);
      if (!semesterId) {
        errors.push(`Row ${rowNum}: semester ${semNum} not found in database`);
        continue;
      }

      if (deptCodes.length === 0) {
        errors.push(`Row ${rowNum}: missing department`);
        continue;
      }
      const departmentIds = [];
      for (const deptCode of deptCodes) {
        const departmentId = departmentMap.get(deptCode) ?? null;
        if (!departmentId) {
          errors.push(`Row ${rowNum}: department "${deptCode}" not found in database`);
          continue;
        }
        departmentIds.push(departmentId);
      }
      if (departmentIds.length === 0) continue;

      const electiveRaw = String(row.elective ?? "").trim().toLowerCase();
      const isElective = ["yes", "true", "1"].includes(electiveRaw);
      const electiveGroupId = String(row.electiveGroupId ?? row.elective_group_id ?? "").trim() || null;

      const tcpRaw = String(row.tcp ?? "").trim().toLowerCase();
      const isTheoryCumPractical = ["yes", "true", "1"].includes(tcpRaw);

      toInsert.push({ code, name, semesterId, departmentIds: [...new Set(departmentIds)], isElective, electiveGroupId, isTheoryCumPractical });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: `Validation failed:\n${errors.join("\n")}`, details: errors },
        { status: 400 }
      );
    }

    // Bulk insert — use INSERT OR IGNORE to skip duplicates
    let inserted = 0;
    for (const row of toInsert) {
      try {
        await db.insert(subjects).values({
          code: row.code,
          name: row.name,
          semesterId: row.semesterId,
          departmentId: row.departmentIds[0],
          isElective: row.isElective,
          electiveGroupId: row.electiveGroupId,
          isTheoryCumPractical: row.isTheoryCumPractical,
        });
        inserted++;
      } catch (err) {
        const msg = err?.message ?? "";
        if (msg.includes("UNIQUE")) {
          // Existing subject; keep processing mappings.
        }
      }
      for (const departmentId of row.departmentIds) {
        try {
          await db.insert(subjectDepartments).values({
            subjectCode: row.code,
            departmentId,
          });
        } catch (err) {
          const msg = err?.message ?? "";
          if (!msg.includes("UNIQUE")) throw err;
        }
      }
    }

    return NextResponse.json({
      message: `Imported ${inserted} subject(s)${inserted < toInsert.length ? ` (${toInsert.length - inserted} duplicates skipped)` : ""}`,
      inserted,
      skipped: toInsert.length - inserted,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Import failed" },
      { status: 500 }
    );
  }
}
