import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  scheduleVersions,
  examSlots,
  subjects,
  semesters,
  departments,
  exportTemplates,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { generatePdf } from "@/lib/schedule/generatePdf";

export async function GET(request, { params }) {
  try {
    const { versionId } = await params;
    const id = Number(versionId);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid version id" }, { status: 400 });
    }

    const db = getDb();

    const [version] = await db
      .select()
      .from(scheduleVersions)
      .where(eq(scheduleVersions.id, id));
    if (!version) {
      return NextResponse.json({ error: "Schedule version not found" }, { status: 404 });
    }

    const [template] = await db
      .select()
      .from(exportTemplates)
      .where(eq(exportTemplates.scheduleVersionId, id));

    const slots = await db
      .select({
        id: examSlots.id,
        date: examSlots.date,
        slot: examSlots.slot,
        subjectCode: examSlots.subjectCode,
        subjectName: subjects.name,
        semesterNumber: semesters.semesterNumber,
        departmentId: examSlots.departmentId,
        isElective: subjects.isElective,
        electiveGroupId: subjects.electiveGroupId,
        isTheoryCumPractical: subjects.isTheoryCumPractical,
        departmentCode: departments.code,
        departmentName: departments.name,
        departmentDegreePrefix: departments.degreePrefix,
        departmentDisplayOrder: departments.displayOrder,
      })
      .from(examSlots)
      .innerJoin(subjects, eq(examSlots.subjectCode, subjects.code))
      .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
      .leftJoin(departments, eq(examSlots.departmentId, departments.id))
      .where(eq(examSlots.scheduleVersionId, id))
      .orderBy(asc(examSlots.date), asc(examSlots.slot), asc(departments.displayOrder));

    if (!slots.length) {
      return NextResponse.json({ error: "No exam slots found for this schedule" }, { status: 404 });
    }

    const buffer = await generatePdf({ template: template ?? {}, examSlots: slots });

    const safeName = (version.name ?? `Schedule-${version.versionNumber}`)
      .replace(/[^a-zA-Z0-9_\-. ]/g, "_")
      .trim();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
