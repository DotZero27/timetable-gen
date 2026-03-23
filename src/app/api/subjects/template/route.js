import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const data = [
    {
      code: "CS101",
      name: "Data Structures",
      semester: 3,
      departments: "CSE",
      elective: "",
      electiveGroupId: "",
    },
    {
      code: "UMA2377",
      name: "Discrete Mathematics",
      semester: 5,
      departments: "CSE,IT",
      elective: "",
      electiveGroupId: "",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(data, {
    header: ["code", "name", "semester", "departments", "elective", "electiveGroupId"],
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Subjects");
  const instructions = [
    { field: "code", required: "yes", example: "UMA2377", notes: "Subject code (one row per subject code)." },
    { field: "name", required: "yes", example: "Discrete Mathematics", notes: "Subject name." },
    { field: "semester", required: "yes", example: "5", notes: "Semester number (1-8)." },
    { field: "departments", required: "yes", example: "CSE,IT", notes: "Comma-separated department codes for this subject." },
    { field: "elective", required: "no", example: "yes", notes: "Use yes/true/1 for elective subjects." },
    { field: "electiveGroupId", required: "no", example: "SEM5_open_elective", notes: "Required only when elective is yes." },
  ];
  const ins = XLSX.utils.json_to_sheet(instructions, {
    header: ["field", "required", "example", "notes"],
  });
  XLSX.utils.book_append_sheet(wb, ins, "Instructions");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="subjects-template.xlsx"',
    },
  });
}
