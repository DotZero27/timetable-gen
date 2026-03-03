import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { subjects, semesters, holidays, scheduleVersions, examSlots } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { generate } from "@/lib/schedule/generator";

export async function POST(request) {
  try {
    const body = await request.json();
    const { cycle, startDate, endDate, subjectIds, semesterIds, fixedAssignments: rawFixed } = body;

    if (!cycle || !startDate || !endDate) {
      return NextResponse.json(
        { error: "cycle, startDate, and endDate are required" },
        { status: 400 }
      );
    }
    if (cycle !== "EVEN" && cycle !== "ODD") {
      return NextResponse.json({ error: "cycle must be EVEN or ODD" }, { status: 400 });
    }

    const db = getDb();

    let subjectList;
    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      const rows = await db
        .select({
          id: subjects.id,
          semesterNumber: semesters.semesterNumber,
        })
        .from(subjects)
        .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
        .where(inArray(subjects.id, subjectIds));
      subjectList = rows;
    } else if (Array.isArray(semesterIds) && semesterIds.length > 0) {
      const rows = await db
        .select({
          id: subjects.id,
          semesterNumber: semesters.semesterNumber,
        })
        .from(subjects)
        .innerJoin(semesters, eq(subjects.semesterId, semesters.id))
        .where(inArray(semesters.id, semesterIds));
      subjectList = rows;
    } else {
      return NextResponse.json(
        { error: "Provide subjectIds or semesterIds" },
        { status: 400 }
      );
    }

    if (subjectList.length === 0) {
      return NextResponse.json(
        { error: "No subjects found for the given criteria" },
        { status: 400 }
      );
    }

    const subjectIdsInScope = new Set(subjectList.map((s) => s.id));
    let fixedAssignments = [];
    if (Array.isArray(rawFixed) && rawFixed.length > 0) {
      for (const fa of rawFixed) {
        const { date, slot, subjectId } = fa;
        if (!date || !slot || !subjectId || !subjectIdsInScope.has(Number(subjectId))) continue;
        const sub = subjectList.find((s) => s.id === Number(subjectId));
        if (sub) {
          fixedAssignments.push({
            date: String(date).slice(0, 10),
            slot: slot === "AFTERNOON" ? "AFTERNOON" : "FORENOON",
            subjectId: sub.id,
            semesterNumber: sub.semesterNumber,
          });
        }
      }
    }

    const holidayRows = await db
      .select({ date: holidays.date })
      .from(holidays)
      .where(and(gte(holidays.date, startDate), lte(holidays.date, endDate)));
    const holidayDates = new Set(holidayRows.map((r) => r.date));

    const exams = subjectList.map((s) => ({
      subjectId: s.id,
      semesterNumber: s.semesterNumber,
    }));

    const result = generate({
      exams,
      cycle,
      startDate,
      endDate,
      holidayDates,
      fixedAssignments,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, rule: result.rule },
        { status: 400 }
      );
    }

    const versionRows = await db
      .select({ versionNumber: scheduleVersions.versionNumber })
      .from(scheduleVersions);
    const nextVersion =
      versionRows.length === 0
        ? 1
        : Math.max(...versionRows.map((r) => r.versionNumber)) + 1;

    const [insertedVersion] = await db
      .insert(scheduleVersions)
      .values({
        versionNumber: nextVersion,
        cycle,
        createdAt: new Date().toISOString(),
        status: "draft",
      })
      .returning({ id: scheduleVersions.id });

    const versionId = insertedVersion.id;
    for (const entry of result.schedule) {
      await db.insert(examSlots).values({
        scheduleVersionId: versionId,
        date: entry.date,
        slot: entry.slot,
        subjectId: entry.subjectId,
      });
    }

    return NextResponse.json({
      versionId,
      versionNumber: nextVersion,
      schedule: result.schedule,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Generation failed" },
      { status: 500 }
    );
  }
}
