import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { scheduleVersions, examSlots, subjects, semesters, departments, subjectDepartments } from "@/db/schema";
import { eq, asc, inArray } from "drizzle-orm";
import { validateSchedule } from "@/lib/schedule/validate";

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
        departmentCode: departments.code,
        departmentName: departments.name,
      })
      .from(examSlots)
      .innerJoin(subjects, eq(examSlots.subjectCode, subjects.code))
      .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
      .leftJoin(departments, eq(examSlots.departmentId, departments.id))
      .where(eq(examSlots.scheduleVersionId, id))
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

export async function PUT(request, { params }) {
  try {
    const { versionId } = await params;
    const id = Number(versionId);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid version id" }, { status: 400 });
    }

    const body = await request.json();
    const rawName = typeof body?.name === "string" ? body.name.trim() : "";
    const name = rawName.length > 0 ? rawName : null;
    const rawSlots = Array.isArray(body?.examSlots) ? body.examSlots : null;
    const rawSemesterGap = body?.semesterGapDays;
    const semesterGapDays =
      rawSemesterGap === undefined ? 0 : Number.parseInt(String(rawSemesterGap), 10);

    if (!rawSlots) {
      return NextResponse.json({ error: "examSlots must be an array" }, { status: 400 });
    }
    if (!Number.isInteger(semesterGapDays) || semesterGapDays < 0) {
      return NextResponse.json({ error: "semesterGapDays must be a non-negative integer" }, { status: 400 });
    }

    const parsedSlots = [];
    for (const slot of rawSlots) {
      const date = String(slot?.date ?? "").slice(0, 10);
      const slotName = slot?.slot === "AFTERNOON" ? "AFTERNOON" : slot?.slot === "FORENOON" ? "FORENOON" : null;
      const subjectCode = String(slot?.subjectCode ?? "");
      const departmentId = Number(slot?.departmentId);
      if (!date || !slotName || !subjectCode || !Number.isInteger(departmentId)) {
        return NextResponse.json({ error: "Each exam slot must include date, slot, subjectCode, and departmentId" }, { status: 400 });
      }
      parsedSlots.push({ date, slot: slotName, subjectCode, departmentId });
    }

    const db = getDb();
    const [version] = await db
      .select()
      .from(scheduleVersions)
      .where(eq(scheduleVersions.id, id));
    if (!version) {
      return NextResponse.json({ error: "Schedule version not found" }, { status: 404 });
    }
    if (version.status !== "draft") {
      return NextResponse.json({ error: "Only draft schedules can be edited." }, { status: 400 });
    }

    const subjectCodes = [...new Set(parsedSlots.map((s) => s.subjectCode))];
    const subjectRows = subjectCodes.length
      ? await db
        .select({
          code: subjects.code,
          semesterNumber: semesters.semesterNumber,
          departmentId: subjectDepartments.departmentId,
          isElective: subjects.isElective,
          electiveGroupId: subjects.electiveGroupId,
        })
        .from(subjectDepartments)
        .innerJoin(subjects, eq(subjectDepartments.subjectCode, subjects.code))
        .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
        .where(inArray(subjects.code, subjectCodes))
      : [];
    const subjectMap = new Map(subjectRows.map((s) => [`${s.code}::${s.departmentId}`, s]));
    for (const slot of parsedSlots) {
      const key = `${slot.subjectCode}::${slot.departmentId}`;
      if (!subjectMap.has(key)) {
        return NextResponse.json({ error: `Invalid subject/department combination: ${slot.subjectCode}` }, { status: 400 });
      }
    }
    const hydrated = parsedSlots.map((s) => {
      const subject = subjectMap.get(`${s.subjectCode}::${s.departmentId}`);
      return {
        date: s.date,
        slot: s.slot,
        subjectCode: s.subjectCode,
        semesterNumber: subject.semesterNumber,
        departmentId: subject.departmentId,
        isElective: subject.isElective ?? false,
        electiveGroupId: subject.electiveGroupId ?? null,
      };
    });

    const validation = validateSchedule(hydrated, version.cycle, new Set(), semesterGapDays);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.message, rule: validation.rule },
        { status: 400 }
      );
    }

    await db
      .update(scheduleVersions)
      .set({ name: name ?? version.name ?? `Schedule ${version.versionNumber}` })
      .where(eq(scheduleVersions.id, id));
    await db.delete(examSlots).where(eq(examSlots.scheduleVersionId, id));
    for (const slot of parsedSlots) {
      await db.insert(examSlots).values({
        scheduleVersionId: id,
        date: slot.date,
        slot: slot.slot,
        subjectCode: slot.subjectCode,
        departmentId: slot.departmentId,
      });
    }

    const [updatedVersion] = await db
      .select()
      .from(scheduleVersions)
      .where(eq(scheduleVersions.id, id));
    const updatedSlots = await db
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
        departmentCode: departments.code,
        departmentName: departments.name,
      })
      .from(examSlots)
      .innerJoin(subjects, eq(examSlots.subjectCode, subjects.code))
      .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
      .leftJoin(departments, eq(examSlots.departmentId, departments.id))
      .where(eq(examSlots.scheduleVersionId, id))
      .orderBy(asc(examSlots.date), asc(examSlots.slot));

    return NextResponse.json({ ...updatedVersion, examSlots: updatedSlots });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Failed to update schedule" },
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
