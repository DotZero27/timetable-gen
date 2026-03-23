import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const data = [
    { date: "2026-01-26", label: "Republic Day" },
    { date: "2026-08-15", label: "Independence Day" },
  ];

  const ws = XLSX.utils.json_to_sheet(data, {
    header: ["date", "label"],
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Holidays");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="holidays-template.xlsx"',
    },
  });
}
