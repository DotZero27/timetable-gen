import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { subjects } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const semesterId = searchParams.get("semesterId");
    const db = getDb();
    let query = db.select().from(subjects);
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

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, name, semesterId } = body;
    if (!code || !name || !semesterId) {
      return NextResponse.json(
        { error: "code, name, and semesterId are required" },
        { status: 400 }
      );
    }
    const db = getDb();
    const [inserted] = await db
      .insert(subjects)
      .values({ code, name, semesterId: Number(semesterId) })
      .returning();
    return NextResponse.json(inserted);
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
