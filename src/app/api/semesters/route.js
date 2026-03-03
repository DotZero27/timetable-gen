import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { semesters } from "@/db/schema";

export async function GET() {
  try {
    const db = getDb();
    const list = await db.select().from(semesters).orderBy(semesters.semesterNumber);
    return NextResponse.json(list);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to list semesters" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, semesterNumber } = body;
    if (!name || typeof semesterNumber !== "number") {
      return NextResponse.json(
        { error: "name and semesterNumber are required" },
        { status: 400 }
      );
    }
    const db = getDb();
    const [inserted] = await db
      .insert(semesters)
      .values({ name, semesterNumber })
      .returning();
    return NextResponse.json(inserted);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to create semester" }, { status: 500 });
  }
}
