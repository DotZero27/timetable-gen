import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { subjects, semesters, holidays, scheduleVersions, examSlots, subjectDepartments } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { generate } from "@/lib/schedule/generator";
import { validateSchedule } from "@/lib/schedule/validate";

function normalizeElectiveGroup(subject) {
  return String(subject?.electiveGroupId ?? "").trim();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      cycle,
      startDate,
      endDate,
      subjectCodes,
      semesterIds,
      semesterGapDays: rawSemesterGapDays,
      pairRotationMode: rawPairRotationMode,
      fixedAssignments: rawFixed,
    } = body;

    if (!cycle || !startDate || !endDate) {
      return NextResponse.json(
        { error: "cycle, startDate, and endDate are required" },
        { status: 400 }
      );
    }
    if (cycle !== "EVEN" && cycle !== "ODD") {
      return NextResponse.json({ error: "cycle must be EVEN or ODD" }, { status: 400 });
    }
    const semesterGapDays =
      rawSemesterGapDays === undefined ? 1 : Number.parseInt(String(rawSemesterGapDays), 10);
    if (!Number.isInteger(semesterGapDays) || semesterGapDays < 0) {
      return NextResponse.json({ error: "semesterGapDays must be a non-negative integer" }, { status: 400 });
    }
    const pairRotationMode = rawPairRotationMode ?? "AVAILABLE_ONLY";
    if (pairRotationMode !== "AVAILABLE_ONLY" && pairRotationMode !== "FULL_CYCLE") {
      return NextResponse.json({ error: "pairRotationMode must be AVAILABLE_ONLY or FULL_CYCLE" }, { status: 400 });
    }

    const db = getDb();

    let subjectList;
    if (Array.isArray(subjectCodes) && subjectCodes.length > 0) {
      const rows = await db
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
        .where(inArray(subjects.code, subjectCodes));
      subjectList = rows;
    } else if (Array.isArray(semesterIds) && semesterIds.length > 0) {
      const rows = await db
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
        .where(inArray(semesters.id, semesterIds));
      subjectList = rows;
    } else {
      return NextResponse.json(
        { error: "Provide subjectCodes or semesterIds" },
        { status: 400 }
      );
    }

    if (subjectList.length === 0) {
      return NextResponse.json(
        { error: "No subjects found for the given criteria" },
        { status: 400 }
      );
    }

    const subjectKeysInScope = new Set(subjectList.map((s) => `${s.code}::${s.departmentId}`));
    const subjectByKey = new Map(subjectList.map((s) => [`${s.code}::${s.departmentId}`, s]));
    const groupedElectives = new Map();
    for (const sub of subjectList) {
      const groupId = normalizeElectiveGroup(sub);
      if (sub.isElective !== true || !groupId) continue;
      const key = `${sub.semesterNumber}:${groupId}`;
      const members = groupedElectives.get(key) ?? [];
      members.push(sub);
      groupedElectives.set(key, members);
    }
    let fixedAssignments = [];
    if (Array.isArray(rawFixed) && rawFixed.length > 0) {
      for (const fa of rawFixed) {
        const { date, slot, subjectCode, departmentId } = fa;
        const normalizedCode = String(subjectCode ?? "");
        const normalizedDeptId = Number(departmentId);
        const subjectKey = `${normalizedCode}::${normalizedDeptId}`;
        if (!date || !slot || !normalizedCode || !Number.isInteger(normalizedDeptId) || !subjectKeysInScope.has(subjectKey)) continue;
        const sub = subjectByKey.get(subjectKey);
        if (sub) {
          fixedAssignments.push({
            date: String(date).slice(0, 10),
            slot: slot === "AFTERNOON" ? "AFTERNOON" : "FORENOON",
            subjectCode: normalizedCode,
            semesterNumber: sub.semesterNumber,
            departmentId: sub.departmentId,
            isElective: sub.isElective ?? false,
            electiveGroupId: sub.electiveGroupId ?? null,
          });
        }
      }
    }

    // Auto-pin grouped electives to same date+slot when one member is fixed.
    const fixedBySubject = new Map();
    const fixedGroupAnchor = new Map();
    for (const fixed of fixedAssignments) {
      fixedBySubject.set(`${fixed.subjectCode}::${fixed.departmentId}`, fixed);
      const groupId = normalizeElectiveGroup(fixed);
      if (fixed.isElective !== true || !groupId) continue;
      const key = `${fixed.semesterNumber}:${groupId}`;
      const anchor = fixedGroupAnchor.get(key);
      if (anchor && (anchor.date !== fixed.date || anchor.slot !== fixed.slot)) {
        return NextResponse.json(
          {
            error: `Conflicting fixed assignments for elective group ${groupId} in semester ${fixed.semesterNumber}.`,
          },
          { status: 400 }
        );
      }
      fixedGroupAnchor.set(key, { date: fixed.date, slot: fixed.slot });
    }
    for (const [groupKey, anchor] of fixedGroupAnchor) {
      const members = groupedElectives.get(groupKey) ?? [];
      for (const member of members) {
        const memberKey = `${member.code}::${member.departmentId}`;
        const existing = fixedBySubject.get(memberKey);
        if (existing && (existing.date !== anchor.date || existing.slot !== anchor.slot)) {
          return NextResponse.json(
            {
              error: `Conflicting fixed assignments for elective group ${normalizeElectiveGroup(member)} in semester ${member.semesterNumber}.`,
            },
            { status: 400 }
          );
        }
        if (!existing) {
          const expanded = {
            date: anchor.date,
            slot: anchor.slot,
            subjectCode: member.code,
            semesterNumber: member.semesterNumber,
            departmentId: member.departmentId,
            isElective: member.isElective ?? false,
            electiveGroupId: member.electiveGroupId ?? null,
          };
          fixedAssignments.push(expanded);
          fixedBySubject.set(memberKey, expanded);
        }
      }
    }

    const holidayRows = await db
      .select({ date: holidays.date })
      .from(holidays)
      .where(and(gte(holidays.date, startDate), lte(holidays.date, endDate)));
    const holidayDates = new Set(holidayRows.map((r) => r.date));

    const exams = subjectList.map((s) => ({
      subjectCode: s.code,
      semesterNumber: s.semesterNumber,
      departmentId: s.departmentId,
      isElective: s.isElective ?? false,
      electiveGroupId: s.electiveGroupId ?? null,
    }));

    const result = generate({
      exams,
      cycle,
      startDate,
      endDate,
      holidayDates,
      fixedAssignments,
      semesterGapDays,
      pairRotationMode,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, rule: result.rule },
        { status: 400 }
      );
    }

    const finalValidation = validateSchedule(result.schedule, cycle, holidayDates, semesterGapDays);
    if (!finalValidation.success) {
      return NextResponse.json(
        { error: finalValidation.message, rule: finalValidation.rule },
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
        name: `Schedule ${nextVersion}`,
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
        subjectCode: entry.subjectCode,
        departmentId: entry.departmentId,
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
