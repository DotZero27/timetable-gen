import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { scheduleVersions, examSlots, subjects, semesters } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(request, { params }) {
  try {
    const { versionId } = await params;
    if (Number.isNaN(Number(versionId))) {
      return NextResponse.json({ error: "Invalid version id" }, { status: 400 });
    }
    const db = getDb();
    const [version] = await db
      .select()
      .from(scheduleVersions)
      .where(eq(scheduleVersions.id, versionId));
    if (!version) {
      return NextResponse.json({ error: "Schedule version not found" }, { status: 404 });
    }
    const slots = await db
      .select({
        id: examSlots.id,
        date: examSlots.date,
        slot: examSlots.slot,
        subjectId: examSlots.subjectId,
        subjectCode: subjects.code,
        subjectName: subjects.name,
        semesterNumber: semesters.semesterNumber,
      })
      .from(examSlots)
      .innerJoin(subjects, eq(examSlots.subjectId, subjects.id))
      .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
      .where(eq(examSlots.scheduleVersionId, versionId))
      .orderBy(asc(examSlots.date), asc(examSlots.slot));
    return NextResponse.json({ ...version, examSlots: slots });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Failed to get schedule" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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
    await db.delete(examSlots).where(eq(examSlots.scheduleVersionId, id));
    await db.delete(scheduleVersions).where(eq(scheduleVersions.id, id));
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Failed to delete schedule" },
      { status: 500 }
    );
  }
}
