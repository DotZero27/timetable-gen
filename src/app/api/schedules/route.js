import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { scheduleVersions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const db = getDb();
    let query = db.select().from(scheduleVersions).orderBy(desc(scheduleVersions.id));
    if (status === "published") {
      query = query.where(eq(scheduleVersions.status, "published"));
    }
    const versions = await query;
    return NextResponse.json(versions);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Failed to list schedules" },
      { status: 500 }
    );
  }
}
