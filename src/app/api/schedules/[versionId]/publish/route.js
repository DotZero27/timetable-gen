import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { scheduleVersions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request, { params }) {
  try {
    const versionId = Number(params.versionId);
    if (Number.isNaN(versionId)) {
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
    if (version.status === "published") {
      return NextResponse.json(
        { error: "Version is already published; immutable." },
        { status: 400 }
      );
    }
    await db
      .update(scheduleVersions)
      .set({ status: "published" })
      .where(eq(scheduleVersions.id, versionId));
    return NextResponse.json({ success: true, status: "published" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || "Failed to publish" },
      { status: 500 }
    );
  }
}
