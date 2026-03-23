import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { exportTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleVersionId = searchParams.get("scheduleVersionId");
    if (!scheduleVersionId) {
      return NextResponse.json(
        { error: "scheduleVersionId query parameter is required" },
        { status: 400 }
      );
    }
    const db = getDb();
    const [template] = await db
      .select()
      .from(exportTemplates)
      .where(eq(exportTemplates.scheduleVersionId, Number(scheduleVersionId)));
    return NextResponse.json(template ?? null);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Try again later!" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      scheduleVersionId,
      collegeName,
      examTitle,
      regulation,
      creditSystem,
      degree,
      batchYears,
      fnTiming,
      anTiming,
      publishedDate,
      controllerName,
      principalName,
    } = body;

    if (!scheduleVersionId || !collegeName || !examTitle || !regulation || !creditSystem || !degree || !batchYears) {
      return NextResponse.json(
        { error: "scheduleVersionId, collegeName, examTitle, regulation, creditSystem, degree, and batchYears are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Upsert: delete existing template for this version, then insert
    await db
      .delete(exportTemplates)
      .where(eq(exportTemplates.scheduleVersionId, Number(scheduleVersionId)));

    const [inserted] = await db
      .insert(exportTemplates)
      .values({
        scheduleVersionId: Number(scheduleVersionId),
        collegeName,
        examTitle,
        regulation,
        creditSystem,
        degree,
        batchYears,
        fnTiming: fnTiming || "09.30 am to 12.30 pm",
        anTiming: anTiming || "01.30 pm to 04.30 pm",
        publishedDate: publishedDate || null,
        controllerName: controllerName || null,
        principalName: principalName || null,
      })
      .returning();

    return NextResponse.json(inserted);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Try again later!" }, { status: 500 });
  }
}
