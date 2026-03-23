import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const data = [
    { code: "CS101", name: "Data Structures", semester: 3 },
    { code: "MA201", name: "Linear Algebra", semester: 4 },
  ];

  const ws = XLSX.utils.json_to_sheet(data, {
    header: ["code", "name", "semester"],
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Subjects");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="subjects-template.xlsx"',
    },
  });
}
