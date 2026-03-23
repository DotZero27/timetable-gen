import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { departments } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  try {
    const db = getDb();
    const list = await db
      .select()
      .from(departments)
      .orderBy(asc(departments.displayOrder));
    return NextResponse.json(list);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Try again later!" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, name, degreePrefix, displayOrder } = body;
    if (!code || !name || !degreePrefix || displayOrder == null) {
      return NextResponse.json(
        { error: "code, name, degreePrefix, and displayOrder are required" },
        { status: 400 }
      );
    }
    const db = getDb();
    const [inserted] = await db
      .insert(departments)
      .values({ code, name, degreePrefix, displayOrder: Number(displayOrder) })
      .returning();
    return NextResponse.json(inserted);
  } catch (err) {
    console.error(err);
    const msg = err?.message ?? "";
    if (msg.includes("UNIQUE") && (msg.includes("departments") || msg.includes("code"))) {
      return NextResponse.json(
        { error: "A department with this code already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Try again later!" }, { status: 500 });
  }
}
