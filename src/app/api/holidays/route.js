import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { holidays } from "@/db/schema";
import { and, gte, lte } from "drizzle-orm";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const db = getDb();
    let query = db.select().from(holidays);
    if (from && to) {
      query = query.where(and(gte(holidays.date, from), lte(holidays.date, to)));
    }
    const list = await query;
    return NextResponse.json(list);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to list holidays" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { date, label } = body;
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }
    const db = getDb();
    const [inserted] = await db
      .insert(holidays)
      .values({ date, label: label ?? null })
      .returning();
    return NextResponse.json(inserted);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to create holiday" }, { status: 500 });
  }
}
