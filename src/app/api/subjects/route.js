import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { subjects, departments, semesters, subjectDepartments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const semesterId = searchParams.get("semesterId");
    const db = getDb();
    let query = db
      .select({
        offeringId: subjectDepartments.id,
        code: subjects.code,
        name: subjects.name,
        semesterId: subjects.semesterId,
        semesterNumber: semesters.semesterNumber,
        departmentId: subjectDepartments.departmentId,
        isElective: subjects.isElective,
        electiveGroupId: subjects.electiveGroupId,
        departmentCode: departments.code,
        departmentName: departments.name,
      })
      .from(subjectDepartments)
      .innerJoin(subjects, eq(subjectDepartments.subjectCode, subjects.code))
      .leftJoin(departments, eq(subjectDepartments.departmentId, departments.id))
      .leftJoin(semesters, eq(subjects.semesterId, semesters.id));
    if (semesterId != null && semesterId !== "") {
      query = query.where(eq(subjects.semesterId, Number(semesterId)));
    }
    const list = await query;
    return NextResponse.json(list);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Try again later!" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }
    const db = getDb();
    await db
      .delete(subjectDepartments)
      .where(eq(subjectDepartments.subjectCode, code));
    await db.delete(subjects).where(eq(subjects.code, code));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Try again later!" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { code, name, semesterId, departmentIds, isElective, electiveGroupId } = body;
    if (!code) {
      return NextResponse.json({ error: "code is required" }, { status: 400 });
    }
    const parsedDepartmentIds =
      Array.isArray(departmentIds) && departmentIds.length > 0
        ? [...new Set(departmentIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
        : null;
    if (departmentIds !== undefined && (!parsedDepartmentIds || parsedDepartmentIds.length === 0)) {
      return NextResponse.json({ error: "departmentIds must be a non-empty array of IDs" }, { status: 400 });
    }
    const db = getDb();
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (semesterId !== undefined) updates.semesterId = Number(semesterId);
    if (parsedDepartmentIds?.length) updates.departmentId = parsedDepartmentIds[0];
    if (isElective !== undefined) updates.isElective = isElective === true;
    if (electiveGroupId !== undefined) {
      updates.electiveGroupId = String(electiveGroupId ?? "").trim() || null;
    }
    if (Object.keys(updates).length === 0 && parsedDepartmentIds === null) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }
    const [updated] = await db
      .update(subjects)
      .set(updates)
      .where(eq(subjects.code, code))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }
    if (parsedDepartmentIds !== null) {
      await db.delete(subjectDepartments).where(eq(subjectDepartments.subjectCode, code));
      for (const deptId of parsedDepartmentIds) {
        await db.insert(subjectDepartments).values({
          subjectCode: code,
          departmentId: deptId,
        });
      }
    }
    const offeringRows = await db
      .select({
        offeringId: subjectDepartments.id,
        code: subjects.code,
        name: subjects.name,
        semesterId: subjects.semesterId,
        semesterNumber: semesters.semesterNumber,
        departmentId: subjectDepartments.departmentId,
        isElective: subjects.isElective,
        electiveGroupId: subjects.electiveGroupId,
        departmentCode: departments.code,
        departmentName: departments.name,
      })
      .from(subjectDepartments)
      .innerJoin(subjects, eq(subjectDepartments.subjectCode, subjects.code))
      .leftJoin(departments, eq(subjectDepartments.departmentId, departments.id))
      .leftJoin(semesters, eq(subjects.semesterId, semesters.id))
      .where(eq(subjects.code, code));
    return NextResponse.json(offeringRows);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Try again later!" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, name, semesterId, departmentIds, isElective, electiveGroupId } = body;
    const parsedDepartmentIds =
      Array.isArray(departmentIds) && departmentIds.length > 0
        ? [...new Set(departmentIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))]
        : [];
    if (!code || !name || !semesterId || parsedDepartmentIds.length === 0) {
      return NextResponse.json(
        { error: "code, name, semesterId, and at least one departmentId are required" },
        { status: 400 }
      );
    }
    const db = getDb();
    const [inserted] = await db
      .insert(subjects)
      .values({
        code,
        name,
        semesterId: Number(semesterId),
        departmentId: parsedDepartmentIds[0],
        isElective: isElective === true,
        electiveGroupId: String(electiveGroupId ?? "").trim() || null,
      })
      .returning();
    for (const deptId of parsedDepartmentIds) {
      await db.insert(subjectDepartments).values({
        subjectCode: code,
        departmentId: deptId,
      });
    }
    const offeringRows = await db
      .select({
        offeringId: subjectDepartments.id,
        code: subjects.code,
        name: subjects.name,
        semesterId: subjects.semesterId,
        semesterNumber: semesters.semesterNumber,
        departmentId: subjectDepartments.departmentId,
        isElective: subjects.isElective,
        electiveGroupId: subjects.electiveGroupId,
        departmentCode: departments.code,
        departmentName: departments.name,
      })
      .from(subjectDepartments)
      .innerJoin(subjects, eq(subjectDepartments.subjectCode, subjects.code))
      .leftJoin(departments, eq(subjectDepartments.departmentId, departments.id))
      .leftJoin(semesters, eq(subjects.semesterId, semesters.id))
      .where(eq(subjects.code, inserted.code));
    return NextResponse.json(offeringRows);
  } catch (err) {
    console.error(err);
    const msg = err?.message ?? "";
    if (msg.includes("UNIQUE") && (msg.includes("subjects") || msg.includes("code"))) {
      return NextResponse.json(
        { error: "A subject with this code already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Try again later!" },
      { status: 500 }
    );
  }
}
