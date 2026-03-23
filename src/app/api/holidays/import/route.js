import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getDb } from "@/db";
import { holidays } from "@/db/schema";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
    const errors = [];
    const toInsert = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      // Handle Excel date serial numbers
      let date = row.date;
      if (typeof date === "number") {
        const parsed = XLSX.SSF.parse_date_code(date);
        date = `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
      } else {
        date = String(date ?? "").trim();
      }

      if (!DATE_RE.test(date)) {
        errors.push(`Row ${rowNum}: invalid date "${row.date}" (expected YYYY-MM-DD)`);
        continue;
      }

      const label = String(row.label ?? "").trim() || null;
      toInsert.push({ date, label });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: `Validation failed:\n${errors.join("\n")}`, details: errors },
        { status: 400 }
      );
    }

    // Bulk insert
    if (toInsert.length > 0) {
      await db.insert(holidays).values(toInsert);
    }

    return NextResponse.json({
      message: `Imported ${toInsert.length} holiday(s)`,
      inserted: toInsert.length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Import failed" },
      { status: 500 }
    );
  }
}
